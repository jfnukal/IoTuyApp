// src/tuya/components/grid/DeviceGrid.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import debounce from 'lodash/debounce';

const ResponsiveGridLayout = WidthProvider(Responsive);

import { useAuth } from '../../../contexts/AuthContext';
import { deviceService } from '../../../services/deviceService';
import type { TuyaDevice } from '../../../types';
import DeviceCardRenderer from '../cards/DeviceCardRenderer';
import { getCardSizeFromW } from '../../config/cardConfig';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DeviceGrid.css';
import '../../../themes/glassmorphism/glass-theme.css';

interface DeviceGridProps {
  devices: TuyaDevice[];
  onToggle: (deviceId: string) => Promise<void>;
  onControl: (
    deviceId: string,
    commands: { code: string; value: any }[]
  ) => Promise<void>;
  isDebugVisible: boolean;
  onCardClick: (device: TuyaDevice) => void;
  isLayoutEditMode: boolean;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({
  devices,
  onToggle,
  onControl,
  isDebugVisible,
  onCardClick,
  isLayoutEditMode,
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
      // Pokud má uložený layout, použij ho
      const savedLayout = (device as any).gridLayout || device.gridLayouts?.all;
      if (savedLayout) {
        return {
          i: device.id,
          x: savedLayout.x,
          y: savedLayout.y,
          w: savedLayout.w,
          h: savedLayout.h,
          minW: 1,
          minH: 2,
        };
      }

      // Výchozí hodnoty — w=3 = velikost 'M', h=4 = 200px při rowHeight=50
      let defaultW = 3;
      let defaultH = 4;

      // Větší karty pro karty s více obsahem
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
        x: col * 3,
        y: row * defaultH,
        w: defaultW,
        h: defaultH,
        minW: 1,
        minH: 2,
      };
    });
  };

  // 🔧 Debounced ukládání — uloží až 500ms po posledním pohybu
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
    }, 500),
    [currentUser, devices]
  );

  const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: [] });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized || layouts.lg.length !== devices.length) {
      setLayouts({ lg: generateInitialLayout() });
      setIsInitialized(true);
    }
  }, [devices.length, isInitialized]);

  // Pomocná funkce pro zjištění šířky karty z aktuálního layoutu
  const getDeviceWidth = (deviceId: string): number => {
    const item = layouts.lg.find((l) => l.i === deviceId);
    return item?.w ?? 3;
  };

  return (
    <div className="theme-glass">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 3 }}
        rowHeight={50}
        onLayoutChange={(_currentLayout, allLayouts) => {
          if (allLayouts.lg) {
            setLayouts({ lg: allLayouts.lg });
            handleLayoutSave(allLayouts.lg);
          }
        }}
        isDraggable={isLayoutEditMode}
        isResizable={isLayoutEditMode}
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
              cardSize={getCardSizeFromW(getDeviceWidth(device.id))}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};
