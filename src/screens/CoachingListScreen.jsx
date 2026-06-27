import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import PremiumModal from '../components/PremiumModal';
import { isItemLocked } from '../utils/premiumLock';

const CoachingListScreen = () => {
  const [allCoachings, setAllCoachings] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const navigate = useNavigate();
  const observerTarget = useRef(null);

  useEffect(() => {
    const fetchCoachings = async () => {
      try {
        const data = await fetchWithCache('/api/directory/coaching.json', 'cache_coaching_directory_v2');

        // Convert object to array and sort by order
        const coachingArray = Object.entries(data)
          .map(([id, coachingData]) => ({
            id,
            ...coachingData
          }))
          .sort((a, b) => (a.order || 99) - (b.order || 99));

        setAllCoachings(coachingArray);
      } catch (err) {
        console.error(err);
        setError('Failed to load coachings.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoachings();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setTimeout(() => {
            setVisibleCount(prev => prev + 12);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [allCoachings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 md:p-12 pb-20 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="w-48 h-8 bg-white/10 rounded mb-8 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center p-4 bg-[#121212] rounded-3xl border border-[#222]">
                <div className="w-24 h-24 rounded-full bg-white/5 mb-3" />
                <div className="w-20 h-4 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-red-500 font-bold">
        <p>{error}</p>
      </div>
    );
  }

  const visibleCoachings = allCoachings.slice(0, visibleCount);
  const hasMore = visibleCount < allCoachings.length;

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 pb-24 text-white page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-oswald font-extrabold text-[#FFD700] tracking-wide uppercase flex items-center gap-2.5 truncate">
              <Sparkles className="text-[#FFD700] shrink-0" size={24} />
              <span>Top Institutes</span>
            </h1>
            <div className="px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] font-mono text-[11px] font-bold shrink-0">
              {allCoachings.length} Available
            </div>
          </div>
          <p className="text-gray-400 font-inter text-xs sm:text-sm">
            Select an institute icon below to explore all batches & lectures
          </p>
        </header>

        {/* Circular Institutes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
          {visibleCoachings.map((coaching) => {
            const title = coaching.coachingName || coaching.title || 'Coaching';
            const isComingSoon = title.toLowerCase().includes('coming soon');
            const imageUrl = coaching.image || coaching.thumbnail || '';

            return (
              <div
                key={coaching.id}
                onClick={() => {
                  if (isComingSoon) return;
                  if (isItemLocked(coaching)) {
                    setShowPremiumModal(true);
                    return;
                  }
                  navigate(`/coaching/${coaching.id}`, { state: { coaching } });
                }}
                className={`group relative flex flex-col items-center justify-between p-5 bg-gradient-to-b from-[#181818] to-[#101010] rounded-[28px] border ${
                  isComingSoon
                    ? 'border-white/5 opacity-50 cursor-not-allowed'
                    : 'border-white/10 hover:border-[#FFD700] cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(255,215,0,0.18)]'
                } transition-all duration-300 shadow-xl min-h-[170px]`}
              >
                {/* Glowing Circle Icon Frame */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#FFD700] via-[#FF9000] to-[#FFEA75] shadow-[0_5px_20px_rgba(255,215,0,0.25)] group-hover:scale-105 transition-transform duration-300">
                  <div className="w-full h-full rounded-full bg-[#0a0a0a] overflow-hidden flex items-center justify-center relative p-1 sm:p-1.5">
                    {imageUrl ? (
                      <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-4xl font-extrabold text-[#FFD700] font-oswald">{title.charAt(0)}</span>
                    )}
                  </div>
                  
                  {/* Premium Lock Badge */}
                  {coaching.isPremium && !isComingSoon && (
                    <div className="absolute top-0 right-0 bg-black/95 p-1.5 rounded-full border border-[#FFD700] shadow-md z-10 animate-bounce-short">
                      <Lock size={12} className="text-[#FFD700]" />
                    </div>
                  )}
                </div>

                {/* Institute Title */}
                <div className="mt-4 text-center w-full">
                  <h3 className="text-white font-extrabold text-xs sm:text-sm tracking-wide uppercase line-clamp-2 group-hover:text-[#FFD700] transition-colors font-inter">
                    {title}
                  </h3>
                  
                  {isComingSoon && (
                    <div className="mt-1.5 inline-block text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-white/10 text-gray-400 rounded-full">
                      Coming Soon
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div ref={observerTarget} className="mt-12 flex justify-center pb-8 w-full max-w-[180px] mx-auto animate-pulse">
            <div className="w-full h-8 bg-white/5 rounded-full relative overflow-hidden border border-white/5" />
          </div>
        )}
      </div>
      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  );
};

export default CoachingListScreen;
