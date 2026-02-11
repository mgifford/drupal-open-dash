import { CONFIG, STORAGE_KEYS } from './config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

export const storage = {
  get: <T>(key: string): T | null => {
    // 1. Try memory
    const memEntry = memoryCache.get(key);
    if (memEntry) {
      if (Date.now() - memEntry.timestamp < CONFIG.cacheValidation.ttl) {
        return memEntry.data;
      } else {
        memoryCache.delete(key);
      }
    }

    // 2. Try localStorage
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() - entry.timestamp < CONFIG.cacheValidation.ttl) {
          // Hydrate memory
          memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expired
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    return null;
  },

  set: <T>(key: string, data: T) => {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    memoryCache.set(key, entry);
    try {
      // Only persist if configured? The prompt says "store only in memory by default" for GitLab token.
      // For general data (responses), it says "optional localStorage cache".
      // We will assume "optional" means we persist cache entries unless disabled?
      // Or maybe we treat everything as persistable except secrets?
      // I'll add a check for secrets keys, but for general API data, I'll persist.
      if (key !== STORAGE_KEYS.GITLAB_TOKEN) {
        localStorage.setItem(key, JSON.stringify(entry));
      }
    } catch (e) {
      console.warn('LocalStorage set error', e);
    }
  },

  clear: () => {
    memoryCache.clear();
    try {
      // Clear only cache keys, not settings
      Object.keys(localStorage).forEach(k => {
         if (k.startsWith('drupal-dash-cache-') || k === STORAGE_KEYS.CACHE) { // Assuming we namespace keys later
             localStorage.removeItem(k);
         }
      });
      // Also clear the general cache key if we use it
      localStorage.removeItem(STORAGE_KEYS.CACHE); 
      console.log('Cache cleared');
    } catch (e) {
      console.error(e);
    }
  },
  
  // Specific methods for Settings which shouldn't expire
  getSettings: <T>(key: string, defaultVal: T): T => {
      try {
          const s = localStorage.getItem(key);
          return s ? JSON.parse(s) : defaultVal;
      } catch { return defaultVal; }
  },
  
  setSettings: <T>(key: string, val: T) => {
      try {
          localStorage.setItem(key, JSON.stringify(val));
      } catch {}
  }
};

// Helper for namespaced keys
export const cacheKey = (endpoint: string, params: Record<string, string|number>) => {
    return `drupal-dash-cache-${endpoint}-${JSON.stringify(params)}`;
};
