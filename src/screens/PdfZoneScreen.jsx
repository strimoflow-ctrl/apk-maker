import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Lock } from 'lucide-react';
import { fetchWithCache } from '../utils/api';
import PremiumModal from '../components/PremiumModal';
import { isItemLocked } from '../utils/premiumLock';

const PdfZoneScreen = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  useEffect(() => {
    const fetchPdfData = async () => {
      try {
        const data = await fetchWithCache('/api/directory/pdfzone.json', 'cache_pdfzone_directory');
        setInstitutions(data || []);
      } catch (error) {
        console.error("Failed to fetch PDF zone data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPdfData();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
                <FileText size={28} /> PDF Zone
              </h1>
              <p className="text-gray-400 font-inter text-sm mt-2">Premium Study Materials & Notes</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {institutions.map((item, idx) => (
            <div 
              key={item.id || idx} 
              onClick={() => {
                if (isItemLocked(item)) {
                  setPremiumModalOpen(true);
                } else {
                  navigate(`/pdf-zone/${item.id}`);
                }
              }}
              className={`bg-[#111] border ${isItemLocked(item) ? 'border-red-500/20 hover:border-red-500/50' : 'border-white/5 hover:border-[#FFD700]/50'} rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden flex flex-col justify-between h-48`}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-xl uppercase tracking-wider font-oswald">
                    {item.id ? item.id.replace(/-/g, ' ') : 'Institution'}
                  </h3>
                  {item.name && item.name.includes('Soon') && (
                    <span className="bg-[#FFD700]/10 text-[#FFD700] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">
                  {item.subjects ? `${item.subjects.length} Subjects` : 'Explore Notes'}
                </p>
              </div>

              {/* Background Image or Fallback */}
              {item.image ? (
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                  <img src={item.image} alt={item.id} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                  <FileText size={120} className="text-white" />
                </div>
              )}

              <div className="relative z-10 flex justify-between items-center mt-auto">
                {isItemLocked(item) ? (
                  <span className="text-[10px] text-red-500 uppercase font-black tracking-widest flex items-center gap-1">
                    <Lock size={12} /> Locked
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest group-hover:text-[#FFD700] transition-colors">
                    View Materials
                  </span>
                )}
                <div className={`w-8 h-8 ${isItemLocked(item) ? 'bg-red-500/10 text-red-500' : 'bg-[#1a1a1a] text-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black'} rounded-full flex items-center justify-center transition-all`}>
                  {isItemLocked(item) ? <Lock size={14} /> : <ArrowLeft size={16} className="rotate-180" />}
                </div>
              </div>

              {/* Hover Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
      <PremiumModal 
        isOpen={premiumModalOpen} 
        onClose={() => setPremiumModalOpen(false)} 
      />
    </div>
  );
};

export default PdfZoneScreen;
