// src/routes.tsx
import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

// 🚀 LAZY IMPORTS - Optimalizace výkonu (Code Splitting)
// Komponenty se stáhnou až ve chvíli, kdy na ně uživatel klikne/přejde.

// Hlavní Dashboard
const DashboardLayout = lazy(() => import('./components/Dashboard/DashboardLayout'));

// Dashboard V2 — shell + podstránky
const V2Shell     = lazy(() => import('./components/DashboardV2/V2Shell'));
const DashboardV2 = lazy(() => import('./components/DashboardV2/DashboardV2'));
const DevicesPage = lazy(() => import('./components/DashboardV2/DevicesPage'));
const MorePage    = lazy(() => import('./components/DashboardV2/MorePage'));

// Nastavení
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'));

// Tuya a Půdorys
const FloorPlanPage = lazy(() => import('./tuya/components/visualization/FloorPlanPage'));

// ⚠️ Speciální Lazy load pro "Named Export" (protože v originále bylo { TuyaDeviceList })
const TuyaDeviceList = lazy(() => 
  import('./tuya').then(module => ({ default: module.TuyaDeviceList }))
);

interface AppRoutesProps {
  familyMemberId: string | null;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ familyMemberId }) => {
  const { currentUser } = useAuth();

  // Pokud uživatel není přihlášen, zobrazíme Login (ten necháváme načtený hned)
  if (!currentUser) {
    return <Login />;
  }

  // Poznámka: Celé tyto Routes jsou v App.tsx obaleny v <Suspense>,
  // takže se při přepínání automaticky zobrazí hlavní PageLoader.
  return (
    <Routes>
      {/* 🏠 Hlavní Dashboard */}
      <Route
        path="/"
        element={
          <DashboardLayout
            familyMemberId={familyMemberId}
            onNavigateToSettings={() => {
              // Zde by mělo být volání navigace, pokud to Dashboard vyžaduje
              console.log('Navigate to settings...');
            }}
          />
        }
      />

      {/* ⚙️ Nastavení */}
      <Route 
        path="/settings" 
        element={<SettingsPage />} 
      />

      {/* 📱 Tuya zařízení */}
      <Route 
        path="/tuya" 
        element={<TuyaDeviceList />} 
      />

      {/* 🗺️ Půdorys */}
      <Route 
        path="/floorplan" 
        element={<FloorPlanPage />} 
      />

      {/* 🏠 Dashboard V2 — nested routes se swipe navigací */}
      <Route path="/v2" element={<V2Shell />}>
        <Route index          element={<DashboardV2 />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="more"    element={<MorePage />} />
      </Route>

      {/* Fallback - přesměrování na home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};