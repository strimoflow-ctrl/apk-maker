import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';

const AvatarCropper = ({ imageSrc, onComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Lock body scroll when cropper is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      // Auto-fit image to center
      setScale(0.25); // Set zoom to 25% by default as requested
      draw();
    };
  }, [imageSrc]);

  useEffect(() => {
    draw();
  }, [scale, position]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (black)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Create circle clip
    ctx.beginPath();
    ctx.arc(125, 125, 125, 0, Math.PI * 2);
    ctx.clip();

    // Draw image
    const img = imageRef.current;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    // Center it by default plus pan position
    const cx = (250 - drawWidth) / 2 + position.x;
    const cy = (250 - drawHeight) / 2 + position.y;

    ctx.drawImage(img, cx, cy, drawWidth, drawHeight);

    ctx.restore();

    // Draw dark overlay outside circle
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.rect(0, 0, 250, 250);
    ctx.arc(125, 125, 125, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw golden border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(125, 125, 125, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX || e.touches?.[0].clientX,
      y: e.clientY || e.touches?.[0].clientY
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    // Prevent default to stop pull-to-refresh or native drag
    if (e.cancelable) e.preventDefault();

    const currentX = e.clientX || e.touches?.[0].clientX;
    const currentY = e.clientY || e.touches?.[0].clientY;

    const dx = currentX - dragStart.current.x;
    const dy = currentY - dragStart.current.y;

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));

    dragStart.current = { x: currentX, y: currentY };
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create a temporary canvas just for the cropped circle
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 250;
    exportCanvas.height = 250;
    const exportCtx = exportCanvas.getContext('2d');

    const img = imageRef.current;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const cx = (250 - drawWidth) / 2 + position.x;
    const cy = (250 - drawHeight) / 2 + position.y;

    // Fill white background just in case of transparency
    exportCtx.fillStyle = '#FFFFFF';
    exportCtx.fillRect(0, 0, 250, 250);
    exportCtx.drawImage(img, cx, cy, drawWidth, drawHeight);

    // Compress and get data URL (JPEG, 0.7 quality)
    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.7);

    // Convert to Blob for upload
    exportCanvas.toBlob((blob) => {
      onComplete(dataUrl, blob);
    }, 'image/jpeg', 0.7);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-apple-fade-in touch-none">
      <div className="flex justify-between items-center w-full max-w-sm mb-6">
        <h3 className="text-[#FFD700] font-oswald text-xl uppercase tracking-wider">Adjust Photo</h3>
        <button onClick={onCancel} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={20} className="text-white" />
        </button>
      </div>

      <div
        className="relative touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={250}
          height={250}
          className="rounded-full shadow-[0_0_30px_rgba(255,215,0,0.2)] cursor-move touch-none"
        />
      </div>

      <div className="w-full max-w-sm mt-8">
        <label className="text-xs text-gray-400 font-bold uppercase tracking-widest flex justify-between mb-2">
          <span>Zoom</span>
          <span>{Math.round(scale * 100)}%</span>
        </label>
        <input
          type="range"
          min={0.1}
          max={1.0}
          step={0.01}
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="w-full accent-[#FFD700] h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <button
        onClick={handleSave}
        className="mt-10 w-full max-w-sm flex items-center justify-center gap-2 bg-[#FFD700] text-black font-bold py-3 rounded-xl hover:bg-[#FFC000] hover:scale-[1.02] transition-all shadow-[0_5px_15px_rgba(255,215,0,0.3)]"
      >
        <Check size={20} /> SET PROFILE PICTURE
      </button>
    </div>,
    document.body
  );
};

export default AvatarCropper;
