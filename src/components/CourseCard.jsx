import React, { useState } from 'react';
import { Play, Lock } from 'lucide-react';
import PremiumModal from './PremiumModal';
import { isItemLocked } from '../utils/premiumLock';

const CourseCard = ({ course, onClick }) => {
  const [showModal, setShowModal] = useState(false);
  const isLocked = isItemLocked(course);

  const handleClick = (e) => {
    if (isLocked) {
      setShowModal(true);
    } else {
      onClick(e);
    }
  };

  return (
    <>
      <div 
        className="bg-[#121212] rounded-xl overflow-hidden cursor-pointer flex flex-col h-full border border-[#222] transition-transform duration-300 hover:-translate-y-1 hover:border-[#FFD700]"
        onClick={handleClick}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black">
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className="object-cover w-full h-full scale-[1.08]"
          loading="lazy"
        />
      </div>
      
      <div className="p-4 flex flex-col flex-grow justify-between gap-4">
        <h3 className="text-white font-inter text-[15px] font-semibold leading-tight line-clamp-2">
          {course.title}
        </h3>
        
        <button className={`w-full ${isLocked ? 'bg-[#1a1a1a] hover:bg-[#222] text-[#FFD700] border border-[#FFD700]/30' : 'bg-[#FFD700] hover:bg-[#e6c200] text-black'} font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm`}>
          {isLocked ? (
            <>
              <Lock size={16} />
              LOCKED
            </>
          ) : (
            <>
              <Play size={16} className="fill-black" />
              WATCH NOW
            </>
          )}
        </button>
      </div>
    </div>
    
    <PremiumModal 
      isOpen={showModal} 
      onClose={() => setShowModal(false)} 
    />
    </>
  );
};

export default CourseCard;
