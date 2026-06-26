import React, { useState, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, PlayCircle, FileText, Download, CheckCircle, Loader2, X } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import VideoPlayer from '../components/VideoPlayer';
import { useDownload, useDownloadProgress, DownloadProgressText } from '../context/DownloadContext';
import SaveButton from '../components/SaveButton';

const CrashCourseDetailScreen = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [crashCourse, setCrashCourse] = useState(location.state?.crashCourse || null);
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selections
  const [activeBatchIndex, setActiveBatchIndex] = useState(0);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  
  // Dynamic Batch Data State
  const [activeBatchData, setActiveBatchData] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  
  // State for navigation within the course
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeLecture, setActiveLecture] = useState(null);
  const [activeLectureIndex, setActiveLectureIndex] = useState(0);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (offlineVideoUrl && offlineVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(offlineVideoUrl);
        console.log("Revoked offline video blob URL:", offlineVideoUrl);
      }
    };
  }, [offlineVideoUrl]);

  const virtuosoRef = useRef(null);
  const hasAutoResumed = useRef(false);

  const { downloadFile, isDownloaded, isDownloading, getOfflineFileUrl, cancelDownload } = useDownload();

  // Auto-scroll to active lecture
  useEffect(() => {
    if (virtuosoRef.current && activeLectureIndex !== -1) {
      setTimeout(() => {
        virtuosoRef.current.scrollToIndex({
          index: activeLectureIndex,
          align: 'center',
          behavior: 'smooth'
        });
      }, 300);
    }
  }, [activeLecture, selectedChapter, activeLectureIndex]);

  // Fetch crash course info if not passed via state
  useEffect(() => {
    if (!crashCourse) {
      const fetchInfo = async () => {
        try {
          const data = await fetchWithCache('/api/directory/crash_courses.json', 'cache_crash_directory');
          if (data[courseId]) {
            setCrashCourse({ id: courseId, ...data[courseId] });
          } else {
            throw new Error('Crash course not found');
          }
        } catch (err) {
          console.error(err);
          setError(err.message);
          setLoading(false);
        }
      };
      fetchInfo();
    }
  }, [crashCourse, courseId]);

  // Fetch crash course content
  useEffect(() => {
    if (crashCourse && crashCourse.target_file) {
      const fetchContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithCache(`/api${crashCourse.target_file}`, `cache_crash_content_${courseId}`);
          
          // Support both Coaching style (batches) and Course style (flat)
          // If data has subjects but no batches, wrap it in a pseudo-batch
          if (data.subjects && !data.batches) {
             data.batches = [{
                batchName: "Full Course",
                subjects: data.subjects
             }];
          }

          setCourseData(data);
          if (location.state?.activeBatchName && data && data.batches) {
            const idx = data.batches.findIndex(b => b.batchName === location.state.activeBatchName);
            setActiveBatchIndex(idx !== -1 ? idx : 0);
          } else {
            setActiveBatchIndex(0);
          }
          setActiveSubjectIndex(0);
        } catch (err) {
          console.error(err);
          setError('Failed to load crash course content.');
        } finally {
          setLoading(false);
        }
      };
      fetchContent();
    }
  }, [crashCourse, courseId]);

  // Fetch dynamic batch data if dataFile is used
  useEffect(() => {
    if (!courseData || !courseData.batches || !courseData.batches[activeBatchIndex]) return;
    
    const batch = courseData.batches[activeBatchIndex];
    
    if (batch.dataFile) {
      const fetchBatchData = async () => {
        setBatchLoading(true);
        setError(null);
        try {
          const data = await fetchWithCache(`/api${batch.dataFile}`, `cache_batch_data_v3_${batch.dataFile}`);
          if (!data) throw new Error("Empty data received");
          setActiveBatchData(data.subjects ? data : { subjects: data });
        } catch (err) {
          console.error("Batch fetch error:", err);
          setActiveBatchData({ subjects: [] });
        } finally {
          setBatchLoading(false);
        }
      };
      fetchBatchData();
    } else {
      setActiveBatchData(batch);
    }
  }, [courseData, activeBatchIndex]);

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
      sessionStorage.setItem(`naino_active_crash_${courseId}_chapter`, JSON.stringify(selectedChapter));
      sessionStorage.setItem(`naino_active_crash_${courseId}_lecture`, JSON.stringify(activeLecture));
      sessionStorage.setItem(`naino_active_crash_${courseId}_index`, String(activeLectureIndex));
      sessionStorage.setItem(`naino_active_crash_${courseId}_batch_index`, String(activeBatchIndex));
      sessionStorage.setItem(`naino_active_crash_${courseId}_subject_index`, String(activeSubjectIndex));
    }
  }, [selectedChapter, activeLecture, activeLectureIndex, activeBatchIndex, activeSubjectIndex, courseId]);

  // Removed aggressive sessionStorage cleanup to allow state persistence during routing.

  // Restore active lecture state on mount/data load if URL query has ?chapter=active
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') === 'active' && !selectedChapter && courseData) {
      try {
        const savedBatchIndex = sessionStorage.getItem(`naino_active_crash_${courseId}_batch_index`);
        
        // Sync Batch Index first before attempting to find the chapter
        if (savedBatchIndex !== null) {
          const parsedBatchIdx = parseInt(savedBatchIndex, 10);
          if (activeBatchIndex !== parsedBatchIdx) {
            setActiveBatchIndex(parsedBatchIdx);
            return; // Wait for the correct batch data to load
          }
        }

        if (!activeBatchData || !activeBatchData.subjects) return;

        const savedChapter = sessionStorage.getItem(`naino_active_crash_${courseId}_chapter`);
        const savedLecture = sessionStorage.getItem(`naino_active_crash_${courseId}_lecture`);
        const savedIndex = sessionStorage.getItem(`naino_active_crash_${courseId}_index`);
        const savedSubjectIndex = sessionStorage.getItem(`naino_active_crash_${courseId}_subject_index`);
        
        if (savedChapter && savedLecture) {
          const ch = JSON.parse(savedChapter);
          const lec = JSON.parse(savedLecture);
          
          let chapterExists = false;
          const targetSubjectIndex = savedSubjectIndex ? parseInt(savedSubjectIndex, 10) : activeSubjectIndex;
          const subject = activeBatchData.subjects[targetSubjectIndex];
          if (subject) {
            const getChId = (obj) => obj?.chapter || obj?.name;
            const targetId = getChId(ch);
            const foundCh = (subject.chapters || []).find(c => getChId(c) === targetId && targetId);
            if (foundCh) {
              const foundLec = (foundCh.lectures || []).find(l => l.name === lec.name);
              if (foundLec) {
                chapterExists = true;
                if (savedBatchIndex !== null) setActiveBatchIndex(parseInt(savedBatchIndex, 10));
                setActiveSubjectIndex(targetSubjectIndex);
                setSelectedChapter(foundCh);
                setActiveLecture(foundLec);
                setActiveLectureIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
                
                getOfflineFileUrl('video', courseId, lec.name).then(offlineUrl => {
                  setOfflineVideoUrl(offlineUrl);
                });
              }
            }
          }
          
          if (!chapterExists) {
            // Check all subjects
            for (let s = 0; s < activeBatchData.subjects.length; s++) {
              if (s === targetSubjectIndex) continue;
              const sub = activeBatchData.subjects[s];
              const getChId = (obj) => obj?.chapter || obj?.name;
              const targetId = getChId(ch);
              const foundCh = (sub.chapters || []).find(c => getChId(c) === targetId && targetId);
              if (foundCh) {
                const foundLec = (foundCh.lectures || []).find(l => l.name === lec.name);
                if (foundLec) {
                  chapterExists = true;
                  if (savedBatchIndex !== null) setActiveBatchIndex(parseInt(savedBatchIndex, 10));
                  setActiveSubjectIndex(s);
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
  }, [courseData, activeBatchData, location.search, courseId, navigate, getOfflineFileUrl, selectedChapter, activeBatchIndex]);

  // Auto-play from state (Navigation fix included)
  useEffect(() => {
    if (courseData && location.state?.autoPlayLecture && !selectedChapter) {
      const lectureId = location.state.autoPlayLecture;
      const ctx = location.state.coachingContext;

      // Case 1: We have context (Deep nested batches)
      if (ctx) {
        if (ctx.batchIndex !== undefined && activeBatchIndex !== ctx.batchIndex) {
          setActiveBatchIndex(ctx.batchIndex);
          return; // Wait for activeBatchData to update
        }

        if (activeBatchData && activeBatchData.subjects) {
          const searchSubjects = ctx.subjectIndex !== undefined ? [activeBatchData.subjects[ctx.subjectIndex]] : activeBatchData.subjects;
          
          for (let s = 0; s < searchSubjects.length; s++) {
            const subject = searchSubjects[s];
            if (!subject) continue;
            const chapter = (subject.chapters || []).find(c => (c.name === ctx.chapterName || c.chapter === ctx.chapterName));
            
            if (chapter) {
              const lIndex = (chapter.lectures || []).findIndex(l => {
                const sName = subject?.name || "";
                const cName = chapter.chapter || chapter.name || "";
                const uId = [sName, cName, l.name].filter(Boolean).map(s => s.replace(/[^a-zA-Z0-9]/g, '_')).join('_');
                const oldUId = cName ? `${cName.replace(/[^a-zA-Z0-9]/g, '_')}_${l.name}` : l.name;
                return uId === lectureId || oldUId === lectureId || l.name === lectureId;
              });
              if (lIndex !== -1) {
                setActiveSubjectIndex(ctx.subjectIndex !== undefined ? ctx.subjectIndex : s);
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
        
        if (ctx.batchIndex !== undefined) {
          return; // Still waiting for data
        }
      }

      // Case 2: Flat search (Old history items or simple structures)
      // Check both pre-loaded batches and current active batch data
      const searchInBatch = (batch, bIdx, sData) => {
        const subjects = sData?.subjects || batch.subjects || [];
        for (let s = 0; s < subjects.length; s++) {
          const subject = subjects[s];
          for (const chapter of subject.chapters || []) {
            const lIndex = (chapter.lectures || []).findIndex(l => {
              const sName = subject?.name || "";
              const cName = chapter.chapter || chapter.name || "";
              const uId = [sName, cName, l.name].filter(Boolean).map(s => s.replace(/[^a-zA-Z0-9]/g, '_')).join('_');
              const oldUId = cName ? `${cName.replace(/[^a-zA-Z0-9]/g, '_')}_${l.name}` : l.name;
              return uId === lectureId || oldUId === lectureId || l.name === lectureId;
            });
            if (lIndex !== -1) {
              setActiveBatchIndex(bIdx);
              setActiveSubjectIndex(s);
              setSelectedChapter(chapter);
              setActiveLecture(chapter.lectures[lIndex]);
              setActiveLectureIndex(lIndex);
              
              getOfflineFileUrl('video', courseId, lectureId).then(offlineUrl => {
                setOfflineVideoUrl(offlineUrl);
              });
               
               const cleanState = { ...location.state };
               delete cleanState.autoPlayLecture;
               navigate(location.pathname, { replace: true, state: cleanState });
               navigate(location.pathname + "?chapter=active", { replace: false, state: cleanState });
               return true;
            }
          }
        }
        return false;
      };

      for (let b = 0; b < (courseData.batches || []).length; b++) {
        const batch = courseData.batches[b];
        const sData = (b === activeBatchIndex) ? activeBatchData : null;
        if (searchInBatch(batch, b, sData)) return;
      }
    }
  }, [courseData, location.state, courseId, navigate, getOfflineFileUrl, selectedChapter, activeBatchData, activeBatchIndex]);

  // Removed aggressive auto-resume on mount so chapter list shows first.

  const activeBatch = courseData?.batches?.[activeBatchIndex];
  const activeSubject = activeBatchData?.subjects?.[activeSubjectIndex];

  if (!selectedChapter) {
    return (
      <div className="flex-1 w-full overflow-y-auto bg-[#050505] text-white flex flex-col pt-0 pb-[env(safe-area-inset-bottom,0px)] page-transition">
        <header className="p-4 md:p-6 pb-2 border-b border-white/10 sticky top-0 bg-[#050505]/90 backdrop-blur-md z-30">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
               <button onClick={() => navigate(-1)} className="hover:text-[#FFD700] transition-colors shrink-0">
                 <ArrowLeft size={24} />
               </button>
               <h1 className="text-[#FFD700] font-oswald text-2xl font-bold uppercase tracking-wide truncate">
                 {courseData ? courseData.coachingName || crashCourse?.title : 'Loading...'}
               </h1>
            </div>
            {courseData && (
              <div className="shrink-0">
                <SaveButton 
                  shake={true}
                  key={activeBatch ? `${courseId}_batch_${activeBatch.batchName}` : courseId}
                  item={activeBatch ? {
                    id: `${courseId}_batch_${activeBatch.batchName}`,
                    type: 'crash',
                    courseId: courseId,
                    title: activeBatch.batchName,
                    courseTitle: courseData.coachingName || crashCourse?.title,
                    activeBatchName: activeBatch.batchName,
                    image: crashCourse?.image
                  } : {
                    id: courseId,
                    type: 'crash',
                    courseId: courseId,
                    courseTitle: courseData.coachingName || crashCourse?.title,
                    image: crashCourse?.image
                  }}
                />
              </div>
            )}
          </div>

          {courseData?.batches && courseData.batches.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {courseData.batches.map((batch, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveBatchIndex(idx);
                    setActiveSubjectIndex(0);
                  }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeBatchIndex === idx ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-transparent text-gray-400 border-white/20 hover:border-white/50'}`}
                >
                  {batch.batchName}
                </button>
              ))}
            </div>
          )}
        </header>

        {loading ? (
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full space-y-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between min-h-[75px] relative overflow-hidden"
              >
                <div className="space-y-2 flex-1">
                  <div className="w-1/3 h-4 bg-white/10 rounded relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>
                  <div className="w-16 h-2.5 bg-white/5 rounded relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-12 flex-1">{error}</div>
        ) : (
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
            {batchLoading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between min-h-[75px] relative overflow-hidden"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="w-1/3 h-4 bg-white/10 rounded relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                      </div>
                      <div className="w-16 h-2.5 bg-white/5 rounded relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {activeBatchData?.subjects && (
                  <div className="flex gap-4 overflow-x-auto no-scrollbar mb-6 pb-2 border-b border-white/10">
                    {activeBatchData.subjects.map((subject, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSubjectIndex(idx)}
                        className={`shrink-0 pb-2 text-sm font-bold uppercase tracking-wide transition-all border-b-2 ${activeSubjectIndex === idx ? 'text-[#FFD700] border-[#FFD700]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                      >
                        {subject.icon && <span className="mr-1">{subject.icon}</span>}
                        {subject.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  {activeSubject?.chapters?.map((chapter, idx) => (
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
                              foundRecent = recent.find(r => r.courseId === courseId && chapterLectureNames.includes(r.lectureTitle));
                            }
                            if (foundRecent) {
                              const lIdx = chapter.lectures.findIndex(l => l.name === foundRecent.lectureTitle);
                              if (lIdx !== -1) {
                                nextActiveLec = chapter.lectures[lIdx];
                                nextActiveIndex = lIdx;
                              }
                            }
                          } catch (e) {
                            console.warn(e);
                          }
                          setActiveLecture(nextActiveLec);
                          setActiveLectureIndex(nextActiveIndex);
                          localStorage.setItem(`naino_last_lecture_${courseId}`, nextActiveLec.name);
                          localStorage.setItem(`naino_last_coaching_context_${courseId}`, JSON.stringify({
                            batchIndex: activeBatchIndex,
                            subjectIndex: activeSubjectIndex,
                            chapterName: chapter.chapter || chapter.name
                          }));
                        }
                      }}
                      className="bg-[#111] border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-[#FFD700]/50 transition-colors shadow-lg"
                    >
                      <div>
                        <h3 className="font-bold text-white text-[0.95rem] mb-1">{chapter.chapter || chapter.name}</h3>
                        <p className="text-gray-400 text-xs">{chapter.lectures?.length || 0} Videos</p>
                      </div>
                      <div className="border border-[#FFD700]/30 p-1.5 rounded-full">
                        <PlayCircle className="text-[#FFD700]" size={24} />
                      </div>
                    </div>
                  ))}
                  
                  {(!activeSubject?.chapters || activeSubject.chapters.length === 0) && (
                    <div className="text-center text-gray-500 py-12">No chapters found for this subject.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const handleNextLecture = () => {
    if (selectedChapter?.lectures && activeLectureIndex < selectedChapter.lectures.length - 1) {
      setActiveLecture(selectedChapter.lectures[activeLectureIndex + 1]);
      setActiveLectureIndex(activeLectureIndex + 1);
    }
  };

  const handlePrevLecture = () => {
    if (selectedChapter?.lectures && activeLectureIndex > 0) {
      setActiveLecture(selectedChapter.lectures[activeLectureIndex - 1]);
      setActiveLectureIndex(activeLectureIndex - 1);
    }
  };

  const hasNext = selectedChapter?.lectures && activeLectureIndex < selectedChapter.lectures.length - 1;
  const hasPrev = activeLectureIndex > 0;

  return (
    <div className="flex-1 w-full bg-[#111] text-white flex flex-col overflow-hidden page-transition">
      <header className="bg-black p-4 flex items-center justify-between z-10 pt-[calc(var(--safe-area-top)+1rem)]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold hover:text-[#FFD700] transition-colors uppercase">
          <ArrowLeft size={18} /> BACK
        </button>
        <button onClick={() => navigate('/', { replace: true })} className="flex items-center gap-2 text-sm font-semibold hover:text-[#FFD700] transition-colors uppercase">
          <Home size={18} /> HOME
        </button>
      </header>

      <div className="w-full bg-black aspect-video relative z-20 max-w-5xl mx-auto border-b border-white/10 shadow-lg">
        {activeLecture?.link ? (
          <VideoPlayer 
            key={offlineVideoUrl || activeLecture.link}
            videoUrl={offlineVideoUrl || activeLecture.link}
            title={activeLecture.name}
            courseTitle={crashCourse?.title || courseData?.coachingName}
            courseId={courseId}
            lectureId={activeLecture.name}
            coachingContext={{
              batchIndex: activeBatchIndex,
              subjectIndex: activeSubjectIndex,
              chapterName: selectedChapter.chapter || selectedChapter.name
            }}
            coachingName={courseData?.coachingName || null}
            onVideoEnd={handleNextLecture}
            onNext={hasNext ? handleNextLecture : null}
            onPrevious={hasPrev ? handlePrevLecture : null}
            type="crash"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">Unable to play</div>
        )}
      </div>

      <div className="p-4 bg-black border-b border-white/5 flex justify-between items-center z-10">
        <div>
          <h2 className="text-[#FFD700] font-bold text-lg mb-1">Lecture {(activeLectureIndex + 1).toString().padStart(2, '0')}</h2>
          <p className="text-gray-400 text-sm truncate max-w-[200px] md:max-w-md">{selectedChapter.chapter || selectedChapter.name}</p>
        </div>
        {offlineVideoUrl && (
          <div className="bg-[#FFD700]/10 text-[#FFD700] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-[#FFD700]/30">
            <CheckCircle size={14} /> OFFLINE
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#181818] relative">
        <div className="absolute inset-0 max-w-5xl mx-auto w-full">
          {selectedChapter.lectures && selectedChapter.lectures.length > 0 ? (
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: '100%' }}
              data={selectedChapter.lectures}
              initialTopMostItemIndex={activeLectureIndex > 0 ? activeLectureIndex : 0}
              itemContent={(idx, lecture) => {
                const isPlaying = activeLecture === lecture;
                const subjectName = activeSubject?.name || "";
                const chapterName = selectedChapter.chapter || selectedChapter.name || "";
                const uniqueLectureId = [subjectName, chapterName, lecture.name]
                  .filter(Boolean)
                  .map(s => s.replace(/[^a-zA-Z0-9]/g, '_'))
                  .join('_');
                
                return (
                  <div className={`p-4 border-b flex flex-col gap-2 transition-colors ${isPlaying ? 'bg-white/10 border-[#FFD700]/30' : 'border-white/5 hover:bg-white/5'}`}>
                <div className="flex justify-between items-start">
                  <h4 className="text-white text-sm font-semibold">Lecture {(idx + 1).toString().padStart(2, '0')}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs truncate max-w-[200px] text-right">{lecture.name}</span>
                    <SaveButton 
                      item={{ 
                        id: `crash_video_${courseId}_${uniqueLectureId}`, 
                        type: 'crash', 
                        courseId: courseId, 
                        courseTitle: courseData?.coachingName || crashCourse?.title,
                        lectureId: uniqueLectureId, 
                        lectureTitle: lecture.name,
                        coachingContext: {
                          batchIndex: activeBatchIndex,
                          subjectIndex: activeSubjectIndex,
                          chapterName: selectedChapter.chapter || selectedChapter.name
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
                      localStorage.setItem(`naino_last_coaching_context_${courseId}`, JSON.stringify({
                        batchIndex: activeBatchIndex,
                        subjectIndex: activeSubjectIndex,
                        chapterName: selectedChapter.chapter || selectedChapter.name
                      }));
                      const offlineUrl = await getOfflineFileUrl('video', courseId, uniqueLectureId);
                      setOfflineVideoUrl(offlineUrl);
                    }}
                    className={`shrink-0 px-4 py-1.5 rounded text-xs font-bold transition-colors ${isPlaying ? 'bg-[#FFD700] text-black' : 'bg-[#00E600] text-black hover:bg-[#00c900]'}`}
                  >
                    {isPlaying ? 'PLAYING...' : 'PLAY'}
                  </button>

                  {isDownloaded('video', courseId, uniqueLectureId) ? (
                    <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-green-500 text-green-500 flex items-center gap-1 opacity-70"><CheckCircle size={14} /> SAVED</button>
                  ) : isDownloading('video', courseId, uniqueLectureId) ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] flex items-center gap-1">
                        <Loader2 size={14} className="animate-spin" /> 
                        <DownloadProgressText downloadKey={`naino_offline_video_${courseId}_${uniqueLectureId}`} />
                      </button>
                      <button 
                        onClick={() => cancelDownload('video', courseId, uniqueLectureId)}
                        className="p-1.5 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shrink-0"
                        title="Cancel Download"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => downloadFile('video', courseId, uniqueLectureId, lecture.link, lecture.name, courseData?.coachingName || crashCourse?.title, selectedChapter?.chapter || selectedChapter?.name)}
                      className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <Download size={14} /> VIDEO
                    </button>
                  )}

                  {lecture.notes && (
                    <>
                      {/* PDF Download Button */}
                      {isDownloaded('pdf', courseId, uniqueLectureId) ? (
                        <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-green-500 text-green-500 flex items-center gap-1 opacity-70">
                          <CheckCircle size={14} /> SAVED
                        </button>
                      ) : isDownloading('pdf', courseId, uniqueLectureId) ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] flex items-center gap-1">
                            <Loader2 size={14} className="animate-spin" /> 
                            <DownloadProgressText downloadKey={`naino_offline_pdf_${courseId}_${uniqueLectureId}`} />
                          </button>
                          <button 
                            onClick={() => cancelDownload('pdf', courseId, uniqueLectureId)}
                            className="p-1.5 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shrink-0"
                            title="Cancel Download"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => downloadFile('pdf', courseId, uniqueLectureId, lecture.notes, `${lecture.name} Notes`, courseData?.coachingName || crashCourse?.title, selectedChapter?.chapter || selectedChapter?.name)} 
                          className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                        >
                          <Download size={14} /> PDF
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          const offlinePdf = await getOfflineFileUrl('pdf', courseId, uniqueLectureId);
                          navigate('/pdf', { state: { file: offlinePdf || lecture.notes, title: `${lecture.name} Notes` } });
                        }}
                        className="shrink-0 px-4 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors flex items-center gap-1 ml-auto"
                      >
                        <FileText size={14} /> VIEW PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
                );
              }}
            />
          ) : null}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
};

export default CrashCourseDetailScreen;
