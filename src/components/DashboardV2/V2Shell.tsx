// src/components/DashboardV2/V2Shell.tsx
// Shell pro všechny /v2/* stránky. Zůstane namountovaný při přechodu mezi nimi.
// Outlet renderuje aktuální podstránku s animací dle směru navigace.

import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useV2Swipe } from './useV2Swipe';
import { getNavDir, clearNavDir } from './navDirection';
import { applyGridConfig, loadGridConfig } from './gridConfig';

// Načti grid config jednou při mountu shellu
applyGridConfig(loadGridConfig());

const V2Shell: React.FC = () => {
  useV2Swipe(); // aktivní na všech /v2/* stránkách

  const location = useLocation();
  const dir = getNavDir(); // čtení synchronně při renderu

  // Po animaci smaž směr (400 ms = délka CSS animace)
  useEffect(() => {
    if (!dir) return;
    const t = setTimeout(clearNavDir, 400);
    return () => clearTimeout(t);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // key způsobí remount vnitřního divu → spustí CSS animaci
    <div key={location.pathname} className={`v2-page ${dir ? `v2-page--${dir}` : ''}`}>
      <Outlet />
    </div>
  );
};

export default V2Shell;
