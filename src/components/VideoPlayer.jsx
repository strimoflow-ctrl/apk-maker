import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, FastForward, Rewind, SkipBack, SkipForward } from 'lucide-react';
import NativeBridge from '../utils/NativeBridge';
import { logStudySession } from '../utils/progressTracker';
import { decryptString } from '../utils/encryption';

const VideoPlayer = ({ videoUrl, title, courseId, lectureId, courseTitle, onVideoEnd, onNext, onPrevious, coachingContext, coachingName, type }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Speed control
  const speeds = [0.5, 1, 1.5, 2, 2.5, 3];
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const getCleanVideoUrl = (url) => {
    if (!url) return '';
    
    // First, try to decrypt the URL if it's encrypted
    const decryptedUrl = decryptString(url);

    // Handle relative /dl/ paths for Capacitor
    if (decryptedUrl.startsWith('/dl/') && NativeBridge.isNative()) {
      return `https://filestreambot-1-jx2x.onrender.com${decryptedUrl}`;
    }
    if (decryptedUrl.startsWith('http://') && !decryptedUrl.includes('localhost')) {
      return decryptedUrl.replace('http://', 'https://');
    }
    return decryptedUrl;
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Persistent Study Time Tracking Hook
  useEffect(() => {
    let studyInterval;

    if (isPlaying && !isBuffering && courseTitle && title) {
      studyInterval = setInterval(() => {
        const currentLink = window.location.hash.startsWith('#') 
            ? window.location.hash.substring(1) 
            : window.location.pathname;
            
        const extraData = {
          courseId,
          lectureId,
          type: type || (window.location.pathname.includes('/coaching') ? 'coaching' : window.location.pathname.includes('/crash') ? 'crash' : 'course'),
          coachingContext: coachingContext || null
        };
            
        // Log 5 seconds of study time
        logStudySession(courseTitle, title, 5, currentLink, extraData);
      }, 5000);
    }

    return () => clearInterval(studyInterval);
  }, [isPlaying, isBuffering, courseTitle, title]);

  useEffect(() => {
    if (window.Android && videoUrl) {
      try {
        const cleanUrl = getCleanVideoUrl(videoUrl);
        window.Android.playVideo(
          cleanUrl,
          title || '',
          courseId || '',
          lectureId || '',
          courseTitle || '',
          type || '',
          coachingContext ? JSON.stringify(coachingContext) : null
        );
      } catch (e) {
        console.error("Failed to play video natively", e);
      }
    }
  }, [videoUrl, title, courseId, lectureId, courseTitle, type, coachingContext]);

  // Center animation state
  const [rippleEffect, setRippleEffect] = useState(null); // { side: 'left' | 'right', id: number }
  const [scrubTime, setScrubTime] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef(null);
  const lastHideTime = useRef(0);

  const handleMouseMove = () => {
    if (Date.now() - lastHideTime.current < 500) return;
    setShowControls(true);
    clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  const lastTapRef = useRef({ time: 0, x: 0 });

  const handleZoneClick = (e, zone) => {
    e.stopPropagation();
    const now = Date.now();

    // Double tap detection (within 300ms)
    if (now - lastTapRef.current.time < 300 && lastTapRef.current.zone === zone) {
      if (zone === 'left') {
        videoRef.current.currentTime -= 10;
        showRipple('left');
      } else if (zone === 'right') {
        videoRef.current.currentTime += 10;
        showRipple('right');
      }
      lastTapRef.current.time = 0; // Reset
      return;
    }

    lastTapRef.current = { time: now, zone };

    // Single tap logic (Toggle controls)
    if (showControls) {
      setShowControls(false);
      lastHideTime.current = now;
      clearTimeout(controlsTimeout.current);
    } else {
      handleMouseMove();
    }
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();

    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.warn("Playback interrupted:", error));
      }
      setIsPlaying(true);
      handleMouseMove();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  const showRipple = (side) => {
    setRippleEffect({ side, id: Date.now() });
    setTimeout(() => {
      setRippleEffect(prev => (prev?.id === side ? prev : null));
    }, 600); // clear after animation
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;

    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    if (videoRef.current.duration) {
      setProgress((curr / videoRef.current.duration) * 100);
    }

    // Save progress to localStorage
    if (curr > 0 && courseId && lectureId) {
      localStorage.setItem(`naino_progress_${courseId}_${lectureId}`, curr.toString());
      localStorage.setItem(`naino_last_lecture_${courseId}`, lectureId);
      if (coachingContext) {
        localStorage.setItem(`naino_last_coaching_context_${courseId}`, JSON.stringify(coachingContext));
      } else {
        localStorage.removeItem(`naino_last_coaching_context_${courseId}`);
      }

      // Update Recent Activity Array
      try {
        const recentRaw = localStorage.getItem('naino_recent_activity') || '[]';
        let recent = JSON.parse(recentRaw);

        // Remove existing entry for this specific video to move it to the front
        recent = recent.filter(item => !(item.courseId === courseId && item.lectureId === lectureId));

        // Add current activity to the front
        recent.unshift({
          courseId,
          lectureId,
          courseTitle: courseTitle || title,
          lectureTitle: title,
          coachingContext: coachingContext || null,
          coachingName: coachingName || null,
          progressPercent: videoRef.current.duration ? (curr / videoRef.current.duration) * 100 : 0,
          timestamp: new Date().getTime(),
          type: type || (window.location.pathname.includes('/coaching') ? 'coaching' : window.location.pathname.includes('/crash') ? 'crash' : 'course')
        });

        // Keep only top 20 recent
        recent = recent.slice(0, 20);
        localStorage.setItem('naino_recent_activity', JSON.stringify(recent));
      } catch (e) {
        console.warn("Error saving recent activity:", e);
      }
    }
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    if (videoRef.current && courseId && lectureId && videoRef.current.dataset.timeSet !== 'true') {
      const savedTime = localStorage.getItem(`naino_progress_${courseId}_${lectureId}`);
      if (savedTime && parseFloat(savedTime) > 0) {
        videoRef.current.currentTime = parseFloat(savedTime);
      }
      videoRef.current.dataset.timeSet = 'true';
    }
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const clickPosition = e.clientX - progressBar.getBoundingClientRect().left;
    const percentage = clickPosition / progressBar.offsetWidth;
    videoRef.current.currentTime = percentage * videoRef.current.duration;
  };

  const toggleMute = () => {
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changeSpeed = (speed) => {
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  useEffect(() => {
    const handleFullscreenChange = async () => {
      setIsFullscreen(!!document.fullscreenElement);

      // Native App Status Bar logic for Immersive Mode (Delegated to Android Kotlin)
      if (NativeBridge.isNative()) {
        try {
          if (document.fullscreenElement) {
            // Future Kotlin call: window.Android.hideStatusBar()
          } else {
            // Future Kotlin call: window.Android.showStatusBar()
            setIsZoomed(false);
            if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
              window.screen.orientation.unlock();
            }
          }
        } catch (e) {
          console.error("Status Bar NativeBridge Error:", e);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Reset timeSet flag when a new lecture is loaded
  useEffect(() => {
    if (videoRef.current) {
      delete videoRef.current.dataset.timeSet;
    }
  }, [lectureId]);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const shouldOpenUpward = isFullscreen || isLandscape;

  if (window.Android) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-center p-4">
        <p className="text-sm text-gray-400 mb-2">Playing natively on device...</p>
        <button 
          onClick={() => {
            try {
              const cleanUrl = getCleanVideoUrl(videoUrl);
              window.Android.playVideo(
                cleanUrl,
                title || '',
                courseId || '',
                lectureId || '',
                courseTitle || '',
                type || '',
                coachingContext ? JSON.stringify(coachingContext) : null
              );
            } catch (e) {
              console.error("Failed to play video natively", e);
            }
          }}
          className="px-4 py-1.5 bg-[#FFD700] text-black font-bold text-xs rounded-full uppercase tracking-wider pointer-events-auto"
        >
          Re-open Player
        </button>
      </div>
    );
  }

  const youtubeId = getYouTubeId(videoUrl);

  if (youtubeId) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          className="w-full h-full border-0 absolute inset-0 z-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        />
        {/* Top-Left overlay: Blocks channel name, avatar, and title, but leaves top-right icons (Volume, CC, Settings) clickable */}
        <div 
          className="absolute top-0 left-0 w-[70%] h-16 z-10 pointer-events-auto bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        />

        {/* Bottom-Left overlay: Blocks YouTube's share button completely from bottom-0 */}
        <div 
          className="absolute bottom-0 left-0 w-24 h-24 z-10 pointer-events-auto bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Sub-container for Video & Animations with overflow-hidden to prevent zoom/ripple bleed */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <video
          ref={videoRef}
          src={getCleanVideoUrl(videoUrl)}
          className={`w-full h-full pointer-events-auto transition-transform duration-300 ${isZoomed ? 'object-cover' : 'object-contain'}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onEnded={() => {
            setIsPlaying(false);
            if (onVideoEnd) onVideoEnd();
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onLoadStart={() => setIsBuffering(true)}
          onLoadedData={() => {
            setIsBuffering(false);
            // Auto-play safely
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => console.warn("Autoplay prevented:", error));
            }
          }}
          autoPlay
          playsInline
        />

        {/* Buffering Spinner */}
        {isBuffering && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]">
            <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Touch Zones for Double Tap (Full Height) */}
        <div className="absolute top-0 bottom-0 left-0 w-[35%] z-30 cursor-pointer pointer-events-auto" onClick={(e) => handleZoneClick(e, 'left')} />
        <div className="absolute top-0 bottom-0 right-0 w-[35%] z-30 cursor-pointer pointer-events-auto" onClick={(e) => handleZoneClick(e, 'right')} />
        <div className="absolute top-0 bottom-0 left-[35%] right-[35%] z-30 cursor-pointer pointer-events-auto" onClick={(e) => handleZoneClick(e, 'center')} />

        {/* Double Tap Skip Ripple Animation */}
        {rippleEffect && (
          <div className={`absolute top-0 bottom-0 w-[40%] flex flex-col items-center justify-center pointer-events-none z-30 overflow-hidden ${rippleEffect.side === 'left' ? 'left-0' : 'right-0'}`}>
            <div key={rippleEffect.id} className={`absolute w-[200%] h-full bg-white/10 rounded-[100%] animate-double-tap ${rippleEffect.side === 'left' ? '-left-[100%]' : '-right-[100%]'}`}></div>
            <div key={`${rippleEffect.id}-icon`} className="animate-apple-fade-in flex flex-col items-center gap-1 z-10 drop-shadow-lg text-white">
              <div className="flex items-center">
                {rippleEffect.side === 'left' ? (
                  <><Rewind size={28} fill="currentColor" /> <span className="text-xl font-bold font-oswald tracking-wider ml-1">10</span></>
                ) : (
                  <><span className="text-xl font-bold font-oswald tracking-wider mr-1">10</span> <FastForward size={28} fill="currentColor" /></>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80">Seconds</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Overlay (outside overflow-hidden so its children can draw outside) */}
      <div className={`video-controls absolute bottom-0 left-0 right-0 z-40 p-4 pt-16 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-2 px-2 relative group">
          <span className="text-white text-xs font-medium w-10 text-right">{formatTime(currentTime)}</span>

          <div className="relative flex-1">
            {scrubTime && (
              <div
                className="absolute bottom-6 bg-[#FFD700] text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-all"
                style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
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
                  setScrubTime(formatTime(time));
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
              className="w-full h-2 cursor-pointer accent-[#FFD700] bg-white/20 rounded-full appearance-none outline-none"
              style={{
                background: `linear-gradient(to right, #FFD700 ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
              }}
            />
          </div>

          <span className="text-white/70 text-xs font-medium w-10">{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4 text-white">
            <button onClick={togglePlay} className="hover:text-[#FFD700] hover:scale-110 transition-all pointer-events-auto">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (onPrevious) onPrevious(); }}
              className={`hover:text-[#FFD700] hover:scale-110 transition-all pointer-events-auto ${!onPrevious ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={!onPrevious}
            >
              <SkipBack size={18} fill="currentColor" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}
              className={`hover:text-[#FFD700] hover:scale-110 transition-all pointer-events-auto ${!onNext ? 'opacity-30 cursor-not-allowed' : ''}`}
              disabled={!onNext}
            >
              <SkipForward size={18} fill="currentColor" />
            </button>

            <button onClick={toggleMute} className="hover:text-[#FFD700] hover:scale-110 transition-all pointer-events-auto">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <h2 className="text-white/90 text-sm font-semibold truncate max-w-[100px] md:max-w-sm hidden sm:block">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-white relative">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu(!showSpeedMenu);
                }}
                className="flex items-center gap-1 text-xs font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded backdrop-blur-md transition-colors"
              >
                {playbackRate}x <Settings size={14} />
              </button>

              {showSpeedMenu && (
                <>
                  {/* Invisible overlay to close menu on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }}
                  />
                  {/* Speed options - opens UPWARD if fullscreen/landscape, otherwise DOWNWARD */}
                  <div className={`absolute ${shouldOpenUpward ? 'bottom-full mb-3' : 'top-full mt-3'} right-0 bg-black/95 backdrop-blur-2xl border border-white/15 shadow-2xl z-50 transition-all ${isLandscape ? 'flex flex-row rounded-full py-1.5 px-3 gap-1.5 min-w-[280px] justify-between' : 'flex flex-row rounded-2xl p-2.5 max-w-[145px] flex-wrap justify-center gap-1.5'}`}>
                    {speeds.map(speed => (
                      <button
                        key={speed}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeSpeed(speed);
                        }}
                        className={`text-xs font-bold transition-all flex items-center justify-center shrink-0 cursor-pointer ${isLandscape ? 'px-3 py-1 rounded-full' : 'w-[36px] h-[32px] rounded-lg'} ${playbackRate === speed ? 'bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/30 font-black' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={toggleFullscreen} className="hover:text-[#FFD700] hover:scale-110 transition-all">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
