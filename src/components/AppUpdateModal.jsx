import React, { useState } from 'react';
import { Smartphone, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

const AppUpdateModal = ({ updateData, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!updateData) return null;

  const handleUpdate = async () => {
    let url = updateData.apkUrl;
    if (!url.startsWith('http')) {
      // Use raw github user content or your Netlify proxy
      url = `https://nainoapi.netlify.app/${url}`;
    }

    // If not running natively on Android, fallback to browser
    if (Capacitor.getPlatform() !== 'android') {
      window.open(url, '_system');
      return;
    }

    try {
      setDownloading(true);
      setProgress(0);

      // Listen for download progress
      const progressListener = await Filesystem.addListener('progress', (progressEvent) => {
        if (progressEvent && progressEvent.bytes && progressEvent.contentLength) {
          setProgress(Math.round((progressEvent.bytes / progressEvent.contentLength) * 100));
        }
      });

      const fileName = `naino_update_v${updateData.latestVersionCode}.apk`;
      
      const downloadRes = await Filesystem.downloadFile({
        url: url,
        path: fileName,
        directory: Directory.Cache,
        progress: true
      });

      // Stop listening to progress
      progressListener.remove();
      setProgress(100);

      // Give filesystem a moment
      setTimeout(async () => {
        try {
          await FileOpener.open({
            filePath: downloadRes.path,
            contentType: 'application/vnd.android.package-archive',
          });
          setDownloading(false);
        } catch (err) {
          console.error('FileOpener Error:', err);
          window.open(url, '_system');
          setDownloading(false);
        }
      }, 500);

    } catch (err) {
      console.error('Download Error:', err);
      // Fallback to browser download if filesystem fails
      window.open(url, '_system');
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 page-transition">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full max-w-sm bg-[#111] border border-[#FFD700]/30 rounded-3xl p-6 shadow-2xl">
        <div className="w-16 h-16 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-2xl flex items-center justify-center text-[#FFD700] mx-auto mb-4 animate-bounce">
          <Smartphone size={32} />
        </div>
        
        <h2 className="text-2xl font-black font-oswald tracking-wide text-center uppercase text-white mb-2">
          New Update <span className="text-[#FFD700]">Available!</span>
        </h2>
        
        <p className="text-gray-400 text-center text-sm mb-6">
          Version {updateData.latestVersionName} is here. {updateData.forceUpdate ? "You must update to continue using the app." : "Update now for the best experience!"}
        </p>

        <div className="bg-black/50 border border-white/5 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Release Notes:</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {updateData.releaseNotes}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpdate}
            disabled={downloading}
            className="w-full bg-[#FFD700] hover:bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest text-sm relative overflow-hidden"
          >
            {downloading && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-[#E6C200] transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            )}
            
            <div className="relative z-10 flex items-center gap-2">
              {downloading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 
                  {progress > 0 ? `Downloading ${progress}%` : 'Starting...'}
                </>
              ) : (
                <>
                  <Download size={18} /> Update Now
                </>
              )}
            </div>
          </button>
          
          {!updateData.forceUpdate && !downloading && (
            <button
              onClick={onClose}
              className="w-full bg-transparent hover:bg-white/5 text-gray-400 font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-xs"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppUpdateModal;
