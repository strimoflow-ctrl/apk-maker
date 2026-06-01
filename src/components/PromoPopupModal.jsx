import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PromoPopupModal = ({ promoData, onClose }) => {
  const navigate = useNavigate();
  if (!promoData) return null;

  const handleAction = () => {
    onClose(); // Close modal first
    if (promoData.actionType === 'internal') {
      navigate(promoData.actionLink);
    } else {
      window.open(promoData.actionLink, '_system');
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://nainoapi.netlify.app/${path}`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 page-transition">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative z-10 w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slide-up">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
        >
          <X size={16} />
        </button>

        {/* Banner Image (Optional) */}
        {promoData.imageUrl && (
          <div className="w-full aspect-[4/3] bg-black relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10"></div>
            <img 
              src={getFullImageUrl(promoData.imageUrl)} 
              alt="Promo" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content Section */}
        <div className={`p-6 md:p-8 flex flex-col items-center text-center ${!promoData.imageUrl ? 'pt-10' : 'pt-2 relative z-20'}`}>
          
          <h2 className="text-2xl md:text-3xl font-black font-oswald tracking-wide uppercase text-white mb-3">
            {promoData.title}
          </h2>
          
          <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8">
            {promoData.description}
          </p>

          <button
            onClick={handleAction}
            className="w-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:from-white hover:to-white text-black font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(255,215,0,0.3)]"
          >
            {promoData.buttonText || 'Click Here'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoPopupModal;
