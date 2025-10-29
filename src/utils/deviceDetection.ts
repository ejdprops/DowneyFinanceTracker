/**
 * Detect if device is an iPad
 */
export const isIPadDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';

  // Check for iPad in user agent
  const hasIPadUA = /iPad/.test(userAgent);

  // Modern iPads may identify as "Macintosh" with touch support
  // So we check for Mac user agent + touch support + tablet screen size
  const isMacWithTouch = /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  const isTabletSize = window.innerWidth >= 768 && window.innerWidth <= 1366;

  return hasIPadUA || (isMacWithTouch && isTabletSize);
};

/**
 * Detect if the user is on a mobile device (phone, not tablet)
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Exclude iPads from mobile detection
  if (isIPadDevice()) return false;

  // Check for mobile user agents
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';

  // Check for iOS (iPhone/iPod only, not iPad)
  const isIOS = /iPhone|iPod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

  // Check for Android
  const isAndroid = /android/i.test(userAgent);

  // Check for other mobile devices (excluding iPad)
  const isMobileUserAgent = /Mobile|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Only use screen size if we also detect touch capability
  // This prevents desktop browsers in narrow windows from being detected as mobile
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 768; // Changed to < 768 to exclude iPad
  const isSmallTouchDevice = hasTouch && isSmallScreen;

  return isIOS || isAndroid || isMobileUserAgent || isSmallTouchDevice;
};

/**
 * Detect if device is iOS
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
};

/**
 * Detect if device is Android
 */
export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /android/i.test(userAgent);
};
