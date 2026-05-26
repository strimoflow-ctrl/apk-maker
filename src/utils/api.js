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

export const fetchWithCache = async (url, cacheKey, ttlMs = 5 * 60 * 1000) => {
  try {
    const cachedItem = memoryCache[cacheKey];
    if (cachedItem) {
      const now = new Date().getTime();
      
      // If cache hasn't expired
      if (now - cachedItem.timestamp < ttlMs) {
        return cachedItem.data;
      }
      // If expired, remove it
      delete memoryCache[cacheKey];
    }
  } catch (e) {
    console.warn('Error reading from cache:', e);
  }

  const resolvedUrl = resolveApiUrl(url);
  // Fetch new data
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  
  const rawText = await response.text();
  const data = decryptData(rawText);
  
  // Save to memory cache (NEVER to sessionStorage to prevent decryption leaks)
  try {
    memoryCache[cacheKey] = {
      timestamp: new Date().getTime(),
      data: data
    };
  } catch (e) {
    console.warn('Error saving to cache:', e);
  }
  
  return data;
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
    throw new Error(data.error || 'API Request Failed');
  }
  
  return data;
};

