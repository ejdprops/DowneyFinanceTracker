/**
 * Detect if the user is on a mobile device
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for mobile user agents
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

  // Check for Android
  const isAndroid = /android/i.test(userAgent);

  // Check for other mobile devices
  const isMobile = /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Also check screen size as a fallback
  const isSmallScreen = window.innerWidth <= 768;

  return isIOS || isAndroid || isMobile || isSmallScreen;
};

/**
 * Detect if device is iOS
 */
export const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
};

/**
 * Detect if device is Android
 */
export const isAndroidDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.vendor;
  return /android/i.test(userAgent);
};
