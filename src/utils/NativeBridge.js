/**
 * NativeBridge.js
 * 
 * This file acts as a bridge between the React Web App and the Android Kotlin Native App.
 * When running inside the Android WebView, `window.Android` is injected by Kotlin.
 * When testing on a PC/Chrome (localhost), `window.Android` is undefined, so this 
 * bridge provides mock implementations to prevent crashes and allow UI testing.
 */

class NativeBridge {
    static isNative() {
        return typeof window !== 'undefined' && window.Android !== undefined;
    }

    //---------------------------------------------------------
    // Existing Bridge Methods (Auth / User)
    //---------------------------------------------------------

    static getToken() {
        if (this.isNative() && window.Android.getToken) return window.Android.getToken();
        console.log("[NativeBridge] getToken() mocked");
        return localStorage.getItem('token') || "";
    }

    static getUsername() {
        if (this.isNative() && window.Android.getUsername) return window.Android.getUsername();
        console.log("[NativeBridge] getUsername() mocked");
        return localStorage.getItem('username') || "TestUser";
    }

    static isPremium() {
        if (this.isNative() && window.Android.isPremium) return window.Android.isPremium();
        console.log("[NativeBridge] isPremium() mocked");
        return localStorage.getItem('isPremium') === 'true';
    }

    static getAvatar() {
        if (this.isNative() && window.Android.getAvatar) return window.Android.getAvatar();
        console.log("[NativeBridge] getAvatar() mocked");
        return localStorage.getItem('avatar') || "";
    }

    static getDeviceId() {
        if (this.isNative() && window.Android.getDeviceId) return window.Android.getDeviceId();
        console.log("[NativeBridge] getDeviceId() mocked");
        return "mock-device-id-12345";
    }

    static logout() {
        if (this.isNative() && window.Android.logout) {
            window.Android.logout();
        } else {
            console.log("[NativeBridge] logout() triggered");
            localStorage.clear();
            window.location.reload();
        }
    }

    //---------------------------------------------------------
    // Downloads & Offline Features (Phase 1 Stubs)
    //---------------------------------------------------------

    /**
     * Start downloading a video in the background natively.
     */
    static startDownload(videoUrl, title, courseId, lectureId, type = "video") {
        if (this.isNative() && window.Android.startDownload) {
            window.Android.startDownload(String(videoUrl), String(title), String(courseId), String(lectureId), String(type));
        } else {
            console.log(`[NativeBridge] MOCK startDownload: ${title} (${lectureId}) from ${courseId}`);
            alert(`[PC Testing] Download started for: ${title}`);
        }
    }

    static pauseDownload(type, courseId, lectureId) {
        if (this.isNative() && window.Android.pauseDownload) {
            window.Android.pauseDownload(String(type), String(courseId), String(lectureId));
        } else {
            console.log(`[NativeBridge] MOCK pauseDownload: ${type}-${courseId}-${lectureId}`);
        }
    }

    static cancelDownload(type, courseId, lectureId) {
        if (this.isNative() && window.Android.cancelDownload) {
            window.Android.cancelDownload(String(type), String(courseId), String(lectureId));
        } else {
            console.log(`[NativeBridge] MOCK cancelDownload: ${type}-${courseId}-${lectureId}`);
        }
    }

    static deleteOfflineFile(type, courseId, lectureId) {
        if (this.isNative() && window.Android.deleteOfflineFile) {
            return window.Android.deleteOfflineFile(String(type), String(courseId), String(lectureId));
        } else {
            console.log(`[NativeBridge] MOCK deleteOfflineFile: ${type}-${courseId}-${lectureId}`);
            return false;
        }
    }

    static playOfflineVideo(filePath, title) {
        if (this.isNative() && window.Android.playOfflineVideo) {
            window.Android.playOfflineVideo(filePath, title);
        } else {
            console.log(`[NativeBridge] MOCK playOfflineVideo: ${title} at ${filePath}`);
            alert(`[PC Testing] Would play offline video: ${title}`);
        }
    }

    /**
     * Check if a video is already downloaded.
     * Returns a boolean.
     */
    static isDownloaded(courseId, lectureId, type = "video", title = "") {
        if (this.isNative() && window.Android.isDownloaded) {
            return window.Android.isDownloaded(String(courseId), String(lectureId), String(type), String(title));
        } else {
            console.log(`[NativeBridge] MOCK isDownloaded check for ${courseId}-${lectureId}`);
            return false; // Always return false for PC testing, or mock it if needed.
        }
    }

    /**
     * Get the local path/URI of the downloaded file.
     * Returns a string (URL/Path).
     */
    static getLocalVideoPath(courseId, lectureId, type = "video", title = "") {
        if (this.isNative() && window.Android.getLocalVideoPath) {
            return window.Android.getLocalVideoPath(String(courseId), String(lectureId), String(type), String(title));
        } else {
            console.log(`[NativeBridge] MOCK getLocalVideoPath for ${courseId}-${lectureId}`);
            return null;
        }
    }

    static getOfflineDownloadsList() {
        if (this.isNative() && window.Android.getOfflineDownloadsList) {
            try {
                const json = window.Android.getOfflineDownloadsList();
                return json ? JSON.parse(json) : [];
            } catch (e) {
                console.error("Failed to parse native downloads list", e);
                return [];
            }
        }
        return [];
    }

    /**
     * Open PDF using Native Android renderer instead of react-pdf (Phase 5 plan)
     */
    static openPdfNative(pdfUrl, title) {
        if (this.isNative() && window.Android.openPdfNative) {
            window.Android.openPdfNative(pdfUrl, title);
        } else {
            console.log(`[NativeBridge] MOCK openPdfNative: ${title} - ${pdfUrl}`);
            window.open(pdfUrl, '_blank');
        }
    }

    /**
     * Read an absolute local file path natively as a base64 string on Capacitor.
     */
    static readAbsoluteFileAsBase64(filePath) {
        if (this.isNative() && window.Android.readAbsoluteFileAsBase64) {
            return window.Android.readAbsoluteFileAsBase64(filePath);
        }
        return null;
    }

    /**
     * Open a URL in the system browser natively using an Intent.
     */
    static openInBrowser(url) {
        if (this.isNative() && window.Android.openInBrowser) {
            window.Android.openInBrowser(String(url));
        } else {
            console.log(`[NativeBridge] MOCK openInBrowser: ${url}`);
            window.open(url, '_blank');
        }
    }
}

export default NativeBridge;
