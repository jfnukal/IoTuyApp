// src/tuya/components/grid/DeviceGrid.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import debounce from 'lodash/debounce';

const ResponsiveGridLayout = WidthProvider(Responsive);

import { useAuth } from '../../../contexts/AuthContext';
import { deviceService } from '../../../services/deviceService';
import type { TuyaDevice } from '../../../types';
import DeviceCardRenderer from '../cards/DeviceCardRenderer';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DeviceGrid.css';

interface DeviceGridProps {
  devices: TuyaDevice[];
  onToggle: (deviceId: string) => Promise<void>;
  onControl: (
    deviceId: string,
    commands: { code: string; value: any }[]
  ) => Promise<void>;
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
      // ✅ Pokud má uložený layout, použij ho (už přemigrovaný)
      if (device.gridLayout) {
        return {
          i: device.id,
          x: device.gridLayout.x,
          y: device.gridLayout.y,
          w: device.gridLayout.w,
          h: device.gridLayout.h,
          minW: 2,  // Minimální šířka (2 * ~8% = 16% obrazovky)
          minH: 2,  // Minimální výška (2 * 50px = 100px)
        };
      }
  
      // ⚙️ Výchozí hodnoty pro NOVÝ grid (cols=12, rowHeight=50)
      // Šířka: 3 = 25% obrazovky (3/12)
      // Výška: 6 = 300px (6 * 50px)
      let defaultW = 3;
      let defaultH = 4; // 200px - základní
  
      // Větší karty podle kategorie
      if (device.category === 'wk') defaultH = 6;   // heating - 300px
      if (device.category === 'wkcz') defaultH = 6; // bojler - 300px
      if (device.category === 'dj') defaultH = 5;   // light - 250px
      if (device.category === 'kg') defaultH = 5;   // multi_switch - 250px
      if (device.category === 'cz') defaultH = 5;   // socket - 250px
      if (device.category === 'pc') defaultH = 5;   // socket - 250px
      if (device.category === 'wsdcg') defaultH = 4; // temp sensor - 200px
  
      // Pozice: 4 karty na řádek (každá w=3, celkem 12)
      const cardsPerRow = 4;
      const col = index % cardsPerRow;
      const row = Math.floor(index / cardsPerRow);
  
      return {
        i: device.id,
        x: col * 3,           // 0, 3, 6, 9
        y: row * defaultH,    // Výška závisí na předchozích kartách
        w: defaultW,
        h: defaultH,
        minW: 2,
        minH: 2,
      };
    });
  };

  // 🔧 Debounced ukládání - uloží až 500ms po posledním pohybu
  const handleLayoutSave = useCallback(
    debounce((newLayout: Layout[]) => {
      if (!currentUser || devices.length === 0) return;

      const batch = deviceService.getWriteBatch();
      newLayout.forEach((item) => {
        const deviceId = item.i;
        const newGridSettings = { x: item.x, y: item.y, w: item.w, h: item.h };
        deviceService.updateDevicePartial(
          batch,
          currentUser!.uid,
          deviceId,
          { gridLayout: newGridSettings }
        );
      });

      batch
        .commit()
        .then(() => console.log('✅ Layout uložen'))
        .catch((err) => {
          console.error('❌ Chyba při ukládání layoutu:', err);
        });
    }, 500), // ← Čeká 500ms po posledním pohybu
    [currentUser, devices] // ← Závislosti
  );

  const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: [] });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Generuj layout jen při prvním načtení nebo když se změní POČET zařízení
    if (!isInitialized || layouts.lg.length !== devices.length) {
      setLayouts({ lg: generateInitialLayout() });
      setIsInitialized(true);
    }
  }, [devices.length, isInitialized]);

  return (
<ResponsiveGridLayout
  className="layout"
  layouts={layouts}
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
  cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 3 }}
  rowHeight={50}
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
      {devices.map((device) => (
        <div
          key={device.id}
          className={
            isLayoutEditMode ? 'grid-item-draggable' : 'grid-item-clickable'
          }
        >
          <DeviceCardRenderer
            device={device}
            onToggle={onToggle}
            onControl={onControl}
            isDebugVisible={isDebugVisible}
            onHeaderClick={
              isLayoutEditMode ? undefined : () => onCardClick(device)
            }
          />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
