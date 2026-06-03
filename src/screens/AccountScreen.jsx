import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Camera, LogOut, Send, AlertTriangle, ShieldCheck, User, X, Crown, Loader2, CheckCircle, Sparkles, Smartphone, QrCode, Edit2, BadgeCheck, BookOpen, Timer, Flame, TrendingUp, Tv, Calendar, ChevronRight, Plus, Trash2, Pin, Clock, ClipboardList, CheckSquare, Award, Lightbulb, Smile } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchWithCache, fetchBackendAPI, getDynamicLink, getBackendUrl } from '../utils/api';
import AvatarCropper from '../components/AvatarCropper';
import ConfirmModal from '../components/ConfirmModal';
import PostItem from '../components/Community/PostItem';
import { useAlert } from '../context/AlertContext';

const AccountScreen = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);
  const paymentInputRef = useRef(null);
  
  // Environment Configurations
  const backendUrl = getBackendUrl();
  const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY || '4c0c2a2c16a284fcd18ea8ef0cf199ed';

  const [keyVisible, setKeyVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('naino_user_avatar') || null);
  const [username, setUsername] = useState(localStorage.getItem('naino_user_name') || 'Student');
  const [secretKey, setSecretKey] = useState(localStorage.getItem('naino_access_token') || 'XXXXXX');
  const [isUploading, setIsUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [isPremium, setIsPremium] = useState(localStorage.getItem('naino_premium_member') === 'true');
  const [subData, setSubData] = useState(null);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchBackendAPI(`/api/community/users/${secretKey}/profile`, 'GET');
        if (data && data.posts) {
          setMyPosts(data.posts);
        }
      } catch (e) {
        console.error("Failed to load user posts", e);
      }
    };
    if (secretKey && secretKey !== 'XXXXXX') {
      loadProfile();
    }
  }, [secretKey]);

  const handleDeletePost = (postId) => {
    setPostToDelete(postId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      const res = await fetchBackendAPI(`/api/community/posts/${postToDelete}`, 'DELETE');
      if (res.success) {
        setMyPosts(myPosts.filter(p => p._id !== postToDelete));
        showAlert("Post deleted successfully", "success");
      }
    } catch (e) {
      showAlert("Failed to delete post", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setPostToDelete(null);
    }
  };

  const [pricingData, setPricingData] = useState({
    plans: [
      { id: "6month", name: "Silver Plan", duration: "6 MONTHS", price: 599, qrImage: "/qr/6month.jpg", themeColor: "#9CA3AF", isPopular: false, benefits: [] },
      { id: "1year", name: "Gold Plan", duration: "1 YEAR", price: 999, qrImage: "/qr/1year.jpg", themeColor: "#FFD700", isPopular: true, benefits: [] }
    ],
    instructions: { hi: "", en: "" }
  });

  // Prevent background scrolling when modals are open
  useEffect(() => {
    if (isSuccessModalOpen || isNameModalOpen || isLogoutModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSuccessModalOpen, isNameModalOpen, isLogoutModalOpen]);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const data = await fetchWithCache('/api/pricing.json', 'cache_pricing_v3', 1000 * 60 * 60); // 1 hour cache
        if (data && data.plans) {
          setPricingData(data);
        }
      } catch (e) {
        console.warn("Failed to fetch dynamic pricing");
      }
    };
    fetchPricing();
  }, []);

  useEffect(() => {
    if (!secretKey || secretKey === 'XXXXXX') return;
    
    const backendUrlStr = getBackendUrl();
    const eventSource = new EventSource(`${backendUrlStr}/api/keys/listen?code=${secretKey}`);
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'update' && payload.data) {
          const data = payload.data;
          setSubData({
            ...data.subscription,
            pendingRequest: data.pendingRequest || null
          });

          // Sync premium status dynamically from database updates
          const serverIsPremium = data.isPremium || false;
          if (serverIsPremium !== isPremium) {
            setIsPremium(serverIsPremium);
            localStorage.setItem('naino_premium_member', String(serverIsPremium));
            window.dispatchEvent(new Event('premiumStatusChanged'));
          }

          const pending = data.pendingRequest;
          if (pending) {
            const statusVal = pending.status?.trim().toLowerCase();
            if (statusVal === 'approved') {
              setIsPremium(true);
              localStorage.setItem('naino_premium_member', 'true');
              setSubStep('selection');
              window.dispatchEvent(new Event('premiumStatusChanged'));
            } else if (statusVal === 'rejected') {
              setSubStep('selection');
            }
          }
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error("SSE connection error in AccountScreen:", error);
      if (eventSource.readyState === EventSource.CLOSED || eventSource.readyState === EventSource.CONNECTING) {
        eventSource.close();
        setTimeout(() => {
          if (secretKey && secretKey !== 'XXXXXX') {
             // Force re-trigger by dispatching a custom event, or just rely on a safer polling mechanism if needed
             // For now, closing it prevents the Capacitor freeze crash
          }
        }, 10000);
      }
    };
    
    return () => eventSource.close();
  }, [secretKey, isPremium]);

  // Automated Subscription States
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subStep, setSubStep] = useState('selection'); // selection, form, payment, pending, success
  const [subFullName, setSubFullName] = useState('');
  const [subContact, setSubContact] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [upiLink, setUpiLink] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  // Background status polling for automated verification
  useEffect(() => {
    let intervalId;
    if (pollingActive && orderId) {
      intervalId = setInterval(async () => {
        try {
          const response = await fetch(`${backendUrl}/api/payment/status?orderId=${orderId}`);
          const data = await response.json();
          if (data.success && data.status === 'SUCCESS') {
            setPollingActive(false);
            setIsPremium(true);
            localStorage.setItem('naino_premium_member', 'true');
            setSubStep('success');
            // Trigger custom event to notify other UI elements (like Header)
            window.dispatchEvent(new Event('premiumStatusChanged'));
          } else if (data.status === 'FAILED') {
            setPollingActive(false);
            showAlert('Payment failed. Please try again.', 'error');
            setSubStep('selection');
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pollingActive, orderId, backendUrl]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Must be an image
    if (!file.type.startsWith('image/')) {
      showAlert('Please select a valid image file.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Clear input so same file can be selected again
    e.target.value = null;
  };

  const handleCropComplete = async (localDataUrl, imageBlob) => {
    setIsUploading(true);
    try {
      const response = await fetchBackendAPI('/api/keys/verify', 'POST', {
        code: secretKey,
        deviceId: localStorage.getItem('naino_device_uuid')
      });
      const data = response.data;
      let changeCount = data.avatarChangeCount || 0;
      let lastChange = data.lastAvatarChangeDate ? new Date(data.lastAvatarChangeDate).getTime() : 0;
      
      if (Date.now() > lastChange + (30 * 24 * 60 * 60 * 1000)) {
         changeCount = 0;
      }

      if (changeCount >= 5) {
        showAlert('You have reached the maximum of 5 avatar changes per 30 days.', 'warning');
        setIsUploading(false);
        setCropImageSrc(null);
        return;
      }

      const formData = new FormData();
      formData.append('image', imageBlob, 'avatar.jpg');
      const uploadResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, { method: 'POST', body: formData });
      const resData = await uploadResponse.json();
      
      if (resData.success) {
         const remoteUrl = resData.data.url;
         await fetchBackendAPI('/api/keys/update', 'POST', {
            code: secretKey,
            deviceId: data.deviceId || localStorage.getItem('naino_device_uuid'),
            updates: {
              avatarUrl: remoteUrl,
              avatarChangeCount: changeCount + 1,
              lastAvatarChangeDate: new Date().toISOString()
            }
         });
           setCropImageSrc(null);
           setAvatarUrl(localDataUrl);
           localStorage.setItem('naino_user_avatar', localDataUrl);
           window.dispatchEvent(new Event('avatarUpdated'));
        } else {
           showAlert('Upload failed: ' + resData.error.message, 'error');
        }
    } catch(e) {
      console.error(e);
      showAlert('Error changing avatar', 'error');
    } finally {
      setIsUploading(false);
      setCropImageSrc(null);
    }
  };

  const handleNameSave = async () => {
    if (!newNameInput.trim()) return;
    setIsSavingName(true);
    const deviceId = localStorage.getItem('naino_device_uuid');
    try {
      const response = await fetchBackendAPI('/api/keys/verify', 'POST', {
        code: secretKey,
        deviceId: deviceId
      });
      const data = response.data;
      let changeCount = data.nameChangeCount || 0;
      let lastChange = data.lastNameChangeDate ? new Date(data.lastNameChangeDate).getTime() : 0;
      
      if (Date.now() > lastChange + (30 * 24 * 60 * 60 * 1000)) {
         changeCount = 0;
      }

      if (changeCount >= 5) {
        showAlert('You have reached the maximum of 5 name changes per 30 days.', 'warning');
        setIsSavingName(false);
        setIsNameModalOpen(false);
        return;
      }

      await fetchBackendAPI('/api/keys/update', 'POST', {
         code: secretKey,
         deviceId: deviceId,
         updates: {
           username: newNameInput.trim(),
           nameChangeCount: changeCount + 1,
           lastNameChangeDate: new Date().toISOString()
         }
      });
      
      setUsername(newNameInput.trim());
      localStorage.setItem('naino_user_name', newNameInput.trim());
      setIsNameModalOpen(false);
      setNewNameInput('');
    } catch (e) {
      console.error(e);
      showAlert("Error saving name.", "error");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleInitiatePayment = () => {
    if (!subFullName.trim() || !subContact.trim()) {
      showAlert("Please enter both Name and Phone Number", "warning");
      return;
    }
    setSubStep('payment');
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Must be an image
    if (!file.type.startsWith('image/')) {
      showAlert('Please select a valid image file.', 'warning');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        const screenshotUrl = data.data.url;
        
        const activePlanObj = pricingData.plans.find(p => p.id === selectedPlan);
        await fetchBackendAPI('/api/keys/update', 'POST', {
          code: secretKey,
          deviceId: localStorage.getItem('naino_device_uuid'),
          updates: {
            pendingRequest: {
              plan: selectedPlan,
              amount: activePlanObj ? activePlanObj.price : 999,
              name: subFullName,
              phone: subContact,
              screenshotUrl,
              status: 'pending',
              createdAt: Date.now()
            }
          }
        });
        
        setSubData(prev => ({
          ...prev,
          pendingRequest: { status: 'pending', plan: selectedPlan }
        }));
        
        setSubStep('selection');
        setIsSuccessModalOpen(true);
      } else {
        showAlert('Upload failed. Please try again.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error uploading screenshot.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('naino_access_token');
      if (token && token !== 'XXXXXX') {
        const uuid = localStorage.getItem('naino_device_uuid') || localStorage.getItem('naino_device_uuid');
        await fetchBackendAPI('/api/keys/update', 'POST', {
          code: token,
          deviceId: uuid,
          updates: { deviceId: "" }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("Failed to clear deviceId on logout:", err);
    }
    // Preserve device UUID
    const deviceUuid = localStorage.getItem('naino_device_uuid');
    
    // Clear all session and local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore device UUID
    if (deviceUuid) {
      localStorage.setItem('naino_device_uuid', deviceUuid);
    }
    
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#000] text-white p-4 md:p-8 font-inter pb-4 page-transition overflow-x-hidden">
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2.5s infinite linear;
        }
      `}</style>

      {/* Cropper Modal Overlay */}
      {cropImageSrc && (
        <AvatarCropper 
          imageSrc={cropImageSrc} 
          onComplete={handleCropComplete} 
          onCancel={() => setCropImageSrc(null)} 
        />
      )}

      <div className="max-w-lg mx-auto">
        
        {/* Profile Card */}
        <div className="relative bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-6 md:p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden mb-8">
          {/* Subtle Glows */}
          <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-[#FFD700]/50 to-transparent"></div>
          
          {/* Avatar Section */}
          <div className="relative w-32 h-32 mx-auto mb-6 group">
            <div className="w-full h-full bg-[#1a1a1a] rounded-full border-[3px] border-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.15)] flex items-center justify-center overflow-hidden relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <User size={54} className="text-[#FFD700]/80" />
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {!isUploading && (
              <div 
                onClick={handleAvatarClick}
                className="absolute bottom-1 right-1 bg-[#FFD700] text-black w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-4 border-[#111] hover:scale-110 transition-all z-10 shadow-lg active:scale-95"
              >
                <Camera size={16} strokeWidth={2.5} />
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <h3 className={`text-3xl font-black font-oswald uppercase tracking-tight flex items-center gap-2 ${isPremium ? 'text-[#FFD700]' : 'text-white'}`}>
              {username}
              {isPremium && <BadgeCheck className="text-[#32D74B] w-6 h-6 shrink-0 drop-shadow-[0_0_8px_rgba(50,215,75,0.4)]" />}
            </h3>
            <button 
              onClick={() => {
                setNewNameInput(username);
                setIsNameModalOpen(true);
              }} 
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <Edit2 size={16} />
            </button>
          </div>
          
          {isPremium ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full mb-8 shadow-[0_0_15px_rgba(255,215,0,0.05)] animate-pulse">
              <Crown size={12} className="text-[#FFD700]" />
              <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-widest">Premium Student ✨</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-8">
              <User size={12} className="text-gray-400" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Regular Student</span>
            </div>
          )}

          {/* Access Key */}
          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl text-left mb-8 backdrop-blur-sm">
            <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-2 font-bold opacity-60">Personal Access Key</div>
            <div className="flex items-center justify-between bg-black/60 p-4 rounded-xl border border-white/5 group">
              <span className={`font-mono text-[#FFD700] text-lg tracking-[0.3em] transition-all duration-500 ${!keyVisible ? 'blur-md select-none opacity-30' : ''}`}>
                {secretKey}
              </span>
              <button onClick={() => setKeyVisible(!keyVisible)} className="text-gray-600 hover:text-[#FFD700] transition-colors">
                {keyVisible ? <Eye size={22} /> : <EyeOff size={22} />}
              </button>
            </div>
            <div className="text-red-500/60 text-[9px] font-black mt-3 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle size={12} /> Confidential • Do not share
            </div>
          </div>

          {/* Subscription Section */}
          <div className="mt-4 border-t border-white/5 pt-8">
            
            {subStep === 'selection' && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                  {pricingData.plans.map(plan => {
                    const statusVal = subData?.pendingRequest?.status?.trim().toLowerCase();
                    const isPlanPending = statusVal === 'pending' && subData?.pendingRequest?.plan === plan.id;
                    const isPlanActive = isPremium && (subData?.plan === plan.id || (statusVal === 'approved' && subData?.pendingRequest?.plan === plan.id));
                    
                    return (
                    <div key={plan.id} className="flex flex-col items-center w-full">
                      {/* 1. Plan Button */}
                      <button 
                        disabled={isPlanActive || isPlanPending || (statusVal === 'pending')}
                        onClick={() => { setSelectedPlan(plan.id); setSubStep('form'); }}
                        className={`w-full relative h-28 rounded-2xl border p-3 sm:p-4 text-left overflow-hidden transition-all ${(isPlanActive || isPlanPending) ? 'bg-[#111] opacity-80 cursor-default' : 'bg-[#1a1a1c] hover:scale-[1.02] active:scale-95 group shadow-lg'} ${statusVal === 'pending' && !isPlanPending ? 'opacity-30' : ''}`}
                        style={{ borderColor: isPlanActive ? '#32D74B4D' : isPlanPending ? '#FFD7004D' : `${plan.themeColor}33` }}
                      >
                        {!isPlanActive && !isPlanPending ? (
                          <>
                            <div className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20" style={{ background: `linear-gradient(to bottom right, ${plan.themeColor}, transparent)` }}></div>
                            {plan.isPopular && <div className="absolute top-0 left-0 w-full h-full animate-shimmer pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${plan.themeColor}1A, transparent)`, width: '200%' }}></div>}
                          </>
                        ) : null}
                        
                        <span className="text-[9px] uppercase font-black tracking-widest mb-1 block" style={{ color: `${plan.themeColor}99` }}>{plan.name}</span>
                        <span className="text-lg sm:text-xl font-black text-white block mb-2">{plan.duration}</span>
                        
                        {isPlanActive ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-[#32D74B] uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> Active</span>
                            {subData?.expireDate && <span className="text-[8px] text-gray-500 uppercase tracking-wider">Exp: {new Date(subData.expireDate.toDate ? subData.expireDate.toDate().getTime() : subData.expireDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}</span>}
                          </div>
                        ) : isPlanPending ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Pending</span>
                          </div>
                        ) : (
                          <span className="text-[11px] sm:text-sm font-black px-2 py-0.5 rounded-md inline-block shadow-lg" style={{ backgroundColor: plan.themeColor, color: '#000' }}>₹{plan.price}</span>
                        )}
                      </button>

                      {/* 2. Branch Line */}
                      {plan.benefits && plan.benefits.length > 0 && (
                        <div className="w-px h-6 sm:h-8 opacity-60" style={{ background: `linear-gradient(to bottom, ${plan.themeColor}, transparent)` }}></div>
                      )}

                      {/* 3. Sticky Note with Benefits */}
                      {plan.benefits && plan.benefits.length > 0 && (
                        <div className="w-11/12 rounded-xl p-3 border relative overflow-hidden shadow-xl" style={{ borderColor: `${plan.themeColor}22`, backgroundColor: `${plan.themeColor}05` }}>
                          <div className="absolute top-2 right-2 opacity-40">
                             <Pin size={10} color={plan.themeColor} />
                          </div>
                          <ul className="space-y-2 mt-1">
                            {plan.benefits.map((benefit, i) => {
                              const benefitText = typeof benefit === 'string' ? benefit : benefit.text;
                              const benefitColor = typeof benefit === 'string' ? null : benefit.color;
                              return (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle size={10} color={plan.themeColor} className="mt-0.5 shrink-0 opacity-80" />
                                  <span 
                                    className="text-[8.5px] sm:text-[9.5px] font-bold leading-snug"
                                    style={{ color: benefitColor || '#D1D5DB' }}
                                  >
                                    {benefitText}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {pricingData.instructions && (
                  <div className="bg-[#111] border border-white/5 rounded-2xl p-4 mb-8 text-[11px] leading-relaxed">
                    <p className="text-gray-300 font-medium mb-3">{pricingData.instructions.en}</p>
                    <p className="text-gray-400">{pricingData.instructions.hi}</p>
                  </div>
                )}
              </>
            )}

                {/* Steps Container */}
                {selectedPlan && subStep !== 'selection' && subStep !== 'success' && (
                  <div className="bg-black/60 border border-white/5 rounded-3xl p-6 mb-8 animate-apple-slide-up backdrop-blur-xl">
                    {subStep === 'form' ? (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.2em]">Step 1: Details</span>
                          <button onClick={() => setSubStep('selection')} className="text-gray-500 text-[10px] uppercase font-bold hover:text-white transition-colors">Cancel</button>
                        </div>
                        <div className="space-y-4">
                          <input 
                            type="text"
                            value={subFullName}
                            onChange={(e) => setSubFullName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-[#FFD700] transition-all outline-none"
                          />
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">+91</span>
                            <input 
                              type="tel"
                              value={subContact}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 10) setSubContact(val);
                              }}
                              placeholder="9876543210"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm focus:border-[#FFD700] transition-all outline-none"
                            />
                          </div>
                          <button 
                            disabled={!subFullName || subContact.length !== 10 || isSubmitting}
                            onClick={handleInitiatePayment}
                            className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#FFD700] transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Proceed to Payment'}
                          </button>
                        </div>
                      </div>
                    ) : subStep === 'payment' ? (
                      <div className="space-y-6 animate-apple-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.2em]">Step 2: Pay & Verify</span>
                          <button 
                            onClick={() => setSubStep('form')} 
                            className="text-gray-500 text-[10px] uppercase font-bold hover:text-white transition-colors"
                          >
                            Back
                          </button>
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <div className="bg-white p-3 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.1)] mb-4 relative group">
                            <img 
                              src={pricingData.plans.find(p => p.id === selectedPlan)?.qrImage}
                              alt="Payment QR" 
                              className="w-44 h-44 object-contain rounded-xl"
                            />
                          </div>
                          
                          <p className="text-xs text-gray-500 font-bold mb-6 text-center leading-relaxed">
                            Scan this QR code to pay securely.<br/>
                            Amount: <span className="text-white font-black">₹{pricingData.plans.find(p => p.id === selectedPlan)?.price}</span>
                          </p>
                          
                          <div className="w-full">
                            <input 
                              type="file" 
                              accept="image/*" 
                              id="screenshot-upload" 
                              className="hidden" 
                              onChange={handleScreenshotUpload} 
                            />
                            <label 
                              htmlFor="screenshot-upload"
                              className={`w-full ${isUploading ? 'bg-[#FFD700]/50 cursor-wait' : 'bg-[#FFD700] hover:bg-[#FFC000] cursor-pointer hover:scale-[1.02]'} text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_5px_15px_rgba(255,215,0,0.3)] flex items-center justify-center gap-2.5 transition-all active:scale-95 text-center`}
                            >
                              {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                              {isUploading ? 'UPLOADING...' : 'UPLOAD SCREENSHOT'}
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
          </div>

        </div>

        {/* My Posts Section */}
        {myPosts.length > 0 && (
          <div className="bg-[#111] border border-white/5 p-5 rounded-2xl mb-8">
            <h3 className="text-white font-oswald uppercase tracking-wider mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-[#0A84FF]" /> My Posts
            </h3>
            <div className="space-y-4">
              {myPosts.map(post => (
                <PostItem 
                  key={post._id} 
                  post={post} 
                  onLike={() => {}} 
                  onCommentClick={() => {}} 
                  onProfileClick={() => {}}
                  onDelete={handleDeletePost}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons (Now Outside the card) */}
        <div className="flex gap-4 px-2 mb-12">
          <a 
            href={getDynamicLink('lockscreen_bot_link', 'https://t.me/nainochatbot')} 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 bg-[#111] border border-white/5 text-gray-400 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-[#0088cc] hover:text-white hover:border-[#0088cc] transition-all shadow-lg active:scale-95"
          >
            <Send size={18} /> TELEGRAM SUPPORT
          </a>
          
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex-1 bg-[#111] border border-red-500/10 text-red-500/80 p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <LogOut size={18} /> LOGOUT ACCOUNT
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isLogoutModalOpen}
        title="Logout?"
        message="Are you sure you want to logout? This will clear your session and local cache."
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        confirmText="Logout"
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Delete Post?"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        confirmText="Delete"
      />

      {/* Success Popup Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
          <div className="bg-[#111] border border-green-500/20 rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_20px_60px_-15px_rgba(34,197,94,0.3)] animate-apple-slide-up">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] animate-bounce">
              <ShieldCheck size={32} />
            </div>
            <h4 className="text-white font-black uppercase tracking-widest mb-3">Request Submitted!</h4>
            <p className="text-sm text-gray-400 leading-relaxed mb-8 font-medium">
              Your payment screenshot has been uploaded successfully. The admin will review it and activate your account shortly. 🎓
            </p>
            <button 
              onClick={() => setIsSuccessModalOpen(false)} 
              className="w-full bg-green-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-400 transition-all active:scale-95"
            >
              Okay, Got It!
            </button>
          </div>
        </div>
      )}

      {/* Name Edit Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center p-4 pt-20 md:pt-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-apple-slide-up">
            <h3 className="text-xl font-bold text-white font-oswald uppercase tracking-wide mb-4">Edit Profile Name</h3>
            <p className="text-gray-400 text-xs mb-4">You can change your name up to 5 times every 30 days.</p>
            <input 
              type="text" 
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              className="w-full bg-black/50 border border-white/10 text-white rounded-xl px-4 py-3 mb-6 focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] outline-none"
              placeholder="Enter your new name"
              maxLength={20}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setIsNameModalOpen(false)}
                className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleNameSave}
                disabled={isSavingName}
                className="flex-1 py-3 px-4 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)] disabled:opacity-50"
              >
                {isSavingName ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountScreen;
