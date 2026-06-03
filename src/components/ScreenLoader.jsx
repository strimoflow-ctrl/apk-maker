import React from 'react';

const ScreenLoader = () => {
  return (
    <div className="flex-1 min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#32D74B]/5 rounded-full blur-3xl animate-pulse"></div>
      
      {/* Premium Loader Animation */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 rounded-full border-2 border-t-[#32D74B] border-r-transparent border-b-[#FFD700] border-l-transparent animate-spin"></div>
          {/* Inner pulsing logo container */}
          <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center border border-white/5 shadow-[0_0_15px_rgba(50,215,75,0.2)]">
            <img src="/logo.png" alt="Loading" className="w-6 h-6 object-contain animate-pulse" />
          </div>
        </div>
        
        {/* Loading text with animated dots */}
        <div className="flex items-center gap-1 text-sm font-oswald tracking-widest text-gray-500 uppercase">
          Loading<span className="animate-[ping_1.5s_infinite_0ms] text-[#32D74B]">.</span>
          <span className="animate-[ping_1.5s_infinite_200ms] text-[#32D74B]">.</span>
          <span className="animate-[ping_1.5s_infinite_400ms] text-[#32D74B]">.</span>
        </div>
      </div>
    </div>
  );
};

export default ScreenLoader;
