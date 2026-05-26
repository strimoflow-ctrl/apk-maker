import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { fetchWithCache } from '../utils/api';

const CrashCourseListScreen = () => {
  const [allCrashCourses, setAllCrashCourses] = useState([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const observerTarget = useRef(null);

  useEffect(() => {
    const fetchCrashCourses = async () => {
      try {
        const data = await fetchWithCache('/api/directory/crash_courses.json', 'cache_crash_directory');

        // Convert object to array and sort by order
        const crashArray = Object.entries(data)
          .map(([id, crashData]) => ({
            id,
            ...crashData
          }))
          .sort((a, b) => a.order - b.order);

        setAllCrashCourses(crashArray);
      } catch (err) {
        console.error(err);
        setError('Failed to load crash courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchCrashCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setTimeout(() => {
            setVisibleCount(prev => prev + 6);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [allCrashCourses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
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

  const visibleCrashCourses = allCrashCourses.slice(0, visibleCount);
  const hasMore = visibleCount < allCrashCourses.length;

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 pb-12 text-white page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase">
            Crash Courses
          </h1>
          <p className="text-gray-400 font-inter text-sm mt-2">Finish your syllabus in record time</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCrashCourses.map((crash) => (
            <CourseCard
              key={crash.id}
              course={crash}
              onClick={() => {
                if (crash.title.includes('Coming Soon')) return;
                navigate(`/crash/${crash.id}`, { state: { crashCourse: crash } });
              }}
            />
          ))}
        </div>

        {hasMore && (
          <div ref={observerTarget} className="mt-12 flex justify-center pb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD700]"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrashCourseListScreen;
