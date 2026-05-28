import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, PlayCircle, FileText, Download, CheckCircle, Loader2 } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import VideoPlayer from '../components/VideoPlayer';
import { useDownload } from '../context/DownloadContext';
import SaveButton from '../components/SaveButton';

const CoachingDetailScreen = () => {
  const { coachingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [coaching, setCoaching] = useState(location.state?.coaching || null);
  const [coachingData, setCoachingData] = useState(null);
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
  
  const activeLectureRef = useRef(null);
  const lectureListContainerRef = useRef(null);
  const hasAutoResumed = useRef(false);

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

  // Fetch coaching info if not passed via state
  useEffect(() => {
    if (!coaching) {
      const fetchCoachingInfo = async () => {
        try {
          const data = await fetchWithCache('/api/directory/coaching.json', 'cache_coaching_directory_v2');
          if (data[coachingId]) {
            setCoaching({ id: coachingId, ...data[coachingId] });
          } else {
            throw new Error('Coaching not found');
          }
        } catch (err) {
          console.error(err);
          setError(err.message);
          setLoading(false);
        }
      };
      fetchCoachingInfo();
    }
  }, [coaching, coachingId]);

  // Fetch coaching content
  useEffect(() => {
    if (coaching && coaching.target_file) {
      const fetchContent = async () => {
        setLoading(true);
        try {
          const data = await fetchWithCache(`/api${coaching.target_file}`, `cache_coaching_content_v3_${coachingId}`);
          
          if (data && data.batches) {
            data.batches.sort((a, b) => {
              const getYear = (name) => {
                if (!name) return 0;
                // Match exactly a 4 digit year (e.g., 2024, 2025) using word boundaries to prevent matching '20241'
                const match = name.match(/\b(20\d{2})\b/);
                return match ? parseInt(match[1], 10) : 0;
              };
              
              const yearA = getYear(a.batchName);
              const yearB = getYear(b.batchName);
              
              // Sort descending (latest year first)
              // If years are equal, keep original order (stable sort is preferred but this is simple)
              return yearB - yearA; 
            });
          }

          setCoachingData(data);
          if (location.state?.activeBatchName && data && data.batches) {
            const idx = data.batches.findIndex(b => b.batchName === location.state.activeBatchName);
            setActiveBatchIndex(idx !== -1 ? idx : 0);
          } else {
            setActiveBatchIndex(0);
          }
          setActiveSubjectIndex(0);
        } catch (err) {
          console.error(err);
          setError('Failed to load coaching content.');
        } finally {
          setLoading(false);
        }
      };
      fetchContent();
    }
  }, [coaching, coachingId]);

  // Fetch dynamic batch data if dataFile is used
  useEffect(() => {
    if (!coachingData || !coachingData.batches || !coachingData.batches[activeBatchIndex]) return;
    
    const batch = coachingData.batches[activeBatchIndex];
    
    if (batch.dataFile) {
      const fetchBatchData = async () => {
        setBatchLoading(true);
        setError(null);
        try {
          const data = await fetchWithCache(`/api${batch.dataFile}`, `cache_batch_data_v3_${batch.dataFile}`);
          if (!data) throw new Error("Empty data received");
          // Support both array of subjects or { subjects: [...] }
          setActiveBatchData(data.subjects ? data : { subjects: data });
        } catch (err) {
          console.error("Batch fetch error:", err);
          setActiveBatchData({ subjects: [] }); // Fallback to empty subjects so it says "No chapters found"
        } finally {
          setBatchLoading(false);
        }
      };
      fetchBatchData();
    } else {
      setActiveBatchData(batch);
    }
  }, [coachingData, activeBatchIndex]);

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
      sessionStorage.setItem(`naino_active_coaching_${coachingId}_chapter`, JSON.stringify(selectedChapter));
      sessionStorage.setItem(`naino_active_coaching_${coachingId}_lecture`, JSON.stringify(activeLecture));
      sessionStorage.setItem(`naino_active_coaching_${coachingId}_index`, String(activeLectureIndex));
      sessionStorage.setItem(`naino_active_coaching_${coachingId}_batch_index`, String(activeBatchIndex));
      sessionStorage.setItem(`naino_active_coaching_${coachingId}_subject_index`, String(activeSubjectIndex));
    }
  }, [selectedChapter, activeLecture, activeLectureIndex, activeBatchIndex, activeSubjectIndex, coachingId]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') !== 'active') {
      sessionStorage.removeItem(`naino_active_coaching_${coachingId}_chapter`);
      sessionStorage.removeItem(`naino_active_coaching_${coachingId}_lecture`);
      sessionStorage.removeItem(`naino_active_coaching_${coachingId}_index`);
      sessionStorage.removeItem(`naino_active_coaching_${coachingId}_batch_index`);
      sessionStorage.removeItem(`naino_active_coaching_${coachingId}_subject_index`);
    }
  }, [location.search, coachingId]);

  // Restore active lecture state on mount/data load if URL query has ?chapter=active
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('chapter') === 'active' && !selectedChapter && activeBatchData && activeBatchData.subjects) {
      try {
        const savedChapter = sessionStorage.getItem(`naino_active_coaching_${coachingId}_chapter`);
        const savedLecture = sessionStorage.getItem(`naino_active_coaching_${coachingId}_lecture`);
        const savedIndex = sessionStorage.getItem(`naino_active_coaching_${coachingId}_index`);
        const savedBatchIndex = sessionStorage.getItem(`naino_active_coaching_${coachingId}_batch_index`);
        const savedSubjectIndex = sessionStorage.getItem(`naino_active_coaching_${coachingId}_subject_index`);
        
        if (savedChapter && savedLecture) {
          const ch = JSON.parse(savedChapter);
          const lec = JSON.parse(savedLecture);
          
          let chapterExists = false;
          const targetSubjectIndex = savedSubjectIndex ? parseInt(savedSubjectIndex, 10) : activeSubjectIndex;
          const subject = activeBatchData.subjects[targetSubjectIndex];
          if (subject) {
            const foundCh = (subject.chapters || []).find(c => c.name === ch.name || c.chapter === ch.chapter || c.name === ch.chapter || c.chapter === ch.name);
            if (foundCh) {
              const foundLec = (foundCh.lectures || []).find(l => l.name === lec.name);
              if (foundLec) {
                chapterExists = true;
                if (savedBatchIndex !== null) setActiveBatchIndex(parseInt(savedBatchIndex, 10));
                setActiveSubjectIndex(targetSubjectIndex);
                setSelectedChapter(foundCh);
                setActiveLecture(foundLec);
                setActiveLectureIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
                
                getOfflineFileUrl('video', coachingId, lec.name).then(offlineUrl => {
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
              const foundCh = (sub.chapters || []).find(c => c.name === ch.name || c.chapter === ch.chapter || c.name === ch.chapter || c.chapter === ch.name);
              if (foundCh) {
                const foundLec = (foundCh.lectures || []).find(l => l.name === lec.name);
                if (foundLec) {
                  chapterExists = true;
                  if (savedBatchIndex !== null) setActiveBatchIndex(parseInt(savedBatchIndex, 10));
                  setActiveSubjectIndex(s);
                  setSelectedChapter(foundCh);
                  setActiveLecture(foundLec);
                  setActiveLectureIndex(savedIndex ? parseInt(savedIndex, 10) : 0);
                  
                  getOfflineFileUrl('video', coachingId, lec.name).then(offlineUrl => {
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
  }, [activeBatchData, location.search, coachingId, navigate, getOfflineFileUrl, selectedChapter]);

  // Auto-play from state (e.g. from Recent Activity)
  useEffect(() => {
    if (coachingData && location.state?.autoPlayLecture && !selectedChapter) {
      const lectureId = location.state.autoPlayLecture;
      const ctx = location.state.coachingContext;

      // Fast-path if we have coaching context (for deeply nested batches)
      if (ctx) {
        if (ctx.batchIndex !== undefined && activeBatchIndex !== ctx.batchIndex) {
          setActiveBatchIndex(ctx.batchIndex);
          return; // Wait for activeBatchData to fetch
        }

        if (activeBatchData && activeBatchData.subjects) {
          const searchSubjects = ctx.subjectIndex !== undefined ? [activeBatchData.subjects[ctx.subjectIndex]] : activeBatchData.subjects;
          
          for (let s = 0; s < searchSubjects.length; s++) {
            const subject = searchSubjects[s];
            if (!subject) continue;
            const chapter = (subject.chapters || []).find(c => c.name === ctx.chapterName || c.chapter === ctx.chapterName);
            
            if (chapter) {
              const lIndex = (chapter.lectures || []).findIndex(l => l.name === lectureId);
              if (lIndex !== -1) {
                setActiveSubjectIndex(ctx.subjectIndex !== undefined ? ctx.subjectIndex : s);
                setSelectedChapter(chapter);
                setActiveLecture(chapter.lectures[lIndex]);
                setActiveLectureIndex(lIndex);
                
                getOfflineFileUrl('video', coachingId, lectureId).then(offlineUrl => {
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

      // Fallback for PW or flat arrays
      for (let b = 0; b < (coachingData.batches || []).length; b++) {
        const batch = coachingData.batches[b];
        for (let s = 0; s < (batch.subjects || []).length; s++) {
          const subject = batch.subjects[s];
          for (const chapter of subject.chapters || []) {
            const lIndex = (chapter.lectures || []).findIndex(l => l.name === lectureId);
            if (lIndex !== -1) {
              setActiveBatchIndex(b);
              setActiveSubjectIndex(s);
              setSelectedChapter(chapter);
              setActiveLecture(chapter.lectures[lIndex]);
              setActiveLectureIndex(lIndex);
              
              // Check offline URL
              getOfflineFileUrl('video', coachingId, lectureId).then(offlineUrl => {
                setOfflineVideoUrl(offlineUrl);
              });
              
              // Clear state
              const cleanState = { ...location.state };
              delete cleanState.autoPlayLecture;
              navigate(location.pathname, { replace: true, state: cleanState });
              navigate(location.pathname + "?chapter=active", { replace: false, state: cleanState });
              return;
            }
          }
        }
      }
    }
  }, [coachingData, location.state, coachingId, navigate, getOfflineFileUrl, selectedChapter, activeBatchData, activeBatchIndex]);

  // Removed aggressive auto-resume on mount so chapter list shows first.

  const activeBatch = coachingData?.batches?.[activeBatchIndex];
  const activeSubject = activeBatchData?.subjects?.[activeSubjectIndex];

  // View: Chapter List
  if (!selectedChapter) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col font-inter pb-12 page-transition">
        <header className="p-4 md:p-6 pb-2 border-b border-white/10 sticky top-0 bg-[#050505]/90 backdrop-blur-md z-30">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
               <button onClick={() => navigate(-1)} className="hover:text-[#FFD700] transition-colors shrink-0">
                 <ArrowLeft size={24} />
               </button>
               <h1 className="text-[#FFD700] font-oswald text-2xl font-bold uppercase tracking-wide truncate">
                 {coachingData ? coachingData.coachingName || coaching?.title : 'Loading...'}
               </h1>
            </div>
            {coachingData && (
              <div className="shrink-0">
                <SaveButton 
                  shake={true}
                  key={activeBatch ? `${coachingId}_batch_${activeBatch.batchName}` : coachingId}
                  item={activeBatch ? {
                    id: `${coachingId}_batch_${activeBatch.batchName}`,
                    type: 'coaching',
                    courseId: coachingId,
                    title: activeBatch.batchName,
                    coachingName: coachingData.coachingName || coaching?.title,
                    activeBatchName: activeBatch.batchName,
                    image: coaching?.image
                  } : {
                    id: coachingId,
                    type: 'coaching',
                    courseId: coachingId,
                    coachingName: coachingData.coachingName || coaching?.title,
                    image: coaching?.image
                  }}
                />
              </div>
            )}
          </div>

          {/* Batch Selector Tabs */}
          {coachingData?.batches && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {coachingData.batches.map((batch, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveBatchIndex(idx);
                    setActiveSubjectIndex(0);
                  }}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border ${activeBatchIndex === idx ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-transparent text-gray-400 border-white/20 hover:border-white/50'}`}
                >
                  {batch.batchIcon && <span className="mr-2">{batch.batchIcon}</span>}
                  {batch.batchName}
                </button>
              ))}
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center p-12 flex-1 items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center p-12 flex-1">{error}</div>
        ) : (
          <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
            {batchLoading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD700]"></div>
              </div>
            ) : (
              <>
                {/* Subject Selector Tabs */}
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

            {/* Chapters List */}
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
                          
                          foundRecent = recent.find(r => 
                            r.courseId === coachingId && 
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
                      localStorage.setItem(`naino_last_lecture_${coachingId}`, nextActiveLec.name);
                      localStorage.setItem(`naino_last_coaching_context_${coachingId}`, JSON.stringify({
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

  // View: Lecture List & Video Player
  return (
    <div className="h-[100dvh] bg-[#111] text-white flex flex-col overflow-hidden page-transition">
      {/* Top Header */}
      <header className="bg-black p-4 flex items-center justify-between z-10">
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
            courseTitle={coaching?.title || coachingData?.coachingName}
            courseId={coachingId}
            lectureId={activeLecture.name}
            coachingContext={selectedChapter ? {
              batchIndex: activeBatchIndex,
              subjectIndex: activeSubjectIndex,
              chapterName: selectedChapter.chapter || selectedChapter.name
            } : null}
            coachingName={coachingData?.coachingName || null}
            onVideoEnd={handleNextLecture}
            onNext={hasNext ? handleNextLecture : null}
            onPrevious={hasPrev ? handlePrevLecture : null}
            type="coaching"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Unable to play
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="p-4 bg-black border-b border-white/5 flex justify-between items-center z-10">
        <div>
          <h2 className="text-[#FFD700] font-bold text-lg mb-1">
            Lecture {(activeLectureIndex + 1).toString().padStart(2, '0')}
          </h2>
          <p className="text-gray-400 text-sm truncate max-w-[200px] md:max-w-md">
            {selectedChapter.chapter || selectedChapter.name}
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
                        id: `coaching_video_${coachingId}_${lecture.name}`, 
                        type: 'coaching', 
                        courseId: coachingId, 
                        coachingName: coachingData?.coachingName || coaching?.title,
                        lectureId: lecture.name, 
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
                      localStorage.setItem(`naino_last_lecture_${coachingId}`, lecture.name);
                      localStorage.setItem(`naino_last_coaching_context_${coachingId}`, JSON.stringify({
                        batchIndex: activeBatchIndex,
                        subjectIndex: activeSubjectIndex,
                        chapterName: selectedChapter.chapter || selectedChapter.name
                      }));
                      // Check offline
                      const offlineUrl = await getOfflineFileUrl('video', coachingId, lecture.name);
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
                  {isDownloaded('video', coachingId, lecture.name) ? (
                    <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-green-500 text-green-500 flex items-center gap-1 opacity-70">
                      <CheckCircle size={14} /> SAVED
                    </button>
                  ) : isDownloading('video', coachingId, lecture.name) ? (
                    <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-[#FFD700] text-[#FFD700] flex items-center gap-1">
                      <Loader2 size={14} className="animate-spin" /> 
                      {Math.round(activeDownloads[`naino_offline_video_${coachingId}_${lecture.name}`]?.progress || 0)}%
                    </button>
                  ) : (
                    <button 
                      onClick={() => downloadFile('video', coachingId, lecture.name, lecture.link, lecture.name, coachingData?.coachingName || coaching?.title, selectedChapter?.chapter || selectedChapter?.name)}
                      className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <Download size={14} /> VIDEO
                    </button>
                  )}

                  {lecture.notes && (
                    <>
                      <button
                        onClick={async () => {
                          const offlinePdf = await getOfflineFileUrl('pdf', coachingId, lecture.name);
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
                      {!isDownloaded('pdf', coachingId, lecture.name) && !isDownloading('pdf', coachingId, lecture.name) && (
                        <button 
                          onClick={() => downloadFile('pdf', coachingId, lecture.name, lecture.notes, `${lecture.name} Notes`, coachingData?.coachingName || coaching?.title, selectedChapter?.chapter || selectedChapter?.name)}
                          className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                        >
                          <Download size={14} /> PDF
                        </button>
                      )}
                      
                      {isDownloading('pdf', coachingId, lecture.name) && (
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
      
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default CoachingDetailScreen;
