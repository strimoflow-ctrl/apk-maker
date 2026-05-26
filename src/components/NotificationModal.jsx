import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Info, FileArchive } from 'lucide-react';

const NotificationModal = ({ isOpen, title, message, onClose, type = 'success' }) => {
  if (!isOpen) return null;
  
  const getIcon = () => {
    switch(type) {
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      case 'zip': return <FileArchive className="text-[#FFD700]" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const getBgColor = () => {
    switch(type) {
      case 'success': return 'bg-green-500/10';
      case 'zip': return 'bg-[#FFD700]/10';
      default: return 'bg-blue-500/10';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-apple-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className={`${getBgColor()} p-2 rounded-full`}>
            {getIcon()}
          </div>
          <h3 className="text-xl font-bold text-white font-oswald uppercase tracking-wide">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-inter">
          {message}
        </p>
        <button 
          onClick={onClose}
          className="w-full py-3 px-4 bg-[#FFD700] hover:bg-white text-black font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]"
        >
          Got It
        </button>
      </div>
    </div>,
    document.body
  );
};

export default NotificationModal;
