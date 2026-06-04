import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import {
  Search, Bell, User, BookOpen, Play, Presentation, FileText,
  MessageSquare, TrendingUp, Users, Award, ChevronRight, Trophy, MoreVertical,
  Book, Zap, Video, Compass, Store, Star, Newspaper, Target, GraduationCap
} from 'lucide-react';
import { fetchWithCache, fetchBackendAPI } from '../utils/api';
import BannerCarousel from '../components/BannerCarousel';
import ActiveUsersWidget from '../components/ActiveUsersWidget';

const HomeScreen = () => {
  const navigate = useNavigate();

  // Avatar and Profile cache
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('naino_user_avatar') || null);
  const [username, setUsername] = useState(localStorage.getItem('naino_user_name') || 'Scholar');



  // Global search states
  const [searchIndex, setSearchIndex] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Recent activity states
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);

  // Unread News State
  const [hasUnreadNews, setHasUnreadNews] = useState(false);

  useEffect(() => {
    // Listen for avatar/profile updates
    const handleAvatarUpdate = () => {
      setAvatarUrl(localStorage.getItem('naino_user_avatar'));
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    const calculateUnreadCount = () => {
      try {
        const cachedStr = localStorage.getItem('naino_cached_notifications');
        if (!cachedStr) return;
        
        const notifications = JSON.parse(cachedStr);
        const lastRead = localStorage.getItem('naino_last_read_notifications_timestamp') || 0;
        
        const count = notifications.filter(n => new Date(n.createdAt).getTime() > Number(lastRead)).length;
        setUnreadCount(count);
      } catch (e) {}
    };

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('naino_access_token');
        if (!token || token === 'XXXXXX') return;

        const res = await fetchBackendAPI(`/api/notifications?userKey=${token}`, 'GET');
        if (res && Array.isArray(res)) {
          const deletedStr = localStorage.getItem('naino_deleted_notifications');
          const deletedIds = deletedStr ? JSON.parse(deletedStr) : [];
          const activeNotifs = res.filter(n => !deletedIds.includes(n._id));
          
          localStorage.setItem('naino_cached_notifications', JSON.stringify(activeNotifs));
          calculateUnreadCount();
          window.dispatchEvent(new Event('notificationsUpdated'));
        }
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
      }
    };

    calculateUnreadCount();
    window.addEventListener('notificationsUpdated', calculateUnreadCount);
    window.addEventListener('badgeUpdateRequired', calculateUnreadCount);
    window.addEventListener('fetchNewNotifications', fetchNotifications);
    
    // Initial fetch on mount
    fetchNotifications();

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('notificationsUpdated', calculateUnreadCount);
      window.removeEventListener('badgeUpdateRequired', calculateUnreadCount);
      window.removeEventListener('fetchNewNotifications', fetchNotifications);
    };
  }, []);

  // Check for unread news
  useEffect(() => {
    const checkNews = async () => {
      try {
        const data = await fetchBackendAPI('/api/news', 'GET');
        if (data && data.length > 0) {
          const latestNewsTime = new Date(data[0].createdAt).getTime();
          const lastSeen = localStorage.getItem('naino_last_seen_news_time');
          if (!lastSeen || latestNewsTime > parseInt(lastSeen, 10)) {
            setHasUnreadNews(true);
          }
        }
      } catch (e) {
        console.warn("Failed to check for latest news:", e);
      }
    };
    checkNews();
  }, []);



  // On-demand search index builder triggered ONLY when search overlay is opened
  useEffect(() => {
    if (!isSearchOpen || searchIndex.length > 0) return;

    const buildSearchIndex = async () => {
      const index = [];

      // 1. Index Books
      try {
        const booksData = await fetchWithCache('/api/directory/books.json', 'cache_books_directory');
        if (Array.isArray(booksData)) {
          booksData.forEach(book => {
            index.push({
              type: 'book',
              title: book.title,
              subtitle: book.author || 'Book Library',
              path: '/book-library',
              state: {},
              searchString: `${book.title} ${book.author || ''} book library pdf`.toLowerCase()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to index books for search:', e);
      }

      // 2. Index Teacher's Library Courses
      try {
        const coursesData = await fetchWithCache('/api/directory/courses.json', 'cache_courses_directory');
        if (coursesData) {
          const coursesArray = Object.entries(coursesData).map(([id, item]) => ({ id, ...item }));
          coursesArray.forEach(course => {
            index.push({
              type: 'course',
              title: course.title,
              subtitle: course.subtitle || 'Teacher\'s Library Course',
              path: `/course/${course.id}`,
              state: { course },
              searchString: `${course.title} ${course.subtitle || ''} ${course.category || ''} teacher library lectures`.toLowerCase()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to index courses for search:', e);
      }

      // 3. Index Coaching Materials
      try {
        const coachingData = await fetchWithCache('/api/directory/coaching.json', 'cache_coaching_directory_v2');
        if (coachingData) {
          const coachingArray = Object.entries(coachingData).map(([id, item]) => ({ id, ...item }));
          coachingArray.forEach(coaching => {
            index.push({
              type: 'coaching',
              title: coaching.title,
              subtitle: coaching.subtitle || 'Coaching Material',
              path: `/coaching/${coaching.id}`,
              state: { coaching },
              searchString: `${coaching.title} ${coaching.subtitle || ''} coaching notes pdf`.toLowerCase()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to index coaching for search:', e);
      }

      // 4. Index Crash Courses
      try {
        const crashData = await fetchWithCache('/api/directory/crash_courses.json', 'cache_crash_directory');
        if (crashData) {
          const crashArray = Object.entries(crashData).map(([id, item]) => ({ id, ...item }));
          crashArray.forEach(crash => {
            index.push({
              type: 'crash',
              title: crash.title,
              subtitle: crash.subtitle || 'Crash Course',
              path: `/crash/${crash.id}`,
              state: { crashCourse: crash },
              searchString: `${crash.title} ${crash.subtitle || ''} crash course revision`.toLowerCase()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to index crash courses for search:', e);
      }

      // 5. Index Test Zone Series
      try {
        const testData = await fetchWithCache('/api/directory/testzone.json', 'cache_testzone_directory');
        if (Array.isArray(testData)) {
          testData.forEach(item => {
            index.push({
              type: 'test-zone',
              title: item.name || item.id,
              subtitle: 'Premium Test Series',
              path: `/test-zone/${item.id}`,
              state: {},
              searchString: `${item.name || ''} ${item.id || ''} test zone online practice mocking paper`.toLowerCase()
            });
          });
        }
      } catch (e) {
        console.warn('Failed to index test zone for search:', e);
      }

      setSearchIndex(index);
    };

    buildSearchIndex();
  }, [isSearchOpen, searchIndex]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const filtered = searchIndex.filter(item => item.searchString.includes(q));
    setSearchResults(filtered.slice(0, 30));
  }, [searchQuery, searchIndex]);

  // Load recent activities
  useEffect(() => {
    try {
      const raw = localStorage.getItem('naino_recent_activity');
      if (raw) {
        setRecentActivity(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to load recent activity on home');
    }
  }, []);



  return (
    <div className="min-h-screen bg-[#000] text-white overflow-x-hidden font-inter pb-24 page-transition relative">
      <style>{`
        @keyframes gridCardEntrance {
          0% { opacity: 0; transform: translateY(24px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .grid-card-anim {
          animation: gridCardEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.03; }
          50% { transform: translate(15px, -20px) scale(1.15); opacity: 0.08; }
        }
        @keyframes orbFloatAlt {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.04; }
          50% { transform: translate(-20px, 25px) scale(1.2); opacity: 0.09; }
        }
        @keyframes bannerTimerProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes zapPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(15deg); }
        }
        .group:hover .icon-zap-anim {
          animation: zapPulse 0.5s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }
        @keyframes targetLock {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.15); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .group:hover .icon-target-anim {
          animation: targetLock 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes bookBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.1); }
        }
        .group:hover .icon-book-anim {
          animation: bookBounce 0.5s ease-in-out infinite;
        }
        @keyframes fileFold {
          0%, 100% { transform: scale(1) skewX(0); }
          50% { transform: scale(1.1) skewX(-5deg); }
        }
        .group:hover .icon-file-anim {
          animation: fileFold 0.5s ease-in-out;
        }
        @keyframes storeBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px) scaleX(1.08); }
        }
        .group:hover .icon-store-anim {
          animation: storeBounce 0.5s ease-in-out infinite;
        }
        @keyframes starPulse {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.25) rotate(72deg); }
        }
        .group:hover .icon-star-anim {
          animation: starPulse 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes quickIconEntrance {
          0% { opacity: 0; transform: translateX(30px) scale(0.8); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        .quick-icon-anim {
          animation: quickIconEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
      {/* Golden Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-4 pt-4">

        {/* --- 1. TOP HEADER SECTION --- */}
        <header className="flex items-center justify-between py-3 mb-6 bg-black/40 backdrop-blur-md rounded-2xl px-2 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[#FFD700]/30 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_10px_rgba(255,215,0,0.1)]">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <div className="flex items-center leading-none">
                <span className="font-oswald text-sm font-bold tracking-tight text-white uppercase">
                  NANO <span className="text-[#FFD700]">ACADEMY</span>
                </span>
              </div>
              <span className="text-[7px] text-[#8E8E93] tracking-[0.2em] font-semibold uppercase block mt-0.5">
                Learn • Grow • Succeed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-[#FFD700] hover:scale-105 active:scale-95 transition-all"
            >
              <Search size={16} />
            </button>

            <button 
              onClick={() => navigate('/notifications')}
              className="relative w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-[#FFD700] hover:scale-105 active:scale-95 transition-all"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-black scale-90">
                  {unreadCount > 4 ? '4+' : unreadCount}
                </span>
              )}
            </button>

            <div
              onClick={() => navigate('/account')}
              className="w-9 h-9 rounded-full border border-[#FFD700] bg-[#222] flex items-center justify-center text-[#FFD700] overflow-hidden cursor-pointer hover:shadow-[0_0_10px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={16} />
              )}
            </div>
          </div>
        </header>

        {/* --- 2. AUTO-SWIPING BANNER SECTION --- */}
        <BannerCarousel />

        {/* --- 3. QUICK ACCESS HORIZONTAL SLIDER --- */}
        <section className="mb-6 relative">
          <div className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-3 hide-scrollbar relative z-10 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { label: "Teacher's", icon: BookOpen, path: '/teachers-library', color: 'text-[#FFD700]', bgClass: 'bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5' },
              { label: "Coaching", icon: Presentation, path: '/coaching', color: 'text-[#30D158]', bgClass: 'bg-gradient-to-br from-[#30D158]/20 to-[#30D158]/5' },
              { label: "Crash", icon: Zap, path: '/crash', color: 'text-[#BF5AF2]', bgClass: 'bg-gradient-to-br from-[#BF5AF2]/20 to-[#BF5AF2]/5' },
              { label: "PDFs", icon: FileText, path: '/pdf-zone', color: 'text-[#FF453A]', bgClass: 'bg-gradient-to-br from-[#FF453A]/20 to-[#FF453A]/5' },
              { label: "Tests", icon: Trophy, path: '/test-zone', color: 'text-[#FFD700]', bgClass: 'bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5' },
              { label: "Books", icon: Book, path: '/book-library', color: 'text-[#0A84FF]', bgClass: 'bg-gradient-to-br from-[#0A84FF]/20 to-[#0A84FF]/5' },
              { label: "Mentors", icon: Target, path: '/mentorship', color: 'text-[#FFD700]', bgClass: 'bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5' },
              { label: "Store", icon: Store, path: '/store', color: 'text-[#30D158]', bgClass: 'bg-gradient-to-br from-[#30D158]/20 to-[#30D158]/5' },
              { label: "Notes", icon: Star, path: '#', color: 'text-[#BF5AF2]', bgClass: 'bg-gradient-to-br from-[#BF5AF2]/20 to-[#BF5AF2]/5', isComingSoon: true }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={`quick_${idx}`}
                  onClick={() => {
                    if (item.isComingSoon) return;
                    if (item.path !== '#') navigate(item.path);
                  }}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={`quick-icon-anim flex flex-col items-center gap-1.5 snap-center shrink-0 w-[56px] group transition-all duration-300 ${item.isComingSoon ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 hover:-translate-y-1'}`}
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[#111] border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-all duration-300 shadow-md relative overflow-hidden group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                    <div className={`absolute inset-0 opacity-100 transition-opacity duration-300 ${item.bgClass}`} />
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
                    <Icon size={18} className={`${item.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${!item.isComingSoon && 'group-hover:scale-110'} transition-transform duration-300 z-10`} />
                    {item.isComingSoon && (
                      <div className="absolute -top-1 -right-1 z-20">
                        <span className="bg-gradient-to-r from-gray-600 to-gray-500 text-white text-[6px] font-black uppercase px-1 rounded-sm shadow-md border border-gray-400">
                          SOON
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-semibold text-gray-400 group-hover:text-white text-center leading-tight transition-colors duration-300">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* --- 4. UNIFIED ACADEMIC DIRECTORY GRID (9 PREMIUM SECTIONS) --- */}
        <section className="mb-8 relative">
          {/* Background Ambient Glow Orbs (Removed heavy blurs to fix GPU lag) */}

          <div className="flex items-center gap-2 mb-4 relative z-10">
            <div className="w-1 h-4 bg-[#FFD700] rounded-full" />
            <h3 className="font-oswald text-xs font-black tracking-[0.2em] text-gray-400 uppercase">
              Academic Directory
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            {[
              { label: "Teacher's Library", icon: BookOpen, path: '/teachers-library', color: 'text-[#FFD700]', bgClass: 'bg-[#FFD700]', desc: "Lectures & Vids", iconClass: "icon-book-anim" },
              { label: "Coaching Library", icon: Presentation, path: '/coaching', color: 'text-[#30D158]', bgClass: 'bg-[#30D158]', desc: "Offline Batches", iconClass: "icon-store-anim" },
              { label: "Crash Course", icon: Zap, path: '/crash', color: 'text-[#BF5AF2]', bgClass: 'bg-[#BF5AF2]', desc: "Quick Revision", iconClass: "icon-zap-anim" },
              { label: "PDF Zone", icon: FileText, path: '/pdf-zone', color: 'text-[#FF453A]', bgClass: 'bg-[#FF453A]', desc: "Class Notes & DPP", iconClass: "icon-file-anim" },
              { label: "Test Zone", icon: Trophy, path: '/test-zone', color: 'text-[#FFD700]', bgClass: 'bg-[#FFD700]', desc: "Online Test Series", iconClass: "icon-star-anim" },
              { label: "Book Library", icon: Book, path: '/book-library', color: 'text-[#0A84FF]', bgClass: 'bg-[#0A84FF]', desc: "E-Books & Guides", iconClass: "icon-book-anim" },
              { label: "Mentorship", icon: Target, path: '/mentorship', color: 'text-[#FFD700]', bgClass: 'bg-[#FFD700]', desc: "1-on-1 Guidance", iconClass: "icon-target-anim" },
              { label: "Naino Store", icon: Store, path: '/store', color: 'text-[#30D158]', bgClass: 'bg-[#30D158]', desc: "Premium Material", iconClass: "icon-store-anim" },
              { label: "Premium Notes", icon: Star, path: '#', color: 'text-[#BF5AF2]', bgClass: 'bg-[#BF5AF2]', desc: "Coming Soon", iconClass: "icon-star-anim", isComingSoon: true },
              { label: "News", icon: Newspaper, path: '/news', color: 'text-[#FF453A]', bgClass: 'bg-[#FF453A]', desc: "Exam Updates", iconClass: "icon-file-anim", isNews: true },
              { label: "Community", icon: Users, path: '/community', color: 'text-[#0A84FF]', bgClass: 'bg-[#0A84FF]', desc: "Social Media Hub", iconClass: "icon-users-anim" },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isWide = idx === 9 || idx === 10; // News (9) and Community (10) are wide
              return (
                <button
                  key={idx}
                  onClick={() => { 
                    if (item.isComingSoon) return; // Disable click
                    if (item.isNews) {
                      localStorage.setItem('naino_last_seen_news_time', Date.now().toString());
                      setHasUnreadNews(false);
                    }
                    if (item.path !== '#') navigate(item.path); 
                  }}
                  style={{ animationDelay: `${idx * 45}ms` }}
                  className={`grid-card-anim group relative flex border border-white/5 rounded-2xl transition-all duration-300 ${item.isComingSoon ? 'opacity-70 cursor-not-allowed' : 'active:scale-95 hover:border-[#FFD700]/30 hover:-translate-y-1'} shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
                    isWide 
                      ? 'col-span-3 flex-row items-center gap-4 px-5 py-3 bg-gradient-to-r from-[#1A1A1A] to-[#141414] min-h-[68px]' 
                      : 'flex-col items-center justify-between p-3 bg-[#1A1A1A] min-h-[105px]'
                  }`}
                >
                  <div className={`absolute inset-0 opacity-[0.02] group-hover:opacity-[0.08] blur-xl rounded-full transition-opacity duration-300 ${item.bgClass}`} />
                  <div className={`rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner transition-colors group-hover:border-white/20 relative overflow-hidden shrink-0 ${
                    isWide ? 'w-10 h-10' : 'w-10 h-10 mb-1.5'
                  }`}>
                    <div className={`absolute inset-0 opacity-10 blur-md rounded-full ${item.bgClass}`} />
                    <Icon size={18} className={`${item.color} ${item.iconClass || ''} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 transition-transform`} />
                  </div>
                  
                  <div className={`flex flex-col ${isWide ? 'flex-1 min-w-0 text-left' : 'items-center text-center w-full'}`}>
                    <span className={`font-oswald font-bold text-white tracking-wide leading-tight truncate w-full ${isWide ? 'text-sm' : 'text-[11px]'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[#8E8E93] font-medium truncate w-full ${isWide ? 'text-[10px] mt-0.5' : 'text-[8px] mt-1'}`}>
                      {item.desc}
                    </span>
                  </div>
                  
                  {isWide && (
                    <ChevronRight size={16} className="text-gray-600 shrink-0 group-hover:text-white transition-colors" />
                  )}    
                  <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-white/10 group-hover:bg-[#FFD700] transition-colors" />
                  
                  {item.isNews && hasUnreadNews && (
                    <div className="absolute -top-1.5 -right-1.5 z-20">
                      <div className="relative flex items-center justify-center">
                         <span className="absolute inset-0 bg-[#FF453A] rounded-full animate-ping opacity-60"></span>
                         <span className="relative bg-gradient-to-tr from-[#FF453A] to-red-400 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-[0_0_15px_rgba(255,69,58,0.6)] border border-[#FF453A]/50">
                           NEW
                         </span>
                      </div>
                    </div>
                  )}

                  {item.isComingSoon && (
                    <div className="absolute -top-1.5 -right-1.5 z-20">
                      <span className="bg-gradient-to-r from-gray-600 to-gray-500 text-white text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg border border-gray-400">
                        SOON
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* --- 4. YOUR IMPACT SECTION --- */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#FFD700] rounded-full" />
            <h3 className="font-oswald text-xs font-black tracking-[0.2em] text-gray-400 uppercase">
              Your Impact
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* Impact Card 1: Active Users */}
            <ActiveUsersWidget />

            {/* Impact Card 2: Premium Lectures */}
            <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
              <div>
                <div className="w-7 h-7 rounded-xl bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] mb-3">
                  <Play size={14} />
                </div>
                <span className="text-xl font-bold font-mono tracking-tight block leading-none">
                  20,000+
                </span>
                <span className="text-[8px] text-[#8E8E93] uppercase font-bold tracking-wider mt-1 block">
                  Lectures
                </span>
              </div>
              {/* Dynamic Sparkline */}
              <div className="w-full h-8 mt-3 opacity-80">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d="M0,22 Q20,25 40,15 T70,8 T90,14 L100,5"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Impact Card 3: PDFs & Books */}
            <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden">
              <div>
                <div className="w-7 h-7 rounded-xl bg-[#FF453A]/10 flex items-center justify-center text-[#FF453A] mb-3">
                  <FileText size={14} />
                </div>
                <span className="text-xl font-bold font-mono tracking-tight block leading-none">
                  25,000+
                </span>
                <span className="text-[8px] text-[#8E8E93] uppercase font-bold tracking-wider mt-1 block">
                  PDFs & Books
                </span>
              </div>
              {/* Dynamic Sparkline */}
              <div className="w-full h-8 mt-3 opacity-80">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d="M0,18 Q15,22 35,28 T65,10 T90,16 L100,5"
                    fill="none"
                    stroke="#FF453A"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Wide Card with 92% Circular progress */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] p-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0A84FF]/10 flex items-center justify-center text-[#0A84FF]">
                <Users size={24} />
              </div>
              <div>
                <span className="text-2xl font-black font-mono tracking-tight block leading-none">
                  2300+
                </span>
                <span className="text-[9px] text-[#8E8E93] uppercase font-black tracking-widest mt-1.5 block">
                  Total Students Joined
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-white font-black uppercase tracking-wider block">
                  Growing Together
                </span>
                <span className="text-[9px] text-[#0A84FF] font-bold block mt-0.5">
                  Keep it up!
                </span>
              </div>
              {/* Progress Ring */}
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Track path */}
                  <path
                    className="text-white/5"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Progress path (92%) */}
                  <path
                    className="text-[#0A84FF] drop-shadow-[0_0_5px_rgba(10,132,255,0.4)]"
                    strokeWidth="3.5"
                    strokeDasharray="92, 100"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono font-black text-white leading-none">
                    92%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary menu merged with the top unified grid */}

        {/* --- 5. CONTINUE LEARNING SECTION --- */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#FFD700] rounded-full" />
            <h3 className="font-oswald text-xs font-black tracking-[0.2em] text-gray-400 uppercase">
              Continue Learning
            </h3>
          </div>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 3).map((item, idx) => {
                let type = item.type;
                if (!type) {
                  if (item.courseTitle?.toUpperCase().includes('CRASH')) {
                    type = 'crash';
                  } else if (item.courseId?.startsWith('c_')) {
                    type = 'coaching';
                  } else {
                    type = 'course';
                  }
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(`/${type}/${item.courseId}`, {
                        state: {
                          autoPlayLecture: item.lectureId || item.lectureTitle,
                          coachingContext: item.coachingContext
                        }
                      });
                    }}
                    className="bg-[#1A1A1A] border border-white/5 rounded-[2rem] p-4 flex gap-4 shadow-lg relative overflow-hidden group hover:border-[#FFD700]/30 transition-all duration-300 cursor-pointer"
                  >
                    {/* Subject badge and play thumbnail */}
                    <div className="relative w-24 h-16 bg-gradient-to-br from-[#121213] to-[#252528] rounded-2xl overflow-hidden border border-white/5 shrink-0 flex items-center justify-center shadow-inner">
                      <div className="absolute inset-0 bg-[#FFD700]/5" />
                      <div className="absolute bottom-1.5 left-1.5 px-1 py-0.5 bg-black/75 rounded text-[7px] font-black text-[#FFD700] uppercase tracking-wider max-w-[80px] truncate">
                        {item.type === 'coaching' ? 'COACHING' : type.toUpperCase()}
                      </div>
                      <div className="z-10 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-110 active:scale-95 transition-transform duration-300">
                        <Play size={12} className="fill-current ml-0.5" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0 pr-1 py-0.5">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-xs font-black text-white truncate leading-tight group-hover:text-[#FFD700] transition-colors">
                          {item.lectureTitle}
                        </h4>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-none mt-1 truncate">
                        {item.courseTitle}
                      </p>

                      {/* Progress metrics and gold bar */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                          <div
                            className="absolute top-0 left-0 h-full bg-[#FFD700] rounded-full drop-shadow-[0_0_3px_rgba(255,215,0,0.5)]"
                            style={{ width: `${item.progressPercent || 0}%` }}
                          />
                        </div>
                        <span className="text-[8px] font-mono font-black text-gray-400 shrink-0">
                          {Math.round(item.progressPercent || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {recentActivity.length > 3 && (
                <button
                  onClick={() => navigate('/recent')}
                  className="w-full bg-[#111]/80 hover:bg-[#FFD700] border border-white/5 hover:border-[#FFD700] text-gray-400 hover:text-black font-black uppercase text-[9px] tracking-widest py-3 rounded-full transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5"
                >
                  Load More History <ChevronRight size={10} strokeWidth={3} />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-[#121213] via-[#0B0B0C] to-[#040404] border border-[#FFD700]/25 rounded-[2rem] p-6 text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-2xl" />
              <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] mx-auto mb-3 animate-pulse">
                <Play size={20} className="fill-[#FFD700] ml-0.5" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1 font-oswald">
                No recent activity found
              </h4>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-4 max-w-[240px] mx-auto">
                Start watching your premium video lectures to track your progress here!
              </p>
              <button
                onClick={() => navigate('/teachers-library')}
                className="bg-[#FFD700] text-black text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-[0_5px_15px_rgba(255,215,0,0.2)]"
              >
                Browse Lectures
              </button>
            </div>
          )}
        </section>

        {/* --- 6. FOOTER MOTIVATION BANNER --- */}
        <section className="mb-6">
          <div className="bg-[#1A1A1A] border border-[#FFD700]/25 rounded-[2rem] p-4 flex items-center justify-between gap-4 shadow-[0_10px_35px_rgba(255,215,0,0.03)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFD700]/15 text-[#FFD700] flex items-center justify-center shrink-0 animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.2)]">
                <Trophy size={18} />
              </div>
              <p className="text-[10px] text-gray-300 font-bold leading-relaxed max-w-[180px]">
                Small daily improvements lead to big results!
              </p>
            </div>

            <button className="bg-transparent border border-[#FFD700]/30 hover:border-[#FFD700] hover:bg-[#FFD700]/5 text-[#FFD700] text-[9px] font-black uppercase tracking-wider py-2 px-3.5 rounded-full transition-all active:scale-95 shrink-0 shadow-lg">
              You Can Do It! 💪
            </button>
          </div>
        </section>

      </div>

      {/* --- 7. POWERFUL SEARCH OVERLAY MODAL --- */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col p-4 md:p-8 animate-fade-in">
          <div className="w-full max-w-xl mx-auto flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses, chapters, lectures, books..."
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111] border border-[#FFD700]/30 focus:border-[#FFD700] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all shadow-[0_0_15px_rgba(255,215,0,0.05)]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs font-black uppercase"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold uppercase text-xs px-4 py-3.5 rounded-2xl transition-all active:scale-95 shrink-0"
              >
                Close
              </button>
            </div>

            {/* Quick Suggestions Tags */}
            <div className="mb-6">
              <span className="text-[9px] text-[#8E8E93] uppercase font-black tracking-widest block mb-2.5">
                Popular Searches
              </span>
              <div className="flex flex-wrap gap-2">
                {["Physics", "Chemistry", "HC Verma", "Maths", "Kinematics", "Organic"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="bg-[#1C1C1E] border border-white/5 hover:border-[#FFD700]/50 hover:bg-[#FFD700]/5 hover:text-[#FFD700] text-xs text-gray-300 px-3.5 py-1.5 rounded-full transition-all duration-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
              {searchQuery ? (
                searchResults.length > 0 ? (
                  <div className="space-y-3">
                    <span className="text-[9px] text-[#8E8E93] uppercase font-black tracking-widest block mb-1">
                      Found {searchResults.length} Results
                    </span>
                    {searchResults.map((result, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(result.path, { state: result.state });
                        }}
                        className="bg-[#1C1C1E]/60 border border-white/5 hover:border-[#FFD700]/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all group duration-300"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${result.type === 'lecture' ? 'bg-[#30D158]/10 text-[#30D158]' :
                              result.type === 'book' ? 'bg-[#FF453A]/10 text-[#FF453A]' :
                                result.type === 'chapter' ? 'bg-[#BF5AF2]/10 text-[#BF5AF2]' :
                                  'bg-[#FFD700]/10 text-[#FFD700]'
                              }`}>
                              {result.type}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug group-hover:text-[#FFD700] transition-colors truncate max-w-[280px] sm:max-w-md">
                            {result.title}
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-1 truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-gray-600 group-hover:text-[#FFD700] transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Search size={40} className="mb-3 text-gray-700 animate-pulse" />
                    <p className="text-sm">No topics found matching your query.</p>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                  <p className="text-xs text-center leading-relaxed">
                    Search over 45,000+ lectures, chapters, books,<br />
                    and premium academy materials instantly.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Ask Doubt Button */}
      {createPortal(
        <div className="fixed bottom-[72px] right-4 z-[9999] flex flex-col items-center animate-bounce-slow">
          <button
            onClick={() => navigate('/doubt-zone')}
            className="w-[100px] h-[100px] hover:scale-110 flex items-center justify-center transition-all active:scale-95 relative z-10"
          >
            <img
              src="/botlogo.png"
              alt="Ask Doubt Bot"
              className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.7)]"
            />
          </button>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#FFD700] drop-shadow-lg bg-black/80 px-2 py-0.5 rounded-full backdrop-blur-md border border-[#FFD700]/30 shadow-lg -mt-6 z-0">
            Ask Doubt
          </span>
        </div>,
        document.body
      )}

      {/* Required for hiding scrollbar visually in Nav Scroller */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        @keyframes skeleton-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .skeleton-shimmer {
          animation: skeleton-shimmer 2s infinite linear;
        }
      `}} />
    </div>
  );
};

export default HomeScreen;
