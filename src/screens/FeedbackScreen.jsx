import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Send, Trash2, Heart, BadgeCheck, Loader2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useAlert } from '../context/AlertContext';
import { fetchBackendAPI } from '../utils/api';

// Cache to avoid refetching on component remount (saves Firebase document read billing costs)
let cachedFeedbacks = null;
let cachedLastVisible = null;
let cachedHasMore = true;

const FeedbackScreen = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [feedbacks, setFeedbacks] = useState([]);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteFeedbackId, setDeleteFeedbackId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emojiMap = { 1: "😭", 2: "😟", 3: "😊", 4: "🤩", 5: "🔥" };
  const uName = localStorage.getItem('naino_user_name') || 'Scholar';
  const uAvatar = localStorage.getItem('naino_user_avatar') || '👨‍🎓';
  const myToken = localStorage.getItem('naino_access_token');
  const isPremiumUser = localStorage.getItem('naino_premium_member') === 'true';

  useEffect(() => {
    if (cachedFeedbacks !== null) {
      setFeedbacks(cachedFeedbacks);
      setLastVisible(cachedLastVisible);
      setHasMore(cachedHasMore);
      setLoading(false);
    } else {
      fetchInitialFeedbacks();
    }
  }, []);

  const fetchInitialFeedbacks = async () => {
    try {
      const res = await fetchBackendAPI('/api/feedbacks?limit=10');
      const items = res.docs || [];

      let nextLastVisible = null;
      let nextHasMore = true;
      if (items.length > 0) {
        nextLastVisible = items[items.length - 1];
        if (items.length < 10) nextHasMore = false;
      } else {
        nextHasMore = false;
      }

      setFeedbacks(items);
      setLastVisible(nextLastVisible);
      setHasMore(nextHasMore);

      // Save to global variables
      cachedFeedbacks = items;
      cachedLastVisible = nextLastVisible;
      cachedHasMore = nextHasMore;
    } catch (error) {
      console.error("Failed to fetch feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFeedbacks = async () => {
    if (!lastVisible || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchBackendAPI(`/api/feedbacks?limit=5&startAfterId=${lastVisible.id}`);
      const newItems = res.docs || [];

      let nextLastVisible = lastVisible;
      let nextHasMore = hasMore;
      if (newItems.length > 0) {
        nextLastVisible = newItems[newItems.length - 1];
        if (newItems.length < 5) nextHasMore = false;
      } else {
        nextHasMore = false;
      }

      const existingIds = new Set(feedbacks.map(i => i.id));
      const filteredNew = newItems.filter(i => !existingIds.has(i.id));

      setFeedbacks(prev => {
        const updated = [...prev, ...filteredNew];
        cachedFeedbacks = updated;
        return updated;
      });
      setLastVisible(nextLastVisible);
      setHasMore(nextHasMore);

      cachedLastVisible = nextLastVisible;
      cachedHasMore = nextHasMore;
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      showAlert("Please select a star rating!", "warning");
      return;
    }
    if (!text.trim() || text.trim().length < 5) {
      showAlert("Please write a meaningful feedback (min 5 chars)!", "warning");
      return;
    }

    setSubmitting(true);
    try {
      await fetchBackendAPI('/api/feedbacks', 'POST', {
        name: uName,
        avatar: uAvatar,
        stars: rating,
        text: text.trim(),
        userId: myToken,
        isPremium: isPremiumUser
      });
      setText('');
      setRating(0);
      setLoading(true);
      fetchInitialFeedbacks(); // Refresh list to put it at top
      showAlert("Thank you! Your feedback has been posted.", "success");
    } catch (error) {
      console.error("Failed to post feedback:", error);
      showAlert("Failed to post feedback. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFeedbackId) return;
    try {
      await fetchBackendAPI(`/api/feedbacks/${deleteFeedbackId}`, 'DELETE', { userId: myToken });
      setFeedbacks(prev => {
        const updated = prev.filter(fb => fb.id !== deleteFeedbackId);
        cachedFeedbacks = updated;
        return updated;
      });
      setDeleteFeedbackId(null);
    } catch (err) {
      console.error("Delete failed:", err);
      showAlert("Failed to delete feedback.", "error");
      setDeleteFeedbackId(null);
    }
  };

  const handleLike = async (fb) => {
    if (!myToken) return showAlert("Please ensure you are logged in properly to like feedbacks!", "warning");

    const isLiked = fb.likedBy?.includes(myToken);

    // Optimistic UI update
    setFeedbacks(prev => {
      const updated = prev.map(item => {
        if (item.id === fb.id) {
          return {
            ...item,
            likes: isLiked ? (item.likes - 1) : (item.likes + 1),
            likedBy: isLiked
              ? item.likedBy.filter(id => id !== myToken)
              : [...(item.likedBy || []), myToken]
          };
        }
        return item;
      });
      cachedFeedbacks = updated;
      return updated;
    });

    try {
      await fetchBackendAPI(`/api/feedbacks/${fb.id}/like`, 'PUT', { userId: myToken });
    } catch (err) {
      console.error("Like failed:", err);
      // Revert on failure (simple fetch again)
      fetchInitialFeedbacks();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">

            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase">
                Student Voice
              </h1>
              <p className="text-gray-400 font-inter text-sm mt-2">Share your thoughts and suggestions</p>
            </div>
          </div>
        </header>

        {/* Feedback Input Card */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 mb-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-bold uppercase tracking-widest text-gray-400 block mb-2">Rate your experience</label>
              <div className="flex gap-2 items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-75 active:rotate-12 ${rating >= star ? 'bg-[#FFD700] text-black scale-110 shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:scale-105'}`}
                  >
                    <Star size={20} fill={rating >= star ? "currentColor" : "none"} />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-2xl ml-3 animate-bounce">{emojiMap[rating]}</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold uppercase tracking-widest text-gray-400 block mb-2">Your Message</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us how we can help you more... Share your thoughts, suggestions, or appreciation..."
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFD700]/50 min-h-[120px] resize-none text-base md:text-lg"
                maxLength={500}
              />
              <div className="flex justify-between mt-1 text-xs text-gray-600">
                <span>{text.length}/500</span>
                <span>Minimum 5 characters</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${submitting ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-[#FFD700] text-black hover:bg-[#FFA500] hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              <Send size={18} /> {submitting ? 'Posting...' : 'Post Feedback'}
            </button>
          </form>
        </div>

        {/* Feedback List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold font-oswald uppercase text-[#FFD700]">Recent Feedback</h2>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Loading feedback...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              No feedback yet. Be the first!
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb) => {
                const isUrl = fb.avatar && (fb.avatar.startsWith('http') || fb.avatar.startsWith('/'));
                const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fb.name || 'User')}&background=random&color=fff`;
                const isMyFeedback = fb.userId === myToken;
                const iLiked = fb.likedBy?.includes(myToken);
                const showPremium = fb.isPremium || (isMyFeedback && isPremiumUser);

                return (
                  <div key={fb.id} className={`bg-[#111] border ${isMyFeedback ? 'border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.05)]' : 'border-white/5 shadow-lg'} rounded-2xl p-5 flex gap-4 transition-all hover:border-white/10`}>
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-2xl shrink-0 overflow-hidden border border-white/5">
                      {isUrl ? (
                        <img src={fb.avatar} alt={fb.name} className="w-full h-full object-cover" />
                      ) : fb.avatar && fb.avatar !== "👤" ? (
                        fb.avatar
                      ) : (
                        <img src={fallbackAvatar} alt={fb.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-bold flex items-center gap-1.5 ${showPremium ? 'text-[#FFD700]' : 'text-white'}`}>
                            {fb.name || 'Anonymous'}
                            {showPremium && <BadgeCheck size={16} className="text-[#32D74B] drop-shadow-[0_0_5px_rgba(50,215,75,0.4)]" />}
                            {isMyFeedback && <span className="ml-2 text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300 uppercase tracking-widest font-bold">You</span>}
                          </h3>
                          <div className="flex items-center gap-1 text-[#FFD700] mt-1">
                            {Array.from({ length: fb.stars || 0 }).map((_, i) => (
                              <Star key={i} size={12} fill="currentColor" />
                            ))}
                            <span className="text-xs ml-1">{emojiMap[fb.stars]}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-600 font-medium">
                            {fb.timestamp ? new Date(fb.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Just now'}
                          </span>
                          {isMyFeedback && (
                            <button
                              onClick={() => setDeleteFeedbackId(fb.id)}
                              className="text-gray-500 hover:text-red-500 transition-colors p-1"
                              title="Delete Feedback"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-200 text-base md:text-lg mt-3 leading-relaxed break-words">
                        {fb.text?.length > 150 && !expandedIds.has(fb.id) ? fb.text.substring(0, 150) + '... ' : fb.text + ' '}
                        {fb.text?.length > 150 && (
                          <button
                            onClick={() => toggleExpand(fb.id)}
                            className="text-[#FFD700] hover:text-white text-sm font-semibold transition-colors"
                          >
                            {expandedIds.has(fb.id) ? 'show less' : 'load more'}
                          </button>
                        )}
                      </p>

                      {/* Interaction Bar */}
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-4">
                        <button
                          onClick={() => handleLike(fb)}
                          className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-90 ${iLiked ? 'text-pink-500' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <Heart size={16} fill={iLiked ? "currentColor" : "none"} className={iLiked ? 'animate-pulse' : ''} />
                          {fb.likes || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="text-center pt-4">
              <button
                onClick={loadMoreFeedbacks}
                disabled={loadingMore}
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center mx-auto gap-2"
              >
                {loadingMore ? <Loader2 size={16} className="animate-spin" /> : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteFeedbackId}
        title="Delete Feedback?"
        message="Are you sure you want to delete your feedback? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteFeedbackId(null)}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default FeedbackScreen;
