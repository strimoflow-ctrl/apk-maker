import React, { useState } from 'react';
import { Heart, MessageCircle, Repeat, CheckCircle, Users, Trash2 } from 'lucide-react';

const PostItem = ({ post, onLike, onCommentClick, onProfileClick, onDelete }) => {
  const [isLiking, setIsLiking] = useState(false);
  const myCode = localStorage.getItem('naino_access_token');
  const hasLiked = post.likedBy?.includes(myCode);
  
  // If post belongs to current user, prefer their current local avatar
  const isMine = post.authorCode === myCode;
  const displayAvatar = isMine ? (localStorage.getItem('naino_user_avatar') || post.authorAvatar) : post.authorAvatar;

  const handleLike = () => {
    setIsLiking(true);
    onLike(post._id);
    setTimeout(() => setIsLiking(false), 300); // Reset animation
  };

  const renderPostContent = (p) => (
    <div className="p-4 bg-[#111] border border-white/5 rounded-2xl relative group">
      {isMine && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(p._id); }} 
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors p-2 bg-black/50 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      )}
      <div className="flex items-center gap-3 mb-3 cursor-pointer pr-10" onClick={() => onProfileClick(p)}>
        {displayAvatar ? (
          <img src={displayAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF]">
            <Users size={20} />
          </div>
        )}
        <div>
          <h4 className={`font-bold text-sm flex items-center gap-1 ${p.authorIsPremium ? 'text-yellow-500' : 'text-white'}`}>
            {p.authorName}
            {p.authorIsPremium && <CheckCircle size={14} className="text-green-500" />}
          </h4>
          <span className="text-gray-500 text-[10px]">
            {new Date(p.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      
      {p.text && <p className="text-gray-300 text-sm mb-3 leading-relaxed">{p.text}</p>}
      
      {p.imageUrl && (
        <img src={p.imageUrl} alt="Post" className="w-full rounded-xl border border-white/5 mb-3" />
      )}

    </div>
  );

  return (
    <div className="mb-4">
      {renderPostContent(post)}
      
      <div className="flex items-center gap-6 pt-3 px-4">
        <button 
          onClick={handleLike} 
          className={`flex items-center gap-2 transition-colors ${hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
        >
          <Heart size={18} className={`${isLiking ? 'scale-150 transition-transform duration-200' : 'scale-100 transition-transform duration-200'} ${hasLiked ? 'fill-current' : ''}`} />
          <span className="text-xs font-mono">{post.likesCount}</span>
        </button>
        <button onClick={() => onCommentClick(post)} className="flex items-center gap-2 text-gray-400 hover:text-[#0A84FF] transition-colors">
          <MessageCircle size={18} />
          <span className="text-xs font-mono">{post.commentsCount}</span>
        </button>
      </div>
    </div>
  );
};

export default PostItem;
