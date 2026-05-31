import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Trash2, BellOff } from 'lucide-react';

const SwipeableNotification = ({ notif, onDelete, shouldHint }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const startX = useRef(null);
  const currentX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!startX.current || isDeleting) return;
    const deltaX = e.touches[0].clientX - startX.current;
    
    // Only allow swiping left
    if (deltaX < 0) {
      currentX.current = deltaX;
      setTranslateX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    startX.current = null;
    
    if (currentX.current < -100) {
      // Swiped far enough, trigger delete
      setIsDeleting(true);
      setTranslateX(-window.innerWidth);
      setTimeout(() => onDelete(notif._id), 300); // Wait for animation
    } else {
      // Snap back
      currentX.current = 0;
      setTranslateX(0);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-4 group">
      {/* Background showing trash icon when swiping */}
      <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end px-6 z-0">
        <Trash2 className="text-white" size={24} />
      </div>
      
      {/* Foreground Notification Card */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: startX.current === null ? 'transform 0.3s ease-out' : 'none'
        }}
        className={`relative z-10 bg-[#111] border border-white/5 rounded-2xl p-4 flex gap-4 transition-colors ${shouldHint ? 'animate-[swipeHint_1.5s_ease-in-out]' : ''}`}
      >
        <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 shrink-0 flex items-center justify-center text-[#FFD700]">
          <Bell size={18} />
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-bold text-white leading-tight truncate pr-2">
              {notif.title}
            </h3>
            <span className="text-[10px] text-gray-500 font-mono shrink-0 pt-0.5">
              {formatTime(notif.createdAt)}
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-snug">
            {notif.body}
          </p>
        </div>
      </div>
    </div>
  );
};

const NotificationListScreen = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    // The timestamp update logic is now moved inside loadNotifications
    // to strictly use server timestamps and avoid clock skew issues.

    // Check if we need to show the swipe hint
    // Play animation once per page load, but turn it off after it finishes
    // so it doesn't replay when the first item is deleted.
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);

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
      const cached = localStorage.getItem('naino_cached_notifications');
      if (cached) {
        const parsed = JSON.parse(cached);
        setNotifications(parsed);
        
        // Update last read to the newest notification's server timestamp
        if (parsed.length > 0) {
          const newestTime = Math.max(...parsed.map(n => new Date(n.createdAt).getTime()));
          const oldTime = Number(localStorage.getItem('naino_last_read_notifications_timestamp') || 0);
          
          if (newestTime > oldTime) {
            localStorage.setItem('naino_last_read_notifications_timestamp', newestTime.toString());
            window.dispatchEvent(new Event('badgeUpdateRequired'));
          }
        } else if (parsed.length === 0) {
           // If list is empty, also clear badge
           localStorage.setItem('naino_last_read_notifications_timestamp', Date.now().toString());
           window.dispatchEvent(new Event('badgeUpdateRequired'));
        }
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  const handleDelete = (id) => {
    try {
      // 1. Add to local deleted list so it doesn't show up again
      const deletedStr = localStorage.getItem('naino_deleted_notifications');
      const deletedIds = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('naino_deleted_notifications', JSON.stringify(deletedIds));
      }

      // 2. Remove from active state and cache
      const updated = notifications.filter(n => n._id !== id);
      setNotifications(updated);
      localStorage.setItem('naino_cached_notifications', JSON.stringify(updated));
      
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (e) {
      console.error("Failed to delete notification:", e);
    }
  };

  const handleClearAll = () => {
    // Removed the window.confirm alert completely
    try {
      const deletedStr = localStorage.getItem('naino_deleted_notifications');
      const deletedIds = deletedStr ? JSON.parse(deletedStr) : [];
      
      // Add all current notification IDs to the deleted list
      notifications.forEach(n => {
        if (!deletedIds.includes(n._id)) {
          deletedIds.push(n._id);
        }
      });
      
      localStorage.setItem('naino_deleted_notifications', JSON.stringify(deletedIds));
      
      setNotifications([]);
      localStorage.setItem('naino_cached_notifications', JSON.stringify([]));
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (e) {
      console.error("Failed to clear notifications:", e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes swipeHint {
          0% { transform: translateX(0); }
          20% { transform: translateX(-40px); }
          80% { transform: translateX(-40px); }
          100% { transform: translateX(0); }
        }
      `}} />
      
      {/* Golden Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-60"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="w-10 h-10"></div>
          
          <h1 className="font-oswald text-xl font-bold tracking-wider uppercase flex items-center gap-2">
            Push <span className="text-[#FFD700]">Alerts</span>
          </h1>
          
          <div className="w-10 h-10"></div>
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
            notifications.map((notif, index) => (
              <SwipeableNotification 
                key={notif._id} 
                notif={notif} 
                onDelete={handleDelete} 
                shouldHint={showHint && index === 0} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationListScreen;
