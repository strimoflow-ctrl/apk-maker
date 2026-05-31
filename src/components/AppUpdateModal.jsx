import React from 'react';
import { Smartphone, Download, AlertTriangle } from 'lucide-react';

const AppUpdateModal = ({ updateData, onClose }) => {
  if (!updateData) return null;

  const handleUpdate = () => {
    let url = updateData.apkUrl;
    if (!url.startsWith('http')) {
      // Use raw github user content or your Netlify proxy
      url = `https://nainoapi.netlify.app/${url}`;
    }
    window.open(url, '_system');
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 page-transition">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full max-w-sm bg-[#111] border border-[#FFD700]/30 rounded-3xl p-6 shadow-2xl">
        <div className="w-16 h-16 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-2xl flex items-center justify-center text-[#FFD700] mx-auto mb-4 animate-bounce">
          <Smartphone size={32} />
        </div>
        
        <h2 className="text-2xl font-black font-oswald tracking-wide text-center uppercase text-white mb-2">
          New Update <span className="text-[#FFD700]">Available!</span>
        </h2>
        
        <p className="text-gray-400 text-center text-sm mb-6">
          Version {updateData.latestVersionName} is here. {updateData.forceUpdate ? "You must update to continue using the app." : "Update now for the best experience!"}
        </p>

        <div className="bg-black/50 border border-white/5 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Release Notes:</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {updateData.releaseNotes}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpdate}
            className="w-full bg-[#FFD700] hover:bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm"
          >
            <Download size={18} /> Update Now
          </button>
          
          {!updateData.forceUpdate && (
            <button
              onClick={onClose}
              className="w-full bg-transparent hover:bg-white/5 text-gray-400 font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-xs"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppUpdateModal;
