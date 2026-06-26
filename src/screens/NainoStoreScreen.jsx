import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Star, ShoppingCart, Tag, Search } from 'lucide-react';
import { fetchWithCache } from '../utils/api';

const NainoStoreScreen = () => {
  const navigate = useNavigate();
  const [storeItems, setStoreItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    const loadStoreData = async () => {
      try {
        const data = await fetchWithCache('/api/directory/nainostore.json', 'cache_nainostore');
        if (data && Array.isArray(data)) {
          setStoreItems(data);
        } else if (data && data.items) {
          setStoreItems(data.items);
        }
      } catch (err) {
        console.error("Failed to load store data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoreData();
  }, []);

  const handleBuy = (link) => {
    if (link && link !== '#') {
      window.open(link, '_blank');
    } else {
      alert("Purchase link not available currently.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden animate-fade-in relative">
      {/* Background glowing blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#30D158]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[#FFD700]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header matching screenshot */}
      <div className="pt-12 pb-6 px-4 flex flex-col items-center justify-center relative z-10">
        <h1 className="text-3xl md:text-4xl font-oswald font-bold tracking-wide uppercase">
          <span className="text-white">NAINO</span> <span className="text-[#FFD700]">STORE</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-medium italic mt-2 text-center">
          Premium Books & Study Materials for Toppers
        </p>

        {/* Search Bar */}
        <div className="w-full max-w-md mt-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search for books or publishers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-white/5 rounded-[2rem] py-3.5 pl-12 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20 transition-colors shadow-lg"
          />
        </div>
      </div>

      <div className="px-4 mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6 animate-pulse">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#111] border border-white/5 rounded-xl md:rounded-[1.5rem] flex flex-col relative overflow-hidden h-64 md:h-[420px]"
              >
                {/* Image Section Skeleton */}
                <div className="w-full h-32 md:h-56 bg-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                </div>

                {/* Content Section Skeleton */}
                <div className="p-2.5 md:p-4 flex flex-col flex-grow justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-2/3 h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-1/3 h-3.5 bg-white/5 rounded relative overflow-hidden mt-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto">
                    <div className="w-2/3 h-6 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-full h-8 md:h-11 bg-white/5 rounded-lg md:rounded-xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : storeItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {storeItems.filter(item => item.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-[#111] border border-white/5 rounded-xl md:rounded-[1.5rem] flex flex-col relative overflow-hidden group hover:border-[#FFD700]/30 transition-all duration-300"
              >
                {/* Image Section */}
                <div className="w-full h-32 md:h-56 bg-white relative overflow-hidden">
                  {item.image && item.image !== '#' ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain p-1 md:p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Store size={48} className="text-gray-600 m-auto mt-10 md:mt-20" />
                  )}
                  {/* Badge */}
                  {item.badge && item.badge !== '#' && (
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[#FFD700] text-black font-oswald font-bold text-[8px] md:text-xs uppercase tracking-widest px-2 py-0.5 md:px-3 md:py-1 rounded-sm shadow-md">
                      {item.badge}
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-2.5 md:p-4 flex flex-col flex-1">
                  <h3 className="font-oswald font-bold text-sm md:text-xl text-white leading-tight tracking-wide mb-1 md:mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  
                  {/* Rating */}
                  {item.rating && item.rating !== '#' && (
                    <div className="flex items-center gap-1 md:gap-1.5 mb-2 md:mb-4">
                      <Star className="text-[#FFD700] fill-[#FFD700] w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-[10px] md:text-xs font-bold text-[#FFD700]">{item.rating}</span>
                      {item.reviews && item.reviews !== '#' && (
                        <span className="text-[9px] md:text-[11px] text-gray-500">({item.reviews})</span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto">
                    {/* Price and Action */}
                    <div className="flex items-center gap-1.5 md:gap-3 mb-2 md:mb-4 flex-wrap">
                      <span className="font-oswald font-bold text-lg md:text-3xl text-white tracking-wide">
                        ₹{item.sale_price}
                      </span>
                      {item.original_price && item.original_price !== '#' && (
                        <span className="text-[10px] md:text-sm text-gray-500 font-medium line-through">
                          ₹{item.original_price}
                        </span>
                      )}
                      {item.original_price && item.original_price !== '#' && parseInt(item.original_price) > parseInt(item.sale_price) && (
                        <span className="text-[8px] md:text-[10px] font-bold text-[#30D158] uppercase tracking-wider ml-auto">
                          {Math.round(((parseInt(item.original_price) - parseInt(item.sale_price)) / parseInt(item.original_price)) * 100)}% OFF
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuy(item.buy_link)}
                      className="w-full bg-[#FFD700] text-black font-oswald font-bold text-xs md:text-lg uppercase tracking-widest py-2 md:py-3.5 rounded-lg md:rounded-xl shadow-[0_4px_15px_rgba(255,215,0,0.3)] hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-1.5 md:gap-2"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 md:w-5 md:h-5" />
                      BUY NOW
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Store size={64} className="mb-4 opacity-20" />
            <h3 className="text-xl font-bold tracking-tight text-gray-400 mb-2">Store Empty</h3>
            <p className="text-sm text-center">Currently there are no items in the store.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NainoStoreScreen;
