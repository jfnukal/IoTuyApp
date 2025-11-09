// src/tuya/components/grid/DeviceGrid.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import debounce from 'lodash/debounce'; 

const ResponsiveGridLayout = WidthProvider(Responsive);

import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';
import type { TuyaDevice } from '../../../types';
import DeviceCardRenderer from '../cards/DeviceCardRenderer'; 

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DeviceGrid.css';


interface DeviceGridProps {
  devices: TuyaDevice[];
  onToggle: (deviceId: string) => Promise<void>; 
  onControl: (deviceId: string, commands: { code: string; value: any }[]) => Promise<void>;
  isDebugVisible: boolean;
  // --- ZMĚNA ZDE ---
  onCardClick: (device: TuyaDevice) => void; // Přijímá celý objekt
  isLayoutEditMode: boolean; // Přijímá stav režimu úprav
  // --- KONEC ZMĚNY ---
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({
  devices,
  onToggle,
  onControl,
  isDebugVisible,
  // --- ZMĚNA ZDE ---
  onCardClick,
  isLayoutEditMode,
  // --- KONEC ZMĚNY ---
}) => {
  const { currentUser } = useAuth();

  // HACK pro F12 resize bug
  const [, setForceRender] = useState(0);
  useEffect(() => {
    const handleResize = () => setForceRender((c) => c + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const generateInitialLayout = (): Layout[] => {
    return devices.map((device, index) => {
      const grid = device.gridLayout;
      let defaultW = 1;
      let defaultH = 1; 
      if (device.category === 'light') defaultH = 2;
      if (device.category === 'heating') defaultH = 2;
      if (device.category === 'multi_switch') defaultH = 2;
      if (device.category === 'multi_socket') defaultH = 2;
      return {
        i: device.id,
        x: grid?.x ?? (index % 4),
        y: grid?.y ?? Math.floor(index / 4),
        w: grid?.w ?? defaultW,
        h: grid?.h ?? defaultH,
      };
    });
  };

// 🔧 Debounced ukládání - uloží až 500ms po posledním pohybu
const handleLayoutSave = useCallback(
  debounce((newLayout: Layout[]) => {
    if (!currentUser || devices.length === 0) return;
    
    console.log('💾 Ukládám layout do Firestore...'); // Debug
    
    const batch = firestoreService.getWriteBatch();
    newLayout.forEach(item => {
      const deviceId = item.i;
      const newGridSettings = { x: item.x, y: item.y, w: item.w, h: item.h };
      firestoreService.updateDevicePartial(
        batch, 
        currentUser!.uid, 
        deviceId, 
        { 'cardSettings.gridLayout': newGridSettings }
      );
    });
    
    batch.commit()
      .then(() => console.log('✅ Layout uložen'))
      .catch(err => {
        console.error("❌ Chyba při ukládání layoutu:", err);
      });
  }, 500), // ← Čeká 500ms po posledním pohybu
  [currentUser, devices] // ← Závislosti
);

  const layouts = {
    lg: generateInitialLayout(),
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 }}
      rowHeight={150}
      onLayoutChange={(_currentLayout, allLayouts) => {
        if (allLayouts.lg) {
          handleLayoutSave(allLayouts.lg);
        }
      }}
      // --- ZMĚNA ZDE ---
      // Povolit přetahování pouze v režimu úprav
      isDraggable={isLayoutEditMode}
      isResizable={isLayoutEditMode}
      // --- KONEC ZMĚNY ---
      useCSSTransforms={true}
      preventCollision={false}
      compactType="vertical"
      measureBeforeMount={false}
    >
      {devices.map(device => (
        // --- ZMĚNA ZDE ---
        <div
          key={device.id}
          onClick={() => onCardClick(device)} // Posíláme celý objekt
          className={isLayoutEditMode ? 'grid-item-draggable' : 'grid-item-clickable'}
        >
        {/* --- KONEC ZMĚNY --- */}
          <DeviceCardRenderer
            device={device}
            onToggle={onToggle}
            onControl={onControl}
            isDebugVisible={isDebugVisible}
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
