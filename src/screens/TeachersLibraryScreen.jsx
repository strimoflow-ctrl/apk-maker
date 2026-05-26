import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import { fetchWithCache } from '../utils/api';

const TeachersLibraryScreen = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const observerTarget = useRef(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await fetchWithCache('/api/directory/courses.json', 'cache_courses_directory');


        // Convert object to array and sort by order
        const courseArray = Object.entries(data)
          .map(([id, courseData]) => ({
            id,
            ...courseData
          }))
          .sort((a, b) => a.order - b.order);

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
  }, [allCourses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-apple-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-apple-gold)]"></div>
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

  const visibleCourses = allCourses.slice(0, visibleCount);
  const hasMore = visibleCount < allCourses.length;

  return (
    <div className="min-h-screen bg-[var(--color-apple-bg)] p-6 md:p-12 page-transition">
      <div className="max-w-7xl mx-auto">
        <p className="text-[var(--color-apple-textmuted)] font-inter mb-6 md:mb-8 text-center md:text-left text-sm tracking-wide">Teacher's Library - Premium Courses</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/course/${course.id}`, { state: { course } })}
            />
          ))}
        </div>

        {/* Intersection Observer Target and Loading Spinner */}
        {hasMore && (
          <div ref={observerTarget} className="mt-12 flex justify-center pb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-apple-gold)]"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachersLibraryScreen;
