package com.naino.academy;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.io.File;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private String pendingRoute = null;

    private final BroadcastReceiver downloadNotificationReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (DownloadManager.ACTION_NOTIFICATION_CLICKED.equals(intent.getAction())) {
                Intent launchIntent = new Intent(context, MainActivity.class);
                launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra("navigate_to", "/downloads");
                context.startActivity(launchIntent);
            }
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("navigate_to")) {
            pendingRoute = intent.getStringExtra("navigate_to");
        }

        // Register receiver to open app when download notification is clicked
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadNotificationReceiver, new IntentFilter(DownloadManager.ACTION_NOTIFICATION_CLICKED), Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(downloadNotificationReceiver, new IntentFilter(DownloadManager.ACTION_NOTIFICATION_CLICKED));
        }

        // Register MainActivity in download manager for JS progress dispatching
        NativeDownloadManager.setMainActivity(this);

        // Request notification permission for Android 13+ (API 33+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(downloadNotificationReceiver);
        } catch (Exception e) {}
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Enable local file access for React Video Player
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowFileAccessFromFileURLs(true);
            webView.getSettings().setAllowUniversalAccessFromFileURLs(true);

            // Inject window.Android
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void startDownload(String videoUrl, String title, String courseId, String lectureId, String type) {
                    NativeDownloadManager.startDownload(MainActivity.this, videoUrl, title, type, courseId, lectureId, (idKey, progress, downloaded, total) -> {
                        runOnUiThread(() -> {
                            String jsCode = "if(window.updateDownloadProgress) { window.updateDownloadProgress('" + idKey + "', " + progress + ", " + downloaded + ", " + total + "); }";
                            webView.evaluateJavascript(jsCode, null);
                        });
                    });
                }

                @JavascriptInterface
                public void pauseDownload(String type, String courseId, String lectureId) {
                    NativeDownloadManager.pauseDownload(type, courseId, lectureId);
                }

                @JavascriptInterface
                public void cancelDownload(String type, String courseId, String lectureId) {
                    NativeDownloadManager.cancelDownload(MainActivity.this, type, courseId, lectureId);
                }

                @JavascriptInterface
                public boolean deleteOfflineFile(String type, String courseId, String lectureId) {
                    return NativeDownloadManager.deleteOfflineFile(MainActivity.this, type, courseId, lectureId);
                }

                @JavascriptInterface
                public boolean isDownloaded(String courseId, String lectureId, String type, String title) {
                    return NativeDownloadManager.isDownloaded(MainActivity.this, type, title, courseId, lectureId);
                }

                @JavascriptInterface
                public String getLocalVideoPath(String courseId, String lectureId, String type, String title) {
                    return NativeDownloadManager.getLocalFilePath(MainActivity.this, type, title, courseId, lectureId);
                }

                @JavascriptInterface
                public String getOfflineDownloadsList() {
                    return NativeDownloadManager.getOfflineDownloadsList(MainActivity.this);
                }

                @JavascriptInterface
                public void openPdfNative(String pdfUrl, String title) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        Uri uri;

                        if (pdfUrl.startsWith("http://localhost/_capacitor_file_")) {
                            String cleanPath = pdfUrl.replace("http://localhost/_capacitor_file_", "");
                            File file = new File(cleanPath);
                            
                            uri = androidx.core.content.FileProvider.getUriForFile(
                                MainActivity.this,
                                getApplicationContext().getPackageName() + ".fileprovider",
                                file
                            );
                            
                            intent.setDataAndType(uri, "application/pdf");
                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } else if (pdfUrl.startsWith("file://") || pdfUrl.startsWith("/")) {
                            String cleanPath = pdfUrl.startsWith("file://") ? pdfUrl.substring(7) : pdfUrl;
                            File file = new File(cleanPath);
                            
                            uri = androidx.core.content.FileProvider.getUriForFile(
                                MainActivity.this,
                                getApplicationContext().getPackageName() + ".fileprovider",
                                file
                            );
                            
                            intent.setDataAndType(uri, "application/pdf");
                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        } else {
                            uri = Uri.parse(pdfUrl);
                            intent.setDataAndType(uri, "application/pdf");
                        }
                        
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        
                        try {
                            startActivity(intent);
                        } catch (android.content.ActivityNotFoundException e) {
                            runOnUiThread(() -> {
                                android.widget.Toast.makeText(MainActivity.this, "No PDF Viewer found on device. Please install a PDF reader.", android.widget.Toast.LENGTH_LONG).show();
                            });
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                @JavascriptInterface
                public String readAbsoluteFileAsBase64(String filePath) {
                    try {
                        String cleanPath = filePath;
                        if (cleanPath.startsWith("http://localhost/_capacitor_file_")) {
                            cleanPath = cleanPath.replace("http://localhost/_capacitor_file_", "");
                        } else if (cleanPath.startsWith("file://")) {
                            cleanPath = cleanPath.substring(7);
                        }
                        File file = new File(cleanPath);
                        if (file.exists()) {
                            java.io.FileInputStream fis = new java.io.FileInputStream(file);
                            byte[] bytes = new byte[(int) file.length()];
                            fis.read(bytes);
                            fis.close();
                            return android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return null;
                }

                @JavascriptInterface
                public String getPendingRoute() {
                    String route = pendingRoute;
                    pendingRoute = null; // Clear it after reading
                    return route;
                }

                @JavascriptInterface
                public String getDeviceId() {
                    return android.provider.Settings.Secure.getString(getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
                }

                @JavascriptInterface
                public void openInBrowser(String url) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }, "Android");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && "/downloads".equals(intent.getStringExtra("navigate_to"))) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript("window.location.hash = '#/downloads';", null);
            }
        }
    }
}
