import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'qr-saved-configs';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load saved configs:', e);
  }
  return [];
}

export function useSavedConfigs() {
  // Initialize state from localStorage (lazy initialization)
  const [savedConfigs, setSavedConfigs] = useState(loadFromStorage);

  // Save to localStorage whenever configs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfigs));
    } catch (e) {
      console.error('Failed to save configs:', e);
    }
  }, [savedConfigs]);

  const saveConfig = useCallback((config) => {
    const newConfig = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...config
    };
    setSavedConfigs((prev) => [newConfig, ...prev]);
    return newConfig;
  }, []);

  const deleteConfig = useCallback((id) => {
    setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAllConfigs = useCallback(() => {
    setSavedConfigs([]);
  }, []);

  return {
    savedConfigs,
    saveConfig,
    deleteConfig,
    clearAllConfigs
  };
}
