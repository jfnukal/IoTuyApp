// src/utils/deviceDetection.ts
export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIpad = /ipad/.test(userAgent);
  const isAndroidTablet = /android/.test(userAgent) && !/mobile/.test(userAgent);
  
  // Detekce podle velikosti obrazovky (tablet má typicky 768px+)
  const hasTabletScreen = window.innerWidth >= 768 && window.innerWidth <= 1024;
  
  // Detekce touch + velká obrazovka
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return (isIpad || isAndroidTablet || (isTouchDevice && hasTabletScreen));
};

export const isMobile = (): boolean => {
  return /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(
    navigator.userAgent.toLowerCase()
  ) && !isTablet();
};

export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};
