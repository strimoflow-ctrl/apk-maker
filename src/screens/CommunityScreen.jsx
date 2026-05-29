import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Send, MessageSquare, Shield, Users, Heart, MessageCircle } from 'lucide-react';
import { compressImageToWebP } from '../utils/imageCompressor';
import { fetchBackendAPI } from '../utils/api';

const CommunityScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Feed');
  
  return (
    <div className="flex flex-col h-screen bg-[#000] text-white font-inter overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-30"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col pt-4 px-4 pb-2 bg-[#111]/80 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10"></div>
          <h1 className="font-oswald text-xl font-bold tracking-wider uppercase flex items-center gap-2">
            Social <span className="text-[#0A84FF]">Hub</span>
          </h1>
          <div className="w-10 h-10"></div>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl">
          {['Feed', 'Chat', 'Admin'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-[#0A84FF] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Content Area - flex-1 with overflow-y-auto ensures it scrolls inside, leaving header at top */}
      <main className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'Feed' && <FeedTab />}
        {activeTab === 'Chat' && <ChatTab />}
        {activeTab === 'Admin' && <AdminTab />}
      </main>
    </div>
  );
};

// --- FEED TAB ---
const FeedTab = () => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

  const loadPosts = async () => {
    try {
      const data = await fetchBackendAPI('/api/community/posts', 'GET');
      setPosts(data);
    } catch (e) {
      console.error("Failed to load posts:", e);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const webpFile = await compressImageToWebP(file);
        setImageFile(webpFile);
        setPreviewUrl(URL.createObjectURL(webpFile));
      } catch (err) {
        alert("Failed to process image.");
      }
    }
  };

  const handlePost = async () => {
    if (!text && !imageFile) return;
    setIsPosting(true);
    
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await fileToBase64(imageFile);
      }

      // Hardcode author info for now (in real app, get from context/localstorage)
      const authorName = localStorage.getItem('naino_username') || 'Student';

      const newPost = await fetchBackendAPI('/api/community/posts', 'POST', {
        authorName,
        text,
        imageUrl
      });

      setPosts([newPost, ...posts]);
      setText('');
      setImageFile(null);
      setPreviewUrl('');
    } catch (e) {
      alert("Failed to post. " + e.message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const data = await fetchBackendAPI(`/api/community/posts/${postId}/like`, 'POST');
      setPosts(posts.map(p => p._id === postId ? { ...p, likesCount: data.likesCount } : p));
    } catch (e) {
      console.error("Failed to like:", e);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto w-full">
      {/* Create Post Box */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-6 shadow-lg">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm mb-3"
          rows={3}
        />
        
        {previewUrl && (
          <div className="relative mb-3 rounded-xl overflow-hidden bg-black/50 border border-white/5">
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-60 object-contain" />
            <button 
              onClick={() => { setImageFile(null); setPreviewUrl(''); }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 text-gray-400 hover:text-[#0A84FF] transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            <ImageIcon size={18} />
            <span className="text-xs font-bold uppercase tracking-wide">Photo</span>
          </button>
          
          <button 
            onClick={handlePost}
            disabled={isPosting || (!text && !imageFile)}
            className="bg-[#0A84FF] disabled:opacity-50 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
          >
            {isPosting ? 'Posting...' : 'Post'}
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">No posts yet. Be the first to share something!</div>
        ) : (
          posts.map(post => (
            <div key={post._id} className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF]">
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{post.authorName}</h4>
                  <span className="text-gray-500 text-[10px]">Just now</span>
                </div>
              </div>
              
              {post.text && <p className="text-gray-300 text-sm mb-3 leading-relaxed">{post.text}</p>}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="Post" className="w-full rounded-xl border border-white/5 mb-3" />
              )}
              
              <div className="flex items-center gap-6 border-t border-white/5 pt-3">
                <button onClick={() => handleLike(post._id)} className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Heart size={18} />
                  <span className="text-xs font-mono">{post.likesCount}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-400 hover:text-[#0A84FF] transition-colors">
                  <MessageCircle size={18} />
                  <span className="text-xs font-mono">{post.commentsCount}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- CHAT TAB ---
const ChatTab = () => {
  const rooms = ['Study', 'Discuss', 'Planning', 'Masti'];
  const [activeRoom, setActiveRoom] = useState('Study');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  const loadMessages = async (room) => {
    try {
      const data = await fetchBackendAPI(`/api/community/chat/${room}`, 'GET');
      setMessages(data);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      console.error("Failed to load chat messages", e);
    }
  };

  useEffect(() => {
    loadMessages(activeRoom);
    // Real app would use websockets here or polling
    const interval = setInterval(() => loadMessages(activeRoom), 5000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const authorName = localStorage.getItem('naino_username') || 'Student';
    
    // Optimistic update
    const tempMsg = { _id: Date.now(), text, authorName, isMine: true };
    setMessages([...messages, tempMsg]);
    setText('');
    
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      await fetchBackendAPI(`/api/community/chat/${activeRoom}`, 'POST', {
        authorName,
        text
      });
      loadMessages(activeRoom); // Reload actual state
    } catch (e) {
      alert("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto w-full relative">
      {/* Rooms Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto p-4 shrink-0 no-scrollbar border-b border-white/5 bg-[#0a0a0a]">
        {rooms.map(room => (
          <button
            key={room}
            onClick={() => { setActiveRoom(room); setMessages([]); }}
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeRoom === room 
                ? 'bg-white/10 text-white border border-white/20' 
                : 'text-gray-500 border border-transparent'
            }`}
          >
            #{room}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        <div className="text-center text-xs text-gray-600 mb-6 font-mono bg-white/5 py-2 rounded-lg">
          Welcome to #{activeRoom} chat
        </div>
        {messages.map(msg => {
          // Identify if message is mine
          const myCode = localStorage.getItem('naino_access_key');
          const isMine = msg.isMine || msg.authorCode === myCode;

          return (
            <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-4`}>
              {!isMine && <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.authorName}</span>}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                isMine 
                  ? 'bg-[#0A84FF] text-white rounded-br-sm' 
                  : 'bg-[#222] text-gray-200 rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input - sticky at bottom inside this relative container */}
      <div className="sticky bottom-0 left-0 right-0 p-3 bg-[#111] border-t border-white/10 shrink-0 mb-4 rounded-xl mx-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Message #${activeRoom}...`}
            className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0A84FF]/50"
          />
          <button 
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-11 h-11 rounded-xl bg-[#0A84FF] disabled:opacity-50 flex items-center justify-center text-white shrink-0 active:scale-95 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ADMIN TAB ---
const AdminTab = () => {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      const authorName = localStorage.getItem('naino_username') || 'Student';
      await fetchBackendAPI('/api/community/admin-contact', 'POST', {
        authorName,
        message,
        contactInfo: 'App User'
      });
      setSent(true);
      setTimeout(() => { setMessage(''); setSent(false); }, 3000);
    } catch (e) {
      alert("Failed to send message");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto w-full mt-4">
      <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-[#FFD700]/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 blur-3xl rounded-full"></div>
        
        <div className="w-14 h-14 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-6">
          <Shield size={28} className="text-[#FFD700]" />
        </div>
        
        <h2 className="text-xl font-oswald font-bold tracking-wide uppercase text-white mb-2">
          Direct Line to Admin
        </h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Need help, found a bug, or have a suggestion? Send a direct message to the admin team. We read everything.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50 min-h-[120px] mb-4 text-sm"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sent}
          className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            sent 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-[#FFD700] text-black hover:bg-white disabled:opacity-50'
          }`}
        >
          {sent ? 'Message Sent ✓' : 'Send Message'}
        </button>
      </div>
    </div>
  );
};

export default CommunityScreen;
