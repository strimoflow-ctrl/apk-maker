import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, PlayCircle, CheckCircle, FileText } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { useDownload } from '../context/DownloadContext';

const OfflinePlayerScreen = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { completedDownloads, getOfflineFileUrl } = useDownload();

  // state: { autoPlayLecture: dl.itemId, type: dl.type, title: dl.title, courseTitle: dl.courseTitle }
  const [activeLectureId, setActiveLectureId] = useState(location.state?.autoPlayLecture || null);
  const [offlineVideoUrl, setOfflineVideoUrl] = useState(null);

  // Extract downloaded videos for this course
  const downloadedLectures = useMemo(() => {
    return completedDownloads.filter(dl => 
      dl.courseId === courseId && dl.type === 'video'
    ).sort((a, b) => a.timestamp - b.timestamp); // Keep them ordered by download time
  }, [completedDownloads, courseId]);

  const activeLecture = useMemo(() => {
    if (!activeLectureId && downloadedLectures.length > 0) {
      return downloadedLectures[0];
    }
    return downloadedLectures.find(dl => dl.itemId === activeLectureId) || downloadedLectures[0];
  }, [downloadedLectures, activeLectureId]);

  const activeLectureIndex = useMemo(() => {
    if (!activeLecture) return -1;
    return downloadedLectures.findIndex(dl => dl.itemId === activeLecture.itemId);
  }, [downloadedLectures, activeLecture]);

  // Handle URL change
  useEffect(() => {
    if (activeLecture) {
      getOfflineFileUrl('video', courseId, activeLecture.itemId).then(url => {
        setOfflineVideoUrl(url);
      });
    }
  }, [activeLecture, courseId, getOfflineFileUrl]);



  const handleNextLecture = () => {
    if (activeLectureIndex < downloadedLectures.length - 1) {
      setActiveLectureId(downloadedLectures[activeLectureIndex + 1].itemId);
    }
  };

  const handlePrevLecture = () => {
    if (activeLectureIndex > 0) {
      setActiveLectureId(downloadedLectures[activeLectureIndex - 1].itemId);
    }
  };

  const hasNext = activeLectureIndex < downloadedLectures.length - 1;
  const hasPrev = activeLectureIndex > 0;

  if (downloadedLectures.length === 0) {
    return (
      <div className="flex-1 w-full bg-[#111] text-white flex flex-col items-center justify-center p-6 text-center pt-[calc(var(--safe-area-top)+1rem)]">
        <h2 className="text-xl font-bold mb-2">No Downloads Found</h2>
        <p className="text-gray-400 mb-6">You don't have any downloaded videos for this course.</p>
        <button
          onClick={() => navigate('/downloads')}
          className="bg-[#FFD700] text-black font-bold py-2 px-6 rounded-full"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-[#111] text-white flex flex-col overflow-hidden page-transition">
      {/* Top Header */}
      <header className="bg-black p-4 flex items-center justify-between pt-[calc(var(--safe-area-top)+1rem)]">
        <button
          onClick={() => navigate('/downloads')}
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
        {offlineVideoUrl ? (
          <VideoPlayer 
            key={offlineVideoUrl}
            videoUrl={offlineVideoUrl}
            title={activeLecture?.title || activeLecture?.itemId}
            courseTitle={activeLecture?.courseTitle || 'Offline Course'}
            courseId={courseId}
            lectureId={activeLecture?.itemId}
            coachingContext={activeLecture?.chapterName ? {
              chapterName: activeLecture.chapterName
            } : null}
            onVideoEnd={handleNextLecture}
            onNext={hasNext ? handleNextLecture : null}
            onPrevious={hasPrev ? handlePrevLecture : null}
            type={activeLecture?.courseType || "course"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Loading Offline Video...
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="p-4 bg-black border-b border-white/5 flex justify-between items-center">
        <div>
          <h2 className="text-[#FFD700] font-bold text-lg mb-1">
            {activeLecture?.title || activeLecture?.itemId}
          </h2>
          <p className="text-gray-400 text-sm">
            {activeLecture?.chapterName || 'Offline Playback'}
          </p>
        </div>
        <div className="bg-[#FFD700]/10 text-[#FFD700] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-[#FFD700]/30">
          <CheckCircle size={14} /> OFFLINE PLAY
        </div>
      </div>

      {/* Lectures List */}
      <div className="flex-1 bg-[#181818] relative">
        <div className="absolute inset-0 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar">
          {downloadedLectures.map((lecture, idx) => {
            const isPlaying = activeLecture?.itemId === lecture.itemId;

            return (
              <div
                key={lecture.key}
                className={`p-4 border-b flex flex-col gap-2 transition-colors ${isPlaying ? 'bg-white/10 border-[#FFD700]/30' : 'border-white/5 hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-white text-sm font-semibold">{lecture.title || lecture.itemId}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs truncate max-w-[200px] text-right">
                      {lecture.chapterName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2 overflow-x-auto pb-2 custom-scrollbar">
                  <button
                    onClick={() => setActiveLectureId(lecture.itemId)}
                    className={`shrink-0 px-4 py-1.5 rounded text-xs font-bold transition-colors ${isPlaying
                      ? 'bg-[#FFD700] text-black'
                      : 'bg-[#00E600] text-black hover:bg-[#00c900]'
                      }`}
                  >
                    {isPlaying ? 'PLAYING...' : 'PLAY'}
                  </button>

                  <button disabled className="shrink-0 px-3 py-1.5 rounded text-xs font-bold border border-green-500 text-green-500 flex items-center gap-1 opacity-70">
                    <CheckCircle size={14} /> SAVED
                  </button>
                  
                  {/* Option to view PDF if downloaded could be added here, but to keep it simple, we just show Video state */}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OfflinePlayerScreen;
