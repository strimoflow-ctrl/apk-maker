import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Menu, User, Send, Paperclip, X, Loader2, Bot, MessageSquare, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';

const NainoAiScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useAlert();
  const isDoubtZone = location.pathname === '/doubt-zone';
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { sessId, title }
  const chatContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const hasHandledAiIntent = useRef(false);

  // Initialization
  useEffect(() => {
    let uId = localStorage.getItem('naino_fixed_user_id');
    if (!uId) {
      uId = 'student_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('naino_fixed_user_id', uId);
    }
    setUserId(uId);

    let sessId = localStorage.getItem('naino_current_session');
    if (!sessId) {
      sessId = 'sess_' + Date.now();
      localStorage.setItem('naino_current_session', sessId);
    }
    setCurrentSessionId(sessId);

    fetchSessions(uId, sessId);
    if (!location.state?.aiImage) {
      fetchChatHistory(sessId);
    }
  }, []);

  // Handle PDF AI Intent
  useEffect(() => {
    if (userId && currentSessionId && location.state?.aiImage && location.state?.aiPrompt && !hasHandledAiIntent.current) {
      hasHandledAiIntent.current = true;
      const { aiImage, aiPrompt, isTemp } = location.state;
      window.history.replaceState({}, document.title);
      
      let targetSessionId = currentSessionId;
      if (isTemp) {
        targetSessionId = 'temp_' + Date.now();
        setCurrentSessionId(targetSessionId);
        setMessages([]); // Clear chat for temporary session
      }
      
      setTimeout(() => {
        sendMessage(aiPrompt, aiImage, userId, targetSessionId);
      }, 300);
    }
  }, [userId, currentSessionId, location.state]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const fetchSessions = async (uId, activeSessId) => {
    try {
      const res = await fetch(`https://naino-chat.onrender.com/get_sessions?userId=${uId}`);
      const data = await res.json();
      if (data.sessions) {
        const filtered = data.sessions.filter(s => !s.session_id.startsWith('temp_'));
        setSessions(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  };

  const fetchChatHistory = async (sessId) => {
    try {
      const res = await fetch(`https://naino-chat.onrender.com/get_chat_messages?sessionId=${sessId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to fetch chat history:', e);
    }
  };

  const createNewSession = () => {
    const newSessId = 'sess_' + Date.now();
    localStorage.setItem('naino_current_session', newSessId);
    setCurrentSessionId(newSessId);
    setMessages([]);
    setIsSidebarOpen(false);
    fetchSessions(userId, newSessId);
  };

  const loadSession = (sessId) => {
    localStorage.setItem('naino_current_session', sessId);
    setCurrentSessionId(sessId);
    fetchChatHistory(sessId);
    setIsSidebarOpen(false);
  };

  const deleteSession = async (sessId, e) => {
    e.stopPropagation();
    const sess = sessions.find(s => s.session_id === sessId);
    setDeleteConfirm({ sessId, title: sess?.title || 'this chat' });
  };

  const confirmDeleteSession = async () => {
    if (!deleteConfirm) return;
    const { sessId } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const response = await fetch('https://naino-chat.onrender.com/delete_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId: sessId }),
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessId));
        if (currentSessionId === sessId) {
          createNewSession();
        }
      } else {
        showAlert("Failed to delete chat", "error");
      }
    } catch (error) {
      showAlert("Network error while deleting chat", "error");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Please upload only image files (no videos or documents).', 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImageBase64(compressedBase64);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImageBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const sendMessage = async (overrideText, overrideImage, overrideUserId, overrideSessionId) => {
    const text = overrideText !== undefined ? overrideText : input.trim();
    const currentImg = overrideImage !== undefined ? overrideImage : imageBase64;
    const activeUserId = overrideUserId || userId;
    const activeSessionId = overrideSessionId || currentSessionId;

    if (!text && !currentImg) return;
    if (!activeUserId || !activeSessionId) return;

    const payloadBase64 = currentImg;
    const newMessage = { 
      sender: 'user', 
      text: text, 
      image: payloadBase64 ? payloadBase64.split(',')[1] : null 
    };
    
    setMessages((prev) => [...prev, newMessage]);
    if (overrideText === undefined) setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (overrideImage === undefined) removeImage(); // Clear preview immediately
    setIsLoading(true);

    try {
      const response = await fetch('https://naino-chat.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: activeUserId,
          sessionId: activeSessionId,
          image: payloadBase64 ? payloadBase64.split(',')[1] : null // Remove data URI prefix for payload
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { sender: 'bot', text: data.reply }]);
        fetchSessions(activeUserId, activeSessionId);
      } else {
        setMessages((prev) => [...prev, { sender: 'bot', text: `Error: ${data.error}` }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Connection failed.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-[#FFD700]">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</span>;
    });
  };

  return (
    <>
    <div className="fixed inset-0 z-50 w-full bg-black text-white flex flex-col font-inter overflow-hidden">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-[#121212] z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/', { replace: true })} className="text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
        </div>
        <span className="font-oswald text-[#FFD700] tracking-wide text-lg">NAINO AI</span>
        <button onClick={createNewSession} className="text-gray-400 hover:text-white">
          <Plus size={24} />
        </button>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar overlay for mobile */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black/60 z-[60]" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Sidebar */}
        <aside className={`fixed md:relative top-0 left-0 h-full w-[280px] bg-[#121212] border-r border-white/10 z-[70] transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="hidden md:flex items-center justify-between p-4 border-b border-white/10">
             <button onClick={() => navigate('/', { replace: true })} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-bold">
              <ArrowLeft size={18} /> Back
            </button>
          </div>
          
          <button onClick={createNewSession} className="m-4 p-3 bg-[#FFD700] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors active:scale-95">
            <Plus size={20} /> New Doubt
          </button>
          
          <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
            {sessions.length === 0 ? (
              <p className="text-center text-gray-500 text-sm mt-8">No history yet.</p>
            ) : (
              sessions.map((sess) => (
                <div key={sess.session_id} className="relative group flex items-center mb-1">
                  <button 
                    onClick={() => loadSession(sess.session_id)}
                    className={`w-full text-left p-3 rounded-lg text-sm truncate flex items-center gap-3 transition-colors pr-10 ${sess.session_id === currentSessionId ? 'bg-[#222] text-[#FFD700]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{sess.title || 'New Chat'}</span>
                  </button>
                  <button
                    onClick={(e) => deleteSession(sess.session_id, e)}
                    className="absolute right-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-white/10 flex items-center gap-3 text-sm font-bold text-gray-300">
            <User size={24} className="text-[#FFD700]" />
            Student
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-black overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth" ref={chatContainerRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 animate-apple-fade-in">
                <Bot size={64} className="text-[#FFD700] mb-4 animate-bounce" />
                <h1 className="text-3xl font-oswald text-[#FFD700] tracking-wide mb-2 uppercase">Naino AI</h1>
                <p className="max-w-xs text-sm">Ask me anything about Physics, Chemistry, or your Naino Academy courses!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-[#FFD700] text-black' : 'border border-[#FFD700] text-[#FFD700]'}`}>
                    {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={`p-3 md:p-4 text-[15px] leading-relaxed break-words shadow-lg ${msg.sender === 'user' ? 'bg-[#FFD700] text-black rounded-[20px] rounded-tr-sm' : 'bg-[#1a1a1a] text-white border border-white/10 rounded-[20px] rounded-tl-sm'}`}>
                    {msg.image && (
                      <img 
                        src={`data:image/jpeg;base64,${msg.image}`} 
                        alt="Sent" 
                        className="max-w-[200px] max-h-[200px] object-cover rounded-lg mb-2 border border-black/10 shadow-sm" 
                      />
                    )}
                    {renderText(msg.text)}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-[#FFD700] text-[#FFD700]">
                  <Bot size={18} />
                </div>
                <div className="p-4 bg-[#1a1a1a] border border-white/10 rounded-[20px] rounded-tl-sm text-[#FFD700]">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              </div>
            )}
            
            {/* Empty element for bottom padding so content doesn't hide behind absolute input on mobile */}
            <div className="h-4"></div>
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-6 bg-black shrink-0 border-t border-white/10">
            <div className="max-w-4xl mx-auto bg-[#1a1a1a] border border-white/10 focus-within:border-[#FFD700] rounded-2xl transition-colors">
              {/* Image Preview */}
              {imageBase64 && (
                <div className="p-3 border-b border-white/10 flex items-center gap-3 relative animate-apple-fade-in">
                  <div className="relative group">
                    <img src={imageBase64} alt="Upload preview" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                    <button onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform">
                      <X size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">Image attached</span>
                </div>
              )}
              
              <div className="flex items-end p-2 md:p-3 gap-2">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleImageChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-[#FFD700] transition-colors mb-1"
                  disabled={isLoading}
                >
                  <Paperclip size={22} />
                </button>
                
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a doubt..."
                  className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none max-h-[120px] py-2 md:py-3 text-[15px] leading-relaxed"
                  rows="1"
                />
                
                <button 
                  onMouseDown={(e) => e.preventDefault()} // Prevents input from losing focus
                  onClick={(e) => {
                    e.preventDefault();
                    sendMessage();
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                  disabled={!input.trim()}
                  className="p-2.5 bg-[#FFD700] text-black rounded-xl hover:bg-white disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-400 transition-colors mb-1 shrink-0"
                >
                  <Send size={20} className="ml-1" />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-3 hidden md:block">Naino AI can make mistakes. Verify important answers.</p>
          </div>
        </main>
      </div>
    </div>

    {/* Premium Delete Confirmation Modal */}
    {deleteConfirm && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>
        <div
          className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 size={26} className="text-red-400" />
          </div>

          <h3 className="text-white font-bold text-lg text-center mb-1">Delete Chat?</h3>
          <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
            <span className="text-white/70 font-semibold">"{deleteConfirm.title}"</span> will be deleted permanently and cannot be recovered.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteSession}
              className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default NainoAiScreen;
