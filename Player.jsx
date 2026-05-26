import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Maximize, Play, Pause, Volume2, VolumeX, Settings, Star, PlusSquare, Share2, HelpCircle, Heart, Timer, ZoomIn, ZoomOut } from 'lucide-react';
import { fetchAnimeData, fetchPopularData } from '../api/config';
import { useStar } from '../context/StarContext';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

const Player = () => {
  const { showId: dataFile, episodeId } = useParams();
  const navigate = useNavigate();
  const { state: metadata } = useLocation();
  const videoRef = useRef(null);
  const { stars, deductStar, currentUser, likes, toggleLike, savedList, toggleSave, addToHistory, openLoginModal } = useStar();

  const [show, setShow] = useState(metadata || null);
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState("00:00");
  const [durationFormatted, setDurationFormatted] = useState("00:00");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [skipIndicator, setSkipIndicator] = useState(null);

  // New State variables
  const [scrubTime, setScrubTime] = useState(null);
  const [playAnim, setPlayAnim] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const historyLoggedRef = useRef(false);

  const [allEpisodes, setAllEpisodes] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Episode Chunking & Auto-Scroll
  const CHUNK_SIZE = 50;
  const [selectedChunkIdx, setSelectedChunkIdx] = useState(0);
  const activeEpisodeRef = useRef(null);

  const handleActiveEpisodeRef = (node) => {
    if (node && node !== activeEpisodeRef.current) {
      activeEpisodeRef.current = node;
      setTimeout(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 100);
    }
  };

  // Strict Token Tracking State
  const [sessionSeconds, setSessionSeconds] = useState(() => {
    return parseInt(localStorage.getItem('anime_session_seconds')) || 0;
  });

  let controlsTimeout = useRef(null);
  let clickTimeout = useRef(null);

  const isLiked = likes.some(l => l.title === show?.title);
  const isSaved = savedList.some(s => s.title === show?.title);

  // Status Bar Immersive Mode
  useEffect(() => {
    const handleFullscreenChange = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          if (document.fullscreenElement) {
            await StatusBar.hide();
          } else {
            await StatusBar.show();
            setIsZoomed(false); // Unzoom on exit
            if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock();
            }
          }
        } catch (e) { console.error("StatusBar Error:", e); }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Load Video Data & Suggestions
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const decodedDataFile = decodeURIComponent(dataFile);
      const data = await fetchAnimeData(decodedDataFile);

      let currentShowTitle = metadata?.title || '';

      if (data) {
        currentShowTitle = data.title || currentShowTitle;
        if (!metadata) {
          setShow(data);
        } else {
          setShow(prev => ({ ...data, ...prev }));
        }

        const eps = data.seasons?.[0]?.episodes || data.episodes || [];
        setAllEpisodes(eps);

        const lastWatchedEpId = localStorage.getItem(`anime_last_episode_${currentShowTitle}`);

        let ep = null;
        // If explicitly requesting an episode (e.g., from History)
        if (episodeId && episodeId !== 'e1') {
          ep = eps.find(e => e.id === episodeId);
        }
        // If coming from Home (default e1), try to resume last watched episode
        else if (lastWatchedEpId) {
          ep = eps.find(e => e.id === lastWatchedEpId);
        }

        if (!ep) {
          ep = eps[0];
        }

        if (videoRef.current) {
          videoRef.current.dataset.timeSet = ''; // Reset time flag for new episode
        }
        setEpisode(ep);
        setIsBuffering(true);
      }

      // Load suggestions
      const pop = await fetchPopularData();
      if (pop) {
        const filtered = pop.filter(p => p.title !== currentShowTitle);
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 6));
      }

      setLoading(false);
    };
    loadData();
    historyLoggedRef.current = false;
  }, [dataFile, episodeId, metadata]);

  // Auto-scroll and chunk selection for active episode
  useEffect(() => {
    if (episode && allEpisodes.length > 0) {
      const idx = allEpisodes.findIndex(e => e.id === episode.id);
      if (idx !== -1) {
        setSelectedChunkIdx(Math.floor(idx / CHUNK_SIZE));
      }
    }
  }, [episode, allEpisodes]);

  // Persistent Study Time Tracking Hook
  useEffect(() => {
    let studyInterval;
    
    if (isPlaying && !isBuffering && show && episode) {
      studyInterval = setInterval(() => {
        let stats = {};
        try {
          stats = JSON.parse(localStorage.getItem('naino_study_stats')) || {};
        } catch (e) {
          stats = {};
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayDayName = dayNames[now.getDay()];

        // Initialize defaults
        if (!stats.lastUpdatedDate) {
          stats.lastUpdatedDate = todayStr;
          stats.streak = 1;
          stats.totalSeconds = 0;
          stats.todaySeconds = 0;
          stats.weeklyData = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
          stats.lectureHistory = [];
        }

        // Handle date roll-overs & streak tracking
        if (stats.lastUpdatedDate !== todayStr) {
          const lastDate = new Date(stats.lastUpdatedDate);
          const diffTime = Math.abs(now - lastDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            stats.streak = (stats.streak || 0) + 1;
          } else if (diffDays > 1) {
            stats.streak = 1;
          }
          
          stats.todaySeconds = 0;
          stats.lastUpdatedDate = todayStr;
        }

        // Increment time
        stats.totalSeconds = (stats.totalSeconds || 0) + 1;
        stats.todaySeconds = (stats.todaySeconds || 0) + 1;
        stats.weeklyData[todayDayName] = (stats.weeklyData[todayDayName] || 0) + 1;

        // Track per-lecture detail
        const lectureId = `${show.title} - ${episode.title || episode.name || 'Episode ' + episode.id}`;
        let lecture = (stats.lectureHistory || []).find(l => l.id === lectureId && l.date === todayStr);
        if (lecture) {
          lecture.seconds = (lecture.seconds || 0) + 1;
        } else {
          if (!stats.lectureHistory) stats.lectureHistory = [];
          stats.lectureHistory.push({
            id: lectureId,
            title: episode.title || episode.name || 'Episode ' + episode.id,
            course: show.title,
            date: todayStr,
            seconds: 1
          });
        }

        // Cap history to last 100 entries to prevent localStorage bloat
        if (stats.lectureHistory.length > 100) {
          stats.lectureHistory.shift();
        }

        localStorage.setItem('naino_study_stats', JSON.stringify(stats));
      }, 1000);
    }

    return () => clearInterval(studyInterval);
  }, [isPlaying, isBuffering, show, episode]);

  // Strict Star Tracking Interval
  useEffect(() => {
    let watchInterval;

    if (isPlaying && !currentUser) {
      videoRef.current?.pause();
      setIsPlaying(false);
      openLoginModal();
      return;
    }

    if (isPlaying && stars <= 0) {
      videoRef.current?.pause();
      setIsPlaying(false);
      setShowModal(true);
      return;
    }

    if (isPlaying && !isBuffering && stars > 0) {
      watchInterval = setInterval(() => {
        setSessionSeconds(prev => {
          const next = prev + 1;
          if (next >= 600) {
            deductStar();
            localStorage.setItem('anime_session_seconds', 0);
            return 0;
          }
          localStorage.setItem('anime_session_seconds', next);
          return next;
        });
      }, 1000);
    }

    return () => clearInterval(watchInterval);
  }, [isPlaying, isBuffering, stars, deductStar, show, currentUser, openLoginModal]);

  const calculateTimeLeft = () => {
    const totalSecondsLeft = (stars * 600) - sessionSeconds;
    if (totalSecondsLeft <= 0) return "00:00";

    const m = Math.floor(totalSecondsLeft / 60);
    const s = totalSecondsLeft % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const captureScreenshot = () => {
    try {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.warn("CORS issue preventing screenshot capture", e);
      return null;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;

      const p = (currentTime / duration) * 100;
      setProgress(p || 0);
      setCurrentTimeFormatted(formatVideoTime(currentTime));
      if (!isNaN(duration)) {
        setDurationFormatted(formatVideoTime(duration));
      }

      // Save local progress and current episode
      if (currentTime > 0 && show && episode) {
        localStorage.setItem(`anime_progress_${show.title}_${episode.id}`, currentTime.toString());
        localStorage.setItem(`anime_last_episode_${show.title}`, episode.id);
      }

      // Trigger History Log at 1 second with screenshot
      if (currentTime >= 1 && !historyLoggedRef.current && show) {
        historyLoggedRef.current = true;
        const thumb = captureScreenshot();
        addToHistory(show, episode, thumb);
      }
    }
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    if (show && episode && videoRef.current && !videoRef.current.dataset.timeSet) {
      const savedTime = localStorage.getItem(`anime_progress_${show.title}_${episode.id}`);
      if (savedTime && parseFloat(savedTime) > 0) {
        videoRef.current.currentTime = parseFloat(savedTime);
      }
      videoRef.current.dataset.timeSet = 'true';
    }
  };

  const handleNextEpisode = () => {
    const isAutoPlay = localStorage.getItem('anime_autoplay') === 'true';
    if (!isAutoPlay) return;

    const currentIdx = allEpisodes.findIndex(e => e.id === episode.id);
    if (currentIdx !== -1 && currentIdx < allEpisodes.length - 1) {
      setEpisode(allEpisodes[currentIdx + 1]);
      historyLoggedRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#111111]">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!episode) return <div className="p-20 text-center text-[#E50914] bg-[#111111] min-h-screen">Episode not found or no stream link available!</div>;

  const togglePlay = () => {
    if (!currentUser) {
      if (!videoRef.current.paused) videoRef.current.pause();
      setIsPlaying(false);
      openLoginModal();
      return;
    }

    if (stars <= 0) {
      setShowModal(true);
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      setPlayAnim('play');
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setPlayAnim('pause');
    }

    setTimeout(() => setPlayAnim(null), 500);
  };

  const handleSeek = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleVideoClick = (e, side) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      // Double Click
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      handleSeek(side === 'left' ? -10 : 10);

      setSkipIndicator(side);
      setTimeout(() => setSkipIndicator(null), 500);
    } else {
      // Single Click
      clickTimeout.current = setTimeout(() => {
        setShowControls(prev => !prev);
        handleMouseMove(); // reset timer
        clickTimeout.current = null;
      }, 250);
    }
  };

  const toggleMute = () => {
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const changeSpeed = (e) => {
    e.stopPropagation();
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const formatVideoTime = (seconds) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  };

  const getStreamUrl = (ep) => {
    if (!ep) return "";
    let url = ep.stream_url || ep.video_url || ep.link || "";
    if (url.startsWith("http://")) {
      url = url.replace("http://", "https://");
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white pb-24 font-sans">
      {/* Low Balance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 p-8 rounded-xl border border-[#E50914]/50 flex flex-col items-center max-w-sm text-center shadow-[0_0_30px_rgba(229,9,20,0.2)]">
            <Star className="text-yellow-400 fill-yellow-400 w-16 h-16 mb-4 animate-pulse" />
            <h2 className="text-2xl font-black text-white mb-2 tracking-wide">0 Stars Left</h2>
            <p className="text-gray-300 mb-6 text-sm">Your watch time has expired. Watch an ad to earn more stars instantly.</p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => navigate('/rewards')}
                className="flex-1 px-4 py-3 rounded-lg bg-[#E50914] text-white font-bold tracking-widest hover:bg-red-700 transition"
              >
                GET STARS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Video Player */}
      <div className="sticky top-0 z-50 w-full bg-black aspect-video flex items-center justify-center overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={() => isPlaying && setShowControls(false)}>
        <video
          ref={videoRef}
          src={getStreamUrl(episode)}
          className={`w-full h-full transition-transform duration-300 ${isZoomed ? 'object-cover' : 'object-contain'}`}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={handleCanPlay}
          onEnded={handleNextEpisode}
          autoPlay
          playsInline
        />

        {/* Buffering Spinner */}
        {isBuffering && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Interaction Layer for Double Click Seek & Center Pause */}
        <div className="absolute inset-0 z-10 flex">
          {/* Left Seek */}
          <div className="w-1/3 h-full relative flex items-center justify-center" onClick={(e) => handleVideoClick(e, 'left')}>
            {skipIndicator === 'left' && (
              <div className="absolute inset-y-0 right-0 w-[150%] bg-white/20 flex items-center justify-center rounded-r-[100%] animate-pulse">
                <span className="text-white font-bold text-2xl drop-shadow-lg">⏪ -10s</span>
              </div>
            )}
          </div>

          {/* Center Play/Pause */}
          <div className="w-1/3 h-full relative flex items-center justify-center cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            togglePlay();
            setShowControls(true);
            handleMouseMove();
          }}>
            {playAnim === 'play' && (
              <div className="absolute animate-[ping_0.5s_ease-out_forwards] bg-black/60 p-4 rounded-full pointer-events-none">
                <Play fill="white" size={48} className="text-white" />
              </div>
            )}
            {playAnim === 'pause' && (
              <div className="absolute animate-[ping_0.5s_ease-out_forwards] bg-black/60 p-4 rounded-full pointer-events-none">
                <Pause fill="white" size={48} className="text-white" />
              </div>
            )}
          </div>

          {/* Right Seek */}
          <div className="w-1/3 h-full relative flex items-center justify-center" onClick={(e) => handleVideoClick(e, 'right')}>
            {skipIndicator === 'right' && (
              <div className="absolute inset-y-0 left-0 w-[150%] bg-white/20 flex items-center justify-center rounded-l-[100%] animate-pulse">
                <span className="text-white font-bold text-2xl drop-shadow-lg">+10s ⏩</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Controls Overlay */}
        <div className={`absolute inset-0 z-30 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-2 md:p-4 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between pointer-events-auto">
            <button onClick={() => navigate(-1)} className="text-white hover:text-[#E50914] p-2 transition-colors">
              <ArrowLeft size={28} />
            </button>
          </div>

          <div className="pointer-events-auto flex flex-col gap-2">
            {/* Progress Bar with Scrubbing Tooltip */}
            <div className="relative group w-full flex items-center px-1">
              {scrubTime && (
                <div
                  className="absolute bottom-6 bg-[#E50914] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-all"
                  style={{ left: `${(parseFloat(progress) || 0)}%`, transform: 'translateX(-50%)' }}
                >
                  {scrubTime}
                </div>
              )}
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress || 0}
                onInput={(e) => {
                  const p = parseFloat(e.target.value);
                  setProgress(p);
                  if (videoRef.current && videoRef.current.duration) {
                    const time = (p / 100) * videoRef.current.duration;
                    setScrubTime(formatVideoTime(time));
                  }
                }}
                onChange={(e) => {
                  const p = parseFloat(e.target.value);
                  setProgress(p);
                  if (videoRef.current && videoRef.current.duration) {
                    videoRef.current.currentTime = (p / 100) * videoRef.current.duration;
                  }
                  setScrubTime(null);
                }}
                className="w-full h-2 cursor-pointer accent-[#E50914] bg-transparent"
              />
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between mt-1 px-1">
              <div className="flex items-center gap-4 md:gap-6">
                <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-[#E50914] hover:scale-110 transition-all">
                  {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white hover:text-[#E50914] hover:scale-110 transition-all">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <span className="text-gray-300 text-xs md:text-sm font-medium tracking-wider">
                  {currentTimeFormatted} / {durationFormatted}
                </span>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                <button onClick={changeSpeed} className="text-white text-xs md:text-sm font-bold bg-white/10 px-2 py-1 rounded hover:bg-[#E50914] transition-colors">
                  {playbackSpeed}x
                </button>

                {/* Zoom Button (Only visible in landscape/fullscreen) */}
                {document.fullscreenElement && (
                  <button onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }} className="text-white hover:text-[#E50914] transition-colors flex items-center gap-1">
                    {isZoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
                  </button>
                )}

                <button onClick={async (e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    try {
                      if (!document.fullscreenElement) {
                        if (videoRef.current.requestFullscreen) await videoRef.current.requestFullscreen();
                        else if (videoRef.current.webkitRequestFullscreen) await videoRef.current.webkitRequestFullscreen();

                        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
                          await window.screen.orientation.lock('landscape').catch(() => { });
                        }
                      } else {
                        if (document.exitFullscreen) await document.exitFullscreen();
                      }
                    } catch (err) {
                      console.log("Fullscreen error:", err);
                    }
                  }
                }} className="text-white hover:text-[#E50914] transition-colors">
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-4 py-4 border-b border-zinc-800/50">
        <h1 className="text-xl md:text-2xl font-bold mb-2 tracking-wide leading-tight">
          {show?.title || 'Anime Series'} {episode?.title ? <span className="text-gray-400 text-lg"> - {episode.title}</span> : ''}
        </h1>
        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mb-5">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={12} className="fill-current" />
            <span className="font-bold text-gray-300">{show?.rating || '7.6'}</span>
          </div>
          <span>|</span>
          <span>{show?.year || '2023'}</span>
          <span>|</span>
          <span>Japan</span>
          <span>|</span>
          <span>{show?.tags?.[0] || 'Anime'}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              if (!currentUser) {
                alert("Please login to like!");
                return;
              }
              toggleLike(show);
            }}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/80 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors"
          >
            <Heart size={18} className={isLiked ? "fill-[#E50914] text-[#E50914]" : ""} /> {isLiked ? 'Liked' : 'Like'}
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                alert("Please login to save!");
                return;
              }
              toggleSave(show);
            }}
            className="flex flex-1 items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800/80 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-colors"
          >
            <PlusSquare size={18} className={isSaved ? "fill-[#E50914] text-[#E50914]" : ""} /> {isSaved ? 'Saved' : 'Save'}
          </button>

          <div className="flex flex-col items-center justify-center px-4 py-1.5 bg-black/40 border border-[#E50914]/20 rounded-xl">
            <div className="flex items-center gap-1 text-yellow-500">
              <Timer size={14} className="animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Time Left</span>
            </div>
            <span className="text-sm font-black text-white">{calculateTimeLeft()}</span>
          </div>
        </div>
      </div>

      {/* Episodes Section */}
      <div className="px-4 py-5 border-b border-zinc-800/50 bg-[#141414]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold tracking-wide">Episodes</h2>

          {/* Chunk Selector Dropdown for 50+ Episodes */}
          {allEpisodes.length > CHUNK_SIZE && (
            <select
              className="bg-zinc-900 border border-zinc-800 text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-[#E50914] cursor-pointer"
              value={selectedChunkIdx}
              onChange={(e) => setSelectedChunkIdx(Number(e.target.value))}
            >
              {Array.from({ length: Math.ceil(allEpisodes.length / CHUNK_SIZE) }).map((_, i) => {
                const start = i * CHUNK_SIZE + 1;
                const end = Math.min((i + 1) * CHUNK_SIZE, allEpisodes.length);
                return <option key={i} value={i}>{start} - {end}</option>;
              })}
            </select>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x pb-2">
          {allEpisodes.slice(selectedChunkIdx * CHUNK_SIZE, (selectedChunkIdx + 1) * CHUNK_SIZE).map((ep, idx) => {
            const actualIdx = selectedChunkIdx * CHUNK_SIZE + idx;
            const isCurrent = ep.id === episode.id;
            return (
              <div
                key={actualIdx}
                ref={isCurrent ? handleActiveEpisodeRef : null}
                onClick={() => setEpisode(ep)}
                className={`min-w-[60px] h-14 flex items-center justify-center rounded-xl text-sm font-black shrink-0 cursor-pointer snap-start transition-all border ${isCurrent
                    ? 'bg-[#E50914] border-[#E50914] text-white shadow-lg shadow-red-500/20 scale-105'
                    : 'bg-zinc-900 border-zinc-800 text-gray-400 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
              >
                {String(actualIdx + 1).padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>

      {/* For You Recommendations */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-bold mb-4 tracking-wide border-l-4 border-[#E50914] pl-3">More Like This</h2>

        {suggestions.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <Link
                key={i}
                to={`/player/${encodeURIComponent(s.data_file)}/e1`}
                state={s}
                className="aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden relative group border border-zinc-800/50 hover:border-[#E50914]/50 transition-colors"
              >
                <img
                  src={s.poster || s.thumb}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt={s.title}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Play className="text-white fill-white" size={24} />
                </div>
                <div className="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <p className="text-[10px] font-bold text-white truncate drop-shadow-md">{s.title}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-zinc-600 text-sm italic">Loading recommendations...</div>
        )}
      </div>
    </div>
  );
};

export default Player;
