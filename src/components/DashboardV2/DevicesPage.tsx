// src/components/DashboardV2/DevicesPage.tsx
// Tuya zařízení ve V2 stylu. Přístupná přes swipe up z /v2 nebo přímou URL /v2/devices.

import React, { lazy, Suspense } from 'react';
import GridConfigPanel from './GridConfigPanel';
import './DashboardV2.css';

// Lazy — Tuya kód se stáhne až při první návštěvě této stránky
const TuyaDeviceList = lazy(() =>
  import('../../tuya').then(m => ({ default: m.TuyaDeviceList }))
);

const DevicesPage: React.FC = () => {
  return (
    <div className="v2-layout v2-devices-layout">

      {/* Jemný hint pro navigaci zpět */}
      <div className="v2-swipe-hint v2-swipe-hint--top">
        ↑ přejeď dolů pro návrat
      </div>

      <div className="v2-devices-content">
        <Suspense fallback={
          <div className="v2-devices-loading">
            <div className="v2-spinner" />
            <span>Načítám zařízení…</span>
          </div>
        }>
          <TuyaDeviceList />
        </Suspense>
      </div>

      {/* Grid config panel — dostupný i na této stránce */}
      <GridConfigPanel />

    </div>
  );
};

export default DevicesPage;
