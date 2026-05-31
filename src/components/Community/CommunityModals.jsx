import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Image as ImageIcon, CheckCircle, Heart, Reply, Users } from 'lucide-react';
import { fetchBackendAPI, getBackendUrl } from '../../utils/api';
import { compressImageToWebP } from '../../utils/imageCompressor';
import PostItem from './PostItem';

export const CreatePostModal = ({ onClose, onPostCreated }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef(null);

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
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile, 'community_post.webp');
        
        const res = await fetch(`${getBackendUrl()}/api/upload`, {
          method: 'POST',
          body: formData
        });
        const uploadData = await res.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        } else {
          throw new Error(uploadData.error || "Image upload failed");
        }
      }

      const authorName = localStorage.getItem('naino_user_name') || 'Student';
      const authorIsPremium = localStorage.getItem('naino_premium_member') === 'true';
      const authorAvatar = localStorage.getItem('naino_user_avatar') || null;

      const newPost = await fetchBackendAPI('/api/community/posts', 'POST', {
        authorName,
        authorIsPremium,
        authorAvatar,
        text,
        imageUrl
      });

      onPostCreated(newPost);
      onClose();
    } catch (e) {
      alert("Failed to post: " + e.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start pt-20 justify-center p-4">
      <div className="bg-[#111] w-full max-w-lg rounded-2xl p-4 border border-white/10 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold uppercase tracking-wider">Create Post</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5"><X size={18}/></button>
        </div>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm mb-3 min-h-[100px]"
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
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
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
    </div>
  );
};


export const CommentsModal = ({ post, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // Comment ID
  const myCode = localStorage.getItem('naino_access_token');

  useEffect(() => {
    loadComments();
  }, [post]);

  const loadComments = async () => {
    try {
      const data = await fetchBackendAPI(`/api/community/posts/${post._id}/comments`, 'GET');
      setComments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async () => {
    if (!text.trim()) return;
    try {
      const authorName = localStorage.getItem('naino_user_name') || 'Student';
      const authorIsPremium = localStorage.getItem('naino_premium_member') === 'true';
      const authorAvatar = localStorage.getItem('naino_user_avatar') || null;

      const res = await fetchBackendAPI(`/api/community/posts/${post._id}/comments`, 'POST', {
        authorName,
        authorIsPremium,
        authorAvatar,
        text,
        replyTo: replyTo ? replyTo._id : null
      });
      setComments([...comments, res]);
      setText('');
      setReplyTo(null);
      onCommentAdded();
    } catch (e) {
      alert("Failed to comment");
    }
  };

  const handleLike = async (commentId) => {
    try {
      const data = await fetchBackendAPI(`/api/community/comments/${commentId}/like`, 'POST');
      setComments(comments.map(c => c._id === commentId ? { ...c, likesCount: data.likesCount, likedBy: data.liked ? [...(c.likedBy||[]), myCode] : c.likedBy.filter(code => code !== myCode) } : c));
    } catch (e) {
      console.error(e);
    }
  };

  // Organize comments into threads
  const parentComments = comments.filter(c => !c.replyTo);
  const replies = comments.filter(c => c.replyTo);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end p-4">
      <div className="bg-[#111] w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-white/10 h-[80vh] flex flex-col animate-in slide-in-from-bottom-full relative">
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-bold uppercase tracking-wider text-white">Comments</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          {parentComments.length === 0 ? (
            <p className="text-gray-500 text-center text-sm py-10">No comments yet.</p>
          ) : (
            parentComments.map(c => (
              <div key={c._id} className="space-y-3">
                {/* Parent Comment */}
                <div className="flex gap-3">
                  {(() => {
                    const isMine = c.authorCode === myCode;
                    const displayAvatar = isMine ? (localStorage.getItem('naino_user_avatar') || c.authorAvatar) : c.authorAvatar;
                    return displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0A84FF]/20 flex items-center justify-center shrink-0">
                        <Users size={14} className="text-[#0A84FF]" />
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <div className="bg-white/5 rounded-2xl p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`font-bold text-sm ${c.authorIsPremium ? 'text-yellow-500' : 'text-white'}`}>{c.authorName}</span>
                        {c.authorIsPremium && <CheckCircle size={12} className="text-green-500" />}
                      </div>
                      <p className="text-sm text-gray-300">{c.text}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 px-2">
                      <button onClick={() => handleLike(c._id)} className={`text-xs flex items-center gap-1 ${c.likedBy?.includes(myCode) ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}>
                        <Heart size={12} className={c.likedBy?.includes(myCode) ? 'fill-current' : ''} /> {c.likesCount || 0}
                      </button>
                      <button onClick={() => setReplyTo(c)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                        <Reply size={12} /> Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.filter(r => r.replyTo === c._id).map(r => (
                  <div key={r._id} className="flex gap-3 ml-10">
                    {(() => {
                      const isMine = r.authorCode === myCode;
                      const displayAvatar = isMine ? (localStorage.getItem('naino_user_avatar') || r.authorAvatar) : r.authorAvatar;
                      return displayAvatar ? (
                        <img src={displayAvatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          <Users size={10} className="text-white" />
                        </div>
                      );
                    })()}
                    <div className="flex-1">
                      <div className="bg-white/5 rounded-2xl p-2 px-3">
                        <div className="flex items-center gap-1 mb-1">
                          <span className={`font-bold text-xs ${r.authorIsPremium ? 'text-yellow-500' : 'text-white'}`}>{r.authorName}</span>
                          {r.authorIsPremium && <CheckCircle size={10} className="text-green-500" />}
                        </div>
                        <p className="text-xs text-gray-300">{r.text}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 px-2">
                        <button onClick={() => handleLike(r._id)} className={`text-[10px] flex items-center gap-1 ${r.likedBy?.includes(myCode) ? 'text-red-500' : 'text-gray-500'}`}>
                          <Heart size={10} className={r.likedBy?.includes(myCode) ? 'fill-current' : ''} /> {r.likesCount || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#111] border-t border-white/5">
          {replyTo && (
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-2">
              <span>Replying to {replyTo.authorName}</span>
              <button onClick={() => setReplyTo(null)}><X size={14}/></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none"
            />
            <button onClick={handleComment} disabled={!text.trim()} className="w-11 h-11 bg-[#0A84FF] text-white rounded-xl flex items-center justify-center disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export const UserProfileModal = ({ user, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Posts'); // Posts, Liked

  useEffect(() => {
    // Lock background scrolling
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchBackendAPI(`/api/community/users/${user.authorCode}/profile`, 'GET');
        setProfile(data);
      } catch (e) {
        console.error(e);
      }
    };
    if (user?.authorCode) {
      loadProfile();
    }
  }, [user]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-[#111] w-full max-w-lg max-h-[85vh] my-10 rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white"><X size={18}/></button>
        
        {/* Profile Header */}
        <div className="bg-gradient-to-b from-[#0A84FF]/20 to-[#111] p-6 text-center border-b border-white/5">
          {(() => {
            const isMine = user.authorCode === localStorage.getItem('naino_access_token');
            const displayAvatar = isMine ? (localStorage.getItem('naino_user_avatar') || user.authorAvatar) : user.authorAvatar;
            return displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-20 h-20 mx-auto rounded-full object-cover mb-3 border-2 border-white/10" />
            ) : (
              <div className="w-20 h-20 mx-auto rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF] mb-3">
                <Users size={32} />
              </div>
            );
          })()}
          <h2 className={`text-xl font-bold flex items-center justify-center gap-2 mb-1 ${user.authorIsPremium ? 'text-yellow-500' : 'text-white'}`}>
            {user.authorName}
            {user.authorIsPremium && <CheckCircle size={18} className="text-green-500" />}
          </h2>
          <p className="text-sm text-gray-400">Total Likes Received: {profile.totalLikes || 0} • Total Posts: {profile.posts?.length || 0}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {['Posts', 'Liked'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'text-[#0A84FF] border-b-2 border-[#0A84FF]' : 'text-gray-500'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'Posts' && profile.posts.map(p => <PostItem key={p._id} post={p} onLike={()=>{}} onCommentClick={()=>{}} onProfileClick={()=>{}} />)}
          {activeTab === 'Liked' && profile.likedPosts.map(p => <PostItem key={p._id} post={p} onLike={()=>{}} onCommentClick={()=>{}} onProfileClick={()=>{}} />)}
          
          {(activeTab === 'Posts' && profile.posts.length === 0) && <p className="text-center text-gray-500 mt-10 text-sm">No posts</p>}
          {(activeTab === 'Liked' && profile.likedPosts.length === 0) && <p className="text-center text-gray-500 mt-10 text-sm">No liked posts</p>}
        </div>
      </div>
    </div>
  );
};
