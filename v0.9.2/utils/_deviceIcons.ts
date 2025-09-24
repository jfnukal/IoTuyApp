import type { TuyaDevice } from '../types';

export const getDeviceIcon = (device: TuyaDevice): string => {
  const categoryIcons: Record<string, string> = {
    switch: '🔌',
    light: '💡',
    sensor: '📱',
    garden: '🌱',
    thermostat: '🌡️',
    camera: '📷',
    assistant: '🏠',
    default: '📱',
  };

  return categoryIcons[device.category] || categoryIcons.default;
};
