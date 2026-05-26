import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { fetchBackendAPI } from '../utils/api';
import { useAlert } from '../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, Plus, X, Award, CheckSquare, Trash2, Pin, Clock, 
  Timer, Flame, BookOpen, TrendingUp, Tv, Calendar as CalendarIcon, Smile, Lightbulb,
  ChevronLeft, ChevronRight, PlayCircle, AlertTriangle
} from 'lucide-react';
import { getProgressStats, getDayData } from '../utils/progressTracker';

const getTodayDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const MyProgressScreen = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const secretKey = localStorage.getItem('naino_access_token') || 'XXXXXX';

  // --- Study Progress States ---
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [mainStats, setMainStats] = useState({ streak: 0, totalSeconds: 0 });
  const [dayData, setDayData] = useState({ seconds: 0, lectures: [] });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [visibleLectures, setVisibleLectures] = useState(5);
  
  // Weekly data for the chart (calculating last 7 days ending at selectedDate)
  const [weeklyBars, setWeeklyBars] = useState([]);

  // --- Sticky Notes States ---
  const [stickyNotes, setStickyNotes] = useState([]);
  const [plannerStats, setPlannerStats] = useState({ totalCreated: 0, totalCompleted: 0 });
  const [dailyWin, setDailyWin] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('normal');
  const [newNoteTime, setNewNoteTime] = useState('Morning');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeConfettiId, setActiveConfettiId] = useState(null);

  // Load Main Stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getProgressStats();
      setMainStats({ streak: stats.streak || 0, totalSeconds: stats.totalSeconds || 0 });
    };
    loadStats();
  }, []);

  // Load Specific Day Data (Demand per supply)
  useEffect(() => {
    const loadDay = async () => {
      setIsLoadingDay(true);
      const data = await getDayData(selectedDate);
      setDayData(data || { seconds: 0, lectures: [] });
      
      // Calculate Weekly Bars ending at selectedDate
      const bars = [];
      const end = new Date(selectedDate);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Fetch each day's data for the bar chart
        const dayRecord = await getDayData(dateStr);
        bars.push({
          day: dayLabel,
          dateStr,
          seconds: dayRecord ? dayRecord.seconds : 0
        });
      }
      setWeeklyBars(bars);
      setVisibleLectures(5); // Reset limit when date changes
      setIsLoadingDay(false);
    };
    loadDay();
  }, [selectedDate]);

  // Load User Firebase Data (Sticky Notes)
  useEffect(() => {
    const fetchUserData = async () => {
      if (secretKey === 'XXXXXX') return;
      try {
        const response = await fetchBackendAPI('/api/keys/verify', 'POST', {
          code: secretKey,
          deviceId: localStorage.getItem('naino_device_uuid'),
        });
        const data = response.data;
        setStickyNotes(data.stickyNotes || []);
        setPlannerStats(data.plannerStats || { totalCreated: 0, totalCompleted: 0 });
        setDailyWin(data.dailyWin || '');
      } catch (e) {
        console.error("Error loading account data:", e);
      }
    };
    fetchUserData();
  }, [secretKey]);

  // --- Sticky Notes Handlers ---
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    // Limit to 5 active notes
    const activeNotes = stickyNotes.filter(n => !n.completed);
    if (activeNotes.length >= 5) {
      showAlert('Target Limit Reached', 'You can only have 5 active targets at a time. Complete or delete an existing one first!', 'error');
      return;
    }

    const newNote = {
      id: 'note_' + Date.now(),
      text: newNoteText.trim(),
      completed: false,
      tag: newNoteTag,
      timeTag: newNoteTime,
      createdAt: Date.now(),
      completedAt: null
    };

    const updatedNotes = [newNote, ...stickyNotes];
    const updatedStats = {
      ...plannerStats,
      totalCreated: (plannerStats.totalCreated || 0) + 1
    };

    setStickyNotes(updatedNotes);
    setPlannerStats(updatedStats);
    setNewNoteText('');
    setShowAddForm(false);

    try {
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: secretKey,
        deviceId: localStorage.getItem('naino_device_uuid'),
        updates: {
          stickyNotes: updatedNotes,
          plannerStats: updatedStats
        }
      });
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const handleToggleNote = async (id) => {
    let wasCompleted = false;
    const updatedNotes = stickyNotes.map(note => {
      if (note.id === id) {
        wasCompleted = !note.completed;
        return {
          ...note,
          completed: !note.completed,
          completedAt: !note.completed ? Date.now() : null
        };
      }
      return note;
    });

    const completionDiff = wasCompleted ? 1 : -1;
    const updatedStats = {
      ...plannerStats,
      totalCompleted: Math.max(0, (plannerStats.totalCompleted || 0) + completionDiff)
    };

    if (wasCompleted) {
      setActiveConfettiId(id);
      setTimeout(() => setActiveConfettiId(null), 1500);
    }

    setStickyNotes(updatedNotes);
    setPlannerStats(updatedStats);

    try {
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: secretKey,
        deviceId: localStorage.getItem('naino_device_uuid'),
        updates: {
          stickyNotes: updatedNotes,
          plannerStats: updatedStats
        }
      });
    } catch (err) {
      console.error("Error toggling note status:", err);
    }
  };

  const handleDeleteNote = async (id) => {
    const noteToDelete = stickyNotes.find(note => note.id === id);
    const updatedNotes = stickyNotes.filter(note => note.id !== id);
    
    let completedDiff = 0;
    if (noteToDelete && noteToDelete.completed) {
      completedDiff = -1;
    }
    const updatedStats = {
      ...plannerStats,
      totalCompleted: Math.max(0, (plannerStats.totalCompleted || 0) + completedDiff)
    };

    setStickyNotes(updatedNotes);
    setPlannerStats(updatedStats);

    try {
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: secretKey,
        deviceId: localStorage.getItem('naino_device_uuid'),
        updates: {
          stickyNotes: updatedNotes,
          plannerStats: updatedStats
        }
      });
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const handleSaveDailyWin = async (text) => {
    setDailyWin(text);
    try {
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: secretKey,
        deviceId: localStorage.getItem('naino_device_uuid'),
        updates: { dailyWin: text }
      });
      showAlert("Daily win saved successfully!", "success");
    } catch (err) {
      console.error("Error saving daily win:", err);
    }
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarMonth);
  const monthName = calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Generate Calendar Grid
  const calendarGrid = [];
  for (let i = 0; i < firstDay; i++) {
    calendarGrid.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    calendarGrid.push(d.toISOString().split('T')[0]);
  }

  // --- Horizontal Quick Dates ---
  const quickDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    quickDates.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-24 page-transition overflow-x-hidden">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes float-pin {
          0% { transform: translateY(0) rotate(-10deg); }
          50% { transform: translateY(-2px) rotate(5deg); }
          100% { transform: translateY(0) rotate(-10deg); }
        }
        .floating-pin {
          animation: float-pin 3s ease-in-out infinite;
        }
        .sticky-note-1 { transform: rotate(-1.5deg); transition: all 0.3s; }
        .sticky-note-1:hover { transform: translateY(-6px) rotate(1deg) scale(1.02); }
        .sticky-note-2 { transform: rotate(1deg); transition: all 0.3s; }
        .sticky-note-2:hover { transform: translateY(-6px) rotate(-1.5deg) scale(1.02); }
        .sticky-note-3 { transform: rotate(-0.5deg); transition: all 0.3s; }
        .sticky-note-3:hover { transform: translateY(-6px) rotate(1.5deg) scale(1.02); }
      `}</style>

      {/* Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        <div className="text-center mb-6 flex flex-col items-center">
          <p className="text-[#FFD700] text-[0.65rem] tracking-[0.2em] font-semibold mb-2 uppercase">
            Naino Academy
          </p>
          <h1 className="font-oswald text-[2.2rem] font-bold leading-[1.1] tracking-tight uppercase">
            My <span className="text-[#FFD700]">Progress</span>
          </h1>
        </div>

        {/* --- 1. Top Quick Calendar & Controls --- */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-oswald text-lg uppercase tracking-wider flex items-center gap-2">
            <CalendarIcon size={18} className="text-[#FFD700]" /> History Select
          </h4>
          <button 
            onClick={() => setIsCalendarOpen(true)}
            className="text-[10px] bg-white/10 hover:bg-[#FFD700] hover:text-black px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all"
          >
            Full Calendar
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 mb-6">
          {quickDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            const dObj = new Date(dateStr);
            const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dObj.getDate();
            const isToday = dateStr === getTodayDateString();

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-shrink-0 w-[60px] h-[75px] rounded-2xl flex flex-col items-center justify-center border transition-all ${
                  isSelected 
                    ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-black' : 'text-gray-500'}`}>
                  {isToday ? 'Today' : dayName}
                </span>
                <span className="text-2xl font-black font-oswald mt-1">{dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* --- Calendar Modal --- */}
        {isCalendarOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
            <div className="bg-[#111] border border-white/10 rounded-3xl p-4 sm:p-5 w-full max-w-[320px] shadow-2xl animate-apple-slide-up">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-full"><ChevronLeft size={18} /></button>
                <h3 className="text-[#FFD700] font-black uppercase tracking-widest text-xs sm:text-sm">{monthName}</h3>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-full"><ChevronRight size={18} /></button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-[9px] sm:text-[10px] text-gray-500 font-black">{d}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((dateStr, idx) => {
                  if (!dateStr) return <div key={`empty-${idx}`} className="h-8 sm:h-9" />;
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === getTodayDateString();
                  const dObj = new Date(dateStr);
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setSelectedDate(dateStr); setIsCalendarOpen(false); }}
                      className={`h-8 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold transition-all relative ${
                        isSelected ? 'bg-[#FFD700] text-black shadow-[0_0_10px_rgba(255,215,0,0.5)] scale-110 z-10' : 
                        isToday ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      {dObj.getDate()}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setIsCalendarOpen(false)}
                className="w-full mt-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all"
              >
                Close Calendar
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* --- 2. Study Tracker Dashboard --- */}
        <div className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl mb-4 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-white font-oswald text-xl uppercase tracking-wider flex items-center gap-3">
                <Timer size={22} className="text-[#FFD700]" /> Dashboard
              </h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">
                Stats for <span className="text-[#FFD700]">{new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </p>
            </div>
            
            {mainStats.streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.1)]">
                <Flame size={14} className="text-[#FFD700] fill-[#FFD700]" />
                <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest">{mainStats.streak} Day Streak</span>
              </div>
            )}
          </div>

          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center hover:bg-white/10 transition-all hover:scale-[1.02]">
              <BookOpen size={16} className="text-[#FFD700] mx-auto mb-2" />
              <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">On {new Date(selectedDate).getDate()} {new Date(selectedDate).toLocaleString('default', { month: 'short' })}</span>
              <span className="text-sm font-black text-white font-mono block">
                {isLoadingDay ? '--' : Math.round(dayData.seconds / 60)} <span className="text-[10px] font-normal text-gray-400">m</span>
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center hover:bg-white/10 transition-all hover:scale-[1.02]">
              <TrendingUp size={16} className="text-[#FFD700] mx-auto mb-2" />
              <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">All Time</span>
              <span className="text-sm font-black text-white font-mono block">
                {Math.round(mainStats.totalSeconds / 60)} <span className="text-[10px] font-normal text-gray-400">m</span>
              </span>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center hover:bg-white/10 transition-all hover:scale-[1.02]">
              <Tv size={16} className="text-[#FFD700] mx-auto mb-2" />
              <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">Lectures</span>
              <span className="text-sm font-black text-white font-mono block">
                {isLoadingDay ? '--' : dayData.lectures.length}
              </span>
            </div>
          </div>

          {/* Weekly Bar Chart Progress (Relative to selected date) */}
          <div className="bg-black/40 border border-white/5 p-4 rounded-2xl mb-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp size={14} className="text-[#FFD700]" />
                <span className="text-[9px] uppercase font-black tracking-widest">7-Day Focus (Minutes)</span>
              </div>
            </div>

            <div className="flex gap-3 relative pb-2">
              <div className="flex flex-col justify-between text-right text-[8px] font-mono text-gray-500 h-24 w-8 select-none pr-1.5 py-0.5">
                <span>60m</span><span>45m</span><span>30m</span><span>15m</span><span>0m</span>
              </div>
              
              <div className="flex-1 relative">
                <div className="absolute inset-x-0 top-0 h-24 flex flex-col justify-between pointer-events-none">
                  <div className="w-full border-t border-white/[0.04] border-dashed" />
                  <div className="w-full border-t border-white/[0.04] border-dashed" />
                  <div className="w-full border-t border-white/[0.04] border-dashed" />
                  <div className="w-full border-t border-white/[0.04] border-dashed" />
                  <div className="w-full border-t border-white/[0.1] border-solid" />
                </div>

                <div className="h-24 flex justify-between items-end px-2 relative z-10">
                  {weeklyBars.map((bar) => {
                    const minutes = Math.round(bar.seconds / 60);
                    const pct = Math.min((minutes / 60) * 100, 100);
                    const isSelected = bar.dateStr === selectedDate;

                    return (
                      <div key={bar.dateStr} className="flex flex-col items-center justify-end h-full relative group cursor-pointer" onClick={() => setSelectedDate(bar.dateStr)}>
                        <div className={`relative flex flex-col justify-end h-full w-3.5 bg-white/[0.03] hover:bg-white/[0.07] border ${isSelected ? 'border-[#FFD700]/50' : 'border-white/5'} rounded-full overflow-hidden transition-all duration-300`}>
                          <div 
                            style={{ height: `${Math.max(pct, 5)}%` }}
                            className={`w-full rounded-full transition-all duration-500 ${isSelected ? 'bg-[#FFD700]' : 'bg-gradient-to-t from-[#FFD60A] to-[#FFF59D] opacity-60'} shadow-[0_0_10px_rgba(255,214,10,0.25)]`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-between px-2 mt-2">
                  {weeklyBars.map(bar => {
                    const isSelected = bar.dateStr === selectedDate;
                    return (
                      <div key={bar.dateStr} className="w-3.5 text-center">
                        <span className={`text-[7px] font-black uppercase tracking-widest ${isSelected ? 'text-[#FFD700]' : 'text-gray-500'}`}>
                          {bar.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Activity List for Selected Day */}
          <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
            <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-4">
              Sessions on {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            
            {isLoadingDay ? (
              <div className="text-center py-6 text-gray-500 text-xs font-black uppercase animate-pulse">Loading...</div>
            ) : dayData.lectures && dayData.lectures.length > 0 ? (
              <div className="space-y-3">
                {dayData.lectures.slice(0, visibleLectures).map((item, idx) => (
                  <div key={idx} onClick={() => { 
                    if (item.courseId) {
                       navigate(`/${item.type || 'course'}/${item.courseId}`, {
                          state: {
                             autoPlayLecture: item.lectureId || item.title,
                             coachingContext: item.coachingContext
                          }
                       });
                    } else if (item.link) {
                       navigate(item.link);
                    }
                  }} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex-1 min-w-0 pr-3">
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest block truncate">{item.course}</span>
                      <span className="text-xs text-white font-bold block truncate mt-0.5">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-[9px] text-[#32D74B] font-black uppercase tracking-wider block">Completed</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{Math.round(item.seconds / 60)} min</span>
                      </div>
                      <PlayCircle size={18} className="text-[#FFD700]" />
                    </div>
                  </div>
                ))}
                
                {dayData.lectures.length > visibleLectures && (
                  <button 
                    onClick={() => setVisibleLectures(prev => prev + 5)}
                    className="w-full mt-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] text-gray-400 hover:text-white font-black uppercase tracking-widest transition-all"
                  >
                    Load More
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={16} className="text-gray-500" />
                </div>
                <p className="text-xs text-gray-500 font-bold">No sessions logged this day.</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Disclamier */}
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-8">
          <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[8px] text-red-500/80 font-black uppercase tracking-wider leading-relaxed">
            Note: Your 12-month study data is saved locally for speed & privacy. Premium members sync to cloud daily. Uninstalling or clearing app data will permanently erase local history!
          </p>
        </div>

        {/* 🎯 Sticky Notes & Daily Target Board (Retained) */}
        <div className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl mb-6 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-white font-oswald text-xl uppercase tracking-wider flex items-center gap-3">
                <ClipboardList size={22} className="text-[#FFD700]" /> Daily Target Board
              </h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-bold">Write down your daily targets & tick them off!</p>
            </div>
            
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FFD700] text-black rounded-full font-black uppercase tracking-wider text-[10px] hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,215,0,0.3)]"
            >
              {showAddForm ? <X size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
              {showAddForm ? 'Close' : 'Add Target'}
            </button>
          </div>

          {/* Quick Completion Stats */}
          {stickyNotes.length > 0 && (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 flex items-center justify-center bg-black/40 rounded-full border border-white/10">
                  <Award className="text-[#FFD700] w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block">Daily Focus Rate</span>
                  <span className="text-sm font-black text-white font-mono block">
                    {stickyNotes.filter(n => n.completed).length} / {stickyNotes.length} <span className="text-[10px] font-normal text-gray-400">Done</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/60 border border-white/5 px-4 py-2.5 rounded-xl">
                <div className="text-right">
                  <span className="text-[8px] text-gray-500 uppercase font-black tracking-widest block">Goal Completed</span>
                  <span className="text-xs font-black text-[#32D74B] font-mono block">
                    {Math.round((stickyNotes.filter(n => n.completed).length / stickyNotes.length) * 100)}%
                  </span>
                </div>
                <div className="w-1.5 h-8 bg-white/5 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-[#32D74B] transition-all duration-500" 
                    style={{ height: `${(stickyNotes.filter(n => n.completed).length / stickyNotes.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Add Target Form Panel */}
          {showAddForm && (
            <form onSubmit={handleAddNote} className="bg-[#1c1c1e]/65 border border-[#FFD700]/20 rounded-3xl p-5 mb-6 animate-apple-slide-up backdrop-blur-xl">
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-2">What is your target?</label>
                  <input 
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="e.g. Solve 10 Physics Numericals"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-[#FFD700] transition-all outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-2">Priority Tag</label>
                    <select 
                      value={newNoteTag}
                      onChange={(e) => setNewNoteTag(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#FFD700] transition-all outline-none"
                    >
                      <option value="normal">🟢 Normal Target</option>
                      <option value="high-priority">🔴 Must Do (High)</option>
                      <option value="revision">🟡 Revision Task</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-2">Session Time</label>
                    <select 
                      value={newNoteTime}
                      onChange={(e) => setNewNoteTime(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#FFD700] transition-all outline-none"
                    >
                      <option value="Morning">🌅 Morning</option>
                      <option value="Afternoon">☀️ Afternoon</option>
                      <option value="Night">🌙 Night</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#FFD700] text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.01] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(255,215,0,0.2)]"
                >
                  <Plus size={14} strokeWidth={3} /> Pin Note to Board
                </button>
              </div>
            </form>
          )}

          {/* Sticky Notes Grid */}
          {stickyNotes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {stickyNotes.map((note, index) => {
                const noteStyleClass = index % 3 === 0 ? 'sticky-note-1' : index % 3 === 1 ? 'sticky-note-2' : 'sticky-note-3';
                
                let noteBgClass = '';
                if (note.completed) {
                  noteBgClass = 'bg-white/[0.02] border-white/5 opacity-55 hover:opacity-90';
                } else {
                  if (note.tag === 'high-priority') {
                    noteBgClass = 'bg-gradient-to-br from-[#FF85A2]/15 via-[#FF85A2]/5 to-transparent border-[#FF85A2]/20';
                  } else if (note.tag === 'revision') {
                    noteBgClass = 'bg-gradient-to-br from-[#CE93D8]/15 via-[#CE93D8]/5 to-transparent border-[#CE93D8]/20';
                  } else {
                    noteBgClass = 'bg-gradient-to-br from-[#FFF59D]/10 via-[#FFF59D]/5 to-transparent border-[#FFF59D]/15';
                  }
                }

                return (
                  <div 
                    key={note.id} 
                    className={`relative min-h-[155px] rounded-3xl p-4 border text-left flex flex-col justify-between group overflow-hidden ${noteStyleClass} ${noteBgClass}`}
                  >
                    {!note.completed && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 floating-pin opacity-80 pointer-events-none">
                        <Pin size={16} className={`fill-current ${note.tag === 'high-priority' ? 'text-[#FF85A2]' : 'text-[#FFD700]'}`} />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-1 z-10">
                      {note.tag === 'high-priority' && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-[#FF85A2]/20 text-[#FF85A2] px-1.5 py-0.5 rounded-md">Must Do</span>
                      )}
                      {note.tag === 'revision' && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-[#CE93D8]/20 text-[#CE93D8] px-1.5 py-0.5 rounded-md">Revision</span>
                      )}
                      <span className="text-[7px] font-black uppercase tracking-widest bg-white/5 text-gray-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Clock size={6} /> {note.timeTag}
                      </span>
                    </div>

                    <p className={`text-xs md:text-sm font-bold leading-snug mt-3 flex-1 z-10 ${note.completed ? 'text-gray-500 line-through decoration-white/20' : 'text-white'}`}>
                      {note.text}
                    </p>

                    <div className="flex items-center justify-between mt-4 z-10 pt-2 border-t border-white/5">
                      <button 
                        onClick={() => handleToggleNote(note.id)}
                        className="flex items-center gap-1.5 group/btn"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${note.completed ? 'bg-[#32D74B] text-black' : 'border border-white/20 group-hover/btn:border-[#FFD700]'}`}>
                          {note.completed && <CheckSquare size={12} strokeWidth={3} />}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${note.completed ? 'text-[#32D74B]' : 'text-gray-400 group-hover/btn:text-[#FFD700]'}`}>
                          {note.completed ? 'Done' : 'Complete'}
                        </span>
                      </button>

                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-black/40 border border-white/5 rounded-3xl p-8 text-center shadow-lg">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb size={20} className="text-gray-500" />
              </div>
              <h5 className="text-white font-bold text-sm">No targets set for today</h5>
            </div>
          )}

          {/* Daily Win Reflection */}
          <div className="bg-gradient-to-r from-[#FFD700]/10 to-transparent border border-[#FFD700]/15 rounded-3xl p-5 mt-6 shadow-[0_10px_30px_rgba(255,215,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <Smile size={18} className="text-[#FFD700] fill-[#FFD700]/10" />
              <span className="text-[9px] text-[#FFD700] font-black uppercase tracking-[0.15em]">Daily Win & Reflection</span>
            </div>
            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Write down your biggest achievement, a lesson learned, or something that made you smile today!</p>
            
            <div className="flex gap-2">
              <input 
                type="text"
                value={dailyWin}
                onChange={(e) => setDailyWin(e.target.value)}
                placeholder="e.g. Mastered Organic Chemistry mechanisms today! 🔥"
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-[#FFD700] outline-none transition-all"
              />
              <button 
                onClick={() => handleSaveDailyWin(dailyWin)}
                className="bg-[#FFD700]/10 border border-[#FFD700]/25 text-[#FFD700] hover:bg-[#FFD700] hover:text-black px-4 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProgressScreen;
