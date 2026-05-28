import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { fetchBackendAPI } from './utils/api';
import { DownloadProvider } from './context/DownloadContext';
import { AlertProvider } from './context/AlertContext';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import LockScreen from './components/LockScreen';
import BackButtonHandler from './components/BackButtonHandler';
import BottomNavBar from './components/BottomNavBar';

// Screens
import HomeScreen from './screens/HomeScreen';
import RecentActivityScreen from './screens/RecentActivityScreen';
import DownloadScreen from './screens/DownloadScreen';
import TeachersLibraryScreen from './screens/TeachersLibraryScreen';
import CourseDetailScreen from './screens/CourseDetailScreen';
import CoachingListScreen from './screens/CoachingListScreen';
import CoachingDetailScreen from './screens/CoachingDetailScreen';
import PdfViewerScreen from './screens/PdfViewerScreen';
import AccountScreen from './screens/AccountScreen';
import AboutScreen from './screens/AboutScreen';
import CrashCourseListScreen from './screens/CrashCourseListScreen';
import CrashCourseDetailScreen from './screens/CrashCourseDetailScreen';
import PdfZoneScreen from './screens/PdfZoneScreen';
import PdfDetailScreen from './screens/PdfDetailScreen';
import TestZoneScreen from './screens/TestZoneScreen';
import TestZoneDetailScreen from './screens/TestZoneDetailScreen';
import BookLibraryScreen from './screens/BookLibraryScreen';
import HtmlViewerScreen from './screens/HtmlViewerScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import NainoAiScreen from './screens/NainoAiScreen';
import LibraryScreen from './screens/LibraryScreen';
import MyProgressScreen from './screens/MyProgressScreen';
import MoreScreen from './screens/MoreScreen';
import MentorshipListScreen from './screens/MentorshipListScreen';
import MentorDetailScreen from './screens/MentorDetailScreen';
import NainoStoreScreen from './screens/NainoStoreScreen';
import { requestNotificationPermission, listenForForegroundMessages } from './utils/notifications';

// ─── Root Section Paths ────────────────────────────────────────────────────────
// Jab user Home se kisi ROOT section me jaata hai, usse REPLACE use karo (push nahi).
// Isse wo section wapas back press karne par skip nahi hoga but Home ka trace clear hoga.
// Deep links (course/:id, coaching/:id etc.) normal push use karte hain.
const ROOT_SECTIONS = [
  '/teachers-library',
  '/coaching',
  '/crash',
  '/pdf-zone',
  '/test-zone',
  '/book-library',
  '/naino-ai',
  '/account',
  '/about',
  '/feedback',
  '/recent',
  '/downloads',
  '/mentorship',
  '/store',
];

/**
 * NavigationController
 * 
 * Home screen ke navigation buttons "root section" pe jaate waqt
 * replace use karte hain. Yahan kuch nahi render hota — sirf ek
 * global navigate wrapper provide kiya ja sakta tha, lekin HomeScreen
 * already useNavigate use kar rahi hai. Isliye hum sirf BackButtonHandler
 * aur ScrollToTop yahan mount karte hain.
 */
const AppShell = () => {
  const location = useLocation();
  const mainPaths = ['/', '/library', '/progress', '/doubt-zone', '/more'];
  const showGlobalHeader = !mainPaths.includes(location.pathname);

  return (
    <>
      <ScrollToTop />
      <BackButtonHandler />
      <div className="min-h-screen bg-[var(--color-apple-bg)] flex flex-col">
        {showGlobalHeader && <Header />}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/recent" element={<RecentActivityScreen />} />
            <Route path="/downloads" element={<DownloadScreen />} />
            <Route path="/teachers-library" element={<TeachersLibraryScreen />} />
            <Route path="/course/:courseId" element={<CourseDetailScreen />} />
            <Route path="/coaching" element={<CoachingListScreen />} />
            <Route path="/coaching/:coachingId" element={<CoachingDetailScreen />} />
            <Route path="/pdf" element={<PdfViewerScreen />} />
            <Route path="/account" element={<AccountScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/crash" element={<CrashCourseListScreen />} />
            <Route path="/crash/:courseId" element={<CrashCourseDetailScreen />} />
            <Route path="/pdf-zone" element={<PdfZoneScreen />} />
            <Route path="/pdf-zone/:id" element={<PdfDetailScreen />} />
            <Route path="/test-zone" element={<TestZoneScreen />} />
            <Route path="/test-zone/:id" element={<TestZoneDetailScreen />} />
            <Route path="/book-library" element={<BookLibraryScreen />} />
            <Route path="/html-viewer" element={<HtmlViewerScreen />} />
            <Route path="/feedback" element={<FeedbackScreen />} />
            <Route path="/naino-ai" element={<NainoAiScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/progress" element={<MyProgressScreen />} />
            <Route path="/doubt-zone" element={<NainoAiScreen />} />
            <Route path="/more" element={<MoreScreen />} />
            <Route path="/mentorship" element={<MentorshipListScreen />} />
            <Route path="/mentorship/:id" element={<MentorDetailScreen />} />
            <Route path="/store" element={<NainoStoreScreen />} />
          </Routes>
        </div>
        <BottomNavBar />
      </div>
    </>
  );
};

const App = () => {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return !!localStorage.getItem('naino_access_token');
  });

  // PWA & Notification Setup
  useEffect(() => {
    // Request notification permission and listen for foreground messages
    requestNotificationPermission();
    const unsubscribe = listenForForegroundMessages((payload) => {
      // Create a nice golden toast for foreground notifications
      const title = payload.notification?.title || 'New Notification';
      const body = payload.notification?.body || '';

      const toast = document.createElement('div');
      toast.className = 'fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#111]/90 backdrop-blur-xl border border-[#FFD700]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(255,215,0,0.2)] z-[9999] animate-slide-up flex flex-col cursor-pointer border-l-4 border-l-[#FFD700]';
      toast.innerHTML = `
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-full bg-[#FFD700]/10 flex items-center justify-center shrink-0">
            <span style="font-size: 16px;">🔔</span>
          </div>
          <h4 class="font-oswald font-bold text-[#FFD700] text-lg tracking-wide truncate">${title}</h4>
        </div>
        <p class="text-sm text-gray-300 leading-relaxed ml-11 line-clamp-2">${body}</p>
      `;

      toast.onclick = () => {
        toast.remove();
      };

      document.body.appendChild(toast);

      setTimeout(() => {
        if (document.body.contains(toast)) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-20px)';
          toast.style.transition = 'all 0.5s ease';
          setTimeout(() => toast.remove(), 500);
        }
      }, 5000);
    });

    // Global listener for pending request approvals/rejections via SSE
    const token = localStorage.getItem('naino_access_token');
    let eventSource = null;

    if (token && token !== 'XXXXXX') {
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://naino-app-backend-production.up.railway.app';
      eventSource = new EventSource(`${backendUrl}/api/keys/listen?code=${token}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'update' && payload.data) {
            const pending = payload.data.pendingRequest;
            if (pending) {
              const lastStatus = sessionStorage.getItem('naino_last_pending_status');
              const currentStatus = pending.status?.trim().toLowerCase();

              if (lastStatus === 'pending' && currentStatus !== 'pending') {
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#111]/90 backdrop-blur-xl border border-[#FFD700]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(255,215,0,0.2)] z-[9999] animate-slide-up flex flex-col cursor-pointer border-l-4 border-l-[#FFD700]';

                const title = currentStatus === 'approved' ? 'Payment Approved! 🎉' : 'Payment Rejected ❌';
                const body = currentStatus === 'approved'
                  ? 'Welcome to Premium! Your account is now active and features are unlocked.'
                  : 'Your screenshot was rejected by admin. Please upload a valid payment proof.';

                toast.innerHTML = `
                  <div class="flex items-center gap-3 mb-1">
                    <div class="w-8 h-8 rounded-full bg-[#FFD700]/10 flex items-center justify-center shrink-0">
                      <span style="font-size: 16px;">${currentStatus === 'approved' ? '✨' : '⚠️'}</span>
                    </div>
                    <h4 class="font-oswald font-bold text-[#FFD700] text-lg tracking-wide truncate">${title}</h4>
                  </div>
                  <p class="text-sm text-gray-300 leading-relaxed ml-11 line-clamp-2">${body}</p>
                `;

                toast.onclick = () => toast.remove();
                document.body.appendChild(toast);
                setTimeout(() => { if (document.body.contains(toast)) toast.remove(); }, 6000);

                if (currentStatus === 'approved') {
                  localStorage.setItem('naino_premium_member', 'true');
                  window.dispatchEvent(new Event('premiumStatusChanged'));
                }
              }
              sessionStorage.setItem('naino_last_pending_status', currentStatus);
            }
          } else if (payload.type === 'deleted') {
            console.warn("Access Key has been revoked or deleted. Logging out.");
            localStorage.removeItem('naino_access_token');
            localStorage.removeItem('naino_user_name');
            localStorage.removeItem('naino_user_avatar');
            localStorage.removeItem('naino_premium_member');
            sessionStorage.clear();
            setIsUnlocked(false);
          }
        } catch (e) {
          console.error("SSE parsing error", e);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error", error);
        // Will auto-reconnect typically
      };
    }

    return () => {
      unsubscribe();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Startup, Periodic & Visibility Verification
  useEffect(() => {
    const verifyAccessKey = async () => {
      if (isUnlocked) {
        const token = localStorage.getItem('naino_access_token');
        if (token) {
          try {
            const response = await fetchBackendAPI('/api/keys/verify', 'POST', {
              code: token,
              deviceId: localStorage.getItem('naino_device_uuid')
            });

            // Valid key, track daily active user
            const data = response.data;
            const now = new Date();
            const lastActiveDate = data.lastActiveAt ? new Date(data.lastActiveAt) : new Date(0);

            // Only update if they haven't been active today
            if (lastActiveDate.toDateString() !== now.toDateString()) {
              fetchBackendAPI('/api/keys/update', 'POST', {
                code: token,
                deviceId: data.deviceId || localStorage.getItem('naino_device_uuid'),
                updates: { lastActiveAt: now.toISOString() }
              }).catch(err => console.error("Failed to track active user:", err));
            }
          } catch (error) {
            console.error("Failed to verify access key:", error);
            // If API explicitly rejects it (mismatch, revoked, or invalid)
            const isInvalidOrMismatch = 
              error.message.includes('Invalid') || 
              error.message.includes('Access Denied') || 
              error.message.includes('bound') || 
              error.message.includes('in use') || 
              error.message.includes('device') ||
              error.status === 403 || 
              error.status === 404;

            if (isInvalidOrMismatch) {
              console.warn("Access Key has been revoked, deleted or used on another device. Logging out.");
              localStorage.removeItem('naino_access_token');
              localStorage.removeItem('naino_user_name');
              localStorage.removeItem('naino_user_avatar');
              localStorage.removeItem('naino_premium_member');
              sessionStorage.clear();
              setIsUnlocked(false);
            }
          }
        }
      }
    };

    verifyAccessKey();

    // Verify when returning to the app from background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyAccessKey();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Verify periodically every 60 seconds
    const interval = setInterval(verifyAccessKey, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [isUnlocked]);

  const handleUnlock = (userData) => {
    localStorage.setItem('naino_access_token', userData.code);
    localStorage.setItem('naino_user_name', userData.username);
    localStorage.setItem('naino_premium_member', String(userData.isPremium));
    if (userData.avatarUrl) {
      localStorage.setItem('naino_user_avatar', userData.avatarUrl);
    }
    setIsUnlocked(true);
  };

  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <AlertProvider>
      <DownloadProvider>
        <Router>
          <AppShell />
        </Router>
      </DownloadProvider>
    </AlertProvider>
  );
};

export default App;