import React, { useState, useEffect } from 'react';
import Calculator from './components/Calculator';
import ChatInterface from './components/ChatInterface';
import { listenForMessages } from './services/firebase';
// Hardcoded for User A's APK build
const USER_ID = 'A';
const PANIC_SWITCH_ENABLED = true; // Activated for production security

function App() {
  const [view, setView] = useState('calculator');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    // Visual Viewport API for mobile keyboard handling
    const handleResize = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--viewport-height', `${vh}px`);
      window.scrollTo(0, 0);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }
    handleResize();

    // Panic Switch: Revert to Calculator immediately if app loses focus
    const handlePanic = () => {
      if (!PANIC_SWITCH_ENABLED) return;
      if (window.isSelectingFile) return; // Ignore if user is picking a file
      
      if (document.hidden || !document.hasFocus()) {
        setView('calculator');
      }
    };

    document.addEventListener('visibilitychange', handlePanic);
    window.addEventListener('blur', handlePanic);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      document.removeEventListener('visibilitychange', handlePanic);
      window.removeEventListener('blur', handlePanic);
    };
  }, []);

  useEffect(() => {
    // Global listener to check for unread messages (Stealth Notification)
    const unsubscribe = listenForMessages((messages) => {
      const unread = messages.some(
        msg => msg.sender !== USER_ID && !msg.seenAt
      );
      setHasUnreadMessages(unread);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      {view === 'calculator' ? (
        <Calculator 
          onUnlock={() => setView('chat')} 
          hasUnreadMessages={hasUnreadMessages} 
        />
      ) : (
        <ChatInterface userId={USER_ID} />
      )}
    </div>
  );
}

export default App;
