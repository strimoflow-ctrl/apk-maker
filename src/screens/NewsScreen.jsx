import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Newspaper, Loader2, Sparkles } from 'lucide-react';
import { getDynamicLink, fetchBackendAPI } from '../utils/api';


const NewsScreen = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Action Link setup
  const globalActionLink = getDynamicLink('news_action_link', 'https://telegram.me/nainoacademy');

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const data = await fetchBackendAPI('/api/news', 'GET');
        setNews(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const handleNewsClick = () => {
    if (!globalActionLink) return;
    
    try {
      window.open(globalActionLink, '_blank');
    } catch (e) {
      console.error("Failed to open link:", e);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-inter overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0A84FF]/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FFD700]/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-xl border-b border-white/10 shrink-0 shadow-lg min-h-[64px]">
        <h1 className="font-oswald text-xl font-bold tracking-wider uppercase flex items-center gap-2 text-white text-center">
          Exam <span className="text-[#0A84FF] flex items-center gap-1"><Newspaper size={20} /> Updates</span>
        </h1>
      </header>

      {/* Content Area */}
      <main className="relative z-10 flex-1 overflow-y-auto no-scrollbar p-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-[#0A84FF]">
            <Loader2 size={40} className="animate-spin mb-4" />
            <p className="text-gray-400 font-medium animate-pulse">Fetching latest updates...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <Sparkles size={32} className="text-gray-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">No News Yet</h2>
            <p className="text-gray-400 text-sm max-w-[250px]">
              Check back later for the latest updates on your exams!
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest text-[#FFD700]">
              <Sparkles size={14} />
              <span>Latest Headlines</span>
            </div>
            
            {news.map((item, index) => (
              <div 
                key={item._id}
                onClick={handleNewsClick}
                className="group relative bg-[#111] rounded-2xl overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] cursor-pointer hover:border-[#0A84FF]/50 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* News Image */}
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Action Link Icon Overlay (Subtle) */}
                  <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={16} className="text-[#0A84FF]" />
                  </div>
                </div>

                {/* News Content */}
                <div className="p-5 relative">
                  <h3 className="font-black text-xl md:text-2xl text-white leading-snug mb-2 group-hover:text-[#0A84FF] transition-colors">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                      <Calendar size={12} className="text-gray-400" />
                      <span>{formatTimeAgo(item.createdAt)}</span>
                    </div>
                    
                    <span className="text-[#0A84FF] font-bold flex items-center gap-1 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      Read More <ArrowLeft size={14} className="rotate-180" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default NewsScreen;
