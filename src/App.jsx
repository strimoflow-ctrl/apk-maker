import React, { useState, useEffect, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { fetchBackendAPI, fetchWithCache, getBackendUrl } from './utils/api';
import { ShieldAlert } from 'lucide-react';
import { DownloadProvider } from './context/DownloadContext';
import { AlertProvider } from './context/AlertContext';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import LockScreen from './components/LockScreen';
import BackButtonHandler from './components/BackButtonHandler';
import BottomNavBar from './components/BottomNavBar';
import ScreenLoader from './components/ScreenLoader';

// Instantly Loaded Screens
import HomeScreen from './screens/HomeScreen';

// Lazy Loaded Screens
const RecentActivityScreen = React.lazy(() => import('./screens/RecentActivityScreen'));
const DownloadScreen = React.lazy(() => import('./screens/DownloadScreen'));
const NewsScreen = React.lazy(() => import('./screens/NewsScreen'));
const TeachersLibraryScreen = React.lazy(() => import('./screens/TeachersLibraryScreen'));
const CourseDetailScreen = React.lazy(() => import('./screens/CourseDetailScreen'));
const CoachingListScreen = React.lazy(() => import('./screens/CoachingListScreen'));
const CoachingDetailScreen = React.lazy(() => import('./screens/CoachingDetailScreen'));
const PdfViewerScreen = React.lazy(() => import('./screens/PdfViewerScreen'));
const AccountScreen = React.lazy(() => import('./screens/AccountScreen'));
const AboutScreen = React.lazy(() => import('./screens/AboutScreen'));
const CrashCourseListScreen = React.lazy(() => import('./screens/CrashCourseListScreen'));
const CrashCourseDetailScreen = React.lazy(() => import('./screens/CrashCourseDetailScreen'));
const PdfZoneScreen = React.lazy(() => import('./screens/PdfZoneScreen'));
const PdfDetailScreen = React.lazy(() => import('./screens/PdfDetailScreen'));
const TestZoneScreen = React.lazy(() => import('./screens/TestZoneScreen'));
const TestZoneDetailScreen = React.lazy(() => import('./screens/TestZoneDetailScreen'));
const BookLibraryScreen = React.lazy(() => import('./screens/BookLibraryScreen'));
const HtmlViewerScreen = React.lazy(() => import('./screens/HtmlViewerScreen'));
const FeedbackScreen = React.lazy(() => import('./screens/FeedbackScreen'));
const NainoAiScreen = React.lazy(() => import('./screens/NainoAiScreen'));
const LibraryScreen = React.lazy(() => import('./screens/LibraryScreen'));
const MyProgressScreen = React.lazy(() => import('./screens/MyProgressScreen'));
const MoreScreen = React.lazy(() => import('./screens/MoreScreen'));
const MentorshipListScreen = React.lazy(() => import('./screens/MentorshipListScreen'));
const MentorDetailScreen = React.lazy(() => import('./screens/MentorDetailScreen'));
const NainoStoreScreen = React.lazy(() => import('./screens/NainoStoreScreen'));
const NotificationListScreen = React.lazy(() => import('./screens/NotificationListScreen'));
const CommunityScreen = React.lazy(() => import('./screens/CommunityScreen'));
import { requestNotificationPermission, listenForForegroundMessages } from './utils/notifications';
import { APP_VERSION_CODE } from './config/version';
import AppUpdateModal from './components/AppUpdateModal';
import PromoPopupModal from './components/PromoPopupModal';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

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
  '/notifications',
  '/community',
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
          <Suspense fallback={<ScreenLoader />}>
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/notifications" element={<NotificationListScreen />} />
              <Route path="/community" element={<CommunityScreen />} />
              <Route path="/recent" element={<RecentActivityScreen />} />
              <Route path="/downloads" element={<DownloadScreen />} />
              <Route path="/news" element={<NewsScreen />} />
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
          </Suspense>
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
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [promoData, setPromoData] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);

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
      // Dispatch event to fetch latest notifications from backend
      window.dispatchEvent(new Event('fetchNewNotifications'));

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

              if (lastStatus && lastStatus !== currentStatus && currentStatus !== 'pending') {
                // Fetch latest notifications to show the approval/rejection notification
                window.dispatchEvent(new Event('fetchNewNotifications'));

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
        // CRITICAL FIX: Close the event source on error to prevent Capacitor infinite retry loops 
        // that freeze the entire application JS thread on 404s/401s.
        if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
          eventSource.close();
          // Optional: Reconnect manually after 10 seconds to avoid spamming the bridge
          setTimeout(() => {
            if (isUnlocked) {
               window.dispatchEvent(new Event('reconnectSSE'));
            }
          }, 10000);
        }
      };
    }

    const handleReconnect = () => {
      // Re-trigger the effect by pretending visibility changed, or just let interval handle it
    };
    window.addEventListener('reconnectSSE', handleReconnect);

    return () => {
      unsubscribe();
      window.removeEventListener('reconnectSSE', handleReconnect);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Global Online Students Tracker (SSE)
  useEffect(() => {
    let onlineTrackerSource = null;
    
    if (isUnlocked) {
      const token = localStorage.getItem('naino_access_token');
      const username = localStorage.getItem('naino_user_name') || 'Student';
      const avatar = localStorage.getItem('naino_user_avatar') || '👨‍🎓';
      const backendUrl = getBackendUrl();
      
      if (token && token !== 'XXXXXX') {
        const query = new URLSearchParams({
          code: token,
          name: username,
          avatar: avatar
        }).toString();
        
        onlineTrackerSource = new EventSource(`${backendUrl}/api/online/listen?${query}`);
        
        onlineTrackerSource.onerror = (error) => {
          console.error("Online Tracker SSE connection error", error);
          if (onlineTrackerSource.readyState === EventSource.CLOSED || onlineTrackerSource.readyState === EventSource.CONNECTING) {
            onlineTrackerSource.close();
          }
        };
      }
    }
    
    return () => {
      if (onlineTrackerSource) {
        onlineTrackerSource.close();
      }
    };
  }, [isUnlocked]);


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
              error.message.includes('device');

            if (isInvalidOrMismatch) {
              console.warn("Access Key has been revoked, deleted or used on another device. Logging out.");
              if (error.message.includes('device') || error.message.includes('in use') || error.message.includes('bound') || error.message.includes('Mismatch')) {
                setShowLogoutAlert(true);
              }
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
    
    const checkAppUpdates = async () => {
      try {
        // Only show APK updates if running natively on an Android/iOS device, not Web
        if (!Capacitor.isNativePlatform()) return;

        const updateRes = await fetchWithCache('/api/config/app_update.json', 'cache_app_update', 5 * 60 * 1000);
        if (updateRes && updateRes.latestVersionCode > APP_VERSION_CODE) {
          const ignoredVersion = localStorage.getItem('naino_ignored_update_version');
          
          // Never skip if it's a forced update
          if (ignoredVersion === String(updateRes.latestVersionCode) && !updateRes.forceUpdate) {
            return; 
          }
          setUpdateData(updateRes);
          setShowUpdateModal(true);
        }
      } catch (err) {
        console.warn("Failed to check for app updates:", err);
      }
    };

    const checkPromoPopup = async () => {
      try {
        const docRef = doc(db, 'app_settings', 'promo_popup');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.isActive) {
            const updatedAtStr = data.updatedAt ? data.updatedAt.toDate().getTime().toString() : '0';
            const lastSeen = localStorage.getItem('naino_last_promo_seen');
            if (updatedAtStr !== lastSeen) {
              setPromoData(data);
              setShowPromoModal(true);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to check promo popup:", err);
      }
    };

    loadDynamicConfig();
    checkAppUpdates();
    
    // Slight delay so popup doesn't clash with update modal immediately
    setTimeout(() => {
      checkPromoPopup();
    }, 1500);
  }, []);

  const handleClosePromo = (dontShowAgain) => {
    setShowPromoModal(false);
    if (dontShowAgain) {
      if (promoData && promoData.updatedAt) {
        localStorage.setItem('naino_last_promo_seen', promoData.updatedAt.toDate().getTime().toString());
      } else {
        localStorage.setItem('naino_last_promo_seen', Date.now().toString());
      }
    }
  };

  const handleCloseUpdate = (dontShowAgain) => {
    setShowUpdateModal(false);
    if (dontShowAgain && updateData) {
      localStorage.setItem('naino_ignored_update_version', String(updateData.latestVersionCode));
    }
  };

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
    return (
      <>
        <LockScreen onUnlock={handleUnlock} />
        {showLogoutAlert && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
            <div className="bg-[#111] border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(255,0,0,0.15)] animate-apple-slide-up flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="text-red-500 w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-white font-oswald uppercase tracking-widest mb-2">
                Security Alert
              </h3>
              <p className="text-sm text-gray-400 mb-6 px-2 leading-relaxed">
                Your account has been logged in from another device. You have been automatically logged out from this device to secure your session.
              </p>
              <button
                onClick={() => setShowLogoutAlert(false)}
                className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-[0_0_20px_rgba(255,0,0,0.2)] active:scale-95"
              >
                Understand
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <AlertProvider>
      <DownloadProvider>
        <Router>
          {showUpdateModal && (
            <AppUpdateModal 
              updateData={updateData} 
              onClose={handleCloseUpdate} 
            />
          )}
          {!showUpdateModal && showPromoModal && (
            <PromoPopupModal 
              promoData={promoData} 
              onClose={handleClosePromo} 
            />
          )}
          <AppShell />
        </Router>
      </DownloadProvider>
    </AlertProvider>
  );
};

export default App;