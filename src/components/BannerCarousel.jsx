import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithCache } from '../utils/api';

const BannerCarousel = () => {
  const navigate = useNavigate();
  
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
  const [bannersData, setBannersData] = useState(initialBannerData || { autoSwipeSeconds: 3, banners: [] });
  const [isBannerLoading, setIsBannerLoading] = useState(!initialBannerData);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
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

  if (isBannerLoading) {
    return (
      <section className="mb-6">
        <div className="w-full aspect-[16/9] md:aspect-[2.1/1] rounded-[2.2rem] bg-[#1a1a1a] border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
        </div>
      </section>
    );
  }

  if (bannersData.banners.length === 0) {
    return (
      <section className="mb-6">
        <div className="w-full h-24 rounded-3xl bg-[#111] border border-white/5 flex flex-col items-center justify-center text-gray-500">
          <span className="text-xs uppercase tracking-widest font-bold">No Banner Available</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
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

        {bannersData.banners.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20 overflow-hidden">
            <div 
              key={currentBannerIndex} 
              className="h-full bg-gradient-to-r from-[#FFD700] to-yellow-500 rounded-full animate-banner-timer"
              style={{ 
                animation: `bannerTimerProgress ${(bannersData.autoSwipeSeconds || 3)}s linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default BannerCarousel;
