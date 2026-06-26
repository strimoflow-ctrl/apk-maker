package com.naino.academy;

import android.content.Context;
import android.util.Log;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class StandardDownloader implements Runnable {
    private static final String TAG = "StandardDownloader";
    private final Context context;
    private final String sourceUrl;
    private final String destPath;
    private final String idKey;
    private final String title;
    private final Runnable callback;

    public StandardDownloader(Context context, String sourceUrl, String destPath, String idKey, String title, Runnable callback) {
        this.context = context;
        this.sourceUrl = sourceUrl;
        this.destPath = destPath;
        this.idKey = idKey;
        this.title = title;
        this.callback = callback;
    }

    public interface Runnable {
        void onCompleted(String idKey, boolean success);
    }

    @Override
    public void run() {
        boolean success = false;
        HttpURLConnection connection = null;
        BufferedInputStream in = null;
        FileOutputStream out = null;

        try {
            URL url = new URL(sourceUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.connect();

            int fileLength = connection.getContentLength();
            File destFile = new File(destPath);
            File tempFile = new File(destPath + ".tmp");

            in = new BufferedInputStream(connection.getInputStream());
            out = new FileOutputStream(tempFile);

            byte[] data = new byte[8192];
            long total = 0;
            int count;
            long lastReportTime = 0;

            while ((count = in.read(data)) != -1) {
                total += count;
                out.write(data, 0, count);

                long currentTime = System.currentTimeMillis();
                if (currentTime - lastReportTime > 500) {
                    lastReportTime = currentTime;
                    int progress = (fileLength > 0) ? (int) (total * 100 / fileLength) : 0;
                    NativeDownloadManager.reportProgress(idKey, progress, total, fileLength, 0, 0);
                    NativeDownloadManager.showProgressNotification(context, title, idKey, progress);
                }
            }

            out.flush();
            out.close();
            in.close();

            // Rename temp to final
            if (tempFile.renameTo(destFile)) {
                NativeDownloadManager.markAsCompleted(context, idKey);
                NativeDownloadManager.reportProgress(idKey, 100, total, fileLength, 0, 0);
                NativeDownloadManager.showCompletedNotification(context, title, idKey);
                success = true;
            }

        } catch (Exception e) {
            Log.e(TAG, "Standard download failed for " + idKey, e);
        } finally {
            try { if (out != null) out.close(); } catch (Exception ignored) {}
            try { if (in != null) in.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
            
            if (!success) {
                new File(destPath + ".tmp").delete();
                // Send -1 progress to indicate failure
                NativeDownloadManager.reportProgress(idKey, -1, 0, 0, 0, 0);
                NativeDownloadManager.cancelProgressNotification(context, idKey);
            }
            if (callback != null) {
                ((Runnable) callback).onCompleted(idKey, success);
            }
        }
    }
}
