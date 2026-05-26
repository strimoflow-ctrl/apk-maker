import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, Maximize, Smartphone, Loader2, X, ZoomIn, Bot } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import SaveButton from '../components/SaveButton';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewerScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [isLandscape, setIsLandscape] = useState(false);
  const [selectedZoomPage, setSelectedZoomPage] = useState(null);
  const [showAiOptions, setShowAiOptions] = useState(false);

  // The state can pass the file directly (URL or Blob URL)
  const file = location.state?.file;
  const title = location.state?.title || 'Document';
  const [fileSizeMB, setFileSizeMB] = useState(0);

  useEffect(() => {
    if (!file) {
      navigate(-1);
      return;
    }

    // Determine file size to conditionally enable pagination
    const checkFileSize = async () => {
      try {
        if (typeof file === 'string') {
          if (file.startsWith('blob:')) {
            const res = await fetch(file);
            const blob = await res.blob();
            setFileSizeMB(blob.size / (1024 * 1024));
          } else {
            const res = await fetch(file, { method: 'HEAD' });
            const size = parseInt(res.headers.get('content-length') || 0, 10);
            setFileSizeMB(size / (1024 * 1024));
          }
        }
      } catch (e) {
        console.warn("Could not determine file size:", e);
      }
    };

    checkFileSize();

    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Reset orientation on unmount if possible
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log(e));
      }
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (e) { }
    };
  }, [file, navigate]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const usePagination = fileSizeMB > 5 || (numPages && numPages > 35);

  const toggleOrientation = async () => {
    try {
      if (!isLandscape) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape');
        }
        setIsLandscape(true);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
        setIsLandscape(false);
      }
    } catch (error) {
      console.warn("Orientation lock not supported or denied by browser", error);
    }
  };

  const handleAnalyzeWithAi = (language) => {
    const modalContainer = document.querySelector('.zoom-modal-container');
    const canvas = modalContainer ? modalContainer.querySelector('canvas') : document.querySelector('canvas');
    
    if (canvas) {
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      const prompt = language === 'hindi' 
        ? "Kripya is page ko analyze karein aur isme maujood important concepts ko detail se samjhayein."
        : "Please analyze this page and explain the core concepts in detail.";
      
      setSelectedZoomPage(null);
      setShowAiOptions(false);
      
      navigate('/naino-ai', { 
        state: { 
          aiImage: base64Image, 
          aiPrompt: prompt,
          isTemp: true
        } 
      });
    } else {
      console.error("Could not find canvas to capture image.");
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-[#050505] text-white flex flex-col overflow-hidden">
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-[60] w-10 h-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center hover:bg-[#FFD700] hover:text-black transition-all shadow-xl"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Floating Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-[60] flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-xl">
        <SaveButton 
          item={{ 
            id: `pdf_${title.replace(/\s+/g, '_')}`, 
            type: 'pdf', 
            title: title,
            file: file,
            state: location.state
          }} 
        />
        <button onClick={toggleOrientation} className="p-2 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-[#FFD700]" title="Toggle Rotation">
          {isLandscape ? <Smartphone size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {/* Document Title Floating (Bottom Left - if not pagination) */}
      {!usePagination && (
        <div className="absolute bottom-4 left-4 z-[60] max-w-[60%] bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-xl pointer-events-none">
          <p className="text-xs font-bold text-[#FFD700] truncate">{title}</p>
        </div>
      )}

      {/* Main PDF Scrollable Container */}
      <div className="flex-1 w-full h-full overflow-auto custom-scrollbar">
        <div className="py-20 flex justify-center min-h-full">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center h-[70vh]">
                <Loader2 className="animate-spin text-[#FFD700] mb-4" size={40} />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Rendering PDF...</p>
              </div>
            }
            error={
              <div className="text-red-500 text-center mt-10 h-[70vh] flex items-center justify-center">
                Failed to load PDF. Please try again.
              </div>
            }
          >
            {numPages && (
              usePagination ? (
                <div
                  className="shadow-[0_0_30px_rgba(0,0,0,0.8)] relative cursor-zoom-in group"
                  onClick={() => setSelectedZoomPage(pageNumber)}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={1.0}
                    width={Math.min(containerWidth - 16, 1200)}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="bg-white overflow-hidden"
                  />
                  {/* Tap to Zoom Hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm">
                      <ZoomIn size={16} className="text-[#FFD700]" /> Tap to Zoom
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {Array.from(new Array(numPages), (el, index) => (
                    <div
                      key={`page_${index + 1}`}
                      className="shadow-[0_0_30px_rgba(0,0,0,0.8)] cursor-zoom-in group relative"
                      onClick={() => setSelectedZoomPage(index + 1)}
                    >
                      <Page
                        pageNumber={index + 1}
                        scale={1.0}
                        width={Math.min(containerWidth - 16, 1200)}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="bg-white overflow-hidden"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                        <div className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm">
                          <ZoomIn size={16} className="text-[#FFD700]" /> Tap to Zoom
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </Document>
        </div>
      </div>

      {/* Pagination Controls */}
      {numPages && usePagination && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full flex items-center justify-center gap-6 shadow-2xl">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(prev => prev - 1)}
            className="px-4 py-1.5 bg-[#1a1a1a] border border-[#FFD700]/30 hover:bg-[#FFD700]/20 disabled:opacity-30 disabled:hover:bg-[#1a1a1a] rounded-full text-[#FFD700] font-bold uppercase text-xs transition-colors"
          >
            Previous
          </button>

          <span className="text-gray-300 font-mono text-sm whitespace-nowrap">
            <span className="text-white font-bold">{pageNumber}</span> / {numPages}
          </span>

          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(prev => prev + 1)}
            className="px-4 py-1.5 bg-[#FFD700] hover:bg-[#FFD700]/80 disabled:opacity-30 disabled:hover:bg-[#FFD700] text-black rounded-full font-bold uppercase text-xs transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Zoom Modal Overlay */}
      {selectedZoomPage && createPortal(
        <div className="zoom-modal-container fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <button
            onClick={() => {
              setSelectedZoomPage(null);
              setShowAiOptions(false);
            }}
            className="absolute top-6 right-6 z-[10000] w-12 h-12 bg-white/10 hover:bg-[#FF3B30] rounded-full flex items-center justify-center text-white transition-colors shadow-2xl"
          >
            <X size={24} />
          </button>

          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[10000] bg-black/50 backdrop-blur-sm px-4 py-1 rounded-full text-white/50 text-xs font-bold uppercase tracking-widest pointer-events-none">
            Page {selectedZoomPage} • Pinch to Zoom
          </div>

          <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing relative pt-12">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={5}
              centerOnInit={true}
              centerZoomedOut={false}
              limitToBounds={true}
              wheel={{ step: 0.1 }}
              pinch={{ step: 5 }}
              doubleClick={{ mode: "zoomIn", step: 0.5 }}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", justifyContent: "center", display: "flex", alignItems: "center" }}
              >
                <div className="shadow-[0_0_50px_rgba(0,0,0,1)] bg-white">
                  <Document file={file}>
                    <Page
                      pageNumber={selectedZoomPage}
                      scale={1.5} // Render higher resolution for zooming
                      width={Math.min(containerWidth, 1000)}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="bg-white"
                    />
                  </Document>
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>

          {/* AI Analyze Floating Button */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex items-center justify-center">
            <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all duration-300">
              {showAiOptions ? (
                <div className="flex items-center animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => handleAnalyzeWithAi('hindi')}
                    className="px-5 py-2 hover:bg-white/10 text-white rounded-full font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    Hindi
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
                  <button 
                    onClick={() => handleAnalyzeWithAi('english')}
                    className="px-5 py-2 hover:bg-white/10 text-white rounded-full font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    English
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 mx-1"></div>
                  <button 
                    onClick={() => setShowAiOptions(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAiOptions(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:opacity-90 text-black rounded-full flex items-center gap-2 font-bold uppercase tracking-wider text-sm transition-all"
                >
                  <Bot size={18} />
                  Analyze with AI
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PdfViewerScreen;
