import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image as ImageIcon, Send, MessageSquare, Shield, Users, Heart, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { compressImageToWebP } from '../utils/imageCompressor';
import { fetchBackendAPI, getBackendUrl } from '../utils/api';
import PostItem from '../components/Community/PostItem';
import { CreatePostModal, CommentsModal, UserProfileModal } from '../components/Community/CommunityModals';

const CommunityScreen = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Feed');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFeedPosts = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchBackendAPI('/api/community/posts', 'GET');
      setFeedPosts(data);
    } catch (e) {
      console.error("Failed to load posts:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#000] text-white font-inter overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute inset-0 bg-golden-grid opacity-30"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 flex flex-col pt-4 px-4 pb-4 bg-[#111]/80 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex items-center justify-center mb-2 mt-4">
          <h1 className="font-oswald text-2xl font-bold tracking-wider uppercase flex items-center gap-2">
            Social <span className="text-[#0A84FF]">Hub</span>
          </h1>
        </div>
      </header>

      {/* Coming Soon Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-[#0A84FF]/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(10,132,255,0.2)]">
          <Users size={48} className="text-[#0A84FF]" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-widest text-white mb-4 font-oswald">Coming Soon</h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed font-medium">
          We are building an amazing community experience for you. Stay tuned for the next big update! 🚀
        </p>
      </div>
    </div>
  );
};

// --- FEED TAB ---
const FeedTab = ({ showCreatePost, setShowCreatePost, posts, setPosts, loadPosts }) => {
  const navigate = useNavigate();
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  useEffect(() => {
    if (posts.length === 0) {
      loadPosts();
    }
  }, []);

  const handleLike = async (postId) => {
    const myCode = localStorage.getItem('naino_access_token');

    // Optimistic Update
    setPosts(posts.map(p => {
      if (p._id === postId) {
        const isLiked = p.likedBy?.includes(myCode);
        const newLikedBy = isLiked ? (p.likedBy || []).filter(c => c !== myCode) : [...(p.likedBy || []), myCode];
        return { ...p, likesCount: isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1, likedBy: newLikedBy };
      }
      return p;
    }));

    try {
      await fetchBackendAPI(`/api/community/posts/${postId}/like`, 'POST');
    } catch (e) {
      console.error("Failed to like:", e);
    }
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto w-full">
      {/* Feed List */}
      <div className="space-y-4 mt-2">
        {posts.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-sm">No posts yet. Be the first to share something!</div>
        ) : (
          posts.map(post => (
            <PostItem
              key={post._id}
              post={post}
              onLike={handleLike}
              onCommentClick={(p) => setSelectedPostForComments(p)}
              onProfileClick={(p) => {
                const myCode = localStorage.getItem('naino_access_token');
                if (p.authorCode === myCode) {
                  navigate('/account');
                } else {
                  setSelectedUserProfile(p);
                }
              }}
            />
          ))
        )}
      </div>

      {showCreatePost && (
        <CreatePostModal
          onClose={() => setShowCreatePost(false)}
          onPostCreated={(newPost) => setPosts([newPost, ...posts])}
        />
      )}

      {selectedPostForComments && (
        <CommentsModal
          post={selectedPostForComments}
          onClose={() => setSelectedPostForComments(null)}
          onCommentAdded={() => {
            setPosts(posts.map(p => p._id === selectedPostForComments._id ? { ...p, commentsCount: p.commentsCount + 1 } : p));
          }}
        />
      )}

      {selectedUserProfile && (
        <UserProfileModal
          user={selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
        />
      )}
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
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeRoom === room
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
          const myCode = localStorage.getItem('naino_access_token');
          const isMine = msg.isMine || msg.authorCode === myCode;

          return (
            <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-4`}>
              {!isMine && <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.authorName}</span>}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${isMine
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

      {/* Chat Input - fixed at bottom above nav bar */}
      <div className="fixed bottom-4 left-0 right-0 max-w-lg mx-auto p-3 bg-[#111] border border-white/10 shrink-0 rounded-xl mx-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-50">
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
          className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${sent
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
