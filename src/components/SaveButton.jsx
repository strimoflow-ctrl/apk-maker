import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';

const SaveButton = ({ item, className = '', shake = false }) => {
  const { isSaved, toggleSave } = useLibrary();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [shouldShake, setShouldShake] = useState(shake);

  useEffect(() => {
    if (shake) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  if (!item || !item.id) return null;

  const saved = isSaved(item.id);

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent triggering parent clicks (like opening a video)
    
    const isNowSaved = toggleSave(item);
    
    setToastMessage(isNowSaved ? 'SAVED' : 'REMOVED');
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, 2000);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button 
        onClick={handleClick}
        className={`p-2 rounded-full hover:bg-white/10 transition-colors active:scale-90 flex items-center justify-center group ${shouldShake ? 'animate-shake' : ''}`}
        title={saved ? "Remove from Library" : "Save to Library"}
      >
        <Bookmark 
          size={20} 
          className={`transition-all duration-300 ${
            saved 
              ? 'fill-[#FFD700] text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]' 
              : 'text-gray-400 group-hover:text-white'
          }`} 
        />
      </button>

      {/* Mini Toast */}
      {showToast && (
        <div className="absolute top-full right-0 mt-2 px-3 py-1 bg-black/90 border border-white/10 text-[#FFD700] text-[10px] font-bold uppercase tracking-wider rounded-md whitespace-nowrap shadow-lg z-50 animate-fade-in-up pointer-events-none">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default SaveButton;
