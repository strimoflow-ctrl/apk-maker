import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const HtmlViewerScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const fileUrl = location.state?.file;
  const title = location.state?.title || 'Interactive Test';

  if (!fileUrl) {
    // If accessed directly without state, go back
    React.useEffect(() => {
      navigate(-1);
    }, [navigate]);
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#050505] z-[9999] animate-in fade-in duration-200">
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute bottom-24 left-4 z-[10000] w-12 h-12 bg-black/70 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#FFD700] hover:text-black transition-colors shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Iframe Container - Full Screen */}
      <iframe 
        src={encodeURI(fileUrl).replace(/\(/g, '%28').replace(/\)/g, '%29')} 
        title={title}
        className="w-full h-full border-0 absolute inset-0 bg-white z-10"
      />
    </div>
  );
};

export default HtmlViewerScreen;
