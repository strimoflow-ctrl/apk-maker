import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { set, get, keys, del } from 'idb-keyval';
import { useAlert } from './AlertContext';
import NativeBridge from '../utils/NativeBridge';
import { decryptString } from '../utils/encryption';

const isCapacitor = NativeBridge.isNative();

const LocalNotifications = {
  requestPermissions: async () => {},
  schedule: async () => {},
  cancel: async () => {},
  createChannel: async () => {}
};

const KeepAwake = {
  keepAwake: async () => {},
  allowSleep: async () => {}
};

const CapacitorHttp = {
  request: async () => ({ headers: {} })
};

const Filesystem = {
  writeFile: async () => ({ uri: '' }),
  getUri: async () => ({ uri: '' }),
  addListener: async () => ({ remove: () => {} }),
  downloadFile: async () => ({}),
  appendFile: async () => {},
  readFile: async () => ({ data: '' })
};
const Directory = { Data: 'DATA' };

// Helper to calculate a stable numeric ID from string key (required by LocalNotifications)
const getNotificationId = (key) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 1000000;
};

const notifyStart = async (id, title) => {
  if (!isCapacitor) return;
  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: `Downloading: ${title}`,
        body: `Starting download...`,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_download',
        iconColor: '#FFD700',
        channelId: 'download-progress'
      }]
    });
  } catch (e) {
    console.error("Local Notification Error:", e);
  }
};

const notifyProgress = async (id, title, progress) => {
  if (!isCapacitor) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: `Downloading: ${title}`,
        body: `Progress: ${Math.round(progress)}%`,
        ongoing: true,
        autoCancel: false,
        smallIcon: 'ic_stat_download',
        iconColor: '#FFD700',
        channelId: 'download-progress'
      }]
    });
  } catch (e) {
    console.error("Local Notification Error:", e);
  }
};

const notifyComplete = async (id, title) => {
  if (!isCapacitor) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: id + 1, // New ID so it stays in history
        title: `Download Complete! 🎉`,
        body: `${title} is ready offline.`,
        ongoing: false,
        autoCancel: true,
        smallIcon: 'ic_stat_download',
        iconColor: '#FFD700'
      }]
    });
  } catch (e) {
    console.error("Local Notification Error:", e);
  }
};

const notifyCancelOrError = async (id) => {
  if (!isCapacitor) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (e) {
    console.error("Local Notification Error:", e);
  }
};

const arrayBufferToBase64 = (uint8Array) => {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i += 1024) {
    const chunk = uint8Array.subarray(i, Math.min(i + 1024, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return window.btoa(binary);
};

const DownloadContext = createContext();

export const useDownload = () => useContext(DownloadContext);

export const DownloadProvider = ({ children }) => {
  const [activeDownloadKeys, setActiveDownloadKeys] = useState([]);
  const activeDownloadsRef = useRef({});
  const listenersRef = useRef({});
  const [completedDownloads, setCompletedDownloads] = useState([]);
  const abortControllers = useRef({});
  const chunksRef = useRef({}); // Store active chunks in memory to save on pause
  const { showAlert } = useAlert();
  const pausedKeysRef = useRef({});
  
  const queueRef = useRef([]);
  const processQueueRef = useRef();

  const updateActiveDownload = (key, data, isDelete = false) => {
    if (isDelete) {
      delete activeDownloadsRef.current[key];
      if (queueRef.current) {
        queueRef.current = queueRef.current.filter(k => k !== key);
      }
      setActiveDownloadKeys(prev => prev.filter(k => k !== key));
      if (listenersRef.current[key]) {
        listenersRef.current[key].forEach(cb => cb(null));
      }
    } else {
      const isNew = !activeDownloadsRef.current[key];
      activeDownloadsRef.current[key] = { ...activeDownloadsRef.current[key], ...data };
      if (isNew) {
        setActiveDownloadKeys(prev => {
          if (!prev.includes(key)) return [...prev, key];
          return prev;
        });
      }
      if (listenersRef.current[key]) {
        listenersRef.current[key].forEach(cb => cb(activeDownloadsRef.current[key]));
      }
    }
  };

  const subscribeToDownload = (key, callback) => {
    if (!listenersRef.current[key]) {
      listenersRef.current[key] = [];
    }
    listenersRef.current[key].push(callback);
    // Send immediate initial state
    callback(activeDownloadsRef.current[key]);

    return () => {
      listenersRef.current[key] = listenersRef.current[key].filter(cb => cb !== callback);
      if (listenersRef.current[key].length === 0) {
        delete listenersRef.current[key];
      }
    };
  };

  // Create silent notification channel on mount and request permissions
  useEffect(() => {
    if (isCapacitor) {
      LocalNotifications.requestPermissions()
        .then(status => console.log("LocalNotifications permission:", status))
        .catch(e => console.warn("Failed to request notification permission:", e));

      LocalNotifications.createChannel({
        id: 'download-progress',
        name: 'Download Progress',
        description: 'Displays active download progress silently without vibrating or ringing.',
        importance: 2, // LOW (no sound/vibration)
        sound: null,
        vibration: false,
        visibility: 1
      }).catch(e => console.warn("Failed to create progress channel:", e));
    }
  }, []);

  const processQueue = () => {
    const activeKeys = Object.keys(activeDownloadsRef.current);
    const downloadingCount = activeKeys.filter(
      key => activeDownloadsRef.current[key]?.status === 'downloading'
    ).length;

    if (downloadingCount < 2) {
      if (queueRef.current) {
        const nextKey = queueRef.current.find(
          key => activeDownloadsRef.current[key]?.status === 'queued'
        );

        if (nextKey) {
          const item = activeDownloadsRef.current[nextKey];
          if (item) {
            updateActiveDownload(nextKey, { status: 'downloading' });
            startActualDownload(item);
          }
        }
      }
    }
  };

  processQueueRef.current = processQueue;

  // Global listener for Native Download Progress
  useEffect(() => {
    if (isCapacitor) {
      window.updateDownloadProgress = async (idKey, progress, downloaded, total, currentSegment, totalSegments) => {
        const activeKeys = Object.keys(activeDownloadsRef.current);
        const targetKey = activeKeys.find(k => k.endsWith(`_${idKey}`));
        
        if (targetKey) {
          if (progress === 100) {
             const state = activeDownloadsRef.current[targetKey];
             const meta = { 
               key: targetKey, 
               courseId: state.courseId, 
               itemId: state.itemId, 
               title: state.title, 
               type: state.type, 
               courseType: state.courseType,
               courseTitle: state.courseTitle,
               chapterName: state.chapterName,
               size: total, 
               timestamp: Date.now() 
             };
             
             try {
               await set(targetKey, { isFilesystem: true });
               await set(`${targetKey}_meta`, meta);
             } catch (e) {
               console.error("Failed to save download meta to IDB:", e);
             }

             setCompletedDownloads(prev => {
                const filtered = prev.filter(d => d.key !== targetKey);
                return [meta, ...filtered];
             });
             updateActiveDownload(targetKey, null, true);
             if (processQueueRef.current) processQueueRef.current();
          } else if (progress === -1) {
             // Handle native download failure
             const state = activeDownloadsRef.current[targetKey];
             const title = state ? state.title : "Video";
             showAlert(`Download failed: ${title}`, 'error');
             updateActiveDownload(targetKey, { status: 'paused', progress: 0 });
             if (processQueueRef.current) processQueueRef.current();
          } else {
             const updates = { progress, loaded: downloaded, total, status: 'downloading' };
             if (currentSegment !== undefined) updates.currentSegment = currentSegment;
             if (totalSegments !== undefined) updates.totalSegments = totalSegments;
             updateActiveDownload(targetKey, updates);
          }
        }
      };
    }
  }, [showAlert]);

  // Manage KeepAwake lock based on active downloads
  useEffect(() => {
    if (!isCapacitor) return;

    const hasActiveDownloads = activeDownloadKeys.some(
      k => activeDownloadsRef.current[k]?.status === 'downloading'
    );

    if (hasActiveDownloads) {
      KeepAwake.keepAwake()
        .then(() => console.log("KeepAwake lock acquired - downloading..."))
        .catch(e => console.warn("KeepAwake error:", e));
    } else {
      KeepAwake.allowSleep()
        .then(() => console.log("KeepAwake lock released - idle."))
        .catch(e => console.warn("KeepAwake error:", e));
    }
  }, [activeDownloadKeys]);

  // Load existing downloads on mount
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        // 1. Sync Native Downloads (if running on mobile app)
        if (isCapacitor) {
          try {
            const nativeDownloads = NativeBridge.getOfflineDownloadsList();
            if (Array.isArray(nativeDownloads)) {
              for (const nd of nativeDownloads) {
                const exists = await get(nd.key);
                if (!exists) {
                  const ext = nd.type === 'pdf' ? '.pdf' : nd.type === 'book' ? '.zip' : '.mp4';
                  const cleanTitle = nd.title.replace(/\s+/g, '_');
                  const targetFileName = `${nd.type}/${cleanTitle}_${nd.type}_${nd.courseId}_${nd.itemId}${ext}`;
                  
                  await set(nd.key, { isFilesystem: true, fileName: targetFileName });
                  await set(`${nd.key}_meta`, nd);
                  console.log("Synced background download to IndexedDB:", nd.key);
                }
              }
            }
          } catch (syncErr) {
            console.error("Failed to sync native downloads:", syncErr);
          }
        }

        const allKeys = await keys();
        const nainoKeys = allKeys.filter(k => k.startsWith('naino_offline_') && !k.endsWith('_meta') && !k.startsWith('naino_offline_partial_'));

        const downloads = [];
        for (const key of nainoKeys) {
          const meta = await get(`${key}_meta`);
          if (meta) {
            downloads.push(meta);
          }
        }
        // Sort by timestamp descending
        downloads.sort((a, b) => b.timestamp - a.timestamp);
        setCompletedDownloads(downloads);

        // Load paused downloads
        const partialKeys = allKeys.filter(k => k.startsWith('naino_offline_partial_'));
        const newKeys = [];
        for (const pKey of partialKeys) {
          const meta = await get(`${pKey}_meta`);
          if (meta) {
            const dlData = {
              ...meta,
              status: 'paused',
              progress: meta.total
                ? (meta.loaded / meta.total) * 100
                : (meta.isHLS && meta.totalSegments ? (meta.currentSegment / meta.totalSegments) * 100 : 0)
            };
            activeDownloadsRef.current[meta.key] = dlData;
            newKeys.push(meta.key);
          }
        }
        if (newKeys.length > 0) {
          setActiveDownloadKeys(prev => [...new Set([...prev, ...newKeys])]);
        }

      } catch (e) {
        console.error("Failed to load downloads", e);
      }
    };
    loadDownloads();
  }, []);

  const savePartialProgress = async (
    downloadKey,
    type,
    courseId,
    itemId,
    loaded,
    total,
    isHLS,
    segmentsDownloaded,
    title,
    courseTitle,
    chapterName,
    url,
    courseType
  ) => {
    const partialKey = `naino_offline_partial_${downloadKey}`;
    const ext = type === 'pdf' ? '.pdf' : type === 'book' ? '.zip' : '.mp4';
    const fileName = `${type}_${courseId}_${itemId}`.replace(/[^a-zA-Z0-9_.-]/g, '_') + ext;

    try {
      if (isCapacitor) {
        const meta = {
          key: downloadKey,
          courseId,
          itemId,
          title,
          type,
          courseType,
          courseTitle,
          chapterName,
          loaded,
          total,
          url,
          currentSegment: segmentsDownloaded,
          isHLS,
          totalSegments: isHLS ? total : 0,
          isCapacitorFile: true,
          fileName
        };
        await set(`${partialKey}_meta`, meta);
      } else {
        const chunks = chunksRef.current[downloadKey];
        if (Array.isArray(chunks) && chunks.length > 0) {
          const partialBlob = new Blob(chunks, { type: type === 'pdf' ? 'application/pdf' : 'video/mp4' });
          await set(partialKey, partialBlob);

          const meta = {
            key: downloadKey,
            courseId,
            itemId,
            title,
            type,
            courseType,
            courseTitle,
            chapterName,
            loaded,
            total,
            url,
            currentSegment: segmentsDownloaded,
            isHLS,
            totalSegments: isHLS ? total : 0
          };
          await set(`${partialKey}_meta`, meta);
        }
      }
      console.log(`Saved partial progress for ${downloadKey}: loaded=${loaded}, total=${total}, segments=${segmentsDownloaded}`);
    } catch (e) {
      console.error("Failed to save partial download metadata:", e);
    }
  };

  const downloadFile = async (type, courseId, itemId, rawUrl, title, courseTitle = '', chapterName = '', isResume = false) => {
    if (!rawUrl) return;
    
    let url = decryptString(rawUrl);
    if (url.startsWith('/dl/')) {
      url = `https://filestreambot-1-jx2x.onrender.com${url}`;
    }
    if (url.startsWith('http://') && !url.includes('localhost')) {
      url = url.replace('http://', 'https://');
    }

    const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
    
    // If already downloading or queued, do nothing
    const existing = activeDownloadsRef.current[downloadKey];
    if (existing && (existing.status === 'downloading' || existing.status === 'queued')) {
      return;
    }

    const currentPath = window.location.pathname + window.location.hash;
    const courseType = currentPath.includes('/coaching') ? 'coaching' :
      currentPath.includes('/crash') ? 'crash' :
        currentPath.includes('/course') ? 'course' :
          currentPath.includes('/pdf-zone') ? 'pdf-zone' :
            currentPath.includes('/test-zone') ? 'test-zone' :
              currentPath.includes('/book-library') ? 'book-library' : 'other';

    if (!isResume) {
      const exists = await get(downloadKey);
      if (exists) return;
    }

    if (type === 'pdf' && itemId && courseId && ['coaching', 'crash', 'course'].includes(courseType)) {
      try {
        const recentRaw = localStorage.getItem('naino_recent_activity') || '[]';
        let recent = JSON.parse(recentRaw);

        recent = recent.filter(item => !(item.courseId === courseId && item.lectureId === itemId));
        recent.unshift({
          courseId,
          lectureId: itemId,
          courseTitle: courseTitle || title,
          lectureTitle: itemId,
          coachingContext: chapterName ? { chapterName } : null,
          coachingName: courseType === 'coaching' ? courseTitle : null,
          progressPercent: 0,
          timestamp: new Date().getTime(),
          type: courseType
        });
        recent = recent.slice(0, 20);
        localStorage.setItem('naino_recent_activity', JSON.stringify(recent));
      } catch (e) {
        console.warn("Error saving recent activity on PDF download:", e);
      }
    }

    const queueItem = {
      key: downloadKey,
      type,
      courseId,
      itemId,
      url,
      title,
      courseTitle,
      chapterName,
      courseType,
      isResume,
      status: 'queued',
      progress: existing ? existing.progress : 0,
      loaded: existing ? existing.loaded : 0,
      total: existing ? existing.total : 0,
      isHLS: url.includes('.m3u8'),
      currentSegment: existing ? existing.currentSegment : 0,
      totalSegments: existing ? existing.totalSegments : 0
    };

    updateActiveDownload(downloadKey, queueItem);

    if (!queueRef.current.includes(downloadKey)) {
      queueRef.current.push(downloadKey);
    }

    processQueue();
  };

  async function startActualDownload(item) {
    const { key: downloadKey, type, courseId, itemId, url, title, courseTitle, chapterName, courseType, isResume } = item;
    const partialKey = `naino_offline_partial_${downloadKey}`;

    if (isCapacitor) {
      NativeBridge.startDownload(url, title, courseId, itemId, type);
      return;
    }

    const controller = new AbortController();
    abortControllers.current[downloadKey] = controller;
    pausedKeysRef.current[downloadKey] = false;

    let existingBlob = null;
    let loaded = 0;
    let total = 0;
    let startSegment = 0;
    let segmentsDownloaded = 0;
    let totalBytesLoaded = 0;

    if (isResume) {
      const meta = await get(`${partialKey}_meta`);
      if (meta) {
        loaded = meta.loaded;
        total = meta.total;
        startSegment = meta.currentSegment || 0;
        segmentsDownloaded = startSegment;
        totalBytesLoaded = loaded;
      }
      if (!isCapacitor) {
        existingBlob = await get(partialKey);
      }
    } else {
      await del(partialKey);
      await del(`${partialKey}_meta`);
    }

    updateActiveDownload(downloadKey, { progress: total ? (loaded / total) * 100 : 0, loaded, total, title, type, courseType, courseTitle, chapterName, courseId, itemId, url, status: 'downloading' });

    const ext = type === 'pdf' ? '.pdf' : type === 'book' ? '.zip' : '.mp4';
    const fileName = `${type}_${courseId}_${itemId}`.replace(/[^a-zA-Z0-9_.-]/g, '_') + ext;
    let fileUri = null;

    if (isCapacitor && !isResume) {
      try {
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: '', // empty file
          directory: Directory.Data,
          recursive: true
        });
        fileUri = writeResult.uri;
      } catch (e) {
        console.error("Failed to pre-create file on filesystem:", e);
      }
    } else if (isCapacitor && isResume) {
      try {
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Data
        });
        fileUri = uriResult.uri;
      } catch (e) {
        console.warn("Failed to get file URI during resume:", e);
      }
    }

    const notifId = getNotificationId(downloadKey);
    await notifyStart(notifId, title);
    let lastPercentNotified = 0;

    try {
      if (url.includes('.m3u8')) {
        const res = await fetch(url, { signal: controller.signal });
        const text = await res.text();
        const lines = text.split('\n');

        const segmentUrls = lines.filter(line => line.trim() !== '' && !line.startsWith('#'));
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        const resolvedUrls = segmentUrls.map(segUrl => {
          if (segUrl.trim().startsWith('http')) return segUrl.trim();
          if (segUrl.trim().startsWith('/')) {
            const urlObj = new URL(url);
            return urlObj.origin + segUrl.trim();
          }
          return baseUrl + segUrl.trim();
        });

        total = resolvedUrls.length;
        const chunks = existingBlob ? [existingBlob] : [];
        chunksRef.current[downloadKey] = chunks;
        totalBytesLoaded = loaded;
        let lastUpdateTime = 0;
        let pendingBuffer = new Uint8Array(0);

        for (let i = startSegment; i < resolvedUrls.length; i++) {
          if (controller.signal.aborted) break;

          const segUrl = resolvedUrls[i];
          try {
            const segRes = await fetch(segUrl, { signal: controller.signal });
            if (!segRes.ok) throw new Error(`Failed to fetch segment: ${segRes.status}`);
            const segData = await segRes.arrayBuffer();
            const value = new Uint8Array(segData);

            if (isCapacitor && fileUri) {
              try {
                const newBuffer = new Uint8Array(pendingBuffer.length + value.length);
                newBuffer.set(pendingBuffer, 0);
                newBuffer.set(value, pendingBuffer.length);

                const remainder = newBuffer.length % 3;
                const bytesToEncode = newBuffer.length - remainder;

                if (bytesToEncode > 0) {
                  const chunkToEncode = newBuffer.subarray(0, bytesToEncode);
                  const base64Data = arrayBufferToBase64(chunkToEncode);
                  await Filesystem.appendFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Data
                  });
                }

                pendingBuffer = newBuffer.subarray(bytesToEncode);
              } catch (fsErr) {
                console.error("Failed to append segment to filesystem:", fsErr);
              }
            } else {
              chunks.push(value);
            }
            totalBytesLoaded += segData.byteLength;
            segmentsDownloaded = i + 1;

            const now = Date.now();
            if (now - lastUpdateTime > 1000 || i === resolvedUrls.length - 1) {
              const currentPercent = ((i + 1) / total) * 100;
              updateActiveDownload(downloadKey, {
                  progress: currentPercent,
                  loaded: totalBytesLoaded,
                  total: 0,
                  isHLS: true,
                  totalSegments: total,
                  currentSegment: segmentsDownloaded,
                  title,
                  type,
                  courseTitle,
                  chapterName,
                  courseId,
                  itemId,
                  url,
                  status: 'downloading'
              });
              lastUpdateTime = now;

              if (Math.floor(currentPercent) - lastPercentNotified >= 5) {
                lastPercentNotified = Math.floor(currentPercent);
                await notifyProgress(notifId, title, currentPercent);
              }
            }
          } catch (segErr) {
            console.error(`Error downloading segment ${i}:`, segErr);
            throw segErr;
          }
        }

        if (isCapacitor && fileUri && pendingBuffer.length > 0) {
          try {
            const base64Data = arrayBufferToBase64(pendingBuffer);
            await Filesystem.appendFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Data
            });
          } catch (fsErr) {
            console.error("Failed to append final segment to filesystem:", fsErr);
          }
        }

        let finalSize = totalBytesLoaded;
        if (!isCapacitor) {
          const finalBlob = new Blob(chunks, { type: 'video/mp2t' });
          await set(downloadKey, finalBlob);
          finalSize = finalBlob.size;
        } else {
          await set(downloadKey, { isFilesystem: true, fileName: fileName });
        }

        const meta = {
          key: downloadKey, courseId, itemId, title, type, courseTitle, chapterName, size: finalSize, timestamp: new Date().getTime(), isHLS: true
        };
        await set(`${downloadKey}_meta`, meta);

        await del(partialKey);
        await del(`${partialKey}_meta`);
        delete chunksRef.current[downloadKey];

        setCompletedDownloads(prev => [meta, ...prev.filter(d => d.key !== downloadKey)]);
        await notifyComplete(notifId, title);

      } else {
        let proxyUrl = url;
        if (!isCapacitor) {
          if (url.includes('filestreambot-1-jx2x.onrender.com')) {
            proxyUrl = url.replace(/^https?:\/\/filestreambot-1-jx2x\.onrender\.com/, '');
          }
        }

        const headers = isResume && loaded > 0 ? { 'Range': `bytes=${loaded}-` } : {};

        if (isCapacitor && !total) {
          try {
            const headRes = await CapacitorHttp.request({
              method: 'HEAD',
              url: proxyUrl
            });
            const len = headRes.headers?.['content-length'] || headRes.headers?.['Content-Length'];
            if (len) {
              total = parseInt(len, 10);
            }
          } catch (e) {
            console.warn("Native HEAD request failed to get content length:", e);
          }
        }

        const response = await fetch(proxyUrl, { signal: controller.signal, headers });

        if (!response.ok && response.status !== 206) throw new Error(`HTTP error! status: ${response.status}`);

        const contentLength = response.headers.get('content-length');
        if (!total) {
          total = parseInt(contentLength, 10) || 0;
        }

        const reader = response.body.getReader();
        const chunks = existingBlob ? [existingBlob] : [];
        chunksRef.current[downloadKey] = chunks;
        let pendingBuffer = new Uint8Array(0);

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          if (isCapacitor && fileUri) {
            try {
              const newBuffer = new Uint8Array(pendingBuffer.length + value.length);
              newBuffer.set(pendingBuffer, 0);
              newBuffer.set(value, pendingBuffer.length);

              const remainder = newBuffer.length % 3;
              const bytesToEncode = newBuffer.length - remainder;

              if (bytesToEncode > 0) {
                const chunkToEncode = newBuffer.subarray(0, bytesToEncode);
                const base64Data = arrayBufferToBase64(chunkToEncode);
                await Filesystem.appendFile({
                  path: fileName,
                  data: base64Data,
                  directory: Directory.Data
                });
              }

              pendingBuffer = newBuffer.subarray(bytesToEncode);
            } catch (fsErr) {
              console.error("Failed to append chunk to filesystem:", fsErr);
            }
          } else {
            chunks.push(value);
          }
          loaded += value.length;

          const currentPercent = total ? (loaded / total) * 100 : 0;

          updateActiveDownload(downloadKey, {
              progress: currentPercent,
              loaded,
              total,
              title,
              type,
              courseTitle,
              chapterName,
              courseId,
              itemId,
              url,
              status: 'downloading'
          });

          if (Math.floor(currentPercent) - lastPercentNotified >= 5) {
            lastPercentNotified = Math.floor(currentPercent);
            await notifyProgress(notifId, title, currentPercent);
          }
        }

        if (isCapacitor && fileUri && pendingBuffer.length > 0) {
          try {
            const base64Data = arrayBufferToBase64(pendingBuffer);
            await Filesystem.appendFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Data
            });
          } catch (fsErr) {
            console.error("Failed to append final chunk to filesystem:", fsErr);
          }
        }

        let finalSize = loaded;
        let isZip = false;
        if (!isCapacitor) {
          const contentType = response.headers.get('content-type') || (type === 'pdf' ? 'application/pdf' : 'video/mp4');
          const finalBlob = new Blob(chunks, { type: contentType });

          await set(downloadKey, finalBlob);
          finalSize = finalBlob.size;

          if (type === 'book' || type === 'pdf') {
            try {
              const magicBytes = await finalBlob.slice(0, 4).text();
              if (magicBytes.startsWith('PK')) {
                isZip = true;
              }
            } catch (e) {
              console.error("Failed to detect ZIP magic bytes:", e);
            }
          }
        } else {
          await set(downloadKey, { isFilesystem: true, fileName: fileName });
          if (type === 'book' || type === 'pdf') {
            try {
              const readRes = await Filesystem.readFile({ path: fileName, directory: Directory.Data });
              const base64Data = readRes.data.substring(0, 50);
              const decoded = atob(base64Data);
              if (decoded.startsWith('PK')) isZip = true;
            } catch (e) { }
          }
        }

        const meta = {
          key: downloadKey, courseId, itemId, title, type, courseType, courseTitle, chapterName, size: finalSize, timestamp: new Date().getTime(), isZip
        };
        await set(`${downloadKey}_meta`, meta);

        await del(partialKey);
        await del(`${partialKey}_meta`);
        delete chunksRef.current[downloadKey];

        setCompletedDownloads(prev => [meta, ...prev.filter(d => d.key !== downloadKey)]);
        await notifyComplete(notifId, title);
      }

    } catch (error) {
      await notifyCancelOrError(notifId);
      if (error.name === 'AbortError') {
        console.log(`Download aborted for ${title}`);
      } else {
        console.error(`Failed to download ${title}:`, error);
        showAlert(`Download paused: ${title} (Network issue)`, 'warning');

        const isHLS = url.includes('.m3u8');
        await savePartialProgress(
          downloadKey,
          type,
          courseId,
          itemId,
          isHLS ? totalBytesLoaded : loaded,
          total,
          isHLS,
          isHLS ? segmentsDownloaded : 0,
          title,
          courseTitle,
          chapterName,
          url,
          courseType
        );
        delete chunksRef.current[downloadKey];

        pausedKeysRef.current[downloadKey] = true;

        if (activeDownloadsRef.current[downloadKey]) {
          updateActiveDownload(downloadKey, {
            status: 'paused',
            progress: total ? ((isHLS ? segmentsDownloaded : loaded) / total) * 100 : 0
          });
        }
      }
    } finally {
      delete abortControllers.current[downloadKey];
      const isPaused = pausedKeysRef.current[downloadKey];
      const prev = activeDownloadsRef.current[downloadKey];
      if (!isPaused && prev && prev.status !== 'paused') {
        updateActiveDownload(downloadKey, null, true);
      }
      if (processQueueRef.current) processQueueRef.current();
    }
  };

  const pauseDownload = async (type, courseId, itemId) => {
    const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
    if (queueRef.current) {
      queueRef.current = queueRef.current.filter(k => k !== downloadKey);
    }
    
    if (isCapacitor) {
      NativeBridge.pauseDownload(type, courseId, itemId);
      if (activeDownloadsRef.current[downloadKey]) {
        updateActiveDownload(downloadKey, { status: 'paused' });
        processQueue();
      }
      return;
    }

    const notifId = getNotificationId(downloadKey);
    await notifyCancelOrError(notifId);

    pausedKeysRef.current[downloadKey] = true;

    if (activeDownloadsRef.current[downloadKey]) {
      updateActiveDownload(downloadKey, { status: 'paused' });
    }

    if (abortControllers.current[downloadKey]) {
      abortControllers.current[downloadKey].abort();
      delete abortControllers.current[downloadKey];
    }

    const state = activeDownloadsRef.current[downloadKey];
    if (state) {
      await savePartialProgress(
        downloadKey,
        type,
        courseId,
        itemId,
        state.loaded,
        state.total,
        state.isHLS,
        state.currentSegment,
        state.title,
        state.courseTitle,
        state.chapterName,
        state.url,
        state.courseType
      );
      delete chunksRef.current[downloadKey];
    }
    processQueue();
  };

  const resumeDownload = (type, courseId, itemId) => {
    const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
    const state = activeDownloadsRef.current[downloadKey];
    if (state) {
      downloadFile(state.type, state.courseId, state.itemId, state.url, state.title, state.courseTitle, state.chapterName, true);
    }
  };

  const cancelDownload = async (type, courseId, itemId) => {
    const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
    if (queueRef.current) {
      queueRef.current = queueRef.current.filter(k => k !== downloadKey);
    }
    
    if (isCapacitor) {
      NativeBridge.cancelDownload(type, courseId, itemId);
      updateActiveDownload(downloadKey, null, true);
      processQueue();
      return;
    }

    const partialKey = `naino_offline_partial_${downloadKey}`;
    const notifId = getNotificationId(downloadKey);
    await notifyCancelOrError(notifId);

    if (abortControllers.current[downloadKey]) {
      abortControllers.current[downloadKey].abort();
      delete abortControllers.current[downloadKey];
    }

    delete chunksRef.current[downloadKey];
    await del(partialKey);
    await del(`${partialKey}_meta`);

    updateActiveDownload(downloadKey, null, true);
    processQueue();
  };

  const getOfflineFileUrl = async (type, courseId, itemId) => {
    if (isCapacitor) {
       return NativeBridge.getLocalVideoPath(courseId, itemId, type);
    }
    try {
      const downloadKey = `naino_offline_${type}_${courseId}_${itemId}`;
      const data = await get(downloadKey);
      if (data) {
        if (isCapacitor && data.isFilesystem) {
          if (type === 'pdf') {
            try {
              const fileData = await Filesystem.readFile({
                path: data.fileName,
                directory: Directory.Data
              });
              const bstr = atob(fileData.data);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              const blob = new Blob([u8arr], { type: 'application/pdf' });
              return URL.createObjectURL(blob);
            } catch (err) {
              console.error("Failed to read PDF to blob, falling back:", err);
            }
          }
          const uriResult = await Filesystem.getUri({
            path: data.fileName,
            directory: Directory.Data
          });
          return Capacitor.convertFileSrc(uriResult.uri);
        } else if (data instanceof Blob) {
          return URL.createObjectURL(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const deleteDownload = async (key) => {
    try {
      if (isCapacitor) {
        const meta = completedDownloads.find(d => d.key === key);
        if (meta) {
           NativeBridge.deleteOfflineFile(meta.type, meta.courseId, meta.itemId);
        }
        await del(key);
        await del(`${key}_meta`);
        setCompletedDownloads(prev => prev.filter(d => d.key !== key));
        return;
      }
      const data = await get(key);
      if (isCapacitor && data && data.isFilesystem) {
        await Filesystem.deleteFile({
          path: data.fileName,
          directory: Directory.Data
        }).catch(err => console.warn("Failed to delete local file:", err));
      }
      await del(key);
      await del(`${key}_meta`);
      setCompletedDownloads(prev => prev.filter(d => d.key !== key));
    } catch (e) {
      console.error("Failed to delete download", e);
    }
  };

  const isDownloaded = (type, courseId, itemId) => {
    if (isCapacitor) {
       return NativeBridge.isDownloaded(courseId, itemId, type, "");
    }
    const key = `naino_offline_${type}_${courseId}_${itemId}`;
    return completedDownloads.some(d => d.key === key);
  };

  const isDownloading = (type, courseId, itemId) => {
    const key = `naino_offline_${type}_${courseId}_${itemId}`;
    const dl = activeDownloadsRef.current[key];
    return !!dl && (dl.status === 'downloading' || dl.status === 'queued');
  };

  return (
    <DownloadContext.Provider value={{
      activeDownloadKeys,
      completedDownloads,
      downloadFile,
      deleteDownload,
      cancelDownload,
      pauseDownload,
      resumeDownload,
      isDownloaded,
      isDownloading,
      getOfflineFileUrl,
      subscribeToDownload
    }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloadProgress = (downloadKey) => {
  const [progressData, setProgressData] = useState(null);
  const { subscribeToDownload } = useDownload();

  useEffect(() => {
    if (!downloadKey) return;
    const unsubscribe = subscribeToDownload(downloadKey, (data) => {
      setProgressData(data ? { ...data } : null);
    });
    return unsubscribe;
  }, [downloadKey, subscribeToDownload]);

  return progressData;
};

export const DownloadProgressText = ({ downloadKey }) => {
  const progressData = useDownloadProgress(downloadKey);
  if (!progressData) return <>0%</>;
  if (progressData.status === 'queued') {
    return <>QUEUED</>;
  }
  if (progressData.status === 'paused') {
    return <>PAUSED</>;
  }
  return <>{Math.round(progressData.progress || 0)}%</>;
};
