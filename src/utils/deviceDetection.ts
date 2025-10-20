// src/utils/deviceDetection.ts
export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // iPad detekce
  const isIpad =
    /ipad/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Android tablet detekce
  const isAndroidTablet =
    /android/.test(userAgent) && !/mobile/.test(userAgent);

  // Touch zařízení se širokou obrazovkou (768px - 1280px)
  const isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasTabletWidth = width >= 768 && width <= 1280;

  // ✅ NOVÉ: Pokud je šířka > 1024px a je to touch, považuj za tablet
  const isWideTablet = width > 1024 && width <= 1920 && isTouchDevice;

  return (
    isIpad ||
    isAndroidTablet ||
    (isTouchDevice && hasTabletWidth) ||
    isWideTablet
  );
};

export const isMobile = (): boolean => {
  const width = window.innerWidth;

  // Mobilní zařízení = šířka < 768px NEBO má v User Agent "mobile"
  return (
    width < 768 ||
    (/mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(
      navigator.userAgent.toLowerCase()
    ) &&
      !isTablet())
  );
};

export const isDesktop = (): boolean => {
  return !isMobile() && !isTablet();
};
