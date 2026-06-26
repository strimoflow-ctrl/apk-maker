package com.naino.academy;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;

import java.io.File;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class NativeDownloadManager {
    private static DownloadManager downloadManager = null;
    private static final Map<String, Long> activeDownloads = new ConcurrentHashMap<>();
    private static android.os.PowerManager.WakeLock wakeLock = null;
    private static android.net.wifi.WifiManager.WifiLock wifiLock = null;
    private static java.lang.ref.WeakReference<MainActivity> mainActivityRef = null;

    public static void setMainActivity(MainActivity activity) {
        mainActivityRef = new java.lang.ref.WeakReference<>(activity);
    }
    private static boolean isPolling = false;
    private static final Handler handler = new Handler(Looper.getMainLooper());

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences("naino_downloads_pref", Context.MODE_PRIVATE);
    }

    public static void markAsCompleted(Context context, String idKey) {
        getPrefs(context).edit().putBoolean("completed_" + idKey, true).apply();
    }

    public static boolean isMarkedCompleted(Context context, String idKey) {
        return getPrefs(context).getBoolean("completed_" + idKey, false);
    }

    public static void removeCompletedMark(Context context, String idKey) {
        getPrefs(context).edit().remove("completed_" + idKey).apply();
    }

    public static void migrateOldDownloads(Context context) {
        SharedPreferences prefs = getPrefs(context);
        if (prefs.getBoolean("migrated_old_downloads", false)) {
            return;
        }

        String[] types = {"video", "pdf", "book", "zip"};
        for (String type : types) {
            String subPath = "videos";
            if ("pdf".equals(type)) subPath = "pdfs";
            else if ("book".equals(type) || "zip".equals(type)) subPath = "zips";

            File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), subPath);
            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File file : files) {
                        try {
                            String name = file.getName();
                            String searchIndicator = "_" + type + "_";
                            int indicatorIndex = name.lastIndexOf(searchIndicator);
                            if (indicatorIndex != -1) {
                                String rest = name.substring(indicatorIndex + searchIndicator.length());
                                int separatorIndex = rest.indexOf("___");
                                String courseId;
                                String itemId;
                                if (separatorIndex != -1) {
                                    courseId = rest.substring(0, separatorIndex);
                                    itemId = rest.substring(separatorIndex + 3);
                                } else {
                                    separatorIndex = rest.indexOf("_");
                                    if (separatorIndex != -1) {
                                        courseId = rest.substring(0, separatorIndex);
                                        itemId = rest.substring(separatorIndex + 1);
                                    } else {
                                        continue;
                                    }
                                }

                                if (itemId.endsWith(".mp4")) itemId = itemId.substring(0, itemId.length() - 4);
                                else if (itemId.endsWith(".pdf")) itemId = itemId.substring(0, itemId.length() - 4);
                                else if (itemId.endsWith(".zip")) itemId = itemId.substring(0, itemId.length() - 4);

                                String idKey = type + "_" + courseId + "_" + itemId;
                                prefs.edit().putBoolean("completed_" + idKey, true).apply();
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        }
        prefs.edit().putBoolean("migrated_old_downloads", true).apply();
    }

    public interface ProgressListener {
        void onProgressUpdate(String idKey, int progress, long downloaded, long total);
    }

    private static void saveActiveDownloads(Context context) {
        if (context == null) return;
        SharedPreferences.Editor editor = getPrefs(context).edit();
        
        // Clear old keys
        String oldKeys = getPrefs(context).getString("active_download_keys", "");
        if (!oldKeys.isEmpty()) {
            for (String key : oldKeys.split(",")) {
                if (!key.isEmpty()) {
                    String[] parts = key.split(":");
                    if (parts.length > 0) editor.remove("active_id_" + parts[0]);
                }
            }
        }
        
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Long> entry : activeDownloads.entrySet()) {
            sb.append(entry.getKey()).append(":").append(entry.getValue()).append(",");
            editor.putLong("active_id_" + entry.getKey(), entry.getValue());
        }
        editor.putString("active_download_keys", sb.toString());
        editor.apply();
    }

    public static void loadActiveDownloads(Context context) {
        if (context == null) return;
        SharedPreferences prefs = getPrefs(context);
        String keysStr = prefs.getString("active_download_keys", "");
        if (!keysStr.isEmpty()) {
            String[] pairs = keysStr.split(",");
            for (String pair : pairs) {
                if (pair.isEmpty()) continue;
                String[] parts = pair.split(":");
                if (parts.length == 2) {
                    String idKey = parts[0];
                    try {
                        long downloadId = Long.parseLong(parts[1]);
                        activeDownloads.put(idKey, downloadId);
                    } catch (Exception ignored) {}
                }
            }
        }
    }

    public static void reportProgress(String idKey, int progress, long downloaded, long total, int currentSegment, int totalSegments) {
        if (mainActivityRef != null) {
            MainActivity activity = mainActivityRef.get();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    try {
                        android.webkit.WebView webView = activity.getBridge().getWebView();
                        if (webView != null) {
                            String jsCode = "if(window.updateDownloadProgress) { window.updateDownloadProgress('" + idKey + "', " + progress + ", " + downloaded + ", " + total + ", " + currentSegment + ", " + totalSegments + "); }";
                            webView.evaluateJavascript(jsCode, null);
                        }
                    } catch (Exception ignored) {}
                });
            }
        }
    }


    private static void acquireLocks(Context context) {
        try {
            if (wakeLock == null && context != null) {
                android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
                wakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "NainoAcademy:DownloadWakeLock");
            }
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(15 * 60 * 1000L); // 15 minutes timeout
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        try {
            if (wifiLock == null && context != null) {
                android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                wifiLock = wm.createWifiLock(3, "NainoAcademy:DownloadWifiLock"); // WIFI_MODE_FULL_HIGH_PERF
            }
            if (wifiLock != null && !wifiLock.isHeld()) {
                wifiLock.acquire();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void releaseLocks() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        try {
            if (wifiLock != null && wifiLock.isHeld()) {
                wifiLock.release();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void init(Context context) {
        if (downloadManager == null) {
            downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        }
        migrateOldDownloads(context);
        loadActiveDownloads(context);
        if (!activeDownloads.isEmpty()) {
            startPolling(context, null);
        }
    }

    public static void startDownload(Context context, String url, String title, String type, String courseId, String lectureId, ProgressListener listener) {
        init(context);
        
        if (url.startsWith("http://") && !url.contains("localhost") && !url.contains("127.0.0.1")) {
            url = url.replace("http://", "https://");
        }

        String idKey = type + "_" + courseId + "_" + lectureId;
        if (activeDownloads.containsKey(idKey)) return;

        String subPath = "videos";
        if ("pdf".equals(type)) subPath = "pdfs";
        else if ("book".equals(type) || "zip".equals(type)) subPath = "zips";

        String fileName = title.replaceAll("[^a-zA-Z0-9.-]", "_") + "_" + type + "_" + courseId + "___" + lectureId;
        if (url.endsWith(".m3u8")) {
            fileName += ".m3u8"; // Save as m3u8 playlist
        }
        File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), subPath);
        if (!dir.exists()) dir.mkdirs();

        File destFile = new File(dir, fileName);

        try {
            activeDownloads.put(idKey, 1L);
            saveActiveDownloads(context);
            
            Intent serviceIntent = new Intent(context, DownloadForegroundService.class);
            serviceIntent.putExtra("url", url);
            serviceIntent.putExtra("title", title);
            serviceIntent.putExtra("type", type);
            serviceIntent.putExtra("courseId", courseId);
            serviceIntent.putExtra("lectureId", lectureId);
            serviceIntent.putExtra("destPath", destFile.getAbsolutePath());
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void pauseDownload(String type, String courseId, String lectureId) {
        // Not natively supported by DownloadManager easily, handled by React UI state
    }

    public static void cancelDownload(Context context, String type, String courseId, String lectureId) {
        String idKey = type + "_" + courseId + "_" + lectureId;
        cancelProgressNotification(context, idKey);
        
        Intent serviceIntent = new Intent(context, DownloadForegroundService.class);
        serviceIntent.setAction("CANCEL");
        serviceIntent.putExtra("idKey", idKey);
        context.startService(serviceIntent);

        activeDownloads.remove(idKey);
        saveActiveDownloads(context);
    }

    public static boolean deleteOfflineFile(Context context, String type, String courseId, String lectureId) {
        String subPath = "videos";
        if ("pdf".equals(type)) subPath = "pdfs";
        else if ("book".equals(type) || "zip".equals(type)) subPath = "zips";

        String idKey = type + "_" + courseId + "_" + lectureId;
        removeCompletedMark(context, idKey);

        String targetNew = "_" + type + "_" + courseId + "___" + lectureId;
        String targetOld = "_" + type + "_" + courseId + "_" + lectureId;
        File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), subPath);
        boolean deleted = false;
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                for (File file : files) {
                    String name = file.getName();
                    if (name.endsWith(targetNew) || name.endsWith(targetNew + ".mp4") || name.endsWith(targetNew + ".pdf") || name.endsWith(targetNew + ".zip") || name.endsWith(targetNew + ".m3u8") || name.endsWith(targetNew + ".ts") ||
                        name.endsWith(targetOld) || name.endsWith(targetOld + ".mp4") || name.endsWith(targetOld + ".pdf") || name.endsWith(targetOld + ".zip") || name.endsWith(targetOld + ".m3u8") || name.endsWith(targetOld + ".ts")) {
                        if (file.delete()) {
                            deleted = true;
                        }
                    }
                }
            }
        }
        cancelDownload(context, type, courseId, lectureId);
        return deleted;
    }

    public static String getLocalFilePath(Context context, String type, String title, String courseId, String lectureId) {
        String subPath = "videos";
        if ("pdf".equals(type)) subPath = "pdfs";
        else if ("book".equals(type) || "zip".equals(type)) subPath = "zips";

        String targetNew = "_" + type + "_" + courseId + "___" + lectureId;
        String targetOld = "_" + type + "_" + courseId + "_" + lectureId;
        File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), subPath);
        
        if (dir.exists() && dir.isDirectory()) {
            File[] files = dir.listFiles();
            if (files != null) {
                // Return .m3u8 preferentially if it exists
                for (File file : files) {
                    String name = file.getName();
                    if (name.endsWith(targetNew + ".m3u8") || name.endsWith(targetOld + ".m3u8")) {
                        String idKey = type + "_" + courseId + "_" + lectureId;
                        if (isMarkedCompleted(context, idKey)) {
                            return "http://localhost/_capacitor_file_" + file.getAbsolutePath();
                        }
                    }
                }
                for (File file : files) {
                    String name = file.getName();
                    if (name.endsWith(targetNew) || name.endsWith(targetNew + ".mp4") || name.endsWith(targetNew + ".pdf") || name.endsWith(targetNew + ".zip") || name.endsWith(targetNew + ".ts") ||
                        name.endsWith(targetOld) || name.endsWith(targetOld + ".mp4") || name.endsWith(targetOld + ".pdf") || name.endsWith(targetOld + ".zip") || name.endsWith(targetOld + ".ts")) {
                        
                        String idKey = type + "_" + courseId + "_" + lectureId;
                        if (isMarkedCompleted(context, idKey)) {
                            return "http://localhost/_capacitor_file_" + file.getAbsolutePath();
                        }
                        if (!activeDownloads.containsKey(idKey)) {
                            file.delete(); // Delete incomplete/stale leftover file
                        }
                    }
                }
            }
        }
        return null;
    }

    public static boolean isDownloaded(Context context, String type, String title, String courseId, String lectureId) {
        return getLocalFilePath(context, type, title, courseId, lectureId) != null;
    }

    public static void showProgressNotification(Context context, String title, String idKey, int progress) {
        if (context == null) return;
        try {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            String channelId = "download_progress_channel";
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        channelId,
                        "Downloads Progress",
                        android.app.NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Progress notifications for downloads");
                notificationManager.createNotificationChannel(channel);
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("navigate_to", "/downloads");
            
            android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                    context,
                    idKey.hashCode(),
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
            );

            int iconRes = context.getApplicationInfo().icon;

            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(iconRes != 0 ? iconRes : android.R.drawable.stat_sys_download)
                    .setContentTitle(title)
                    .setContentText("Downloading... " + progress + "%")
                    .setOnlyAlertOnce(true)
                    .setContentIntent(pendingIntent)
                    .setProgress(100, progress, false)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW);

            notificationManager.notify(idKey.hashCode(), builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void cancelProgressNotification(Context context, String idKey) {
        if (context == null) return;
        try {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(idKey.hashCode());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void showCompletedNotification(Context context, String title, String idKey) {
        try {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            String channelId = "download_completed_channel";
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        channelId,
                        "Downloads Completed",
                        android.app.NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Notifications for completed downloads");
                notificationManager.createNotificationChannel(channel);
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("navigate_to", "/downloads");
            
            android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                    context,
                    idKey.hashCode(),
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
            );

            int iconRes = context.getApplicationInfo().icon;

            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(iconRes != 0 ? iconRes : android.R.drawable.stat_sys_download_done)
                    .setContentTitle("Download Complete! 🎉")
                    .setContentText(title + " is ready offline.")
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT);

            notificationManager.notify(idKey.hashCode(), builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static String getOfflineDownloadsList(Context context) {
        org.json.JSONArray jsonArray = new org.json.JSONArray();
        String[] types = {"video", "pdf", "book", "zip"};
        
        for (String type : types) {
            String subPath = "videos";
            if ("pdf".equals(type)) subPath = "pdfs";
            else if ("book".equals(type) || "zip".equals(type)) subPath = "zips";

            File dir = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), subPath);
            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File file : files) {
                        try {
                            String name = file.getName();
                            String searchIndicator = "_" + type + "_";
                            int indicatorIndex = name.lastIndexOf(searchIndicator);
                            if (indicatorIndex != -1) {
                                String titlePart = name.substring(0, indicatorIndex).replace("_", " ");
                                String rest = name.substring(indicatorIndex + searchIndicator.length());
                                int separatorIndex = rest.indexOf("___");
                                String courseId;
                                String itemId;
                                if (separatorIndex != -1) {
                                    courseId = rest.substring(0, separatorIndex);
                                    itemId = rest.substring(separatorIndex + 3);
                                } else {
                                    // Fallback to old format
                                    separatorIndex = rest.indexOf("_");
                                    if (separatorIndex != -1) {
                                        courseId = rest.substring(0, separatorIndex);
                                        itemId = rest.substring(separatorIndex + 1);
                                    } else {
                                        continue;
                                    }
                                }
                                
                                if (itemId.endsWith(".mp4")) itemId = itemId.substring(0, itemId.length() - 4);
                                else if (itemId.endsWith(".pdf")) itemId = itemId.substring(0, itemId.length() - 4);
                                else if (itemId.endsWith(".zip")) itemId = itemId.substring(0, itemId.length() - 4);

                                String idKey = type + "_" + courseId + "_" + itemId;
                                if (isMarkedCompleted(context, idKey)) {
                                    org.json.JSONObject obj = new org.json.JSONObject();
                                    obj.put("key", "naino_offline_" + type + "_" + courseId + "_" + itemId);
                                    obj.put("courseId", courseId);
                                    obj.put("itemId", itemId);
                                    obj.put("title", titlePart);
                                    obj.put("type", type);
                                    obj.put("size", file.length());
                                    obj.put("timestamp", file.lastModified());
                                    
                                    jsonArray.put(obj);
                                } else if (!activeDownloads.containsKey(idKey)) {
                                    file.delete(); // Delete stale/failed leftover file
                                }
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        }
        return jsonArray.toString();
    }

    private static void startPolling(Context context, ProgressListener listener) {
        // Disabled because we no longer use the system DownloadManager
    }
}
