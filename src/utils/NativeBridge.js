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
        if (this.isNative()) return window.Android.getToken();
        console.log("[NativeBridge] getToken() mocked");
        return localStorage.getItem('token') || "";
    }

    static getUsername() {
        if (this.isNative()) return window.Android.getUsername();
        console.log("[NativeBridge] getUsername() mocked");
        return localStorage.getItem('username') || "TestUser";
    }

    static isPremium() {
        if (this.isNative()) return window.Android.isPremium();
        console.log("[NativeBridge] isPremium() mocked");
        return localStorage.getItem('isPremium') === 'true';
    }

    static getAvatar() {
        if (this.isNative()) return window.Android.getAvatar();
        console.log("[NativeBridge] getAvatar() mocked");
        return localStorage.getItem('avatar') || "";
    }

    static getDeviceId() {
        if (this.isNative()) return window.Android.getDeviceId();
        console.log("[NativeBridge] getDeviceId() mocked");
        return "mock-device-id-12345";
    }

    static logout() {
        if (this.isNative()) {
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
    static startDownload(videoUrl, title, courseId, lectureId) {
        if (this.isNative() && window.Android.startDownload) {
            window.Android.startDownload(videoUrl, title, courseId, lectureId);
        } else {
            console.log(`[NativeBridge] MOCK startDownload: ${title} (${lectureId}) from ${courseId}`);
            alert(`[PC Testing] Download started for: ${title}`);
        }
    }

    /**
     * Check if a video is already downloaded.
     * Returns a boolean.
     */
    static isDownloaded(courseId, lectureId) {
        if (this.isNative() && window.Android.isDownloaded) {
            return window.Android.isDownloaded(courseId, lectureId);
        } else {
            console.log(`[NativeBridge] MOCK isDownloaded check for ${courseId}-${lectureId}`);
            return false; // Always return false for PC testing, or mock it if needed.
        }
    }

    /**
     * Get the local path/URI of the downloaded video.
     * Returns a string (URL) that the HTML <video> tag can play.
     */
    static getLocalVideoPath(courseId, lectureId) {
        if (this.isNative() && window.Android.getLocalVideoPath) {
            return window.Android.getLocalVideoPath(courseId, lectureId);
        } else {
            console.log(`[NativeBridge] MOCK getLocalVideoPath for ${courseId}-${lectureId}`);
            return null;
        }
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
}

export default NativeBridge;
