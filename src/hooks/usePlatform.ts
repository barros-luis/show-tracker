import { useState, useEffect, useMemo } from 'react';

export type Platform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

interface PlatformInfo {
  platform: Platform;
  isMobile: boolean;
  isDesktop: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isMacOS: boolean;
}

/**
 * Detect platform immediately (sync) - used for initial state
 */
function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      isMobile: false,
      isDesktop: true,
      isAndroid: false,
      isIOS: false,
      isWindows: false,
      isMacOS: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  let platform: Platform = 'unknown';
  let isMobile = false;
  let isAndroid = false;
  let isIOS = false;
  let isWindows = false;
  let isMacOS = false;

  // Check for mobile platforms via User Agent
  if (/android/i.test(ua)) {
    platform = 'android';
    isMobile = true;
    isAndroid = true;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    platform = 'ios';
    isMobile = true;
    isIOS = true;
  } else if (/win/i.test(ua)) {
    platform = 'windows';
    isWindows = true;
  } else if (/mac/i.test(ua)) {
    platform = 'macos';
    isMacOS = true;
  } else if (/linux/i.test(ua)) {
    platform = 'linux';
  }

  // Fallback: If width < 768px, treat as mobile
  if (width < 768 && !isMobile) {
    isMobile = true;
  }

  return {
    platform,
    isMobile,
    isDesktop: !isMobile,
    isAndroid,
    isIOS,
    isWindows,
    isMacOS,
  };
}

/**
 * Hook to detect the current platform and provide platform-specific flags.
 * Detection runs immediately (synchronously) to prevent flash of wrong UI.
 */
export function usePlatform(): PlatformInfo {
  // Initialize with actual detection (not defaults)
  const initialPlatform = useMemo(() => detectPlatform(), []);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(initialPlatform);

  useEffect(() => {
    // Re-run detection on mount (in case SSR had different values)
    setPlatformInfo(detectPlatform());

    // Listen for window resize to handle responsive breakpoints
    const handleResize = () => {
      setPlatformInfo(detectPlatform());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return platformInfo;
}
