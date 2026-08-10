import { useCallback, useEffect, useState } from "react";
import type { SaveConfigInput, SavedConfig } from "@frontsail/qr-core";

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
  insertConfig: (config: SavedConfig, index: number) => void;
  restoreConfigs: (configs: SavedConfig[]) => void;
}

export function useSavedConfigs(): UseSavedConfigsReturn {
  // Initialize state from localStorage (lazy initialization)
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(loadFromStorage);

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
        return [updated, ...prev.slice(0, existingIndex), ...prev.slice(existingIndex + 1)];
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

  /* Undoing a delete puts the entry back where it was. Re-adding it at the top
     would make an undone mistake look like a fresh save, leaving the user with
     a history they never had. The id guard covers the case where the same
     design was saved again inside the undo window. */
  const insertConfig = useCallback((config: SavedConfig, index: number) => {
    setSavedConfigs((prev) =>
      prev.some((c) => c.id === config.id)
        ? prev
        : [...prev.slice(0, index), config, ...prev.slice(index)],
    );
  }, []);

  /* The snapshot says what was cleared, not what history is allowed to hold —
     anything saved during the undo window is newer, so it stays and stays on
     top. */
  const restoreConfigs = useCallback((configs: SavedConfig[]) => {
    setSavedConfigs((prev) => [
      ...prev,
      ...configs.filter((c) => !prev.some((p) => p.id === c.id)),
    ]);
  }, []);

  return {
    savedConfigs,
    saveConfig,
    deleteConfig,
    clearAllConfigs,
    insertConfig,
    restoreConfigs,
  };
}
