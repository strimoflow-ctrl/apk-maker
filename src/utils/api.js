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
  
  // Set fetch timeout based on whether cache exists
  const hasCache = typeof localStorage !== 'undefined' && !!localStorage.getItem(`offline_api_${cacheKey}`);
  const timeoutMs = hasCache ? 1500 : 10000; // 1.5s timeout if cache exists, 10s otherwise
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 3. Try fetching from network with abort signal
    const response = await fetch(resolvedUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
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
    clearTimeout(timeoutId);
    console.warn(`Network request failed or timed out for ${url}, trying offline cache...`, err);
    // 4. Fallback to localStorage if network fails or times out
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

export const getBackendUrl = () => {
  let backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'https://naino-app-backend-production.up.railway.app';
  try {
    const rawConfig = localStorage.getItem('naino_global_config');
    if (rawConfig) {
      const config = JSON.parse(rawConfig);
      if (config && config.backendUrl) {
        backendUrl = config.backendUrl.endsWith('/') ? config.backendUrl.slice(0, -1) : config.backendUrl;
      }
    }
  } catch (e) {
    console.warn("Failed to parse global config for backend URL", e);
  }
  return backendUrl;
};

// Helper for Backend API
export const fetchBackendAPI = async (endpoint, method = 'GET', body = null) => {
  const backendUrl = getBackendUrl();

  const url = `${backendUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_API_KEY
    }
  };
  
  try {
    const accessKey = localStorage.getItem('naino_access_token');
    if (accessKey) {
      options.headers['authorization'] = accessKey;
    }
  } catch(e) {}
  
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

// Get dynamic link from localStorage
export const getDynamicLink = (key, defaultLink) => {
  try {
    const raw = localStorage.getItem('naino_dynamic_links');
    if (raw) {
      const links = JSON.parse(raw);
      if (links[key] && links[key].link) {
        return links[key].link;
      }
    }
  } catch (e) {
    console.warn("Failed to get dynamic link for key:", key, e);
  }
  return defaultLink;
};

// Get dynamic title from localStorage
export const getDynamicTitle = (key, defaultTitle) => {
  try {
    const raw = localStorage.getItem('naino_dynamic_links');
    if (raw) {
      const links = JSON.parse(raw);
      if (links[key] && links[key].title) {
        return links[key].title;
      }
    }
  } catch (e) {
    console.warn("Failed to get dynamic title for key:", key, e);
  }
  return defaultTitle;
};

