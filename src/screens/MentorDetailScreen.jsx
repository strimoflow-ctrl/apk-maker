import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, Briefcase, GraduationCap, MapPin, 
  Linkedin, Github, CheckCircle, Languages, Clock, 
  ShieldCheck, X, MessageCircle
} from 'lucide-react';

const MentorDetailScreen = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const mentor = state?.mentor;

  // If directly navigated without state, we should ideally fetch the mentor by ID.
  // For now, if no mentor, we redirect back to list.
  useEffect(() => {
    if (!mentor) {
      navigate('/mentorship', { replace: true });
    }
  }, [mentor, navigate]);

  if (!mentor) return null;

  // Handle telegram redirection
  const handleBooking = (plan) => {
    if (!mentor.telegramUrl || mentor.telegramUrl === '#') {
      alert("Booking link not available for this mentor.");
      return;
    }
    
    // Generate custom message
    const userId = localStorage.getItem('naino_user_name') || 'Scholar';
    let text = `Hello ${mentor.name !== '#' ? mentor.name : 'Mentor'},\n\nI am ${userId} from Naino Academy. I am interested in booking a mentorship session with you.`;
    
    if (plan) {
      text += `\n\nI would like to choose the *${plan.name}* plan (₹${plan.price}).`;
    }

    const url = `${mentor.telegramUrl}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-10 animate-fade-in relative">
      {/* Background glowing blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#FFD700]/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header Image / Pattern */}
      <div className="h-48 w-full bg-[#111] relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-[#1a1a1a] to-[#111]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-8 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white z-20 hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] transition-all"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-4 relative -mt-16 z-10">
        {/* Profile Header */}
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-3xl bg-[#1E1E20] border-4 border-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden relative">
            {mentor.photo && mentor.photo !== '#' ? (
              <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <GraduationCap size={48} />
              </div>
            )}
            {/* Rating Badge */}
            {mentor.rating && mentor.rating !== '#' && (
              <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 shadow-lg">
                <Star size={12} className="text-[#FFD700] fill-[#FFD700]" />
                <span className="text-xs font-bold text-white">{mentor.rating}</span>
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl font-oswald font-bold text-white text-center uppercase">
            {mentor.name !== '#' ? mentor.name : 'Mentor'}
          </h1>
          {mentor.headline && mentor.headline !== '#' && (
            <p className="text-sm text-[#FFD700] font-medium text-center mt-1 max-w-[80%]">
              {mentor.headline}
            </p>
          )}

          {/* Key Metrics */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {mentor.experience && mentor.experience !== '#' && (
              <div className="bg-[#111] border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                <Briefcase size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-200">{mentor.experience} YRS EXP</span>
              </div>
            )}
            {mentor.reviews_count && mentor.reviews_count !== '#' && (
              <div className="bg-[#111] border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                <MessageCircle size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-200">{mentor.reviews_count} REVIEWS</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio Section */}
        {mentor.bio && mentor.bio !== '#' && (
          <div className="mt-8 bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden">
            <h3 className="text-sm font-oswald font-bold text-gray-400 uppercase tracking-widest mb-3">About Mentor</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {mentor.bio}
            </p>
          </div>
        )}

        {/* Education & Work */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentor.company && mentor.company !== '#' && (
            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-[#30D158]/10 text-[#30D158] flex items-center justify-center flex-shrink-0 border border-[#30D158]/20">
                <Briefcase size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Current Company</h4>
                <p className="text-sm font-bold text-white truncate mt-0.5">{mentor.company}</p>
              </div>
            </div>
          )}

          {mentor.college && mentor.college !== '#' && (
            <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-[#0A84FF]/10 text-[#0A84FF] flex items-center justify-center flex-shrink-0 border border-[#0A84FF]/20">
                <GraduationCap size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Education</h4>
                <p className="text-sm font-bold text-white truncate mt-0.5">{mentor.college}</p>
                {mentor.degree && mentor.degree !== '#' && (
                  <p className="text-xs text-gray-400 truncate">{mentor.degree}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Skills & Expertise */}
        <div className="mt-4 bg-[#111]/80 backdrop-blur-md border border-white/5 rounded-3xl p-5 shadow-lg">
          <h3 className="text-sm font-oswald font-bold text-gray-400 uppercase tracking-widest mb-4">Core Competencies</h3>
          
          {mentor.skills && mentor.skills !== '#' && Array.isArray(mentor.skills) && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 mb-2">Technical Skills</h4>
              <div className="flex flex-wrap gap-2">
                {mentor.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mentor.expertise && mentor.expertise !== '#' && Array.isArray(mentor.expertise) && (
            <div>
              <h4 className="text-xs text-gray-500 mb-2">Mentorship Areas</h4>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((exp, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 text-xs text-[#FFD700] font-medium flex items-center gap-1.5">
                    <ShieldCheck size={12} />
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="mt-4 flex gap-3">
          {mentor.linkedin && mentor.linkedin !== '#' && (
            <a href={mentor.linkedin} target="_blank" rel="noreferrer" className="flex-1 bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-[#0077b5] hover:border-[#0077b5] transition-all group">
              <Linkedin size={20} className="text-gray-400 group-hover:text-white" />
              <span className="text-sm font-bold text-gray-400 group-hover:text-white">LinkedIn</span>
            </a>
          )}
          {mentor.github && mentor.github !== '#' && (
            <a href={mentor.github} target="_blank" rel="noreferrer" className="flex-1 bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-white hover:border-white transition-all group">
              <Github size={20} className="text-gray-400 group-hover:text-black" />
              <span className="text-sm font-bold text-gray-400 group-hover:text-black">GitHub</span>
            </a>
          )}
        </div>

        {/* Plans Section */}
        {mentor.plans && mentor.plans !== '#' && mentor.plans.length > 0 && (
          <div className="mt-8 mb-4">
            <h3 className="text-sm font-oswald font-bold text-[#FFD700] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Star size={16} /> Choose Your Plan
            </h3>
            <div className="space-y-4">
              {mentor.plans.map((plan, idx) => (
                <div 
                  key={plan.id || idx}
                  className="bg-gradient-to-b from-[#1a1a1a] to-[#111] border border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-[#FFD700]/30 transition-all duration-300"
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                      <h3 className="font-oswald font-bold text-2xl text-white tracking-wide">
                        {plan.name}
                      </h3>
                    </div>
                    <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 px-3 py-1.5 rounded-xl">
                      <span className="font-oswald font-bold text-xl text-[#FFD700]">₹{plan.price}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-8 relative z-10">
                    {plan.features && plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                        <div className="w-5 h-5 rounded-full bg-[#30D158]/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={12} className="text-[#30D158]" />
                        </div>
                        <span className="font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button 
                    onClick={() => handleBooking(plan)}
                    style={{ background: 'linear-gradient(90deg, #FFD700 0%, #e6c200 50%, #BF5AF2 100%)' }}
                    className="w-full text-black font-oswald font-bold text-base uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 relative z-10"
                  >
                    Book This Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback Book Now Button (If no plans) */}
        {(!mentor.plans || mentor.plans === '#' || mentor.plans.length === 0) && (
          <div className="mt-8 mb-4">
            <button 
              onClick={() => handleBooking(null)}
              style={{ background: 'linear-gradient(90deg, #FFD700 0%, #e6c200 50%, #BF5AF2 100%)' }}
              className="w-full max-w-lg mx-auto text-black font-oswald font-bold text-lg uppercase tracking-widest py-4 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              Book Session
              {mentor.price && mentor.price !== '#' && (
                 <span className="text-sm font-bold bg-black/20 px-2 py-0.5 rounded-md">From ₹{mentor.price}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorDetailScreen;
