import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, PlayCircle, FileText, Download, CheckCircle, Loader2 } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import VideoPlayer from '../components/VideoPlayer';
import { useDownload } from '../context/DownloadContext';
import SaveButton from '../components/SaveButton';

const CourseDetailScreen = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [course, setCourse] = useState(location.state?.course || null);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for navigation within the course
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [activeLectureIndex, setActiveLectureIndex] = useState(0);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState(null);
  
  const hasAutoResumed = useRef(false);
  const activeLectureRef = useRef(null);
  const lectureListContainerRef = useRef(null);

  const { downloadFile, isDownloaded, isDownloading, activeDownloads, getOfflineFileUrl } = useDownload();

  // Auto-scroll to active lecture within the lecture list container
  useEffect(() => {
    if (activeLectureRef.current && lectureListContainerRef.current) {
      setTimeout(() => {
        const container = lectureListContainerRef.current;
        const element = activeLectureRef.current;
        
        // Calculate the relative offset of the element within the container
        const containerTop = container.getBoundingClientRect().top;
        const elementTop = element.getBoundingClientRect().top;
        const relativeTop = elementTop - containerTop;
        
        // Scroll only the container
        container.scrollTo({
          top: container.scrollTop + relativeTop - (container.clientHeight / 2) + (element.clientHeight / 2),
          behavior: 'smooth'
        });
      }, 300);
    }
  }, [activeLecture, selectedChapter]);

  // Fetch course info if not passed via state
  useEffect(() => {
    if (!course) {
      const fetchCourseInfo = async () => {
        try {
          const data = await fetchWithCache('/api/directory/courses.json', 'cache_courses_directory');
          if (data[courseId]) {
            setCourse({ id: courseId, ...data[courseId] });
          } else {
            throw new Error('Course not found');
          }
        } catch (err) {
          console.error(err);
          setError(err.message);
          setLoading(false);
        }
      };
      fetchCourseInfo();
    }
  }, [course, courseId]);

  // Fetch course content
  useEffect(() => {
    if (course && course.target_file) {
      const fetchContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithCache(`/api${course.target_file}`, `cache_course_content_${courseId}`);
          setCourseData(data);
        } catch (err) {
          console.error(err);
          setError('Failed to load course content. Make sure the content JSON exists.');
        } finally {
          setLoading(false);
        }
      };
      fetchContent();
    }
  }, [course]);

  // Auto-play from state (e.g. from Downloads screen)
  useEffect(() => {
    if (courseData && location.state?.autoPlayLecture && !selectedChapter) {
      const lectureId = location.state.autoPlayLecture;
      const ctx = location.state.coachingContext;

      // Case 1: We have coachingContext containing the chapterName
      if (ctx && ctx.chapterName) {
        for (const subject of courseData.subjects || []) {
          const chapter = (subject.chapters || []).find(c => c.chapter === ctx.chapterName || c.name === ctx.chapterName);
          if (chapter) {
            const lIndex = (chapter.lectures || []).findIndex(l => l.name === lectureId);
            if (lIndex !== -1) {
              setSelectedChapter(chapter);
              setActiveLecture(chapter.lectures[lIndex]);
              setActiveLectureIndex(lIndex);
              
              getOfflineFileUrl('video', courseId, lectureId).then(offlineUrl => {
                setOfflineVideoUrl(offlineUrl);
              });
              
              const cleanState = { ...location.state };
              delete cleanState.autoPlayLecture;
              delete cleanState.coachingContext;
              navigate(location.pathname, { replace: true, state: cleanState });
              navigate(location.pathname + "?chapter=active", { replace: false, state: cleanState });
              return;
            }
          }
        }
      }

      // Case 2: Flat fallback search
      for (const subject of courseData.subjects || []) {
        for (const chapter of subject.chapters || []) {
          const lIndex = (chapter.lectures || []).findIndex(l => l.name === lectureId);
          if (lIndex !== -1) {
            setSelectedChapter(chapter);
            setActiveLecture(chapter.lectures[lIndex]);
            setActiveLectureIndex(lIndex);
            
            getOfflineFileUrl('video', courseId, lectureId).then(offlineUrl => {
              setOfflineVideoUrl(offlineUrl);
            });
            
            const cleanState = { ...location.state };
            delete cleanState.autoPlayLecture;
            delete cleanState.coachingContext;
            navigate(location.pathname, { replace: true, state: cleanState });
            navigate(location.pathname + "?chapter=active", { replace: false, state: cleanState });
            return;
          }
        }
      }
    }
  }, [courseData, location.state, courseId, navigate, getOfflineFileUrl, selectedChapter]);

  // Handle URL change to reset chapter selection on back button pop
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') !== 'active') {
      setSelectedChapter(null);
      setActiveLecture(null);
    }
  }, [location.search]);

  // Save active lecture state to sessionStorage to survive navigation
  useEffect(() => {
    if (selectedChapter && activeLecture) {
      sessionStorage.setItem(`naino_active_course_${courseId}_chapter`, JSON.stringify(selectedChapter));
      sessionStorage.setItem(`naino_active_course_${courseId}_lecture`, JSON.stringify(activeLecture));
      sessionStorage.setItem(`naino_active_course_${courseId}_index`, String(activeLectureIndex));
    }
  }, [selectedChapter, activeLecture, activeLectureIndex, courseId]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') !== 'active') {
      sessionStorage.removeItem(`naino_active_course_${courseId}_chapter`);
      sessionStorage.removeItem(`naino_active_course_${courseId}_lecture`);
      sessionStorage.removeItem(`naino_active_course_${courseId}_index`);
    }
  }, [location.search, courseId]);

  // Restore active lecture state on mount if URL query has ?chapter=active
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') === 'active' && !selectedChapter && courseData) {
      try {
        const savedChapter = sessionStorage.getItem(`naino_active_course_${courseId}_chapter`);
        const savedLecture = sessionStorage.getItem(`naino_active_course_${courseId}_lecture`);
        const savedIndex = sessionStorage.getItem(`naino_active_course_${courseId}_index`);
        
        if (savedChapter && savedLecture) {
          const ch = JSON.parse(savedChapter);
          const lec = JSON.parse(savedLecture);
          
          let chapterExists = false;
          for (const subject of courseData.subjects || []) {
            const foundCh = (subject.chapters || []).find(c => c.name === ch.name || c.chapter === ch.chapter || c.name === ch.chapter || c.chapter === ch.name);
            if (foundCh) {
              const foundLec = (foundCh.lectures || []).find(l => l.name === lec.name);
              if (foundLec) {
                chapterExists = true;
                setSelectedChapter(foundCh);
                setActiveLecture(foundLec);
                setActiveLectureIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
                
                getOfflineFileUrl('video', courseId, lec.name).then(offlineUrl => {
                  setOfflineVideoUrl(offlineUrl);
                });
                break;
              }
            }
          }
          if (!chapterExists) {
            navigate(location.pathname, { replace: true });
          }
        } else {
          navigate(location.pathname, { replace: true });
        }
      } catch (e) {
        console.error("Failed to restore active lecture state:", e);
      }
    }
  }, [courseData, location.search, courseId, navigate, getOfflineFileUrl, selectedChapter]);

  // View: Chapter List (Image 2)
  if (!selectedChapter) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-4 md:p-6 pb-12 page-transition">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-[#FFD700] font-oswald text-2xl font-bold uppercase tracking-wide truncate">
              {course ? course.title : 'Loading...'}
            </h1>
          </div>
          {course && (
            <div className="shrink-0">
              <SaveButton 
                shake={true}
                item={{ 
                  id: courseId, 
                  type: 'course', 
                  courseId: courseId, 
                  courseTitle: course.title, 
                  image: course.image 
                }} 
              />
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {courseData?.subjects?.[0]?.chapters?.map((chapter, idx) => (
              <div
                key={idx}
                onClick={() => {
                  window.scrollTo(0, 0);
                  setSelectedChapter(chapter);
                  navigate(location.pathname + "?chapter=active", { state: location.state });
                  if (chapter.lectures && chapter.lectures.length > 0) {
                    let nextActiveLec = chapter.lectures[0];
                    let nextActiveIndex = 0;
                    try {
                      const recentRaw = localStorage.getItem('naino_recent_activity');
                      let foundRecent = null;
                      
                      if (recentRaw) {
                        const recent = JSON.parse(recentRaw);
                        const chapterLectureNames = chapter.lectures.map(l => l.name);
                        
                        // Find the most recent watched lecture for this chapter
                        foundRecent = recent.find(r => 
                          r.courseId === courseId && 
                          chapterLectureNames.includes(r.lectureTitle)
                        );
                      }
                      
                      if (foundRecent) {
                        const idx = chapter.lectures.findIndex(l => l.name === foundRecent.lectureTitle);
                        if (idx !== -1) {
                          nextActiveLec = chapter.lectures[idx];
                          nextActiveIndex = idx;
                        }
                      }
                    } catch (e) {
                      console.warn(e);
                    }
                    setActiveLecture(nextActiveLec);
                    setActiveLectureIndex(nextActiveIndex);
                    localStorage.setItem(`naino_last_lecture_${courseId}`, nextActiveLec.name);
                  }
                }}
                className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-[#FFD700]/50 transition-colors shadow-lg"
              >
                <div>
                  <h3 className="font-bold text-white text-[0.95rem] mb-1">{chapter.chapter}</h3>
                  <p className="text-gray-400 text-xs">{chapter.lectures?.length || 0} Videos</p>
                </div>
                <div className="border border-[#FFD700]/30 p-1.5 rounded-full">
                  <PlayCircle className="text-[#FFD700]" size={24} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleNextLecture = () => {
    if (selectedChapter && selectedChapter.lectures) {
      if (activeLectureIndex < selectedChapter.lectures.length - 1) {
        setActiveLecture(selectedChapter.lectures[activeLectureIndex + 1]);
        setActiveLectureIndex(activeLectureIndex + 1);
      }
    }
  };

  const handlePrevLecture = () => {
    if (selectedChapter && selectedChapter.lectures) {
      if (activeLectureIndex > 0) {
        setActiveLecture(selectedChapter.lectures[activeLectureIndex - 1]);
        setActiveLectureIndex(activeLectureIndex - 1);
      }
    }
  };

  const hasNext = selectedChapter?.lectures && activeLectureIndex < selectedChapter.lectures.length - 1;
  const hasPrev = activeLectureIndex > 0;

  // View: Lecture List & Video Player (Image 3)
  return (
    <div className="h-[100dvh] bg-[#111] text-white flex flex-col overflow-hidden page-transition">
      {/* Top Header */}
      <header className="bg-black p-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold hover:text-[#FFD700] transition-colors uppercase"
        >
          <ArrowLeft size={18} /> BACK
        </button>
        <button
          onClick={() => navigate('/', { replace: true })}
          className="flex items-center gap-2 text-sm font-semibold hover:text-[#FFD700] transition-colors uppercase"
        >
          <Home size={18} /> HOME
        </button>
      </header>

      {/* Video Player Area */}
      <div className="w-full bg-black aspect-video relative z-20 max-w-5xl mx-auto border-b border-white/10 shadow-lg">
        {activeLecture?.link ? (
          <VideoPlayer 
            key={offlineVideoUrl || activeLecture.link}
            videoUrl={offlineVideoUrl || activeLecture.link}
            title={activeLecture.name}
            courseTitle={course?.title}
            courseId={courseId}
            lectureId={activeLecture.name}
            coachingContext={selectedChapter ? {
              chapterName: selectedChapter.chapter || selectedChapter.name
            } : null}
            onVideoEnd={handleNextLecture}
            onNext={hasNext ? handleNextLecture : null}
            onPrevious={hasPrev ? handlePrevLecture : null}
            type="course"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Unable to play
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="p-4 bg-black border-b border-white/5 flex justify-between items-center">
        <div>
          <h2 className="text-[#FFD700] font-bold text-lg mb-1">
            Lecture {(activeLectureIndex + 1).toString().padStart(2, '0')}
          </h2>
          <p className="text-gray-400 text-sm">
            {selectedChapter.chapter}
          </p>
        </div>
        {offlineVideoUrl && (
          <div className="bg-[#FFD700]/10 text-[#FFD700] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-[#FFD700]/30">
            <CheckCircle size={14} /> OFFLINE
          </div>
        )}
      </div>



      {/* Lectures List */}
      <div ref={lectureListContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pb-8 bg-[#181818]">
        <div className="max-w-5xl mx-auto">
          {selectedChapter.lectures?.map((lecture, idx) => {
            const isPlaying = activeLecture === lecture;

            return (
              <div
                key={idx}
                ref={isPlaying ? activeLectureRef : null}
                className={`p-4 border-b flex flex-col gap-2 transition-colors ${isPlaying ? 'bg-white/10 border-[#FFD700]/30' : 'border-white/5 hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-white text-sm font-semibold">Lecture {(idx + 1).toString().padStart(2, '0')}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs truncate max-w-[200px] text-right">
                      {lecture.name}
                    </span>
                    <SaveButton 
                      item={{ 
                        id: `course_video_${courseId}_${lecture.name}`, 
                        type: 'course', 
                        courseId: courseId, 
                        courseTitle: course?.title, 
                        lectureId: lecture.name, 
                        lectureTitle: lecture.name,
                        coachingContext: {
                          chapterName: selectedChapter?.chapter || selectedChapter?.name
                        }
                      }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 overflow-x-auto pb-2 custom-scrollbar">
                  <button
                    onClick={async () => {
                      setActiveLecture(lecture);
                      setActiveLectureIndex(idx);
                      localStorage.setItem(`naino_last_lecture_${courseId}`, lecture.name);
                      // Check offline
                      const offlineUrl = await getOfflineFileUrl('video', courseId, lecture.name);
                      setOfflineVideoUrl(offlineUrl);
                    }}
                    className={`shrink-0 px-4 py-1.5 rounded text-xs font-bold transition-colors ${isPlaying
                      ? 'bg-[#FFD700] text-black'
                      : 'bg-[#00E600] text-black hover:bg-[#00c900]'
                      }`}
                  >
                    {isPlaying ? 'PLAYING...' : 'PLAY'}
                  </button>

                  {/* Video Download Button */}
                  {isDownloaded('video', courseId, lecture.name) ? (
                    <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-green-500 text-green-500 flex items-center gap-1 opacity-70">
                      <CheckCircle size={14} /> SAVED
                    </button>
                  ) : isDownloading('video', courseId, lecture.name) ? (
                    <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] flex items-center gap-1">
                      <Loader2 size={14} className="animate-spin" /> 
                      {Math.round(activeDownloads[`naino_offline_video_${courseId}_${lecture.name}`]?.progress || 0)}%
                    </button>
                  ) : (
                    <button 
                      onClick={() => downloadFile('video', courseId, lecture.name, lecture.link, lecture.name, course?.title, selectedChapter?.chapter)}
                      className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <Download size={14} /> VIDEO
                    </button>
                  )}

                  {lecture.notes && (
                    <>
                      <button
                        onClick={async () => {
                          const offlinePdf = await getOfflineFileUrl('pdf', courseId, lecture.name);
                          navigate('/pdf', { 
                            state: { 
                              file: offlinePdf || lecture.notes, 
                              title: `${lecture.name} Notes`
                            } 
                          });
                        }}
                        className="shrink-0 px-4 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors flex items-center gap-1 ml-auto"
                      >
                        <FileText size={14} /> VIEW PDF
                      </button>

                      {/* PDF Download Button */}
                      {!isDownloaded('pdf', courseId, lecture.name) && !isDownloading('pdf', courseId, lecture.name) && (
                        <button 
                          onClick={() => downloadFile('pdf', courseId, lecture.name, lecture.notes, `${lecture.name} Notes`, course?.title, selectedChapter?.chapter)}
                          className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                        >
                          <Download size={14} /> PDF
                        </button>
                      )}
                      
                      {isDownloading('pdf', courseId, lecture.name) && (
                        <span className="text-xs text-[#FFD700] animate-pulse">Downloading...</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CourseDetailScreen;
