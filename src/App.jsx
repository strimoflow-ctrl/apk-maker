import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { fetchBackendAPI, fetchWithCache, getBackendUrl } from './utils/api';
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

  // Dynamic config values in state
  const [checkInterval, setCheckInterval] = useState(() => {
    try {
      const cached = localStorage.getItem('naino_global_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.checkIntervalMinutes) return parsed.checkIntervalMinutes * 60 * 1000;
      }
    } catch (e) {}
    return 7 * 60 * 1000; // default 7 minutes
  });

  const [maintenance, setMaintenance] = useState(() => {
    try {
      const cached = localStorage.getItem('naino_global_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.maintenanceMode === true;
      }
    } catch (e) {}
    return false;
  });

  const [maintenanceMsg, setMaintenanceMsg] = useState(() => {
    try {
      const cached = localStorage.getItem('naino_global_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.maintenanceMessage) return parsed.maintenanceMessage;
      }
    } catch (e) {}
    return "Naino Academy server updates are in progress. Please check back in a few minutes.";
  });

  // Sync config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      try {
        const cached = localStorage.getItem('naino_global_config');
        if (cached) {
          const parsed = JSON.parse(cached);
          setMaintenance(parsed.maintenanceMode === true);
          if (parsed.maintenanceMessage) {
            setMaintenanceMsg(parsed.maintenanceMessage);
          }
          if (parsed.checkIntervalMinutes) {
            setCheckInterval(parsed.checkIntervalMinutes * 60 * 1000);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('globalConfigUpdated', handleConfigUpdate);
    return () => window.removeEventListener('globalConfigUpdated', handleConfigUpdate);
  }, []);

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
      const backendUrl = getBackendUrl();
      eventSource = new EventSource(`${backendUrl}/api/keys/listen?code=${token}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'update' && payload.data) {
            // Sync premium status dynamically
            const serverIsPremium = payload.data.isPremium || false;
            const localIsPremium = localStorage.getItem('naino_premium_member') === 'true';
            if (serverIsPremium !== localIsPremium) {
              localStorage.setItem('naino_premium_member', String(serverIsPremium));
              window.dispatchEvent(new Event('premiumStatusChanged'));
            }

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

            const data = response.data;

            // Sync premium status dynamically
            const serverIsPremium = data.isPremium || false;
            const localIsPremium = localStorage.getItem('naino_premium_member') === 'true';
            if (serverIsPremium !== localIsPremium) {
              localStorage.setItem('naino_premium_member', String(serverIsPremium));
              window.dispatchEvent(new Event('premiumStatusChanged'));
            }

            const now = new Date();
            const todayStr = now.toDateString();
            const localLastActiveDay = localStorage.getItem('naino_local_last_active_day');

            // Only update if they haven't been active today locally and on server
            if (localLastActiveDay !== todayStr) {
              const lastActiveDate = data.lastActiveAt ? new Date(data.lastActiveAt) : new Date(0);
              if (lastActiveDate.toDateString() !== todayStr) {
                fetchBackendAPI('/api/keys/update', 'POST', {
                  code: token,
                  deviceId: data.deviceId || localStorage.getItem('naino_device_uuid'),
                  updates: { lastActiveAt: now.toISOString() }
                })
                  .then(() => {
                    localStorage.setItem('naino_local_last_active_day', todayStr);
                  })
                  .catch(err => console.error("Failed to track active user:", err));
              } else {
                localStorage.setItem('naino_local_last_active_day', todayStr);
              }
            }
          } catch (error) {
            console.error("Failed to verify access key:", error);
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

    // Verify periodically based on dynamic checkInterval state
    const interval = setInterval(verifyAccessKey, checkInterval);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [isUnlocked, checkInterval]);

  // Fetch dynamic links on mount
  useEffect(() => {
    const loadDynamicLinks = async () => {
      try {
        const links = await fetchWithCache('/api/links.json', 'cache_dynamic_links', 5 * 60 * 1000); // 5 mins cache
        if (links) {
          localStorage.setItem('naino_dynamic_links', JSON.stringify(links));
          window.dispatchEvent(new Event('dynamicLinksUpdated'));
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic links on startup:", err);
      }
    };
    loadDynamicLinks();
  }, []);

  // Fetch dynamic global config on mount
  useEffect(() => {
    const loadDynamicConfig = async () => {
      try {
        const config = await fetchWithCache('/api/config.json', 'cache_global_config', 5 * 60 * 1000); // 5 mins cache
        if (config) {
          localStorage.setItem('naino_global_config', JSON.stringify(config));
          window.dispatchEvent(new Event('globalConfigUpdated'));
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic config on startup:", err);
      }
    };
    loadDynamicConfig();
  }, []);

  const handleUnlock = (userData) => {
    localStorage.setItem('naino_access_token', userData.code);
    localStorage.setItem('naino_user_name', userData.username);
    localStorage.setItem('naino_premium_member', String(userData.isPremium));
    if (userData.avatarUrl) {
      localStorage.setItem('naino_user_avatar', userData.avatarUrl);
    }
    setIsUnlocked(true);
  };

  if (maintenance) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        {/* Golden Grid Background Overlay */}
        <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center opacity-20">
          <div className="absolute inset-0 bg-golden-grid"></div>
        </div>
        <div className="relative z-10 max-w-md w-full bg-[#111] border border-[#FFD700]/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(255,215,0,0.15)] flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700]/20 to-black rounded-full flex items-center justify-center mb-6 border border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <span className="text-4xl animate-pulse">🛠️</span>
          </div>
          <h2 className="text-3xl font-black text-white font-oswald uppercase tracking-widest mb-4 drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">
            Under Maintenance
          </h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed mb-6 font-inter">
            {maintenanceMsg}
          </p>
          <div className="w-full h-[1px] bg-white/10 mb-6" />
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-mono">
            Thank you for your patience
          </p>
        </div>
      </div>
    );
  }

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