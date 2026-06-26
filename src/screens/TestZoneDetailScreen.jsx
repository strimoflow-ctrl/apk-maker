import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Target, FileText, CheckCircle2, Search, PlayCircle, DownloadCloud, Loader2, X } from 'lucide-react';
import { useDownload, useDownloadProgress } from '../context/DownloadContext';

const TestZoneItem = ({ test, courseId, type, isDownloaded, isDownloading, handleTestClick }) => {
  const itemId = test.title;
  const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
  const isItemDownloaded = isDownloaded(type, courseId, itemId);
  const isItemDownloading = isDownloading(type, courseId, itemId);
  const isPdf = test.type === 'file' || test.link.toLowerCase().endsWith('.pdf') || test.link.includes('filestreambot');
  
  const { cancelDownload } = useDownload();
  const progressData = useDownloadProgress(downloadKey);
  const progress = progressData?.progress || 0;
  const isQueued = progressData?.status === 'queued';

  return (
    <div 
      onClick={() => handleTestClick(test)}
      className="group bg-[#0a0a0a] border border-white/5 hover:border-[#FFD700]/30 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all relative overflow-hidden"
    >
      {/* Background Progress Bar */}
      {isItemDownloading && !isQueued && (
         <div 
           className="absolute top-0 left-0 bottom-0 bg-[#FFD700]/10 transition-all duration-300"
           style={{ width: `${progress}%` }}
         />
      )}
      
      <div className="flex items-center gap-4 min-w-0 relative z-10">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
          {isPdf ? <FileText size={18} /> : <PlayCircle size={18} />}
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-white text-sm md:text-base truncate group-hover:text-[#FFD700] transition-colors">
            {test.title}
          </h4>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
            {isItemDownloading ? (isQueued ? 'Queued' : `Downloading: ${Math.round(progress)}%`) : isItemDownloaded ? 'Downloaded • Ready to View' : isPdf ? 'PDF / Solution' : 'Interactive HTML Test'}
          </p>
        </div>
      </div>
      <div className="shrink-0 ml-4 relative z-10">
        {isItemDownloading ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cancelDownload(type, courseId, itemId);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
            title="Cancel Download"
          >
             <X size={16} />
          </button>
        ) : isItemDownloaded ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-500">
             <CheckCircle2 size={18} />
          </div>
        ) : isPdf ? (
           <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/40 group-hover:bg-[#FFD700]/20 group-hover:text-[#FFD700] transition-colors">
             <DownloadCloud size={16} />
           </div>
        ) : (
          <CheckCircle2 size={20} className="text-white/10 group-hover:text-[#FFD700]/50 transition-colors" />
        )}
      </div>
    </div>
  );
};
import NotificationModal from '../components/NotificationModal';
import { fetchWithCache } from '../utils/api';

const TestZoneDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  const { downloadFile, isDownloaded, getOfflineFileUrl, isDownloading } = useDownload();

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const data = await fetchWithCache(`/api/content/testzone/${id}.json`, `cache_testzone_detail_${id}`);
        if (Array.isArray(data)) {
          const mappedData = {
            instituteName: id === 'neet_kaka_jee' ? 'NEET Kaka JEE' : id === 'neetkotaphy' ? 'NEET Kota Physics' : id,
            categories: data.map(cat => ({
              categoryName: cat.type_name || cat.categoryName || 'General',
              tests: cat.files || cat.tests || []
            }))
          };
          setTestData(mappedData);
        } else {
          setTestData(data);
        }
      } catch (error) {
        console.error("Error loading test zone details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleTestClick = async (test) => {
    if (test.type === 'file' || test.link.toLowerCase().endsWith('.pdf') || test.link.includes('filestreambot')) {
      const courseId = 'testzone';
      const itemId = test.title;
      const type = 'pdf';
      const courseTitle = testData.instituteName;
      const chapterName = testData.categories?.[activeCategory]?.categoryName || 'Tests';

      if (isDownloaded(type, courseId, itemId)) {
        // If downloaded, open it from local storage
        const url = await getOfflineFileUrl(type, courseId, itemId);
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const magicBytes = await blob.slice(0, 4).text();
          
          if (magicBytes.startsWith('PK')) {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${test.title}.zip`;
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
            navigate('/pdf', { state: { file: url, title: test.title } });
          }
        } catch (e) {
          console.error('Failed to parse blob type:', e);
          navigate('/pdf', { state: { file: url, title: test.title } });
        }
      } else if (!isDownloading(type, courseId, itemId)) {
        // If not downloaded and not downloading, start background download
        downloadFile(type, courseId, itemId, test.link, test.title, courseTitle, chapterName);
      } else {
        // If already downloading, maybe tell them or redirect to downloads
        navigate('/downloads');
      }
    } else {
      // It's an HTML Test
      navigate('/html-viewer', { state: { file: test.link, title: test.title } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        {/* Header Skeleton */}
        <header className="border-b border-white/5 px-6 py-4 animate-pulse">
          <div className="max-w-7xl mx-auto">
            <div className="w-48 h-6 bg-white/10 rounded relative overflow-hidden mb-1">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
            <div className="w-32 h-3 bg-white/5 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 p-6 flex-1 animate-pulse">
          {/* Sidebar Skeleton */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2">
            <div className="w-24 h-4 bg-white/5 rounded relative overflow-hidden mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
            <div className="flex flex-row md:flex-col overflow-x-auto gap-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="w-32 md:w-full h-11 bg-white/5 rounded-xl border border-transparent relative overflow-hidden flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search Input Skeleton */}
            <div className="w-full h-12 bg-white/5 rounded-xl mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>

            {/* Test Items Skeleton */}
            <div className="grid grid-cols-1 gap-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4 flex items-center justify-between h-[66px] relative overflow-hidden">
                  <div className="flex items-center gap-4 w-2/3">
                    <div className="w-10 h-10 rounded-full bg-white/5 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                    </div>
                    <div className="space-y-2 w-full">
                      <div className="w-3/4 h-4 bg-white/10 rounded relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                      </div>
                      <div className="w-1/2 h-3 bg-white/5 rounded relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <Target size={48} className="text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold font-oswald">Tests Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#FFD700] underline">Go Back</button>
      </div>
    );
  }

  const currentCategory = testData.categories?.[activeCategory];
  const filteredTests = currentCategory?.tests.filter(test => 
    test.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-oswald font-bold text-[#FFD700] uppercase tracking-wide">
              {testData.instituteName}
            </h1>
            <p className="text-xs text-gray-400 font-inter uppercase tracking-widest mt-0.5">Test Series & Mocks</p>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 p-6">
        
        {/* Sidebar / Categories */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 px-2">Categories</h3>
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-4 md:pb-0 hide-scrollbar">
            {testData.categories?.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveCategory(idx); setSearchTerm(''); }}
                className={`flex-shrink-0 flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left border ${
                  activeCategory === idx 
                    ? 'bg-[#FFD700]/10 border-[#FFD700]/50 text-[#FFD700]' 
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="font-semibold text-sm line-clamp-1">{cat.categoryName}</span>
                <span className="text-xs opacity-50 bg-black/20 px-2 py-0.5 rounded-full">{cat.tests?.length || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content / Tests List */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder={`Search in ${currentCategory?.categoryName || 'tests'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111] border border-white/10 text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-[#FFD700]/50 transition-colors font-inter text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredTests.length > 0 ? (
              filteredTests.map((test, idx) => (
                <TestZoneItem 
                  key={idx}
                  test={test}
                  courseId="testzone"
                  type="pdf"
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  handleTestClick={handleTestClick}
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No tests found matching your search.
              </div>
            )}
          </div>
        </div>

      </div>
      <NotificationModal 
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
};

export default TestZoneDetailScreen;
