import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Trash2, BellOff } from 'lucide-react';

const NotificationListScreen = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
    
    // Listen for incoming notifications while on this page
    const handleUpdate = () => {
      loadNotifications();
    };
    window.addEventListener('notificationsUpdated', handleUpdate);
    return () => window.removeEventListener('notificationsUpdated', handleUpdate);
  }, []);

  const loadNotifications = () => {
    try {
      const existing = localStorage.getItem('naino_notifications_list');
      if (existing) {
        setNotifications(JSON.parse(existing));
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  const handleDelete = (id) => {
    try {
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      localStorage.setItem('naino_notifications_list', JSON.stringify(updated));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      setNotifications([]);
      localStorage.removeItem('naino_notifications_list');
      window.dispatchEvent(new Event('notificationsUpdated'));
    }
  };

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    // If yesterday, show 'Yesterday'
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise show date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-24 page-transition overflow-x-hidden">
      {/* Golden Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h1 className="font-oswald text-xl font-bold tracking-wider uppercase flex items-center gap-2">
            Push <span className="text-[#FFD700]">Alerts</span>
          </h1>
          
          {notifications.length > 0 ? (
            <button
              onClick={handleClearAll}
              className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <div className="w-10 h-10"></div> /* Placeholder for alignment */
          )}
        </header>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 text-center px-4">
              <div className="w-24 h-24 rounded-full bg-[#111] border border-white/5 flex items-center justify-center mb-6 shadow-inner">
                <BellOff size={40} className="text-gray-600" />
              </div>
              <h2 className="text-xl font-bold font-oswald tracking-wide uppercase text-gray-300 mb-2">
                All caught up!
              </h2>
              <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                You have no new notifications. When the academy sends an alert, it will appear here.
              </p>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                className="bg-[#111] border border-white/5 hover:border-[#FFD700]/30 rounded-2xl p-4 flex gap-4 transition-colors group relative overflow-hidden"
              >
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 shrink-0 flex items-center justify-center text-[#FFD700]">
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-bold text-white leading-tight truncate pr-2">
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0 pt-0.5">
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-snug">
                    {notif.body}
                  </p>
                </div>
                
                {/* Delete Button (Visible on hover on desktop, or swipe on mobile - but click is easiest) */}
                <button 
                  onClick={() => handleDelete(notif.id)}
                  className="absolute right-0 top-0 bottom-0 w-14 bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-full group-hover:translate-x-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationListScreen;
