import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchBackendAPI } from '../utils/api';
import { useAlert } from '../context/AlertContext';
import { 
  User, Info, Settings, LogOut, Send, MessageSquare, Download, Crown, ChevronRight, BookOpen, Star 
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const MoreScreen = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  
  const [username, setUsername] = useState(localStorage.getItem('naino_user_name') || 'Student');
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('naino_user_avatar') || null);
  const [isPremium, setIsPremium] = useState(localStorage.getItem('naino_premium_member') === 'true');
  const [secretKey, setSecretKey] = useState(localStorage.getItem('naino_access_token') || 'XXXXXX');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarUrl(localStorage.getItem('naino_user_avatar'));
    };
    const handlePremiumUpdate = () => {
      setIsPremium(localStorage.getItem('naino_premium_member') === 'true');
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('premiumStatusChanged', handlePremiumUpdate);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('premiumStatusChanged', handlePremiumUpdate);
    };
  }, []);

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
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("Failed to clear deviceId on logout:", err);
    }
    localStorage.removeItem('naino_access_token');
    localStorage.removeItem('naino_user_name');
    localStorage.removeItem('naino_user_avatar');
    localStorage.removeItem('naino_premium_member');
    window.location.href = '/';
  };

  const menuGroups = [
    {
      title: 'Academy Sections',
      items: [
        { label: 'My Account Settings', icon: User, path: '/account', color: 'text-[#FFD700]' },
        { label: 'Recent Activity Log', icon: BookOpen, path: '/recent', color: 'text-[#30D158]' },
        { label: 'Downloaded Lectures', icon: Download, path: '/downloads', color: 'text-[#0A84FF]' },
      ]
    },
    {
      title: 'Support & Interaction',
      items: [
        { label: 'Student Feedbacks', icon: MessageSquare, path: '/feedback', color: 'text-[#BF5AF2]' },
        { label: 'About Naino Academy', icon: Info, path: '/about', color: 'text-[#FF9F0A]' },
        { label: 'Telegram Support Chat', icon: Send, path: 'https://t.me/nainochatbot', isExternal: true, color: 'text-[#64D2FF]' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-24 page-transition overflow-x-hidden">
      {/* Golden Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <div className="text-center mb-8 flex flex-col items-center">
          <p className="text-[#FFD700] text-[0.65rem] tracking-[0.2em] font-semibold mb-2 uppercase">
            Naino Academy
          </p>
          <h1 className="font-oswald text-[2.2rem] font-bold leading-[1.1] tracking-tight uppercase">
            More <span className="text-[#FFD700]">Options</span>
          </h1>
        </div>

        {/* Profile Card Header */}
        <div 
          onClick={() => navigate('/account')}
          className="bg-gradient-to-r from-[#111] to-[#0d0d0d] border border-white/5 rounded-3xl p-5 mb-8 flex items-center justify-between shadow-xl cursor-pointer hover:border-[#FFD700]/30 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-[#FFD700] bg-[#222] flex items-center justify-center text-[#FFD700] overflow-hidden shrink-0 shadow-[0_0_15px_rgba(255,215,0,0.15)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={28} className="text-[#FFD700]/80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-oswald text-lg font-bold text-white uppercase tracking-wide">
                  {username}
                </span>
                {isPremium && <Crown size={14} className="text-[#FFD700] fill-[#FFD700]" />}
              </div>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                {isPremium ? 'Premium Student ✨' : 'Regular Student'}
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-500" />
        </div>

        {/* Menu Groups */}
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6">
            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-3 px-2">
              {group.title}
            </span>
            <div className="bg-[#111]/80 border border-white/5 rounded-3xl overflow-hidden shadow-lg backdrop-blur-md">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isLast = itemIdx === group.items.length - 1;
                
                if (item.isExternal) {
                  return (
                    <a
                      key={itemIdx}
                      href={item.path}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center justify-between p-4 hover:bg-white/5 active:bg-white/10 transition-colors ${!isLast ? 'border-b border-white/5' : ''}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon size={18} className={item.color} />
                        <span className="text-xs font-semibold text-gray-200">{item.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-600" />
                    </a>
                  );
                }

                return (
                  <button
                    key={itemIdx}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center justify-between p-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors ${!isLast ? 'border-b border-white/5' : ''}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon size={18} className={item.color} />
                      <span className="text-xs font-semibold text-gray-200">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="mt-8 px-2">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full bg-[#111] border border-red-500/10 text-red-500/80 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-[0.98]"
          >
            <LogOut size={16} /> LOGOUT ACCOUNT
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isLogoutModalOpen}
        title="Logout?"
        message="Are you sure you want to logout? You will need your access key to enter again."
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        confirmText="Logout"
      />
    </div>
  );
};

export default MoreScreen;
