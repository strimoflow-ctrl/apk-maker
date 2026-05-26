import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, ChevronRight, PenTool } from 'lucide-react';
import { resolveApiUrl } from '../utils/api';

const TestZoneScreen = () => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const response = await fetch(resolveApiUrl('/api/directory/testzone.json'));
        const data = await response.json();
        setInstitutions(data);
      } catch (error) {
        console.error("Failed to fetch Test Zone data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
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
            <button
              onClick={() => navigate('/', { replace: true })}
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#FFD700] transition-colors uppercase"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
                <Target size={28} /> Test Zone
              </h1>
              <p className="text-gray-400 font-inter text-sm mt-2">Practice with Premium Test Series</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {institutions.map((item, idx) => (
            <div 
              key={item.id || idx} 
              onClick={() => navigate(`/test-zone/${item.id}`)}
              className="bg-[#111] border border-white/5 hover:border-[#FFD700]/50 rounded-2xl p-5 cursor-pointer transition-all shadow-lg group relative overflow-hidden flex flex-col justify-between h-48"
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-xl uppercase tracking-wider font-oswald">
                    {item.name || item.id}
                  </h3>
                </div>
                <p className="text-gray-500 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                  <PenTool size={12} /> Live Tests & Mock Papers
                </p>
              </div>

              {/* Background Image or Fallback */}
              {item.image ? (
                <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                  <Target size={120} className="text-white" />
                </div>
              )}

              <div className="relative z-10 flex justify-between items-center mt-auto">
                <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest group-hover:text-[#FFD700] transition-colors">
                  Enter Zone
                </span>
                <div className="w-8 h-8 bg-[#1a1a1a] rounded-full flex items-center justify-center text-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black transition-all">
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Hover Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestZoneScreen;
