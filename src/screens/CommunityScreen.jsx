import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Wrench } from 'lucide-react';

const CommunityScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-24 page-transition overflow-x-hidden">
      {/* Golden Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h1 className="font-oswald text-xl font-bold tracking-wider uppercase flex items-center gap-2">
            Social <span className="text-[#FFD700]">Hub</span>
          </h1>
          
          <div className="w-10 h-10"></div>
        </header>

        {/* Coming Soon Content */}
        <div className="flex flex-col items-center justify-center mt-20 text-center px-4">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#0A84FF]/20 to-[#FFD700]/10 border border-[#0A84FF]/30 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(10,132,255,0.15)] relative">
            <Users size={50} className="text-[#0A84FF]" />
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#FFD700] rounded-full border-4 border-black flex items-center justify-center">
              <Wrench size={20} className="text-black" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black font-oswald tracking-wide uppercase text-white mb-3">
            Building the <span className="text-[#0A84FF]">Community</span>
          </h2>
          <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-8">
            We are working hard to bring you a massive new social platform! Soon you'll be able to post photos, chat in groups, interact with peers, and connect with admins directly.
          </p>

          <div className="bg-[#111]/80 border border-white/10 rounded-3xl p-6 w-full backdrop-blur-md relative overflow-hidden">
            <div className="absolute -left-20 -top-20 w-40 h-40 bg-[#0A84FF]/10 rounded-full blur-3xl"></div>
            <h3 className="text-xs font-bold text-[#FFD700] uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse"></span>
              Features Coming Soon
            </h3>
            
            <ul className="text-left space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">✨</div>
                <span className="text-sm font-semibold text-gray-200">Public Feeds & Photo Posts</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">💬</div>
                <span className="text-sm font-semibold text-gray-200">Likes, Comments & Reposts</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">🔥</div>
                <span className="text-sm font-semibold text-gray-200">Dedicated Chat Rooms (Study, Masti)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center shrink-0">📞</div>
                <span className="text-sm font-semibold text-gray-200">Direct Contact to Admins</span>
              </li>
            </ul>
          </div>

          <button 
            onClick={() => navigate(-1)}
            className="mt-8 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors uppercase tracking-widest text-xs"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityScreen;
