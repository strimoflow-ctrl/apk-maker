import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Download, ExternalLink, Loader2, Check, Lock, X } from 'lucide-react';
import { useDownload, useDownloadProgress, DownloadProgressText } from '../context/DownloadContext';
import NotificationModal from '../components/NotificationModal';
import SaveButton from '../components/SaveButton';
import PremiumModal from '../components/PremiumModal';
import { fetchWithCache } from '../utils/api';
import { isItemLocked } from '../utils/premiumLock';

const BookLibraryScreen = () => {
  const navigate = useNavigate();
  const { downloadFile, isDownloaded, getOfflineFileUrl, isDownloading, cancelDownload } = useDownload();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await fetchWithCache('/api/directory/books.json', 'cache_books_directory');
        setBooks(data || []);
      } catch (error) {
        console.error("Failed to fetch books data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
            <div className="space-y-2">
              <div className="w-48 h-8 bg-white/10 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
              </div>
              <div className="w-64 h-3.5 bg-white/5 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
              </div>
            </div>
            <div className="w-full md:w-72 h-10 bg-white/5 rounded-full relative overflow-hidden border border-white/5" />
          </header>

          {/* Book Grid Skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 mt-6 animate-pulse">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#111] border border-white/5 rounded-2xl p-3 sm:p-4 min-h-[250px] sm:min-h-[280px] relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex flex-col h-full">
                  <div className="w-full h-28 sm:h-36 bg-white/5 rounded-xl relative overflow-hidden mb-3 border border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="w-full h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-2/3 h-4 bg-white/10 rounded relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="w-1/2 h-3 bg-white/5 rounded relative overflow-hidden mt-1">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                  </div>

                  <div className="mt-3 w-full h-10 bg-white/5 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category && b.category.trim()).filter(Boolean)))];

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || (book.category && book.category.trim() === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
                <BookOpen size={28} /> Book Library
              </h1>
              <p className="text-gray-400 font-inter text-sm mt-2">Premium PDF Books & Modules</p>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search Books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-[#FFD700] transition-colors"
            />
          </div>
        </header>

        {/* Category Pills Bar */}
        {categories.length > 1 && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${selectedCategory === cat
                    ? 'bg-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105'
                    : 'bg-[#111] border border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p>No books found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 mt-6">
            {filteredBooks.map((book, idx) => (
              <div
                key={book.id || idx}
                className="bg-[#111] border border-white/5 hover:border-[#FFD700]/50 rounded-2xl p-3 sm:p-4 transition-all shadow-xl group relative overflow-hidden flex flex-col justify-between min-h-[250px] sm:min-h-[280px]"
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-full h-28 sm:h-36 bg-[#1a1a1a] rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-white/5 relative">
                      {book.image ? (
                        <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen size={36} className="text-[#FFD700] opacity-50" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80" />
                    </div>
                  </div>

                  <div className="flex-1 flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base leading-tight uppercase tracking-wide font-oswald line-clamp-2 mb-1 group-hover:text-[#FFD700] transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest font-bold mb-1">
                        {book.author || "Unknown Author"}
                      </p>
                      {book.category && book.category !== 'General' && (
                        <span className="inline-block bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-widest">
                          {book.category}
                        </span>
                      )}
                    </div>
                    <SaveButton
                      item={{
                        id: `book_${book.id}`,
                        type: 'book',
                        title: book.title,
                        link: book.link,
                        image: book.image,
                        author: book.author || "Unknown Author"
                      }}
                    />
                  </div>

                  <div className="mt-3 flex gap-2 w-full">
                    {isDownloading('book', 'library', book.id) ? (
                      <>
                        <div className="flex-1 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] font-bold uppercase tracking-widest py-2 sm:py-2.5 text-[10px] sm:text-xs rounded-lg flex items-center justify-center gap-1 sm:gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          <DownloadProgressText downloadKey={`naino_offline_book_library_${book.id}`} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelDownload('book', 'library', book.id);
                          }}
                          className="px-3 py-2 sm:py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center shrink-0"
                          title="Cancel Download"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          if (isItemLocked(book)) {
                            setPremiumModalOpen(true);
                            return;
                          }

                          const type = 'book';
                          const courseId = 'library';
                          const itemId = book.id;

                          if (isDownloaded(type, courseId, itemId)) {
                            const url = await getOfflineFileUrl(type, courseId, itemId);
                            try {
                              const res = await fetch(url);
                              const blob = await res.blob();
                              const magicBytes = await blob.slice(0, 4).text();

                              if (magicBytes.startsWith('PK')) {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${book.title}.zip`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setNotification({
                                  isOpen: true,
                                  title: "ZIP Exported",
                                  message: "This is a ZIP module. It has been exported to your phone's Downloads folder. Please open your File Manager to extract it.",
                                  type: "zip"
                                });
                                if (url && url.startsWith('blob:')) {
                                  URL.revokeObjectURL(url);
                                }
                              } else {
                                navigate('/pdf', { state: { file: url, title: book.title } });
                              }
                            } catch (e) {
                              console.error('Failed to parse blob type:', e);
                              navigate('/pdf', { state: { file: url, title: book.title } });
                            }
                          } else {
                            downloadFile(type, courseId, itemId, book.link, book.title, 'Book Library', book.author);
                          }
                        }}
                        className={`w-full ${isItemLocked(book) ? 'bg-[#1a1a1a] hover:bg-[#222] text-[#FFD700] border border-[#FFD700]/30' : 'bg-[#FFD700] hover:bg-white text-black'} font-bold uppercase tracking-widest py-2 sm:py-2.5 text-[10px] sm:text-xs rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-2 shadow-[0_0_15px_rgba(255,215,0,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.5)]`}
                      >
                        {isItemLocked(book) ? (
                          <><Lock size={14} /> Locked</>
                        ) : isDownloaded('book', 'library', book.id) ? (
                          <><Check size={14} /> Open</>
                        ) : (
                          <><Download size={14} /> Download</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-[#FFD700]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>
      <NotificationModal
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
      <PremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
      />
    </div>
  );
};

export default BookLibraryScreen;
