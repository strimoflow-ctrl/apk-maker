import React, { useState, useEffect, useRef } from 'react';
import { listenForMessages, sendMessage, markAsSeen, listenForUserProfile, deleteMessage, reactToMessage } from '../services/firebase';
import { decryptText } from '../services/crypto';
import { uploadImageToImgBB } from '../services/imgbb';
import { Send, Clock, ChevronDown, Lock, Plus, Camera, Image as ImageIcon, X, Reply } from 'lucide-react';
import ProfileSetup from './ProfileSetup';
import { motion, AnimatePresence } from 'framer-motion';

const EXPIRY_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 5 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '1 hour', value: 60 * 60 },
  { label: '24 hours', value: 24 * 60 * 60 }
];

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

const ChatInterface = ({ userId }) => {
  const otherUserId = userId === 'A' ? 'B' : 'A';
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [expiryTimer, setExpiryTimer] = useState(() => {
    const saved = localStorage.getItem('vault_expiry_timer');
    return saved ? parseInt(saved, 10) : 24 * 60 * 60;
  });
  
  useEffect(() => {
    localStorage.setItem('vault_expiry_timer', expiryTimer.toString());
  }, [expiryTimer]);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState(null);
  const [popupMenu, setPopupMenu] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const markedMessagesRef = useRef(new Set());

  const messagesAreaRef = useRef(null);
  const previousScrollHeight = useRef(0);
  const isInitialRender = useRef(true);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [messageLimit, setMessageLimit] = useState(15);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(isBottom);

    if (scrollTop === 0 && !loadingMore && messages.length >= messageLimit) {
      setLoadingMore(true);
      previousScrollHeight.current = scrollHeight;
      setMessageLimit(prev => prev + 15);
    }
  };

  // Load profiles
  useEffect(() => {
    const unsubMe = listenForUserProfile(userId, (data) => {
      setMyProfile(data);
      setIsLoadingProfile(false);
      if (!data) {
        setNeedsSetup(true);
      } else {
        setNeedsSetup(false);
      }
    });
    const unsubOther = listenForUserProfile(otherUserId, (data) => setOtherProfile(data));
    return () => {
      unsubMe();
      unsubOther();
    };
  }, [userId, otherUserId]);

  // Load messages
  useEffect(() => {
    const unsubscribe = listenForMessages(messageLimit, (fetchedMessages) => {
      const processed = fetchedMessages.map(msg => ({
        ...msg,
        decryptedContent: msg.type === 'text' ? decryptText(msg.text) : msg.text
      }));
      setMessages(processed);
      setLoadingMore(false);

      // Mark unread messages from other user as seen
      processed.forEach(msg => {
        if (msg.sender !== userId && !msg.seenAt && !markedMessagesRef.current.has(msg.id)) {
          markedMessagesRef.current.add(msg.id);
          markAsSeen(msg.id);
        }
      });
    });
    return () => unsubscribe();
  }, [userId, messageLimit]);

  useEffect(() => {
    if (isInitialRender.current && messages.length > 0) {
      if (messagesAreaRef.current) {
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      }
      isInitialRender.current = false;
    } else if (previousScrollHeight.current > 0 && messagesAreaRef.current) {
      const newScrollHeight = messagesAreaRef.current.scrollHeight;
      messagesAreaRef.current.scrollTop = newScrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = 0;
    } else if (isAtBottom && !loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUploading, replyingTo, isAtBottom, loadingMore]);

  // Periodic expiry check
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => [...prev]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() && !isUploading) return;

    if (input.trim() === '/load cryvex@5911') {
      setVaultUnlocked(true);
      setInput('');
      return;
    }

    const textToSend = input;
    setInput('');
    const replyContext = replyingTo ? replyingTo.decryptedContent : null;
    setReplyingTo(null);
    
    await sendMessage(textToSend, userId, 'text', replyContext, expiryTimer);
  };

  const handleFilePickerOpen = () => {
    window.isSelectingFile = true;
    window.addEventListener('focus', () => {
      setTimeout(() => {
        window.isSelectingFile = false;
      }, 500);
    }, { once: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setShowAttachMenu(false);
    setIsUploading(true);
    try {
      const imageUrl = await uploadImageToImgBB(file);
      const replyContext = replyingTo ? replyingTo.decryptedContent : null;
      setReplyingTo(null);
      await sendMessage(imageUrl, userId, 'image', replyContext, expiryTimer);
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  let pressTimer = null;
  const handleTouchStart = (msg) => {
    pressTimer = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setPopupMenu({ msg, type: 'delete' });
    }, 600);
  };
  const handleTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };
  const handleBubbleClick = (msg) => {
    if (pressTimer) clearTimeout(pressTimer);
    setPopupMenu({ msg, type: 'action' });
  };

  if (isLoadingProfile) {
    return <div className="chat-interface" style={{justifyContent: 'center', alignItems: 'center'}}>Loading...</div>;
  }

  if (needsSetup) {
    return <ProfileSetup userId={userId} onComplete={() => setNeedsSetup(false)} />;
  }

  const filteredMessages = messages.filter(msg => {
    if (vaultUnlocked) return true;
    if (!msg.seenAt) return true;
    
    const seenTime = typeof msg.seenAt === 'number' 
      ? msg.seenAt 
      : (msg.seenAt.toDate ? msg.seenAt.toDate().getTime() : new Date().getTime());
      
    const expiryTime = seenTime + (expiryTimer * 1000);
    return new Date().getTime() < expiryTime;
  });

  const getAvatarPath = (gender) => {
    return gender === 'Male' ? '/me.jpg' : '/gf.jpg';
  };

  return (
    <div className="chat-interface">
      {/* HEADER */}
      <div className="chat-header">
        <div className="profile-info">
          <div className="avatar">
             <img 
               src={otherProfile ? getAvatarPath(otherProfile.gender) : '/me.jpg'} 
               alt="avatar" 
               onError={(e) => { e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzQ0NCIgLz48L3N2Zz4=' }}
             />
          </div>
          <div className="name">{otherProfile?.name || `User ${otherUserId}`}</div>
        </div>
        {vaultUnlocked && (
          <div className="vault-badge">
            <Lock size={14} /> Vault
          </div>
        )}
      </div>
      
      {/* MESSAGES AREA */}
      <div className="messages-area" ref={messagesAreaRef} onClick={() => setShowAttachMenu(false)} onScroll={handleScroll}>
        <AnimatePresence initial={false}>
          {filteredMessages.map(msg => {
            const isMe = msg.sender === userId;
            
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                key={msg.id} 
                className={`message-wrapper ${isMe ? 'me' : 'other'}`}
              >
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, info) => {
                    if (info.offset.x > 60) {
                      if (navigator.vibrate) navigator.vibrate(50);
                      setReplyingTo(msg);
                    }
                  }}
                  className="message-bubble-container"
                >
                  {msg.replyTo && (
                    <div className="reply-context">
                      {msg.replyTo.substring(0, 40)}{msg.replyTo.length > 40 ? '...' : ''}
                    </div>
                  )}
                  
                  <div 
                    onTouchStart={() => handleTouchStart(msg)}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleBubbleClick(msg)}
                    className={`message-bubble ${msg.type === 'image' ? 'image-bubble' : ''}`}
                  >
                    {msg.type === 'image' ? (
                      <img 
                        src={msg.decryptedContent} 
                        alt="uploaded" 
                        onClick={(e) => { e.stopPropagation(); setFullScreenImage(msg.decryptedContent); }}
                      />
                    ) : (
                      <div className="message-text">{msg.decryptedContent}</div>
                    )}
                    
                    {msg.reaction && (
                      <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                        className="reaction-badge"
                      >
                        {msg.reaction}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
                
                {vaultUnlocked && msg.seenAt && (
                  <div className="debug-timer">
                    Seen: {new Date(typeof msg.seenAt === 'number' ? msg.seenAt : msg.seenAt.toDate()).toLocaleTimeString()}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isUploading && (
          <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="message-wrapper me"
          >
            <div className="message-bubble-container">
              <div className="message-bubble image-bubble uploading">
                <div className="spinner"></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {/* INPUT AREA */}
      <div className="input-area">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="replying-bar"
            >
               <div className="reply-content">
                 <span className="reply-label">
                   Replying to {replyingTo.sender === userId ? 'yourself' : otherProfile?.name || 'them'}
                 </span>
                 <div className="reply-text">
                   {replyingTo.type === 'image' ? 'Photo' : replyingTo.decryptedContent}
                 </div>
               </div>
               <button onClick={() => setReplyingTo(null)} className="cancel-reply">
                 <X size={16} />
               </button>
            </motion.div>
          )}
        </AnimatePresence>
      
        <div className="input-row">
          <div className="attach-wrapper">
            <button type="button" className="attach-btn" onClick={() => setShowAttachMenu(!showAttachMenu)}>
              <Plus size={24} />
            </button>
            
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="attach-menu"
                >
                  <label className="attach-option" onClick={handleFilePickerOpen}>
                    <Camera size={20} /> Camera
                    <input type="file" accept="image/*" capture="environment" className="hidden-radio" ref={cameraInputRef} onChange={handleFileUpload} />
                  </label>
                  <label className="attach-option" onClick={handleFilePickerOpen}>
                    <ImageIcon size={20} /> Photo & Video
                    <input type="file" accept="image/*" className="hidden-radio" ref={fileInputRef} onChange={handleFileUpload} />
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSend} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="iMessage"
              onFocus={() => {
                setShowAttachMenu(false);
                if (isAtBottom) {
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            
            <div className="timer-wrapper">
              <button 
                type="button"
                className={`timer-btn ${showTimerMenu ? 'active' : ''}`} 
                onClick={() => setShowTimerMenu(!showTimerMenu)}
              >
                <Clock size={16} />
                <span className="timer-label">
                  {EXPIRY_OPTIONS.find(o => o.value === expiryTimer)?.label.replace('hours', 'h').replace('min', 'm')}
                </span>
                <ChevronDown size={12} />
              </button>
              
              <AnimatePresence>
                {showTimerMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="timer-menu"
                  >
                    {EXPIRY_OPTIONS.map(opt => (
                      <div 
                        key={opt.value} 
                        className={`timer-option ${expiryTimer === opt.value ? 'selected' : ''}`}
                        onClick={() => {
                          setExpiryTimer(opt.value);
                          setShowTimerMenu(false);
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button type="submit" className="send-btn" disabled={!input.trim()}>
              <Send size={16} className="-ml-0.5" />
            </button>
          </form>
        </div>
      </div>

      {/* POPUP MENU */}
      <AnimatePresence>
        {popupMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="popup-overlay" 
            onClick={() => setPopupMenu(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="popup-menu" 
              onClick={e => e.stopPropagation()}
            >
              {popupMenu.type === 'action' && (
                <>
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
                    }}
                    initial="hidden"
                    animate="visible"
                    className="reactions-row"
                  >
                    {EMOJIS.map(emoji => (
                      <motion.button 
                        key={emoji}
                        variants={{
                          hidden: { y: 20, opacity: 0, scale: 0.5 },
                          visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 500 } }
                        }}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { reactToMessage(popupMenu.msg.id, emoji); setPopupMenu(null); }}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </motion.div>
                  <button 
                    className="popup-action-btn"
                    onClick={() => { setReplyingTo(popupMenu.msg); setPopupMenu(null); }}
                  >
                    <Reply size={18} /> Reply
                  </button>
                </>
              )}
              {popupMenu.type === 'delete' && (
                <button 
                  className="popup-action-btn delete"
                  onClick={() => { deleteMessage(popupMenu.msg.id); setPopupMenu(null); }}
                >
                  Delete Message
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN IMAGE PREVIEW */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fullscreen-preview" 
            onClick={() => setFullScreenImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              src={fullScreenImage} 
              alt="Fullscreen" 
            />
            <button className="close-preview" onClick={() => setFullScreenImage(null)}>
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInterface;
