import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, PlayCircle, FileText, BookmarkMinus } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';

const LibraryScreen = () => {
  const navigate = useNavigate();
  const { savedItems, removeItem } = useLibrary();

  const handleItemClick = (item) => {
    switch (item.type) {
      case 'course':
      case 'coaching':
      case 'crash':
        // If it's a specific video that was saved
        if (item.lectureId) {
          navigate(`/${item.type}/${item.courseId}`, {
            state: {
              autoPlayLecture: item.lectureId,
              coachingContext: item.coachingContext
            }
          });
        } else {
          // If the whole course/coaching/batch was saved
          navigate(`/${item.type}/${item.courseId}`, {
            state: {
              activeBatchName: item.activeBatchName
            }
          });
        }
        break;
      case 'pdf':
        navigate('/pdf', { state: item.state });
        break;
      case 'book':
        navigate('/book-library'); // Just go to books for now since we don't have a specific book detail page
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-24 page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
              <BookmarkMinus size={28} /> My Library
            </h1>
            <p className="text-gray-400 font-inter text-sm mt-2">Your personal collection of saved study materials</p>
          </div>
        </header>

        {savedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map((item) => {
              const isVideo = !!item.lectureId;
              const isPdf = item.type === 'pdf';
              const isBook = item.type === 'book';
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-[#111] border border-white/5 hover:border-[#FFD700]/50 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="flex-1 pr-4 min-w-0">
                      {/* Badge */}
                      <span className="bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-sm mb-2 inline-block max-w-[140px] truncate">
                        {item.type.toUpperCase()} {isVideo ? 'VIDEO' : ''}
                      </span>
                      
                      <h3 className="font-bold text-white text-lg mb-1 truncate leading-tight">
                        {isVideo ? item.lectureTitle : item.title || item.courseTitle || item.coachingName}
                      </h3>
                      
                      {/* Subtitle */}
                      {isVideo && (
                        <p className="text-gray-400 text-xs uppercase tracking-wider truncate max-w-[200px]">
                          {item.courseTitle || item.coachingName}
                        </p>
                      )}
                      {isBook && item.author && (
                        <p className="text-gray-400 text-xs uppercase tracking-wider truncate max-w-[200px]">
                          {item.author}
                        </p>
                      )}
                    </div>
                    
                    {/* Icon based on type */}
                    <div className="bg-black/50 p-2 rounded-full text-[#FFD700] group-hover:scale-110 transition-transform shrink-0">
                      {isVideo ? <PlayCircle size={28} /> : (isPdf || isBook) ? <FileText size={28} /> : <BookOpen size={28} />}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-end relative z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="text-xs text-red-500 font-bold uppercase tracking-wider hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  
                  {/* Hover Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-[#111] border border-white/5 rounded-2xl shadow-lg mt-8 text-center min-h-[40vh]">
            <div className="w-20 h-20 bg-[#FFD700]/10 border border-[#FFD700]/25 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,215,0,0.15)]">
              <BookmarkMinus size={36} className="text-[#FFD700]" />
            </div>
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-wider text-white mb-2">
              Your Library is Empty
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed font-medium max-w-sm mb-8">
              Click the <span className="text-[#FFD700] mx-1"><BookmarkMinus size={14} className="inline" /></span> icon on any course, video, PDF, or book to save it here for quick access later!
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-[#FFD700] text-black font-bold py-2 px-6 rounded-full hover:bg-white transition-colors uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
            >
              Explore Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryScreen;
