import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Star, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';
import { fetchWithCache } from '../utils/api';

const MentorshipListScreen = () => {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMentors = async () => {
      try {
        const data = await fetchWithCache('/api/mentors.json', 'cache_mentors_list');
        if (data && data.mentors) {
          setMentors(data.mentors);
        }
      } catch (err) {
        console.error("Failed to load mentors:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMentors();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden animate-fade-in relative">
      {/* Background glowing blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#FFD700]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#FF453A]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
              <Target size={28} className="text-[#FFD700]" />
              Mentorship
            </h1>
            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase mt-1">
              Guidance from Industry Experts
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-32 rounded-3xl bg-[#111] border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : mentors.length > 0 ? (
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <div
                key={mentor.id}
                onClick={() => navigate(`/mentorship/${mentor.id}`, { state: { mentor } })}
                className="bg-[#111]/80 border border-white/5 rounded-3xl p-5 flex flex-col shadow-lg backdrop-blur-md relative overflow-hidden group hover:border-[#FFD700]/30 transition-all duration-300 cursor-pointer active:scale-95"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-2 bg-gradient-to-r from-[#FFD700]/0 via-[#FFD700]/5 to-[#FFD700]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />

                <div className="flex gap-4 relative z-10">
                  {/* Photo */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E1E20] to-[#121213] border border-white/10 flex-shrink-0 overflow-hidden shadow-2xl relative">
                    {mentor.photo && mentor.photo !== '#' ? (
                      <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <GraduationCap size={32} />
                      </div>
                    )}
                    {/* Rating Badge */}
                    {mentor.rating && mentor.rating !== '#' && (
                      <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                        <Star size={10} className="text-[#FFD700] fill-[#FFD700]" />
                        <span className="text-[9px] font-bold text-white">{mentor.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-white truncate leading-tight">
                      {mentor.name !== '#' ? mentor.name : 'Mentor'}
                    </h2>

                    {mentor.headline && mentor.headline !== '#' && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {mentor.headline}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      {mentor.company && mentor.company !== '#' && (
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          <Briefcase size={12} className="text-[#30D158]" />
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide truncate max-w-[80px]">
                            {mentor.company}
                          </span>
                        </div>
                      )}
                      {mentor.experience && mentor.experience !== '#' && (
                        <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          <Target size={12} className="text-[#0A84FF]" />
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                            {mentor.experience} YRS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expertise Tags */}
                {mentor.expertise && mentor.expertise !== '#' && Array.isArray(mentor.expertise) && (
                  <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar relative z-10 pb-1">
                    {mentor.expertise.map((exp, i) => (
                      <span key={i} className="text-[10px] font-black uppercase tracking-wider bg-white/5 text-gray-300 px-3 py-1.5 rounded-xl whitespace-nowrap border border-white/5">
                        {exp}
                      </span>
                    ))}
                  </div>
                )}

                {/* Book Now Indicator */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between relative z-10">
                  <span className="text-[11px] font-bold text-[#FFD700] tracking-widest uppercase">
                    View Profile
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black transition-colors duration-300">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Target size={64} className="mb-4 opacity-20" />
            <h3 className="text-xl font-oswald font-bold tracking-wide text-gray-400 mb-2 uppercase">No Mentors Found</h3>
            <p className="text-sm text-center">Currently there are no active mentors.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorshipListScreen;
