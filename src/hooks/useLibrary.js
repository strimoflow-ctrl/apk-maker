import { useState, useEffect, useCallback } from 'react';

const LIBRARY_KEY = 'naino_saved_library';

export const useLibrary = () => {
  const [savedItems, setSavedItems] = useState([]);

  useEffect(() => {
    const loadItems = () => {
      try {
        const raw = localStorage.getItem(LIBRARY_KEY);
        if (raw) {
          setSavedItems(JSON.parse(raw));
        } else {
          setSavedItems([]);
        }
      } catch (e) {
        console.warn('Failed to load library items', e);
      }
    };

    loadItems();

    // Listen for changes from other hooks
    window.addEventListener('naino_library_changed', loadItems);
    return () => {
      window.removeEventListener('naino_library_changed', loadItems);
    };
  }, []);

  const saveItem = useCallback((item) => {
    const raw = localStorage.getItem(LIBRARY_KEY);
    let currentItems = raw ? JSON.parse(raw) : [];

    if (currentItems.some(i => i.id === item.id)) {
      return;
    }

    const newItems = [{ ...item, savedAt: new Date().getTime() }, ...currentItems];
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event('naino_library_changed'));
  }, []);

  const removeItem = useCallback((id) => {
    const raw = localStorage.getItem(LIBRARY_KEY);
    let currentItems = raw ? JSON.parse(raw) : [];
    
    const newItems = currentItems.filter(i => i.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event('naino_library_changed'));
  }, []);

  const isSaved = useCallback((id) => {
    return savedItems.some(i => i.id === id);
  }, [savedItems]);

  const toggleSave = useCallback((item) => {
    if (isSaved(item.id)) {
      removeItem(item.id);
      return false;
    } else {
      saveItem(item);
      return true;
    }
  }, [isSaved, removeItem, saveItem]);

  return { savedItems, saveItem, removeItem, isSaved, toggleSave };
};
