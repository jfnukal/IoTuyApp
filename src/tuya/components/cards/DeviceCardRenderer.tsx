// src/tuya/components/cards/DeviceCardRenderer.tsx
import React from 'react';
import type { TuyaDevice } from '../../../types';
import { getDeviceCardType } from '../../utils/deviceHelpers';
import type { CardSize } from '../../config/cardConfig';

// Specializované karty (zachovány pro plnou funkčnost)
import HeatingCard from './HeatingCard';
import DoorbellCard from './DoorbellCard';
import PTZCameraCard from './PTZCameraCard';

// Nová glassmorphism karta pro všechny ostatní typy
import GlassCard from './GlassCard';

interface DeviceCardRendererProps {
  device: TuyaDevice;
  onToggle: (deviceId: string) => Promise<void>;
  onControl?: (
    deviceId: string,
    commands: { code: string; value: any }[]
  ) => Promise<void>;
  isDebugVisible?: boolean;
  onHeaderClick?: () => void;
  cardSize?: CardSize;
}

const DeviceCardRenderer: React.FC<DeviceCardRendererProps> = ({
  device,
  onToggle,
  onControl,
  isDebugVisible = false,
  onHeaderClick,
  cardSize = 'M',
}) => {
  const cardType = getDeviceCardType(device.category, device.product_id);

  // Specializované karty zachovány pro plnou funkčnost
  if (cardType === 'heating') {
    return (
      <HeatingCard
        device={device}
        onToggle={onToggle}
        onControl={onControl}
        isDebugVisible={isDebugVisible}
        onHeaderClick={onHeaderClick}
      />
    );
  }

  if (cardType === 'doorbell') {
    return (
      <DoorbellCard
        device={device}
        onToggle={onToggle}
        onControl={onControl}
        isDebugVisible={isDebugVisible}
        onHeaderClick={onHeaderClick}
      />
    );
  }

  if (cardType === 'ptz_camera') {
    return (
      <PTZCameraCard
        device={device}
        onToggle={onToggle}
        onControl={onControl}
        isDebugVisible={isDebugVisible}
        onHeaderClick={onHeaderClick}
      />
    );
  }

  // Všechny ostatní typy → GlassCard
  // (temp_sensor, multi_switch, multi_socket, smart_light, motion_sensor,
  //  door_sensor, gateway, valve, soil_sensor, basic, ...)
  return (
    <GlassCard
      device={device}
      onToggle={onToggle}
      onControl={onControl}
      onHeaderClick={onHeaderClick}
      cardSize={cardSize}
    />
  );
};

export default React.memo(DeviceCardRenderer);
