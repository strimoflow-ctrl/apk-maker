import { decryptData } from './encryption';

const memoryCache = {};

// Clean up any leaked data from previous versions
try {
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('cache_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => sessionStorage.removeItem(k));
} catch(e) {}

export const resolveApiUrl = (url) => {
  if (url.startsWith('/api/')) {
    return `https://nainoapi.netlify.app/${url.slice(5)}`;
  }
  if (url.startsWith('/api')) {
    return `https://nainoapi.netlify.app${url.replace('/api', '')}`;
  }
  return url;
};

export const fetchWithCache = async (url, cacheKey, ttlMs = 30 * 1000) => {
  // 1. If navigator detects offline, return localStorage cache instantly
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    try {
      const cachedRaw = localStorage.getItem(`offline_api_${cacheKey}`);
      if (cachedRaw) {
        const data = decryptData(cachedRaw);
        return data;
      }
    } catch (e) {
      console.warn('Offline cache lookup failed:', e);
    }
  }

  // 2. Try memory cache for snappy transitions
  try {
    const cachedItem = memoryCache[cacheKey];
    if (cachedItem) {
      const now = new Date().getTime();
      if (now - cachedItem.timestamp < ttlMs) {
        return cachedItem.data;
      }
      delete memoryCache[cacheKey];
    }
  } catch (e) {
    console.warn('Error reading from memory cache:', e);
  }

  const resolvedUrl = resolveApiUrl(url);
  try {
    // 3. Try fetching from network
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}`);
    }
    
    const rawText = await response.text();
    const data = decryptData(rawText);
    
    // Save to memory cache
    try {
      memoryCache[cacheKey] = {
        timestamp: new Date().getTime(),
        data: data
      };
    } catch (e) {
      console.warn('Error saving to memory cache:', e);
    }

    // Save encrypted rawText to localStorage for offline fallback
    try {
      localStorage.setItem(`offline_api_${cacheKey}`, rawText);
    } catch (e) {
      console.warn('Error saving to offline cache:', e);
    }
    
    return data;
  } catch (err) {
    console.warn(`Network request failed for ${url}, trying offline cache...`, err);
    // 4. Fallback to localStorage if network fails
    try {
      const cachedRaw = localStorage.getItem(`offline_api_${cacheKey}`);
      if (cachedRaw) {
        const data = decryptData(cachedRaw);
        return data;
      }
    } catch (e) {
      console.error('Failed to load from offline cache:', e);
    }
    throw err;
  }
};

// Helper for Backend API
export const fetchBackendAPI = async (endpoint, method = 'GET', body = null) => {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://naino-app-backend-production.up.railway.app';
  const url = `${backendUrl}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'API Request Failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
};

