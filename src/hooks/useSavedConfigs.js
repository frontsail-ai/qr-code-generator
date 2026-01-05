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

function configsMatch(a, b) {
  // Compare qrType, formData, and customization (excluding id and timestamp)
  return (
    a.qrType === b.qrType &&
    JSON.stringify(a.formData) === JSON.stringify(b.formData) &&
    JSON.stringify(a.customization) === JSON.stringify(b.customization)
  );
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
    setSavedConfigs((prev) => {
      // Check if an identical config already exists
      const existingIndex = prev.findIndex((c) => configsMatch(c, config));

      if (existingIndex !== -1) {
        // Move existing config to top with updated timestamp
        const existing = prev[existingIndex];
        const updated = {
          ...existing,
          timestamp: new Date().toISOString()
        };
        return [updated, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
      }

      // Create new config
      const newConfig = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...config
      };
      return [newConfig, ...prev];
    });
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
