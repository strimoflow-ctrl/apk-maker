import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { fetchWithCache } from '../utils/api';

const CoachingListScreen = () => {
  const [allCoachings, setAllCoachings] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
          .sort((a, b) => a.order - b.order);

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
          // Add a small delay for smoother UX so spinner is visible
          setTimeout(() => {
            setVisibleCount(prev => prev + 5);
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
      <div className="min-h-screen bg-[#050505] p-6 md:p-12 pb-12 text-white">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <header className="mb-8 animate-pulse">
            <div className="w-48 h-8 bg-white/10 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
            <div className="w-64 h-3.5 bg-white/5 rounded relative overflow-hidden mt-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
          </header>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div 
                key={idx}
                className="bg-[#121212] rounded-xl overflow-hidden flex flex-col h-full border border-[#222] min-h-[220px] relative"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                </div>
                
                <div className="p-4 flex flex-col flex-grow justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="w-full h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-2/3 h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                  </div>
                  
                  <div className="w-full h-10 bg-white/5 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const visibleCoachings = allCoachings.slice(0, visibleCount);
  const hasMore = visibleCount < allCoachings.length;

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 pb-12 text-white page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase">
            Top Coachings
          </h1>
          <p className="text-gray-400 font-inter text-sm mt-2">Explore premium coaching materials</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCoachings.map((coaching) => (
            <CourseCard
              key={coaching.id}
              course={coaching}
              onClick={() => {
                if (coaching.title.includes('Coming Soon')) return;
                navigate(`/coaching/${coaching.id}`, { state: { coaching } });
              }}
            />
          ))}
        </div>

        {/* Intersection Observer Target and Loading Skeleton */}
        {hasMore && (
          <div ref={observerTarget} className="mt-12 flex justify-center pb-8 w-full max-w-[180px] mx-auto animate-pulse">
            <div className="w-full h-8 bg-white/5 rounded-full relative overflow-hidden border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachingListScreen;
