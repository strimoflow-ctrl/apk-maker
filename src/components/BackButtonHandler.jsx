import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * BackButtonHandler
 *
 * Native Android and Web back button handler.
 * - Home pe ho → Exit Confirmation popup dikhao aur back history lock karo
 * - Kisi aur screen pe ho → Direct Home screen pe redirect karo
 */
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitModal, setShowExitModal] = useState(false);

  const locationRef = useRef(location);
  const showExitModalRef = useRef(showExitModal);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location;
    lastPathRef.current = location.pathname;
  }, [location]);

  useEffect(() => {
    showExitModalRef.current = showExitModal;
  }, [showExitModal]);

  // Lock the Home screen history state on mount or path change to Home (active on all platforms)
  useEffect(() => {
    if (location.pathname === '/') {
      if (!window.history.state || !window.history.state.locked) {
        window.history.pushState({ locked: true }, '', window.location.href);
      }
    }
  }, [location.pathname]);

  // 1. Native Capacitor Back Button Interception
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backHandler = CapacitorApp.addListener('backButton', () => {
      const currentPath = locationRef.current.pathname;
      const isHome = currentPath === '/';

      if (showExitModalRef.current) {
        // If exit confirmation is already open, pressing back closes it
        setShowExitModal(false);
        return;
      }

      if (isHome) {
        // On Home screen, show exit confirmation dialog
        setShowExitModal(true);
      } else {
        const isDetailScreen = currentPath.startsWith('/course/') || currentPath.startsWith('/coaching/') || currentPath.startsWith('/crash/');
        if (isDetailScreen) {
          // On detail screens, direct back goes to Home screen (and replaces history)
          navigate('/', { replace: true });
        } else {
          // On other secondary pages (downloads, account, pdf etc.), perform natural history back
          navigate(-1);
        }
      }
    });

    return () => {
      backHandler.then(h => h.remove());
    };
  }, [navigate]);

  // 2. Web Browser Back Button Interception (Active on ALL platforms including native WebView)
  useEffect(() => {
    const getPathFromHash = () => {
      const hash = window.location.hash;
      if (!hash) return '/';
      return hash.replace('#', '').split('?')[0] || '/';
    };

    const handlePopState = (event) => {
      const prevPath = lastPathRef.current;
      const newPath = getPathFromHash();

      if (showExitModalRef.current) {
        setShowExitModal(false);
        if (newPath === '/') {
          window.history.pushState({ locked: true }, '', window.location.href);
        }
        return;
      }

      if (prevPath === '/' && newPath === '/') {
        // User clicked back while already on Home! Lock and show exit modal.
        window.history.pushState({ locked: true }, '', window.location.href);
        setShowExitModal(true);
      } else if (newPath !== '/') {
        // If the target path is a course/coaching/crash detail screen, allow natural navigation
        const isDetailScreen = newPath.startsWith('/course/') || newPath.startsWith('/coaching/') || newPath.startsWith('/crash/');
        if (isDetailScreen) {
          return;
        }

        // On other screens, back button brings us directly to Home
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const handleExit = () => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.exitApp();
    } else {
      window.close(); // Web pe (DevTools testing ke liye)
    }
  };

  const handleCancel = () => {
    setShowExitModal(false);
  };

  if (!showExitModal) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-sm bg-[#1c1c1e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Icon + Text */}
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-14 h-14 bg-[#FFD700]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg mb-1 font-oswald uppercase tracking-wide">
            App Band Karein?
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Kya aap Naino Academy band karna chahte hain?
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 mx-0" />

        {/* Buttons */}
        <div className="flex">
          <button
            onClick={handleCancel}
            className="flex-1 py-4 text-[#0A84FF] font-semibold text-base border-r border-white/5 hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExit}
            className="flex-1 py-4 text-[#FF453A] font-bold text-base hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackButtonHandler;
