import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import {
  Search, Bell, User, BookOpen, Play, Presentation, FileText,
  MessageSquare, TrendingUp, Users, Award, ChevronRight, Trophy, MoreVertical,
  Book, Zap, Video, Compass, Store, Star, Newspaper, Target, GraduationCap
} from 'lucide-react';
import { fetchWithCache } from '../utils/api';

// Active users count time-based ranges lookup
const getActiveUsersRange = (hour) => {
  if (hour >= 7 && hour < 12) {
    return { min: 400, max: 600 };
  } else if (hour >= 12 && hour < 15) {
    return { min: 600, max: 800 };
  } else if (hour >= 15 && hour < 22) {
    return { min: 800, max: 1200 };
  } else if (hour >= 22 && hour < 24) {
    return { min: 600, max: 800 };
  } else {
    // 12:00 AM to 7:00 AM
    return { min: 600, max: 700 };
  }
};

const getRandomInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const HomeScreen = () => {
  const navigate = useNavigate();

  // Avatar and Profile cache
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('naino_user_avatar') || null);
  const [username, setUsername] = useState(localStorage.getItem('naino_user_name') || 'Scholar');

  // Active Users Simulation based on current hour with 3-second fluctuations
  const [activeUsers, setActiveUsers] = useState(() => {
    const hour = new Date().getHours();
    const { min, max } = getActiveUsersRange(hour);
    return getRandomInRange(min, max);
  });

  const [activeHistory, setActiveHistory] = useState(() => {
    const hour = new Date().getHours();
    const { min, max } = getActiveUsersRange(hour);
    return Array.from({ length: 10 }, () => getRandomInRange(min, max));
  });

  // Global search states
  const [searchIndex, setSearchIndex] = useState([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Recent activity states
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // Listen for avatar/profile updates
    const handleAvatarUpdate = () => {
      setAvatarUrl(localStorage.getItem('naino_user_avatar'));
    };
    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, []);

  // Synchronously load banner cache to prevent UI flashing
  const getCachedBanner = () => {
    try {
      const cached = sessionStorage.getItem('cache_hero_banner');
      if (cached) {
        const parsedItem = JSON.parse(cached);
        if (new Date().getTime() - parsedItem.timestamp < 48 * 60 * 60 * 1000) {
          return parsedItem.data;
        }
      }
    } catch (e) {}
    return null;
  };

  const initialBannerData = getCachedBanner();

  // Auto-Swiping Banner State
  const [bannersData, setBannersData] = useState(initialBannerData || { autoSwipeSeconds: 3, banners: [] });
  const [isBannerLoading, setIsBannerLoading] = useState(!initialBannerData);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Touch handlers for banner swipe
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await fetchWithCache('/api/banner.json', 'cache_hero_banner');
        if (data && data.banners) {
          setBannersData(data);
        }
      } catch (err) {
        console.error("Failed to fetch banners:", err);
      } finally {
        setIsBannerLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (bannersData.banners.length <= 1 || isBannerLoading) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % bannersData.banners.length);
    }, (bannersData.autoSwipeSeconds || 3) * 1000);
    return () => clearInterval(interval);
  }, [bannersData, isBannerLoading]);

  const handleBannerTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleBannerTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleBannerTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      setCurrentBannerIndex((prev) => (prev + 1) % bannersData.banners.length);
    } else if (diff < -50) {
      setCurrentBannerIndex((prev) => (prev - 1 + bannersData.banners.length) % bannersData.banners.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  useEffect(() => {
    // Active users fluctuation loop every 3 seconds
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const { min, max } = getActiveUsersRange(hour);

      let nextValue;
      setActiveUsers((prev) => {
        let value = prev;
        if (prev < min || prev > max) {
          value = getRandomInRange(min, max);
        } else {
          const change = Math.floor(Math.random() * 31) - 15;
          value = Math.max(min, Math.min(max, prev + change));
        }
        nextValue = value;
        return value;
      });

      setActiveHistory((prevHistory) => {
        const newHistory = [...prevHistory, nextValue];
        return newHistory.slice(-10);
      });
    }, 3000);

    return () => clearInterval(interval);
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

  // SVG dynamic coordinate sparkline generator
  const generateSparklinePath = (history) => {
    if (history.length === 0) return '';
    const minVal = Math.min(...history);
    const maxVal = Math.max(...history);
    const range = maxVal - minVal || 1;
    const heightLimit = 20;
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * 100;
      const normalized = (val - minVal) / range;
      const y = 25 - (normalized * heightLimit);
      return { x, y };
    });
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  return (
    <div className="min-h-screen bg-[#000] text-white overflow-x-hidden font-inter pb-24 page-transition relative">
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

            <button className="relative w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-[#FFD700] hover:scale-105 active:scale-95 transition-all">
              <Bell size={16} />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-black scale-90">
                1
              </span>
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
        <section className="mb-6">
          {isBannerLoading ? (
            // Shimmer Skeleton Loader
            <div className="w-full aspect-[16/9] md:aspect-[2.1/1] rounded-[2.2rem] bg-[#1a1a1a] border border-white/5 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
          ) : bannersData.banners.length > 0 ? (
            <div
              className="relative w-full aspect-[16/9] md:aspect-[2.1/1] rounded-[2.2rem] overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.7)] group"
              onTouchStart={handleBannerTouchStart}
              onTouchMove={handleBannerTouchMove}
              onTouchEnd={handleBannerTouchEnd}
            >
              {bannersData.banners.map((banner, idx) => (
                <div
                  key={banner.id || idx}
                  className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer origin-center ${
                    idx === currentBannerIndex 
                      ? 'opacity-100 scale-100 translate-x-0 z-10 blur-none' 
                      : 'opacity-0 scale-110 translate-x-8 z-0 blur-[2px]'
                  }`}
                  onClick={() => {
                    if (banner.actionUrl && banner.actionUrl !== '#') {
                      navigate(banner.actionUrl);
                    }
                  }}
                >
                  <img
                    src={banner.imageUrl}
                    alt={`Banner ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}

              {/* Dots Indicator */}
              {bannersData.banners.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
                  {bannersData.banners.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentBannerIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentBannerIndex
                        ? 'w-6 bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.8)]'
                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Fallback if no banner exists
            <div className="w-full h-24 rounded-3xl bg-[#111] border border-white/5 flex flex-col items-center justify-center text-gray-500">
              <span className="text-xs uppercase tracking-widest font-bold">No Banner Available</span>
            </div>
          )}
        </section>

        {/* --- 3. 5-COLUMN MENU ICON SCROLLER / GRID --- */}
        <section className="mb-8">
          <div className="bg-[#111]/80 border border-white/5 rounded-3xl p-4 flex items-start justify-between shadow-lg backdrop-blur-md">
            {[
              { label: "Teacher's Library", icon: BookOpen, path: '/teachers-library', color: 'text-[#FFD700]', bgClass: 'bg-[#FFD700]' },
              { label: "Coaching Library", icon: Presentation, path: '/coaching', color: 'text-[#30D158]', bgClass: 'bg-[#30D158]' },
              { label: "Crash Course", icon: Zap, path: '/crash', color: 'text-[#BF5AF2]', bgClass: 'bg-[#BF5AF2]' },
              { label: "PDF Zone", icon: FileText, path: '/pdf-zone', color: 'text-[#FF453A]', bgClass: 'bg-[#FF453A]' },
              { label: "Book Library", icon: Book, path: '/book-library', color: 'text-[#0A84FF]', bgClass: 'bg-[#0A84FF]' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => navigate(item.path)}
                    className="group flex flex-col items-center justify-start flex-1 transition-all duration-300 active:scale-90 hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-[0_8px_16px_rgba(0,0,0,0.4)] relative overflow-hidden group-hover:border-white/30 transition-colors">
                      {/* Subtle background glow */}
                      <div className={`absolute inset-0 opacity-20 blur-xl rounded-full ${item.bgClass}`} />

                      <Icon size={22} className={`${item.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 transition-transform group-hover:scale-110`} />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-center tracking-wide text-gray-300 max-w-[60px] leading-tight group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </button>
                  {idx < 4 && (
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center" />
                  )}
                </React.Fragment>
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
            <div className="bg-[#111]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden backdrop-blur-md">
              <div>
                <div className="w-7 h-7 rounded-xl bg-[#30D158]/10 flex items-center justify-center text-[#30D158] mb-3">
                  <Users size={14} />
                </div>
                <span className="text-xl font-bold font-mono tracking-tight block leading-none">
                  {activeUsers}
                </span>
                <span className="text-[8px] text-[#8E8E93] uppercase font-bold tracking-wider mt-1 block">
                  Active Users
                </span>
              </div>
              {/* Dynamic Sparkline */}
              <div className="w-full h-8 mt-3 opacity-80">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path
                    d={generateSparklinePath(activeHistory)}
                    fill="none"
                    stroke="#30D158"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Impact Card 2: Premium Lectures */}
            <div className="bg-[#111]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden backdrop-blur-md">
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
            <div className="bg-[#111]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden backdrop-blur-md">
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
          <div className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-5 flex items-center justify-between shadow-lg backdrop-blur-md">
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

        {/* --- 4.5 SECONDARY MENU GRID --- */}
        <section className="mb-8">
          <div className="bg-[#111]/80 border border-white/5 rounded-3xl p-4 flex items-start justify-between shadow-lg backdrop-blur-md">
            {[
              { label: "Mentorship", icon: Target, path: '/mentorship', color: 'text-[#FFD700]', bgClass: 'bg-[#FFD700]' },
              { label: "Naino Store", icon: Store, path: '/store', color: 'text-[#30D158]', bgClass: 'bg-[#30D158]' },
              { label: "Premium Notes", icon: Star, path: '#', color: 'text-[#BF5AF2]', bgClass: 'bg-[#BF5AF2]' },
              { label: "News", icon: Newspaper, path: '#', color: 'text-[#FF453A]', bgClass: 'bg-[#FF453A]' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => { if (item.path !== '#') navigate(item.path); }}
                    className="group flex flex-col items-center justify-start flex-1 transition-all duration-300 active:scale-90 hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-[0_8px_16px_rgba(0,0,0,0.4)] relative overflow-hidden group-hover:border-white/30 transition-colors">
                      <div className={`absolute inset-0 opacity-20 blur-xl rounded-full ${item.bgClass}`} />
                      <Icon size={22} className={`${item.color} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] z-10 transition-transform group-hover:scale-110`} />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-center tracking-wide text-gray-300 max-w-[60px] leading-tight group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </button>
                  {idx < 3 && (
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/10 to-transparent self-center" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>

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
                    className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-4 flex gap-4 shadow-lg backdrop-blur-md relative overflow-hidden group hover:border-[#FFD700]/30 transition-all duration-300 cursor-pointer"
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
          <div className="bg-gradient-to-r from-[#FFD700]/10 via-[#FFD700]/5 to-transparent border border-[#FFD700]/25 rounded-[2rem] p-4 flex items-center justify-between gap-4 shadow-[0_10px_35px_rgba(255,215,0,0.03)] backdrop-blur-md">
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
