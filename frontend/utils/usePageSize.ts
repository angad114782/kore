import { useState, useCallback } from "react";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export function usePageSize(storageKey: string, defaultSize = 20): [number, (size: number) => void] {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(`pageSize_${storageKey}`);
      if (stored) {
        const n = Number(stored);
        if (PAGE_SIZE_OPTIONS.includes(n)) return n;
      }
    } catch {}
    return defaultSize;
  });

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    try { localStorage.setItem(`pageSize_${storageKey}`, String(size)); } catch {}
  }, [storageKey]);

  return [pageSize, setPageSize];
}
