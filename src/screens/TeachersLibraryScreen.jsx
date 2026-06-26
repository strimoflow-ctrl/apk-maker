import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { fetchWithCache } from '../utils/api';

const TeachersLibraryScreen = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const navigate = useNavigate();
  const observerTarget = useRef(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await fetchWithCache('/api/directory/courses.json', 'cache_courses_directory');

        // Convert object to array and sort by order
        const courseArray = Object.entries(data || {})
          .map(([id, courseData]) => ({
            id,
            ...courseData
          }))
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        setAllCourses(courseArray);
      } catch (err) {
        console.error(err);
        setError('Failed to load courses.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
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
  }, [allCourses, searchTerm, selectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-apple-bg)] p-6 md:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="w-48 h-3.5 bg-white/10 rounded mb-6 relative overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
          </div>

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-apple-bg)] text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(
    allCourses.flatMap(c => c.category ? c.category.split(',').map(s => s.trim()).filter(Boolean) : [])
  ))];

  const filteredCourses = allCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.instructor && course.instructor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || (
      course.category && course.category.split(',').map(s => s.trim()).includes(selectedCategory)
    );
    return matchesSearch && matchesCategory;
  });

  const visibleCourses = filteredCourses.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCourses.length;

  return (
    <div className="min-h-screen bg-[var(--color-apple-bg)] p-6 md:p-12 pb-16 page-transition pt-[calc(var(--safe-area-top)+1.5rem)]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
                🎓 Teacher's Library
              </h1>
              <p className="text-[var(--color-apple-textmuted)] font-inter text-sm mt-1">Premium Video Lectures & Modules</p>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search Courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-[#FFD700] transition-colors"
            />
          </div>
        </header>

        {/* Category Pills Bar */}
        {categories.length > 1 && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105'
                    : 'bg-[#111] border border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <p className="text-lg">No courses found matching your search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => navigate(`/course/${course.id}`, { state: { course } })}
              />
            ))}
          </div>
        )}

        {/* Intersection Observer Target and Loading Spinner */}
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

export default TeachersLibraryScreen;
