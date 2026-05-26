import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, BarChart2, Download, Menu } from 'lucide-react';

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'My Library', icon: BookOpen, path: '/library' },
    { label: 'My Progress', icon: BarChart2, path: '/progress' },
    { label: 'Downloads', icon: Download, path: '/downloads' },
    { label: 'More', icon: Menu, path: '/more' },
  ];

  // We only show bottom navbar on these 5 main paths
  const mainPaths = ['/', '/library', '/progress', '/downloads', '/more'];
  if (!mainPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/5 py-3.5 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path, { replace: true })}
              className="flex flex-col items-center justify-center flex-1 py-0.5 px-2 transition-all active:scale-90"
            >
              <Icon
                size={23}
                className={`transition-colors duration-200 ${
                  isActive ? 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]' : 'text-[#8E8E93]'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavBar;
