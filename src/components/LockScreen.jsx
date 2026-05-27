import React, { useState, useEffect, useRef } from 'react';
import { fetchBackendAPI } from '../utils/api';
import { Loader2, ShieldAlert, KeyRound, Bot, User, CheckCircle, SkipForward, Clock, Send, Scan } from 'lucide-react';
import { getDeviceUuid } from '../utils/device';

const LockScreen = ({ onUnlock }) => {
  const [step, setStep] = useState('passcode'); // 'passcode', 'username', 'locked'
  const [passcode, setPasscode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockTimer, setLockTimer] = useState(0);
  const inputsRef = useRef([]);

  // Username step states
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [tempUserData, setTempUserData] = useState(null);

  useEffect(() => {
    // Check lock expiry on mount
    const expiry = localStorage.getItem('naino_lock_expiry');
    if (expiry) {
      const remaining = parseInt(expiry) - Date.now();
      if (remaining > 0) {
        setStep('locked');
        setLockTimer(Math.ceil(remaining / 1000));
      } else {
        localStorage.removeItem('naino_lock_attempts');
        localStorage.removeItem('naino_lock_expiry');
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (step === 'locked' && lockTimer > 0) {
      interval = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            localStorage.removeItem('naino_lock_attempts');
            localStorage.removeItem('naino_lock_expiry');
            setStep('passcode');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, lockTimer]);

  const handleFailedAttempt = () => {
    let attempts = parseInt(localStorage.getItem('naino_lock_attempts') || '0');
    attempts += 1;
    if (attempts >= 5) {
      const expiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem('naino_lock_expiry', expiry.toString());
      setLockTimer(30 * 60);
      setStep('locked');
    } else {
      localStorage.setItem('naino_lock_attempts', attempts.toString());
    }
  };

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newPasscode = [...passcode];
    newPasscode[index] = value[value.length - 1]; // Only take last character
    setPasscode(newPasscode);
    setError(false);
    setErrorMessage('');

    // Auto focus next
    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newPasscode = [...passcode];
      newPasscode[index] = '';
      setPasscode(newPasscode);
      setError(false);
      setErrorMessage('');
      
      // Auto focus previous
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData) {
      const newPasscode = [...passcode];
      for (let i = 0; i < pastedData.length; i++) {
        newPasscode[i] = pastedData[i];
      }
      setPasscode(newPasscode);
      setError(false);
      setErrorMessage('');
      if (pastedData.length < 6) {
        inputsRef.current[pastedData.length]?.focus();
      } else {
        inputsRef.current[5]?.focus();
      }
    }
  };

  useEffect(() => {
    const checkPasscode = async () => {
      const code = passcode.join('');
      if (code.length === 6 && step === 'passcode') {
        setLoading(true);
        setError(false);
        setErrorMessage('');
        try {
          const currentPhoneUuid = await getDeviceUuid();
          try {
            const response = await fetchBackendAPI('/api/keys/verify', 'POST', {
              code: code,
              deviceId: currentPhoneUuid
            });

            // Success! Clear attempts.
            localStorage.removeItem('naino_lock_attempts');
            
            const data = response.data;
            const userData = {
              code: code,
              username: data.username || '',
              isPremium: data.isPremium || false,
              avatarUrl: data.avatarUrl || null
            };

            if (userData.username && userData.username !== 'Student') {
              // Already has a custom username
              onUnlock(userData);
            } else {
              setTempUserData(userData);
              setStep('username');
            }
          } catch (apiError) {
            setError(true);
            setErrorMessage(apiError.message || 'Invalid access key or device mismatch.');
            setPasscode(['', '', '', '', '', '']);
            inputsRef.current[0]?.focus();
            handleFailedAttempt();
          }
        } catch (err) {
          console.error("Firebase Error: ", err);
          setError(true);
          setErrorMessage('Network or server error. Please try again.');
          setPasscode(['', '', '', '', '', '']);
          inputsRef.current[0]?.focus();
        } finally {
          setLoading(false);
        }
      }
    };

    checkPasscode();
  }, [passcode, step, onUnlock]);

  const handleUsernameSubmit = async () => {
    if (!usernameInput.trim()) {
      setUsernameError('Please enter a username.');
      return;
    }
    
    // Validation: max 10 chars, alphanumeric only
    if (!/^[a-zA-Z0-9]{1,10}$/.test(usernameInput)) {
      setUsernameError('Letters and numbers only. Max 10 characters.');
      return;
    }

    setLoading(true);
    try {
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: tempUserData.code,
        deviceId: await getDeviceUuid(),
        updates: { username: usernameInput }
      });
      onUnlock({ ...tempUserData, username: usernameInput });
    } catch (err) {
      console.error(err);
      setUsernameError('Failed to save username.');
      setLoading(false);
    }
  };

  const handleSkipUsername = async () => {
    setLoading(true);
    try {
      const randomName = `User${Math.floor(1000 + Math.random() * 9000)}`;
      await fetchBackendAPI('/api/keys/update', 'POST', {
        code: tempUserData.code,
        deviceId: await getDeviceUuid(),
        updates: { username: randomName }
      });
      onUnlock({ ...tempUserData, username: randomName });
    } catch (err) {
      console.error(err);
      setUsernameError('Failed to skip.');
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Cool High-Tech Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden transition-colors duration-700">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl animate-pulse ${error || step === 'locked' ? 'bg-red-900/10' : 'bg-[#32D74B]/5'}`}></div>
        {/* Scanning Line */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent to-transparent animate-scan-line opacity-40 ${error || step === 'locked' ? 'via-red-500/60' : 'via-[#32D74B]/60'}`}></div>
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>
      
      {/* Naino Academy Logo with Glitch Effect */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-90 group cursor-default">
        <div className="relative">
          <img src="/logo.png" alt="Naino Academy" className="h-12 w-auto mb-2 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)] group-hover:animate-pulse" />
          <div className={`absolute inset-0 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity ${error || step === 'locked' ? 'bg-red-500/20' : 'bg-[#32D74B]/20'}`}></div>
        </div>
        <span className="text-[#FFD700] font-black uppercase tracking-[0.4em] text-xs font-oswald text-shadow-glow">Naino Academy</span>
      </div>

      <div className={`bg-[#111]/80 border ${error ? 'border-red-500' : 'border-white/10'} backdrop-blur-2xl p-6 sm:p-8 rounded-3xl w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-all duration-300 ${error ? 'animate-shake' : 'hover:border-white/20'}`}>
        
        {step === 'locked' && (
          <div className="flex flex-col items-center text-center animate-apple-fade-in">
             <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse">
               <Clock className="text-red-500" size={32} />
             </div>
             <h2 className="text-2xl font-black text-white text-center font-oswald uppercase tracking-widest mb-3">
               Too Many Attempts
             </h2>
             <p className="text-sm text-gray-400 mb-6 leading-relaxed">
               You have entered incorrect keys 5 times. Please wait before trying again.
             </p>
             <div className="bg-red-500/10 border border-red-500/30 rounded-xl py-4 px-8 mb-4">
                <span className="text-3xl font-mono font-black text-red-500 tracking-wider">
                  {formatTime(lockTimer)}
                </span>
             </div>
          </div>
        )}

        {step === 'passcode' && (
          <div className="animate-apple-fade-in">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${error ? 'bg-red-500/20' : 'bg-[#32D74B]/20'}`}></div>
              <div className={`relative w-16 h-16 bg-gradient-to-br to-black rounded-full flex items-center justify-center border transition-colors duration-300 ${error ? 'from-red-900/40 shadow-[0_0_30px_rgba(255,0,0,0.2)] border-red-500/30' : 'from-[#32D74B]/20 shadow-[0_0_30px_rgba(50,215,75,0.2)] border-[#32D74B]/30'}`}>
                {loading ? (
                  <Loader2 className={`${error ? 'text-red-500' : 'text-[#32D74B]'} animate-spin`} size={28} />
                ) : error ? (
                  <ShieldAlert className="text-red-500" size={28} />
                ) : (
                  <Scan className="text-[#32D74B] animate-pulse" size={28} />
                )}
              </div>
            </div>

            <h2 className={`text-3xl font-black text-white text-center font-oswald uppercase tracking-widest mb-1 transition-all duration-300 ${error ? 'drop-shadow-[0_2px_10px_rgba(255,0,0,0.5)]' : 'drop-shadow-[0_2px_10px_rgba(50,215,75,0.3)]'}`}>
              System Locked
            </h2>
            <p className={`text-xs text-center mb-8 font-medium px-4 leading-relaxed transition-colors duration-300 ${errorMessage ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
              {errorMessage || 'SECURE AUTHORIZATION REQUIRED. ENTER 6-DIGIT PIN.'}
            </p>

            <div className="flex justify-center gap-1.5 sm:gap-2 mb-8 w-full" onPaste={handlePaste}>
              {passcode.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputsRef.current[index] = el}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={digit}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`flex-1 max-w-[45px] sm:max-w-[48px] h-14 bg-black/60 border-b-2 ${error ? 'border-red-500 text-red-500 shadow-[0_4px_15px_rgba(255,0,0,0.2)]' : 'border-[#32D74B]/30 text-white focus:border-[#32D74B] focus:shadow-[0_4px_15px_rgba(50,215,75,0.3)]'} rounded-t-lg rounded-b-none text-center text-2xl font-black font-mono focus:ring-0 outline-none transition-all placeholder:text-gray-800`}
                  disabled={loading}
                  maxLength={1}
                  placeholder="0"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <div className="flex justify-center mt-6">
              <a 
                href="https://t.me/nainochatbot" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#24A1DE] to-[#1E88E5] hover:opacity-90 text-white rounded-xl font-bold uppercase tracking-widest text-[11px] transition-all group shadow-[0_8px_25px_rgba(36,161,222,0.3)] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(36,161,222,0.4)]"
              >
                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                Get Key via Telegram
              </a>
            </div>
          </div>
        )}

        {step === 'username' && (
          <div className="flex flex-col items-center animate-apple-slide-up">
             <div className="w-16 h-16 bg-[#32D74B]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(50,215,75,0.15)]">
               <User className="text-[#32D74B]" size={28} />
             </div>
             
             <h2 className="text-2xl font-black text-white text-center font-oswald uppercase tracking-widest mb-2">
               Choose Username
             </h2>
             <p className="text-xs text-center mb-6 font-medium text-gray-400 px-2 leading-relaxed">
               Pick a unique name. Max 10 characters, letters and numbers only.
             </p>

             <div className="w-full mb-6 relative">
               <input 
                 type="text" 
                 value={usernameInput}
                 onChange={(e) => { setUsernameInput(e.target.value); setUsernameError(''); }}
                 placeholder="e.g. Rahul99"
                 disabled={loading}
                 className="w-full h-14 bg-black/50 border border-white/10 rounded-xl px-4 text-white text-center font-black tracking-wider placeholder:text-gray-600 focus:border-[#32D74B] focus:ring-1 focus:ring-[#32D74B] outline-none transition-all"
               />
               {usernameError && (
                 <p className="text-red-500 text-[10px] text-center mt-2 font-bold absolute -bottom-5 w-full">{usernameError}</p>
               )}
             </div>

             <div className="w-full flex flex-col gap-3">
               <button 
                 onClick={handleUsernameSubmit}
                 disabled={loading}
                 className="w-full h-12 bg-[#32D74B] hover:bg-[#2CBF42] text-black font-black uppercase tracking-widest text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(50,215,75,0.2)] active:scale-95 disabled:opacity-50"
               >
                 {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} 
                 Save & Continue
               </button>
               
               <button 
                 onClick={handleSkipUsername}
                 disabled={loading}
                 className="w-full h-12 bg-transparent hover:bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
               >
                 Skip for now <SkipForward size={14} />
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LockScreen;
