import { useState, useEffect } from 'react';

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
 * Hook to detect the current platform and provide platform-specific flags.
 * This is useful for conditionally rendering UI elements or enabling features
 * that are only available on certain platforms.
 */
export function usePlatform(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: 'unknown',
    isMobile: false,
    isDesktop: true,
    isAndroid: false,
    isIOS: false,
    isWindows: false,
    isMacOS: false,
  });

  useEffect(() => {
    const checkPlatform = () => {
      const ua = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;

      let platform: Platform = 'unknown';
      let isMobile = false;
      let isAndroid = false;
      let isIOS = false;
      let isWindows = false;
      let isMacOS = false;

      // Check for mobile platforms via UA
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

      // Fallback: If width < 768px, treat as mobile (responsive limits)
      if (width < 768 && !isMobile) {
        isMobile = true;
      }

      setPlatformInfo({
        platform,
        isMobile,
        isDesktop: !isMobile,
        isAndroid,
        isIOS,
        isWindows,
        isMacOS,
      });
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  return platformInfo;
}
