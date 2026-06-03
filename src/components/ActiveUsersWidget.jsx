import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

const getActiveUsersRange = (hour) => {
  try {
    const cached = localStorage.getItem('naino_global_config');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed.activeUsersRanges)) {
        const range = parsed.activeUsersRanges.find(r => hour >= r.start && hour < r.end);
        if (range) {
          return { min: range.min, max: range.max };
        }
      }
    }
  } catch (e) {
    console.warn("Failed to get dynamic active users range:", e);
  }

  if (hour >= 7 && hour < 12) return { min: 400, max: 600 };
  else if (hour >= 12 && hour < 15) return { min: 600, max: 800 };
  else if (hour >= 15 && hour < 22) return { min: 800, max: 1200 };
  else if (hour >= 22 && hour < 24) return { min: 600, max: 800 };
  else return { min: 600, max: 700 };
};

const getRandomInRange = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// SVG dynamic coordinate sparkline generator
const generateSparklinePath = (history) => {
  if (history.length === 0) return '';
  const minVal = Math.min(...history);
  const maxVal = Math.max(...history);
  const range = maxVal - minVal || 1;
  const heightLimit = 20;
  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * 100;
    const normalized = (val - minVal) / range;
    const y = 25 - (normalized * heightLimit);
    return { x, y };
  });
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};

const ActiveUsersWidget = () => {
  const [activeUsers, setActiveUsers] = useState(() => {
    const hour = new Date().getHours();
    const { min, max } = getActiveUsersRange(hour);
    return getRandomInRange(min, max);
  });

  const [activeHistory, setActiveHistory] = useState(() => {
    const hour = new Date().getHours();
    const { min, max } = getActiveUsersRange(hour);
    return Array.from({ length: 10 }, () => getRandomInRange(min, max));
  });

  useEffect(() => {
    const handleConfigUpdate = () => {
      const hour = new Date().getHours();
      const { min, max } = getActiveUsersRange(hour);
      setActiveUsers(getRandomInRange(min, max));
    };
    window.addEventListener('globalConfigUpdated', handleConfigUpdate);
    
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const { min, max } = getActiveUsersRange(hour);

      let nextValue;
      setActiveUsers((prev) => {
        let value = prev;
        if (prev < min || prev > max) {
          value = getRandomInRange(min, max);
        } else {
          const change = Math.floor(Math.random() * 31) - 15;
          value = Math.max(min, Math.min(max, prev + change));
        }
        nextValue = value;
        return value;
      });

      setActiveHistory((prevHistory) => {
        const newHistory = [...prevHistory, nextValue];
        return newHistory.slice(-10);
      });
    }, 3000);

    return () => {
      window.removeEventListener('globalConfigUpdated', handleConfigUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-[#111]/80 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-md relative overflow-hidden backdrop-blur-md">
      <div>
        <div className="w-7 h-7 rounded-xl bg-[#30D158]/10 flex items-center justify-center text-[#30D158] mb-3">
          <Users size={14} />
        </div>
        <span className="text-xl font-bold font-mono tracking-tight block leading-none">
          {activeUsers}
        </span>
        <span className="text-[8px] text-[#8E8E93] uppercase font-bold tracking-wider mt-1 block">
          Active Users
        </span>
      </div>
      <div className="w-full h-8 mt-3 opacity-80">
        <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
          <path
            d={generateSparklinePath(activeHistory)}
            fill="none"
            stroke="#30D158"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default ActiveUsersWidget;
