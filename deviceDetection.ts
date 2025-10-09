import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint: number = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Počáteční kontrola
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkIfMobile();

    // Nastavení listeneru pro resize
    const handleResize = () => {
      checkIfMobile();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
};