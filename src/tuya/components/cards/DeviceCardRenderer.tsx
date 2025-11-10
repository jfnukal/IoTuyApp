// src/tuya/components/cards/DeviceCardRenderer.tsx
import React from 'react';
import type { TuyaDevice } from '../../../types';
import { getDeviceCardType } from '../../utils/deviceHelpers';

// Import všech karet
import TempSensorCard from './TempSensorCard';
import HeatingCard from './HeatingCard';
import MultiSwitchCard from './MultiSwitchCard';
import MultiSocketCard from './MultiSocketCard';
import SmartLightCard from './SmartLightCard';
import DoorbellCard from './DoorbellCard';
import BasicCard from './BasicCard';

interface DeviceCardRendererProps {
  device: TuyaDevice;
  onToggle: (deviceId: string) => Promise<void>;
  onControl?: (deviceId: string, commands: { code: string; value: any }[]) => Promise<void>;
  isDebugVisible?: boolean;
}

const DeviceCardRenderer: React.FC<DeviceCardRendererProps> = ({
  device,
  onToggle,
  onControl,
  isDebugVisible = false,
}) => {
  // Zjisti typ karty podle kategorie
  const cardType = getDeviceCardType(device.category);

  // Společné props pro všechny karty
  const commonProps = {
    device,
    onToggle,
    onControl,
    isDebugVisible,
  };

  // Vyber správnou kartu podle typu
  switch (cardType) {
    case 'temp_sensor':
      return <TempSensorCard {...commonProps} />;
    
    case 'heating':
      return <HeatingCard {...commonProps} />;
    
    case 'multi_switch':
      return <MultiSwitchCard {...commonProps} />;
    
    case 'multi_socket':
      return <MultiSocketCard {...commonProps} />;
    
    case 'smart_light':
      return <SmartLightCard {...commonProps} />;
    
    case 'doorbell':
      return <DoorbellCard {...commonProps} />;
    
    case 'motion_sensor':
    case 'door_sensor':
    case 'gateway':
    case 'valve':
    case 'soil_sensor':
    case 'basic':
    default:
      // Pro zatím neimplementované typy použij BasicCard
      return <BasicCard {...commonProps} />;
  }
};

export default DeviceCardRenderer;