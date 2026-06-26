import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, ChevronRight, Book, Download, Loader2, Check, X } from 'lucide-react';
import { useDownload, useDownloadProgress, DownloadProgressText } from '../context/DownloadContext';
import NotificationModal from '../components/NotificationModal';
import { fetchWithCache } from '../utils/api';
import { useAlert } from '../context/AlertContext';

const PdfDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { downloadFile, isDownloaded, getOfflineFileUrl, isDownloading, cancelDownload } = useDownload();
  const { showAlert } = useAlert();
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const fetchPdfData = async () => {
      try {
        const data = await fetchWithCache('/api/directory/pdfzone.json', 'cache_pdfzone_directory');
        const found = data?.find(item => item.id === id);
        setInstitution(found);
      } catch (error) {
        console.error("Failed to fetch PDF detail data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPdfData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12">
        <div className="max-w-4xl mx-auto animate-pulse">
          <header className="mb-10">
            <div className="w-56 h-8 bg-white/10 rounded relative overflow-hidden mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
            <div className="w-40 h-4 bg-white/5 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
            </div>
          </header>

          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, sIdx) => (
              <div key={sIdx} className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-lg">
                <div className="w-48 h-6 bg-white/10 rounded mb-4 relative overflow-hidden pb-2">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                </div>
                
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, cIdx) => (
                    <div 
                      key={cIdx}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-transparent"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-8 h-8 bg-black/40 rounded-lg relative overflow-hidden shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                        </div>
                        <div className="w-2/3 h-4 bg-white/5 rounded relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                        </div>
                      </div>
                      <div className="w-12 h-4 bg-white/5 rounded relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col items-center justify-center">
        <p className="text-gray-400 mb-4">Institution not found.</p>
        <button onClick={() => navigate('/pdf-zone')} className="bg-[#FFD700] text-black px-4 py-2 rounded-full font-bold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase">
                {institution.id ? institution.id.replace(/-/g, ' ') : 'Materials'}
              </h1>
              <p className="text-gray-400 font-inter text-sm mt-2">Subjects and Notes</p>
            </div>
          </div>
        </header>

        {institution.subjects && institution.subjects.length > 0 ? (
          <div className="space-y-8">
            {institution.subjects.map((subject, sIdx) => (
              <div key={sIdx} className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                  <Book size={20} className="text-[#FFD700]" /> {subject.name}
                </h2>
                
                {subject.chapters && subject.chapters.length > 0 ? (
                  <div className="space-y-2">
                    {subject.chapters.map((chapter, cIdx) => (
                      <div 
                        key={cIdx}
                        onClick={async () => {
                          if (chapter.link && chapter.link !== 'link=null' && chapter.link !== '') {
                            const courseId = institution.id;
                            const itemId = `${sIdx}_${cIdx}`;
                            const type = 'pdf';
                            
                            if (isDownloaded(type, courseId, itemId)) {
                              const url = await getOfflineFileUrl(type, courseId, itemId);
                              try {
                                const res = await fetch(url);
                                const blob = await res.blob();
                                const magicBytes = await blob.slice(0, 4).text();
                                
                                if (magicBytes.startsWith('PK')) {
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${chapter.title}.zip`;
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
                                  navigate('/pdf', { state: { file: url, title: chapter.title } });
                                }
                              } catch (e) {
                                console.error('Failed to parse blob type:', e);
                                navigate('/pdf', { state: { file: url, title: chapter.title } });
                              }
                            } else if (!isDownloading(type, courseId, itemId)) {
                              downloadFile(type, courseId, itemId, chapter.link, chapter.title, institution.id.replace(/-/g, ' '), subject.name);
                            }
                          } else {
                            showAlert("This link is not available yet.", "warning");
                          }
                        }}
                        className={`flex items-center justify-between p-3 bg-white/5 rounded-xl border border-transparent hover:border-[#FFD700]/30 hover:bg-white/10 transition-all ${(!chapter.link || chapter.link === 'link=null' || chapter.link === '') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <div className="w-8 h-8 bg-black/40 rounded-lg flex items-center justify-center text-[#FFD700] shrink-0">
                            <FileText size={16} />
                          </div>
                          <span className="text-sm font-medium text-white truncate">{chapter.title || 'Untitled Document'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(!chapter.link || chapter.link === 'link=null' || chapter.link === '') ? (
                            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">Unavailable</span>
                          ) : (
                            <>
                              {isDownloading('pdf', institution.id, `${sIdx}_${cIdx}`) ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#FFD700] uppercase font-bold tracking-widest flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> <DownloadProgressText downloadKey={`naino_offline_pdf_${institution.id}_${sIdx}_${cIdx}`} /></span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelDownload('pdf', institution.id, `${sIdx}_${cIdx}`);
                                    }}
                                    className="p-1 rounded border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                    title="Cancel Download"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : isDownloaded('pdf', institution.id, `${sIdx}_${cIdx}`) ? (
                                <span className="text-[10px] text-[#00E600] uppercase font-bold tracking-widest flex items-center gap-1"><Check size={12}/> Saved</span>
                              ) : (
                                <>
                                  <span className="text-[10px] text-[#FFD700] uppercase font-bold tracking-widest hidden md:inline">Download</span>
                                  <Download size={16} className="text-[#FFD700]" />
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 text-center py-4">No chapters available for this subject.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#111] border border-white/5 rounded-2xl">
            <FileText size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-inter">No materials available yet.</p>
            <p className="text-xs text-gray-600 mt-1 uppercase font-bold tracking-widest">Check back later!</p>
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
    </div>
  );
};

export default PdfDetailScreen;
