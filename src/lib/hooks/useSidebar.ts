'use client';

import { useState, useEffect, useCallback } from 'react';

export function useSidebar() {
  // Default to true on desktop to prevent any initial shrink or abnormal collapse
  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ca_sidebar_open') : null;

    const handleMedia = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpenState(false);
      } else {
        // On desktop, prioritize user's saved preference or default to open (expanded)
        setSidebarOpenState(saved !== null ? saved === 'true' : true);
      }
    };

    handleMedia(media);

    const listener = (e: MediaQueryListEvent) => handleMedia(e);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ca_sidebar_open', String(next));
      } catch {}
      return next;
    });
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    try {
      localStorage.setItem('ca_sidebar_open', String(open));
    } catch {}
  }, []);

  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    isMobile,
  };
}
