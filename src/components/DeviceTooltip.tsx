import React, { useState } from 'react';
import type { TuyaDevice } from '../types';
import styles from '../styles/DeviceTooltip.module.css';

interface DeviceTooltipProps {
  device: TuyaDevice;
  children: React.ReactNode;
}

export const DeviceTooltip: React.FC<DeviceTooltipProps> = ({
  device,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const formatLastUpdate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('cs-CZ');
  };

  const getMainStatus = () => {
    const mainSwitch = device.status?.find(
      (s) =>
        s.code === 'switch_1' || s.code === 'switch' || s.code === 'switch_led'
    );
    return mainSwitch ? (mainSwitch.value ? 'Zapnuto' : 'Vypnuto') : 'N/A';
  };

  const getSensorData = () => {
    const sensors = [];

    const temp = device.status?.find((s) => s.code === 'temp_current');
    if (temp)
      sensors.push({ label: 'Teplota', value: `${temp.value}°C`, icon: '🌡️' });

    const humidity = device.status?.find((s) => s.code === 'humidity_value');
    if (humidity)
      sensors.push({
        label: 'Vlhkost',
        value: `${humidity.value}%`,
        icon: '💧',
      });

    const brightness = device.status?.find((s) => s.code === 'bright_value');
    if (brightness)
      sensors.push({ label: 'Jas', value: `${brightness.value}%`, icon: '☀️' });

    return sensors;
  };

  return (
    <div
      className={styles.tooltipContainer}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <h4 className={styles.deviceName}>
              {device.customName || device.name}
            </h4>
            <span
              className={`${styles.statusBadge} ${
                device.online ? styles.online : styles.offline
              }`}
            >
              {device.online ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className={styles.tooltipContent}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Kategorie:</span>
              <span className={styles.value}>{device.category}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.label}>Stav:</span>
              <span className={styles.value}>{getMainStatus()}</span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.label}>Model:</span>
              <span className={styles.value}>{device.product_name}</span>
            </div>

            {getSensorData().length > 0 && (
              <div className={styles.sensorSection}>
                <div className={styles.sensorTitle}>Senzory:</div>
                {getSensorData().map((sensor, index) => (
                  <div key={index} className={styles.sensorRow}>
                    <span className={styles.sensorIcon}>{sensor.icon}</span>
                    <span className={styles.sensorLabel}>{sensor.label}:</span>
                    <span className={styles.sensorValue}>{sensor.value}</span>
                  </div>
                ))}
              </div>
            )}

            {device.lastUpdated && (
              <div className={styles.timestampRow}>
                <span className={styles.timestamp}>
                  Aktualizováno: {formatLastUpdate(device.lastUpdated)}
                </span>
              </div>
            )}
          </div>

          <div className={styles.tooltipArrow}></div>
        </div>
      )}
    </div>
  );
};

export default DeviceTooltip;
