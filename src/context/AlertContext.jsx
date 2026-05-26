import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

const AlertContext = createContext(null);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('info'); // 'success' | 'error' | 'info' | 'warning'
  const [onConfirm, setOnConfirm] = useState(null);

  const showAlert = useCallback((msg, alertType = 'info', alertTitle = '') => {
    setMessage(msg);
    setType(alertType);
    
    // Auto-resolve title based on type if not provided
    if (alertTitle) {
      setTitle(alertTitle);
    } else {
      switch (alertType) {
        case 'success':
          setTitle('Success');
          break;
        case 'error':
          setTitle('Error');
          break;
        case 'warning':
          setTitle('Warning');
          break;
        default:
          setTitle('Notification');
      }
    }
    
    // Support optional callback on ok
    setOnConfirm(() => () => {
      setIsOpen(false);
    });
    
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (onConfirm) {
      onConfirm();
    }
  };

  // Icon mapping based on alert type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-[#30D158] w-12 h-12 drop-shadow-[0_0_15px_rgba(48,209,88,0.4)] animate-bounce" />;
      case 'error':
        return <XCircle className="text-[#FF453A] w-12 h-12 drop-shadow-[0_0_15px_rgba(255,69,58,0.4)]" />;
      case 'warning':
        return <AlertTriangle className="text-[#FF9F0A] w-12 h-12 drop-shadow-[0_0_15px_rgba(255,159,10,0.4)] animate-pulse" />;
      default:
        return <Info className="text-[#FFD700] w-12 h-12 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" />;
    }
  };

  // Accent border/glowing outline based on alert type
  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-[#30D158]/30 shadow-[0_0_50px_rgba(48,209,88,0.1)]';
      case 'error':
        return 'border-[#FF453A]/30 shadow-[0_0_50px_rgba(255,69,58,0.1)]';
      case 'warning':
        return 'border-[#FF9F0A]/30 shadow-[0_0_50px_rgba(255,159,10,0.1)]';
      default:
        return 'border-[#FFD700]/30 shadow-[0_0_50px_rgba(255,215,0,0.1)]';
    }
  };

  // Button background colors
  const getButtonClass = () => {
    switch (type) {
      case 'success':
        return 'bg-[#30D158] text-black hover:bg-[#28b84b]';
      case 'error':
        return 'bg-[#FF453A] text-white hover:bg-[#e03b30]';
      case 'warning':
        return 'bg-[#FF9F0A] text-black hover:bg-[#e08b07]';
      default:
        return 'bg-[#FFD700] text-black hover:bg-[#e6c200]';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      {/* Premium Custom Alert Modal Portal */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            className={`bg-[#121212] border ${getBorderColor()} rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-2xl transition-all duration-300 transform scale-in`}
          >
            {/* Background ambient light */}
            <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            
            {/* Alert Icon */}
            <div className="flex justify-center mb-4 mt-2">
              {getIcon()}
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-oswald font-bold text-white uppercase tracking-wide mb-2">
              {title}
            </h2>
            
            {/* Description / Message */}
            <p className="text-gray-300 font-inter text-sm leading-relaxed mb-6 px-2">
              {message}
            </p>
            
            {/* CTA Button */}
            <button
              onClick={handleClose}
              className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 ${getButtonClass()} shadow-lg`}
            >
              OK
            </button>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.9) translateY(10px); opacity: 0; }
              to { transform: scale(1) translateY(0); opacity: 1; }
            }
            .animate-fade-in {
              animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .scale-in {
              animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
          `}} />
        </div>
      )}
    </AlertContext.Provider>
  );
};
