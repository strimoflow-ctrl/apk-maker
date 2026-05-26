import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import VideoPlayer from '../components/VideoPlayer';
import { useDownload } from '../context/DownloadContext';

const PlayerScreen = () => {
  const { courseId, lectureId: encodedLectureId } = useParams();
  const lectureId = decodeURIComponent(encodedLectureId);
  const navigate = useNavigate();
  const { getOfflineFileUrl } = useDownload();

  const [lectureData, setLectureData] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState(null);

  useEffect(() => {
    const loadLecture = async () => {
      setLoading(true);
      try {
        // Fetch course directory to get the target file
        const dirData = await fetchWithCache('/api/directory/courses.json', 'cache_courses_directory');
        if (!dirData[courseId]) {
          throw new Error('Course not found');
        }
        setCourseTitle(dirData[courseId].title);

        // Fetch course content
        const courseData = await fetchWithCache(`/api${dirData[courseId].target_file}`, `cache_course_content_${courseId}`);
        
        let foundLecture = null;
        for (const subject of courseData.subjects || []) {
          for (const chapter of subject.chapters || []) {
            const l = (chapter.lectures || []).find(l => l.name === lectureId);
            if (l) {
              foundLecture = l;
              break;
            }
          }
          if (foundLecture) break;
        }

        if (!foundLecture) {
          throw new Error('Lecture not found in this course.');
        }

        setLectureData(foundLecture);

        // Check if offline
        const offlineUrl = await getOfflineFileUrl('video', courseId, lectureId);
        setOfflineVideoUrl(offlineUrl);

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLecture();
  }, [courseId, lectureId, getOfflineFileUrl]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (error || !lectureData) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <p className="text-red-500 mb-4">{error || 'Video could not be loaded.'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-[#FFD700] text-black font-bold rounded-full"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <button 
          onClick={() => navigate(-1)} 
          className="pointer-events-auto bg-black/40 hover:bg-[#FFD700] hover:text-black p-2 rounded-full backdrop-blur-md transition-all text-white"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 w-full h-full relative">
        <VideoPlayer 
          videoUrl={offlineVideoUrl || lectureData.link}
          title={lectureData.name}
          courseTitle={courseTitle}
          courseId={courseId}
          lectureId={lectureData.name}
          onVideoEnd={() => {
            // Optional: Auto-close or show end screen
            navigate(-1);
          }}
        />
      </div>
    </div>
  );
};

export default PlayerScreen;
