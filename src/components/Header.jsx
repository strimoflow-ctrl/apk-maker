import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Download, Bell, User, ArrowLeft, Check, LogOut, Settings, Info } from 'lucide-react';
import { useDownload } from '../context/DownloadContext';
import ConfirmModal from './ConfirmModal';
import { fetchBackendAPI } from '../utils/api';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeDownloads, completedDownloads } = useDownload();
  const showBack = location.pathname !== '/';
  
  const activeCount = Object.keys(activeDownloads).length;
  
  const [showCheck, setShowCheck] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('naino_user_avatar'));

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('naino_access_token');
      if (token && token !== 'XXXXXX') {
        const uuid = localStorage.getItem('naino_device_uuid') || localStorage.getItem('naino_device_uuid');
        await fetchBackendAPI('/api/keys/update', 'POST', {
          code: token,
          deviceId: uuid,
          updates: { deviceId: "" }
        });
        // Give Firebase a moment to flush the socket before we kill the page
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("Failed to clear deviceId on header logout:", err);
    }
    localStorage.removeItem('naino_access_token');
    localStorage.removeItem('naino_user_name');
    localStorage.removeItem('naino_premium_member');
    localStorage.removeItem('naino_user_avatar');
    window.location.href = '/';
  };
  const prevCompletedCount = useRef(completedDownloads.length);
  const menuRef = useRef(null);

  // Click outside to close profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    
    const updateAvatar = () => setAvatarUrl(localStorage.getItem('naino_user_avatar'));

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('avatarUpdated', updateAvatar);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('avatarUpdated', updateAvatar);
    };
  }, []);

  useEffect(() => {
    // Show checkmark briefly when a new download finishes
    if (completedDownloads.length > prevCompletedCount.current && prevCompletedCount.current > 0) {
      setShowCheck(true);
      const timer = setTimeout(() => setShowCheck(false), 3000);
      return () => clearTimeout(timer);
    }
    prevCompletedCount.current = completedDownloads.length;
  }, [completedDownloads.length]);

  return (
    <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800 shadow-2xl">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        {/* Logo & Title & Back Button */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center w-8 h-8 text-[#FFD700] hover:bg-white/10 rounded-full transition-colors mr-1"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-7 md:h-9"
            />
            <span className="font-bold text-lg md:text-2xl tracking-tighter text-white font-oswald uppercase whitespace-nowrap">
              NAINO <span className="text-[#FFD700]">ACADEMY</span>
            </span>
          </Link>
        </div>

        {/* Actions (Download, Chat, Profile) */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link 
            to="/downloads" 
            className="relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-[#FFD700] hover:scale-110 hover:drop-shadow-[0_0_8px_#FFD700] transition-all"
          >
            {showCheck ? (
              <Check size={20} className="text-[#00E600]" />
            ) : (
              <Download size={20} />
            )}
            
            {activeCount > 0 && !showCheck && (
              <div className="absolute top-0 right-0 bg-[#FFD700] text-black text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-black animate-pulse">
                {activeCount}
              </div>
            )}
          </Link>
          
          <Link 
            to="#" 
            className="relative flex items-center justify-center w-9 h-9 md:w-10 md:h-10 text-[#FFD700] hover:scale-110 hover:drop-shadow-[0_0_8px_#FFD700] transition-all"
          >
            <Bell size={20} />
            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center border-2 border-black">
              1
            </div>
          </Link>

          <Link to="/account" className="relative ml-1 md:ml-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-[#FFD700] bg-[#222] flex items-center justify-center text-[#FFD700] hover:border-white hover:shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </div>
          </Link>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showLogoutModal}
        title="Logout?"
        message="Are you sure you want to logout? You will need your access key to enter again."
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText="Logout"
      />
    </nav>
  );
};

export default Header;
