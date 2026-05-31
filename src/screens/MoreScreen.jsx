import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchBackendAPI, getDynamicLink, getDynamicTitle } from '../utils/api';
import { useAlert } from '../context/AlertContext';
import {
  User, Info, Settings, LogOut, Send, MessageSquare, Download, Crown, ChevronRight, BookOpen, Star, Megaphone, Users, Gift, Code
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

  const [linksVersion, setLinksVersion] = useState(0);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setAvatarUrl(localStorage.getItem('naino_user_avatar'));
    };
    const handlePremiumUpdate = () => {
      setIsPremium(localStorage.getItem('naino_premium_member') === 'true');
    };
    const handleLinksUpdate = () => {
      setLinksVersion(prev => prev + 1);
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('premiumStatusChanged', handlePremiumUpdate);
    window.addEventListener('dynamicLinksUpdated', handleLinksUpdate);
    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('premiumStatusChanged', handlePremiumUpdate);
      window.removeEventListener('dynamicLinksUpdated', handleLinksUpdate);
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
        { label: 'My Account Settings', icon: User, path: '/account', color: 'text-white', borderColor: 'border-white/20' },
        { label: 'Recent Activity Log', icon: BookOpen, path: '/recent', color: 'text-white', borderColor: 'border-white/20' },
        { label: 'Downloaded Lectures', icon: Download, path: '/downloads', color: 'text-white', borderColor: 'border-white/20' },
      ]
    },
    {
      title: 'Support & Interaction',
      items: [
        { label: 'Student Feedbacks', icon: MessageSquare, path: '/feedback', color: 'text-white', borderColor: 'border-white/20' },
        { label: 'About Naino Academy', icon: Info, path: '/about', color: 'text-white', borderColor: 'border-white/20' },
      ]
    },
    {
      title: '',
      isTelegramGroup: true,
      items: [
        { 
          label: getDynamicTitle('more_support_chat', 'Telegram Support Chat'), 
          icon: Send, 
          path: getDynamicLink('more_support_chat', 'https://t.me/nainochatbot'), 
          isExternal: true, 
          color: 'text-[#3b82f6]',
          borderColor: 'border-[#3b82f6]'
        },
        { 
          label: getDynamicTitle('more_admin_contact', 'Admin Contact'), 
          icon: User, 
          path: getDynamicLink('more_admin_contact', 'https://t.me/naino_admin'), 
          isExternal: true, 
          color: 'text-[#3b82f6]',
          borderColor: 'border-[#3b82f6]'
        },
        { 
          label: getDynamicTitle('more_official_channel', 'Official Channel'), 
          icon: Megaphone, 
          path: getDynamicLink('more_official_channel', 'https://t.me/naino_channel'), 
          isExternal: true, 
          color: 'text-[#3b82f6]',
          borderColor: 'border-[#3b82f6]'
        },
        { 
          label: getDynamicTitle('more_official_group', 'Official Group'), 
          icon: Users, 
          path: getDynamicLink('more_official_group', 'https://t.me/naino_group'), 
          isExternal: true, 
          color: 'text-[#3b82f6]',
          borderColor: 'border-[#3b82f6]'
        },
        { 
          label: getDynamicTitle('more_admin_channel_gifts', 'Admin Channel (Free Gifts)'), 
          icon: Gift, 
          path: getDynamicLink('more_admin_channel_gifts', 'https://t.me/naino_gifts'), 
          isExternal: true, 
          color: 'text-[#f59e0b]',
          borderColor: 'border-[#f59e0b]'
        },
        { 
          label: getDynamicTitle('more_developer_contact', 'Developer Contact'), 
          icon: Code, 
          path: getDynamicLink('more_developer_contact', 'https://t.me/cryvex_dev'), 
          isExternal: true, 
          color: 'text-[#10b981]',
          borderColor: 'border-[#10b981]'
        }
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

        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-4">
            {group.title && (
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-2 px-2">
                {group.title}
              </span>
            )}
            <div className="flex flex-col gap-2">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;

                if (item.isExternal) {
                  return (
                    <a
                      key={itemIdx}
                      href={item.path}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${item.borderColor || 'border-white/20'}`}>
                          <Icon size={16} className={item.color} />
                        </div>
                        <span className="text-[13px] font-semibold text-gray-100">{item.label}</span>
                      </div>
                      <ChevronRight size={16} className="text-gray-500" />
                    </a>
                  );
                }

                return (
                  <button
                    key={itemIdx}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${item.borderColor || 'border-white/20'}`}>
                        <Icon size={16} className={item.color} />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-100">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-gray-500" />
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
