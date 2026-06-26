package com.naino.academy;

import android.content.Context;
import android.util.Log;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

public class M3U8Downloader implements Runnable {
    private static final String TAG = "M3U8Downloader";
    private final Context context;
    private final String sourceUrl;
    private final String destPath;
    private final String idKey;
    private final String title;
    private final StandardDownloader.Runnable callback;

    public M3U8Downloader(Context context, String sourceUrl, String destPath, String idKey, String title, StandardDownloader.Runnable callback) {
        this.context = context;
        this.sourceUrl = sourceUrl;
        this.destPath = destPath;
        this.idKey = idKey;
        this.title = title;
        this.callback = callback;
    }

    @Override
    public void run() {
        boolean success = false;
        FileOutputStream out = null;

        try {
            // 1. Fetch Playlist
            URL playlistUrl = new URL(sourceUrl);
            HttpURLConnection playlistConn = (HttpURLConnection) playlistUrl.openConnection();
            playlistConn.setConnectTimeout(15000);
            playlistConn.setReadTimeout(15000);
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(playlistConn.getInputStream()));
            List<String> segmentUrls = new ArrayList<>();
            String line;
            String baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf("/") + 1);

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (!line.isEmpty() && !line.startsWith("#")) {
                    if (line.startsWith("http")) {
                        segmentUrls.add(line);
                    } else {
                        segmentUrls.add(baseUrl + line);
                    }
                }
            }
            reader.close();
            playlistConn.disconnect();

            int totalSegments = segmentUrls.size();
            if (totalSegments == 0) {
                throw new Exception("No segments found in m3u8 playlist");
            }

            File destFile = new File(destPath);
            File tsTempFile = new File(destPath.replace(".m3u8", ".ts.tmp"));
            File tsFinalFile = new File(destPath.replace(".m3u8", ".ts"));

            out = new FileOutputStream(tsTempFile);

            long totalBytes = 0;
            byte[] buffer = new byte[8192];

            for (int i = 0; i < totalSegments; i++) {
                if (Thread.currentThread().isInterrupted()) {
                    throw new Exception("Download cancelled");
                }

                String segUrl = segmentUrls.get(i);
                int retry = 0;
                boolean segSuccess = false;

                while (retry < 3 && !segSuccess) {
                    InputStream in = null;
                    HttpURLConnection segConn = null;
                    try {
                        segConn = (HttpURLConnection) new URL(segUrl).openConnection();
                        segConn.setConnectTimeout(10000);
                        segConn.setReadTimeout(10000);

                        in = segConn.getInputStream();
                        int bytesRead;
                        while ((bytesRead = in.read(buffer)) != -1) {
                            out.write(buffer, 0, bytesRead);
                            totalBytes += bytesRead;
                        }
                        segSuccess = true;
                    } catch (Exception e) {
                        retry++;
                        if (retry >= 3) throw e;
                        Thread.sleep(2000);
                    } finally {
                        if (in != null) try { in.close(); } catch (Exception ignored) {}
                        if (segConn != null) segConn.disconnect();
                    }
                }

                int progress = (int) (((i + 1) * 100) / totalSegments);
                NativeDownloadManager.reportProgress(idKey, progress, totalBytes, 0, (i + 1), totalSegments);
                NativeDownloadManager.showProgressNotification(context, title, idKey, progress);
            }

            out.flush();
            out.close();

            // Rename TS temp to final TS
            if (tsTempFile.renameTo(tsFinalFile)) {
                // Generate local m3u8 playlist
                FileWriter writer = new FileWriter(destFile);
                writer.write("#EXTM3U\n");
                writer.write("#EXT-X-VERSION:3\n");
                writer.write("#EXT-X-TARGETDURATION:99999\n");
                writer.write("#EXT-X-MEDIA-SEQUENCE:0\n");
                writer.write("#EXTINF:99999.0,\n");
                writer.write(tsFinalFile.getName() + "\n");
                writer.write("#EXT-X-ENDLIST\n");
                writer.close();

                NativeDownloadManager.markAsCompleted(context, idKey);
                NativeDownloadManager.reportProgress(idKey, 100, totalBytes, 0, totalSegments, totalSegments);
                NativeDownloadManager.showCompletedNotification(context, title, idKey);
                success = true;
            }

        } catch (Exception e) {
            Log.e(TAG, "M3U8 download failed for " + idKey, e);
        } finally {
            try { if (out != null) out.close(); } catch (Exception ignored) {}
            
            if (!success) {
                new File(destPath + ".tmp").delete();
                new File(destPath.replace(".m3u8", ".ts.tmp")).delete();
                NativeDownloadManager.reportProgress(idKey, -1, 0, 0, 0, 0);
                NativeDownloadManager.cancelProgressNotification(context, idKey);
            }
            if (callback != null) {
                callback.onCompleted(idKey, success);
            }
        }
    }
}
