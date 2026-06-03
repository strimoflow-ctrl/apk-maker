import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, HardDrive, Trash2, Play, Pause, CheckCircle, Loader2, AlertTriangle, X, FolderArchive, Save, ExternalLink, Eye, ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDownload, useDownloadProgress } from '../context/DownloadContext';
import NotificationModal from '../components/NotificationModal';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const isCapacitor = Capacitor.isNativePlatform();

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    resolve(reader.result);
  };
  reader.readAsDataURL(blob);
});

const saveFileToDevice = async (url, dl) => {
  const ext = dl.type === 'pdf' ? '.pdf' : dl.type === 'book' ? '.zip' : '.mp4';
  const displayFileName = `${dl.title}${ext}`.replace(/[/\\?%*:|"<>]/g, '-');
  
  if (isCapacitor) {
    try {
      const internalFileName = `${dl.type}_${dl.courseId}_${dl.itemId}`.replace(/[^a-zA-Z0-9_.-]/g, '_') + ext;
      
      try {
        const perm = await Filesystem.checkPermissions();
        if (perm.publicStorage !== 'granted') {
          await Filesystem.requestPermissions();
        }
      } catch (err) {
        console.warn("Storage permission request error:", err);
      }

      try {
        await Filesystem.mkdir({
          path: 'NainoAcademy',
          directory: Directory.Documents,
          recursive: true
        });
      } catch (e) {
        // Ignore if it already exists
      }

      await Filesystem.copy({
        from: internalFileName,
        directory: Directory.Data,
        to: `NainoAcademy/${displayFileName}`,
        toDirectory: Directory.Documents
      });
      return true;
    } catch (e) {
      console.error("Failed to copy to Documents/NainoAcademy, trying root Documents...", e);
      try {
        const internalFileName = `${dl.type}_${dl.courseId}_${dl.itemId}`.replace(/[^a-zA-Z0-9_.-]/g, '_') + ext;
        await Filesystem.copy({
          from: internalFileName,
          directory: Directory.Data,
          to: displayFileName,
          toDirectory: Directory.Documents
        });
        return true;
      } catch (err) {
        console.error("Documents fallback failed:", err);
        
        // Final fallback: Try Downloads folder if Documents is restricted
        try {
          const internalFileName = `${dl.type}_${dl.courseId}_${dl.itemId}`.replace(/[^a-zA-Z0-9_.-]/g, '_') + ext;
          await Filesystem.copy({
            from: internalFileName,
            directory: Directory.Data,
            to: displayFileName,
            toDirectory: Directory.ExternalStorage || 'DOWNLOADS'
          });
          return true;
        } catch (extErr) {
          console.error("ExternalStorage fallback failed:", extErr);
          throw err;
        }
      }
    }
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = displayFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
};


const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-apple-fade-in">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-apple-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/10 p-2 rounded-full">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <h3 className="text-xl font-bold text-white font-oswald uppercase tracking-wide">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed font-inter">
          {message}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/5"
          >
            Go Back
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ActiveDownloadItem = ({ downloadKey, openModal, pauseDownload, resumeDownload }) => {
  const dl = useDownloadProgress(downloadKey);
  if (!dl || !dl.title) return null;

  return (
    <div className="bg-black p-4 rounded-xl border border-white/5 relative group">
      <div className="flex justify-between items-center mb-2">
        <div className="pr-10">
          <h3 className="font-semibold text-white text-sm leading-tight">
            {dl.title} <span className="text-[10px] text-gray-500 ml-1">({dl.type?.toUpperCase()})</span>
          </h3>
          {(dl.courseTitle || dl.chapterName) && (
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
              {dl.courseTitle} {dl.chapterName ? `• ${dl.chapterName}` : ''}
            </p>
          )}
        </div>
        <span className="text-xs text-[#FFD700] font-mono whitespace-nowrap ml-2">
          {dl.status === 'paused' ? 'PAUSED' : `${Math.round(dl.progress || 0)}%`}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#FFD700] h-full transition-all duration-300"
            style={{ width: `${dl.progress || 0}%` }}
          ></div>
        </div>
        {dl.status === 'paused' ? (
          <button 
            onClick={() => resumeDownload(dl.type, dl.courseId, dl.itemId)}
            className="text-gray-500 hover:text-[#00E600] transition-colors p-1"
            title="Resume Download"
          >
            <Play size={16} />
          </button>
        ) : (
          <button 
            onClick={() => pauseDownload(dl.type, dl.courseId, dl.itemId)}
            className="text-gray-500 hover:text-yellow-500 transition-colors p-1"
            title="Pause Download"
          >
            <Pause size={16} />
          </button>
        )}
        <button 
          onClick={() => openModal('cancel', dl)}
          className="text-gray-500 hover:text-red-500 transition-colors p-1"
          title="Cancel Download"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 text-right">
        {(dl.loaded / (1024 * 1024)).toFixed(2)} MB 
        {dl.isHLS 
          ? ` (Seg ${dl.currentSegment || 0}/${dl.totalSegments || 0})`
          : ` / ${dl.total ? (dl.total / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown'}`
        }
      </p>
    </div>
  );
};

const DownloadScreen = () => {
  const navigate = useNavigate();
  const { activeDownloadKeys, completedDownloads, deleteDownload, cancelDownload, pauseDownload, resumeDownload, getOfflineFileUrl } = useDownload();
  
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'cancel' or 'delete'
    data: null // download object or key
  });
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [zipStatusMap, setZipStatusMap] = useState({});
  const [optionsModal, setOptionsModal] = useState({ isOpen: false, data: null });

  useEffect(() => {
    const detectFileTypes = async () => {
      const statusMap = {};
      for (const dl of completedDownloads) {
        if (dl.type === 'book' || dl.type === 'pdf') {
          if (dl.isZip !== undefined) {
            statusMap[dl.key] = dl.isZip;
            continue;
          }
          
          try {
            const url = await getOfflineFileUrl(dl.type, dl.courseId, dl.itemId);
            if (url) {
              const res = await fetch(url);
              const blob = await res.blob();
              const magicBytes = await blob.slice(0, 4).text();
              statusMap[dl.key] = magicBytes.startsWith('PK');
              if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
              }
            }
          } catch (e) {
            console.error("Failed to detect ZIP dynamically for key:", dl.key, e);
          }
        }
      }
      setZipStatusMap(statusMap);
    };

    if (completedDownloads.length > 0) {
      detectFileTypes();
    }
  }, [completedDownloads]);

  const openModal = (type, data) => {
    setModalState({ isOpen: true, type, data });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null, data: null });
  };

  const handleConfirm = () => {
    if (modalState.type === 'cancel') {
      const { type, courseId, itemId } = modalState.data;
      cancelDownload(type, courseId, itemId);
    } else if (modalState.type === 'delete') {
      deleteDownload(modalState.data);
    }
    closeModal();
  };

  const openOptionsModal = (dl) => setOptionsModal({ isOpen: true, data: dl });
  const closeOptionsModal = () => setOptionsModal({ isOpen: false, data: null });

  const handleOptionsAction = async (action, dl) => {
    closeOptionsModal();
    if (action === 'delete') {
      openModal('delete', dl.key);
      return;
    }
    
    if (action === 'details') {
      const state = { 
        scrollToId: dl.itemId || dl.courseId, 
        autoPlayLecture: dl.itemId || dl.courseId,
        coachingContext: dl.chapterName ? { chapterName: dl.chapterName } : null
      };
      if (dl.type === 'video') {
        const cType = dl.courseType || (dl.courseId?.startsWith('cr_') ? 'crash' : dl.courseId?.startsWith('c_') ? 'coaching' : 'course');
        if (cType === 'coaching') navigate(`/coaching/${dl.courseId}`, { state });
        else if (cType === 'crash') navigate(`/crash/${dl.courseId}`, { state });
        else navigate(`/course/${dl.courseId}`, { state });
      } else if (dl.type === 'book') {
        navigate('/book-library', { state });
      } else if (dl.type === 'pdf' || dl.type === 'zip') {
        const cType = dl.courseType || (dl.courseId?.startsWith('cr_') ? 'crash' : dl.courseId?.startsWith('c_') ? 'coaching' : 'course');
        if (cType === 'coaching') navigate(`/coaching/${dl.courseId}`, { state });
        else if (cType === 'crash') navigate(`/crash/${dl.courseId}`, { state });
        else if (cType === 'course') navigate(`/course/${dl.courseId}`, { state });
        else if (cType === 'pdf-zone') navigate(`/pdf-zone/${dl.courseId}`, { state });
        else if (cType === 'test-zone') navigate(`/test-zone/${dl.courseId}`, { state });
        else if (cType === 'book-library') navigate('/book-library', { state });
        else if (dl.itemId && dl.itemId !== dl.courseId) navigate(`/course/${dl.courseId}`, { state });
        else navigate('/pdf-zone', { state });
      }
      return;
    }

    const url = await getOfflineFileUrl(dl.type, dl.courseId, dl.itemId);
    if (action === 'watch') {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      const cType = dl.courseType || (dl.courseId?.startsWith('cr_') ? 'crash' : dl.courseId?.startsWith('c_') ? 'coaching' : 'course');
      const state = { 
        autoPlayLecture: dl.itemId,
        coachingContext: dl.chapterName ? { chapterName: dl.chapterName } : null
      };
      if (cType === 'coaching') navigate(`/coaching/${dl.courseId}`, { state });
      else if (cType === 'crash') navigate(`/crash/${dl.courseId}`, { state });
      else navigate(`/course/${dl.courseId}`, { state });
    } else if (action === 'view') {
      navigate('/pdf', { state: { file: url, title: dl.title } });
    } else if (action === 'extract') {
      try {
        await saveFileToDevice(url, dl);
        setNotification({
          isOpen: true,
          title: "ZIP Exported",
          message: isCapacitor 
            ? `"${dl.title}.zip" has been saved to your device's Documents folder.` 
            : "This ZIP module has been exported to your phone's Downloads folder. Please extract it using File Manager.",
          type: "zip"
        });
      } catch (e) { 
        console.error('Extract error', e); 
        alert("Failed to export ZIP file.");
      }
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    } else if (action === 'save') {
      try {
        await saveFileToDevice(url, dl);
        setNotification({
          isOpen: true,
          title: "Saved to Phone",
          message: isCapacitor
            ? `"${dl.title}.pdf" has been saved to your device's Documents folder.`
            : `"${dl.title}" has been saved to your phone's Downloads folder.`,
          type: "success"
        });
      } catch (e) { 
        console.error('Save error', e); 
        alert("Failed to save PDF to phone.");
      }
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 pb-12 page-transition">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-oswald font-bold text-[#FFD700] tracking-wide uppercase flex items-center gap-3">
              <Download size={28} /> My Downloads
            </h1>
            <p className="text-gray-400 font-inter text-sm mt-2">Manage your offline content</p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Active Downloads Section */}
          {activeDownloadKeys.length > 0 && (
            <div className="bg-white/5 border border-[#FFD700]/20 rounded-2xl p-6 shadow-lg shadow-[#FFD700]/5 mb-6">
              <h2 className="text-[#FFD700] font-bold mb-4 flex items-center gap-2">
                <Loader2 className="animate-spin" size={20} /> Downloading ({activeDownloadKeys.length})
              </h2>
              <div className="space-y-4">
                {activeDownloadKeys.map((key) => (
                  <ActiveDownloadItem 
                    key={key} 
                    downloadKey={key} 
                    openModal={openModal} 
                    pauseDownload={pauseDownload} 
                    resumeDownload={resumeDownload} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Downloads Section */}
          {completedDownloads.length > 0 ? (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-lg">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} /> Completed
              </h2>
              <div className="space-y-4">
                {completedDownloads.map((dl) => (
                  <div 
                    key={dl.key} 
                    onClick={() => openOptionsModal(dl)}
                    className="bg-black p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4 cursor-pointer hover:border-[#FFD700]/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          zipStatusMap[dl.key]
                            ? 'bg-yellow-500/20 text-[#FFD700]'
                            : dl.type === 'pdf'
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          {zipStatusMap[dl.key] ? 'ZIP' : dl.type}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{(dl.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-[#FFD700] transition-colors">
                        {dl.title}
                      </h3>
                      {(dl.courseTitle || dl.chapterName) && (
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                          {dl.courseTitle} {dl.chapterName ? `• ${dl.chapterName}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-[#111] border border-white/5 rounded-2xl shadow-lg mt-8">
              <HardDrive size={48} className="text-[#333] mb-4" />
              <p className="text-gray-500 font-inter text-center">
                You don't have any downloaded videos.<br/>
                Downloads will appear here for offline viewing.
              </p>
              <button 
                onClick={() => navigate('/teachers-library')}
                className="mt-6 bg-[#FFD700] text-black font-bold py-2 px-6 rounded-full hover:bg-yellow-500 transition-colors"
              >
                Find Courses
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={modalState.isOpen}
        title={modalState.type === 'cancel' ? 'Cancel Download?' : 'Delete Download?'}
        message={modalState.type === 'cancel' 
          ? 'Are you sure you want to cancel this active download? You will lose all current progress.' 
          : 'Are you sure you want to permanently delete this downloaded file from your device?'}
        onConfirm={handleConfirm}
        onCancel={closeModal}
      />

      <NotificationModal 
        isOpen={notification.isOpen}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />

      {/* Options Modal Bottom Sheet */}
      {optionsModal.isOpen && optionsModal.data && createPortal((() => {
        const dl = optionsModal.data;
        const isZip = zipStatusMap[dl.key];
        return (
          <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-apple-fade-in" onClick={closeOptionsModal}>
            <div 
              className="bg-[#111] border-t border-white/10 rounded-t-3xl w-full max-w-lg p-6 shadow-2xl animate-apple-slide-up pb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                   {isZip ? <FolderArchive className="text-[#FFD700]" size={24} /> : dl.type === 'pdf' ? <FileText className="text-red-500" size={24} /> : <Play className="text-[#0A84FF]" size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">{dl.title}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">{isZip ? 'ZIP' : dl.type} • {(dl.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="space-y-2">
                {isZip ? (
                  <button onClick={() => handleOptionsAction('extract', dl)} className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[#FFD700] font-bold text-sm">
                    <FolderArchive size={18} /> Extract ZIP
                  </button>
                ) : dl.type === 'video' ? (
                  <button onClick={() => handleOptionsAction('watch', dl)} className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[#30D158] font-bold text-sm">
                    <Play size={18} /> Watch Video
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleOptionsAction('view', dl)} className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[#0A84FF] font-bold text-sm">
                      <Eye size={18} /> View Document
                    </button>
                    <button onClick={() => handleOptionsAction('save', dl)} className="w-full flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-[#FFD700] font-bold text-sm">
                      <Save size={18} /> Save to Phone
                    </button>
                  </>
                )}

                <button onClick={() => handleOptionsAction('details', dl)} className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-gray-200 font-bold text-sm">
                  <div className="flex items-center gap-3"><ExternalLink size={18} /> Go to Details</div>
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
                
                <button onClick={() => handleOptionsAction('delete', dl)} className="w-full flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors text-red-500 font-bold text-sm mt-4">
                  <Trash2 size={18} /> Delete Download
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

export default DownloadScreen;
