import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown, X } from 'lucide-react';

const PremiumModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-[#111] border border-[#FFD700]/30 w-full max-w-sm rounded-3xl p-6 relative z-10 shadow-[0_0_50px_rgba(255,215,0,0.15)] animate-apple-slide-up overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-black/50 p-2 rounded-full transition-colors z-20">
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mt-4 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700]/20 to-black rounded-full flex items-center justify-center mb-5 border border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            <Lock className="text-[#FFD700]" size={36} />
          </div>
          <h2 className="text-3xl font-black text-white font-oswald uppercase tracking-widest mb-3 drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">
            Premium Locked
          </h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed px-2">
            This content is locked for regular students. Upgrade to Premium to access all features.
          </p>
        </div>

        <div className="flex flex-col gap-3 relative z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); navigate('/account'); }}
            className="w-full bg-gradient-to-r from-[#FFD700] to-[#E6B800] hover:opacity-90 text-black font-black uppercase tracking-widest text-[11px] py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_5px_15px_rgba(255,215,0,0.3)] hover:-translate-y-0.5 active:scale-95"
          >
            <Crown size={16} /> Buy Now
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white font-bold uppercase tracking-widest text-[10px] py-4 rounded-xl transition-all active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PremiumModal;
