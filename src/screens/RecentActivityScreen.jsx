import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, PlayCircle } from 'lucide-react';

const RecentActivityScreen = () => {
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('naino_recent_activity');
      if (raw) setRecentActivity(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load recent activity');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
              <Clock size={28} /> Recent Activity
            </h1>
            <p className="text-gray-400 font-inter text-sm mt-2">Resume where you left off</p>
          </div>
        </header>

        {recentActivity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {recentActivity.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => {
                  let type = item.type;
                  if (!type) {
                    if (item.courseTitle?.toUpperCase().includes('CRASH')) {
                      type = 'crash';
                    } else if (item.courseId?.startsWith('c_')) {
                      type = 'coaching';
                    } else {
                      type = 'course';
                    }
                  }
                  navigate(`/${type}/${item.courseId}`, { 
                    state: { 
                      autoPlayLecture: item.lectureId || item.lectureTitle,
                      coachingContext: item.coachingContext 
                    } 
                  });
                }}
                className="bg-[#111] border border-white/5 hover:border-[#FFD700]/50 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div>
                    {/* Badge / Sticker - Always show one */}
                    <span className="bg-[#FFD700] text-black text-[10px] font-bold px-2 py-0.5 rounded-sm mb-2 inline-block max-w-[140px] truncate">
                      {item.type === 'coaching' ? (item.coachingName || item.courseTitle) : item.courseTitle}
                    </span>
                    
                    <h3 className="font-bold text-white text-lg mb-1 truncate leading-tight pr-4">{item.lectureTitle}</h3>
                    
                    {/* Subtitle - Only show if it's different from the badge text to avoid redundancy */}
                    {(item.courseTitle !== (item.type === 'coaching' ? (item.coachingName || item.courseTitle) : item.courseTitle)) && (
                      <p className="text-gray-400 text-xs uppercase tracking-wider truncate max-w-[200px]">{item.courseTitle}</p>
                    )}
                  </div>
                  <div className="bg-black/50 p-2 rounded-full text-[#FFD700] group-hover:scale-110 transition-transform">
                    <PlayCircle size={28} />
                  </div>
                </div>
                
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-6 relative z-10 overflow-hidden">
                  <div 
                    className="h-full bg-[#FFD700] rounded-full" 
                    style={{ width: `${item.progressPercent || 0}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-500 mt-2 font-bold relative z-10">
                  {Math.round(item.progressPercent || 0)}% COMPLETED
                </p>
                
                {/* Hover Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-[#111] border border-white/5 rounded-2xl shadow-lg mt-8">
            <Clock size={48} className="text-[#333] mb-4" />
            <p className="text-gray-500 font-inter text-center">
              No recent activity found.<br />
              Start watching a lecture to see it here!
            </p>
            <button
              onClick={() => navigate('/teachers-library')}
              className="mt-6 bg-[#FFD700] text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-500 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivityScreen;
