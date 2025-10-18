/**
 * Detect if the user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for mobile user agents
  const userAgent = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || '';

  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;

  // Check for Android
  const isAndroid = /android/i.test(userAgent);

  // Check for other mobile devices (but exclude iPad from this check as it's handled above)
  const isMobileUserAgent = /Mobile|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Only use screen size if we also detect touch capability
  // This prevents desktop browsers in narrow windows from being detected as mobile
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
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
