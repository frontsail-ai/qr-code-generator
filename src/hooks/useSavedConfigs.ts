import { useCallback, useEffect, useState } from "react";
import type { SaveConfigInput, SavedConfig } from "../types";

const STORAGE_KEY = "qr-saved-configs";

function loadFromStorage(): SavedConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as SavedConfig[];
    }
  } catch (e) {
    console.error("Failed to load saved configs:", e);
  }
  return [];
}

function configsMatch(a: SaveConfigInput, b: SaveConfigInput): boolean {
  // Compare qrType, formData, and customization (excluding id and timestamp)
  return (
    a.qrType === b.qrType &&
    JSON.stringify(a.formData) === JSON.stringify(b.formData) &&
    JSON.stringify(a.customization) === JSON.stringify(b.customization)
  );
}

interface UseSavedConfigsReturn {
  savedConfigs: SavedConfig[];
  saveConfig: (config: SaveConfigInput) => void;
  deleteConfig: (id: string) => void;
  clearAllConfigs: () => void;
}

export function useSavedConfigs(): UseSavedConfigsReturn {
  // Initialize state from localStorage (lazy initialization)
  const [savedConfigs, setSavedConfigs] =
    useState<SavedConfig[]>(loadFromStorage);

  // Save to localStorage whenever configs change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfigs));
    } catch (e) {
      console.error("Failed to save configs:", e);
    }
  }, [savedConfigs]);

  const saveConfig = useCallback((config: SaveConfigInput) => {
    setSavedConfigs((prev) => {
      // Check if an identical config already exists
      const existingIndex = prev.findIndex((c) => configsMatch(c, config));

      if (existingIndex !== -1) {
        // Move existing config to top with updated timestamp
        const existing = prev[existingIndex];
        const updated: SavedConfig = {
          ...existing,
          timestamp: new Date().toISOString(),
        };
        return [
          updated,
          ...prev.slice(0, existingIndex),
          ...prev.slice(existingIndex + 1),
        ];
      }

      // Create new config
      const newConfig: SavedConfig = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...config,
      };
      return [newConfig, ...prev];
    });
  }, []);

  const deleteConfig = useCallback((id: string) => {
    setSavedConfigs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAllConfigs = useCallback(() => {
    setSavedConfigs([]);
  }, []);

  return {
    savedConfigs,
    saveConfig,
    deleteConfig,
    clearAllConfigs,
  };
}
