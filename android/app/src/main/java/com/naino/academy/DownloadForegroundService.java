package com.naino.academy;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.File;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DownloadForegroundService extends Service {
    private static final String TAG = "DownloadForegroundSvc";
    private static final String CHANNEL_ID = "naino_downloads_channel_v2";
    private static final int NOTIFICATION_ID = 8888;

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private ExecutorService executorService;

    // Track active tasks to allow cancellation
    private final Map<String, Runnable> activeTasks = new ConcurrentHashMap<>();

    @Override
    public void onCreate() {
        super.onCreate();
        executorService = Executors.newFixedThreadPool(3); // 3 parallel downloads
        createNotificationChannel();
        acquireLocks();
        startForeground(NOTIFICATION_ID, buildNotification("Preparing to download..."));
    }

    private void acquireLocks() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NainoAcademy:DownloadSvcWakeLock");
            wakeLock.acquire(4 * 60 * 60 * 1000L); // Max 4 hours
        }

        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm != null) {
            wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "NainoAcademy:DownloadSvcWifiLock");
            wifiLock.acquire();
        }
    }

    private void releaseLocks() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            wakeLock = null;
        }
        if (wifiLock != null && wifiLock.isHeld()) {
            wifiLock.release();
            wifiLock = null;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Background Downloads",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows active background downloads for offline access");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String content) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.putExtra("navigate_to", "/downloads");
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Downloading content")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.stat_sys_download)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .build();
    }

    private void updateNotification(String content) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(content));
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if ("CANCEL".equals(action)) {
            String idKey = intent.getStringExtra("idKey");
            if (idKey != null) {
                // Not perfectly aborting the thread for simplicity, just removing it from active map
                // In actual impl, we would interrupt the thread. But NativeDownloadManager already clears it from UI.
                activeTasks.remove(idKey);
            }
            if (activeTasks.isEmpty()) {
                stopSelf();
            }
            return START_STICKY;
        }

        String url = intent.getStringExtra("url");
        String title = intent.getStringExtra("title");
        String type = intent.getStringExtra("type");
        String courseId = intent.getStringExtra("courseId");
        String lectureId = intent.getStringExtra("lectureId");
        String destPath = intent.getStringExtra("destPath");

        if (url != null && destPath != null) {
            String idKey = type + "_" + courseId + "_" + lectureId;
            if (!activeTasks.containsKey(idKey)) {
                Runnable task;
                if (url.endsWith(".m3u8")) {
                    task = new M3U8Downloader(this, url, destPath, idKey, title, this::onTaskCompleted);
                } else {
                    task = new StandardDownloader(this, url, destPath, idKey, title, this::onTaskCompleted);
                }
                activeTasks.put(idKey, task);
                executorService.submit(task);
                updateNotification("Downloading: " + title);
            }
        }

        return START_STICKY; // Keeps service running
    }

    private void onTaskCompleted(String idKey, boolean success) {
        activeTasks.remove(idKey);
        
        if (activeTasks.isEmpty()) {
            stopForeground(true);
            stopSelf();
        } else {
            updateNotification(activeTasks.size() + " downloads remaining");
        }
    }

    @Override
    public void onDestroy() {
        releaseLocks();
        if (executorService != null) {
            executorService.shutdownNow();
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
