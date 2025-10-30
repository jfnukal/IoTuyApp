// src/routes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import { lazy, Suspense } from 'react';
import { TuyaDeviceList } from './tuya';
//

// 🚀 Lazy loading pro SettingsPage - načte se až když uživatel otevře nastavení
const SettingsPage = lazy(() => import('./components/Settings/SettingsPage'));
import DashboardLayout from './components/Dashboard/DashboardLayout';

interface AppRoutesProps {
  familyMemberId: string | null;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ familyMemberId }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DashboardLayout
            familyMemberId={familyMemberId}
            onNavigateToSettings={() => {
              console.log('Navigate to settings...');
            }}
          />
        }
      />
      <Route 
        path="/settings" 
        element={
          <Suspense fallback={
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100vh',
              fontSize: '2rem'
            }}>
              <div>⚙️ Načítám nastavení...</div>
            </div>
          }>
            <SettingsPage />
          </Suspense>
        } 
      />
      {/* 📱 Tuya zařízení */}
        <Route 
          path="/tuya" 
          element={<TuyaDeviceList />} 
        />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};