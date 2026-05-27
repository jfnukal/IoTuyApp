// src/tuya/components/cards/GlassCard.tsx
// ============================================================
// GLASS CARD v3 — Responzivní obsah řízený cardConfig
// ============================================================
// cardSize (XS/S/M/L) → CONTENT_VISIBILITY → co zobrazit
// cardSize (XS/S/M/L) → FONT_SIZES → jak velké
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import type { TuyaDevice } from '../../../types';
import type { CardSize } from '../../config/cardConfig';
import { CONTENT_VISIBILITY, FONT_SIZES } from '../../config/cardConfig';
import {
  getStatusValue,
  getDeviceCardType,
  getBattery,
  getCategoryLabel,
  getTemperature,
  getHumidity,
} from '../../utils/deviceHelpers';

interface GlassCardProps {
  device: TuyaDevice;
  onToggle?: (deviceId: string) => Promise<void>;
  onControl?: (
    deviceId: string,
    commands: { code: string; value: any }[]
  ) => Promise<void>;
  onHeaderClick?: () => void;
  cardSize?: CardSize;
}

// --- CONSTANTS ---
const TYPE_ICONS: Record<string, string> = {
  heating: '🔥', boiler: '🔥', smart_light: '💡', multi_switch: '💡',
  multi_socket: '🔌', single_socket: '🔌', temp_sensor: '🌡️',
  motion_sensor: '👁️', door_sensor: '🚪', valve: '💧',
  doorbell: '🔔', ptz_camera: '📹', gateway: '🌐', soil_sensor: '🌱',
  water_sensor: '💧', camera: '📹', sensor: '📡', remote: '🎮',
  ir_remote: '📺', appliance: '🍳', battery: '🔋', lock: '🔒',
};

const TYPE_LABELS: Record<string, string> = {
  heating: 'Topení', boiler: 'Bojler', smart_light: 'Světlo',
  multi_switch: 'Vypínač', multi_socket: 'Zásuvka', single_socket: 'Zásuvka',
  temp_sensor: 'Senzor', motion_sensor: 'PIR', door_sensor: 'Kontakt',
  valve: 'Ventil', doorbell: 'Zvonek', ptz_camera: 'Kamera',
  gateway: 'Gateway', soil_sensor: 'Půdní senzor', water_sensor: 'Únik vody',
  camera: 'Kamera', sensor: 'Čidlo', remote: 'Ovladač',
  ir_remote: 'IR ovladač', appliance: 'Spotřebič', battery: 'Baterie', lock: 'Zámek',
};

const GLOW_MAP: Record<string, string> = {
  heating: 'rgba(255,100,50,0.2)',
  boiler: 'rgba(255,100,50,0.2)',
  smart_light: 'rgba(255,170,0,0.2)',
  multi_switch: 'rgba(0,212,170,0.15)',
  multi_socket: 'rgba(0,212,170,0.15)',
  temp_sensor: 'rgba(59,130,246,0.15)',
  motion_sensor: 'rgba(0,212,170,0.12)',
  door_sensor: 'rgba(167,139,250,0.12)',
  gateway: 'rgba(120,120,140,0.1)',
  valve: 'rgba(59,130,246,0.15)',
};

const GlassCard: React.FC<GlassCardProps> = ({
  device,
  onToggle,
  onControl,
  onHeaderClick,
  cardSize = 'M',
}) => {
  // ✅ BUG FIX: both loadingSwitches and setLoadingSwitches exposed
  const [loadingSwitches, setLoadingSwitches] = useState<string[]>([]);

  // Config pro aktuální velikost
  const vis = CONTENT_VISIBILITY[cardSize];
  const fonts = FONT_SIZES[cardSize];
  const isXS = cardSize === 'XS';

  // Device data
  const status = device.status || [];
  const cardType = getDeviceCardType(device.category, device.product_id);
  const displayName = device.customName || device.name;

  const temp = getTemperature(status);
  const humidity = getHumidity(status);
  const tempSetRaw = getStatusValue(status, 'temp_set');
  const tempSet = tempSetRaw !== undefined ? tempSetRaw / 10 : undefined;
  const battery = getBattery(status);
  const power = getStatusValue(status, 'cur_power');
  const mode = String(getStatusValue(status, 'mode') || '');
  const isOn =
    getStatusValue(status, 'switch') === true ||
    getStatusValue(status, 'switch_led') === true;
  const brightVal = getStatusValue(status, 'bright_value_v2') ?? 500;
  const contactOpen = getStatusValue(status, 'doorcontact_state') === true;
  const hasMotion = getStatusValue(status, 'pir_state') === 'pir';
  const waterAlarm = getStatusValue(status, 'watersensor_state') === 'alarm';

  const switches = useMemo(
    () =>
      [
        {
          code: 'switch_1',
          val:
            getStatusValue(status, 'switch_1') ??
            getStatusValue(status, 'switch'),
          label: '1',
        },
        {
          code: 'switch_2',
          val: getStatusValue(status, 'switch_2'),
          label: '2',
        },
        {
          code: 'switch_3',
          val: getStatusValue(status, 'switch_3'),
          label: '3',
        },
        {
          code: 'switch_4',
          val: getStatusValue(status, 'switch_4'),
          label: '4',
        },
        {
          code: 'switch_usb1',
          val: getStatusValue(status, 'switch_usb1'),
          label: 'USB',
        },
      ].filter((s) => s.val !== undefined),
    [status]
  );

  const isAnyActive = isOn || switches.some((s) => s.val === true);
  const typeIcon =
    TYPE_ICONS[cardType] || (device.category === 'sj' ? '💧' : '⚙️');
  const typeLabel =
    TYPE_LABELS[cardType] ||
    (device.category === 'sj'
      ? 'Únik vody'
      : getCategoryLabel(device.category));
  const glowColor =
    isAnyActive || temp !== undefined
      ? GLOW_MAP[cardType] || 'transparent'
      : 'transparent';

  // --- HANDLERS ---
  const handleSwitchClick = useCallback(
    async (e: React.MouseEvent, code: string, currentVal: boolean) => {
      e.stopPropagation();
      if (!device.online) return;
      setLoadingSwitches((prev) => [...prev, code]);
      try {
        if (onControl)
          await onControl(device.id, [{ code, value: !currentVal }]);
        else if (onToggle) await onToggle(device.id);
      } finally {
        setLoadingSwitches((prev) => prev.filter((c) => c !== code));
      }
    },
    [device.id, device.online, onControl, onToggle]
  );

  const lastUpdate = device.lastUpdated
    ? new Date(device.lastUpdated).toLocaleTimeString('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // ============================================================
  // RENDER BODY
  // ============================================================
  const renderContent = () => {
    // --- HEATING s teplotou ---
    if (
      (cardType === 'heating' || cardType === 'boiler') &&
      temp !== undefined
    ) {
      return (
        <div style={{ textAlign: 'center' }}>
          {vis.mainValue && (
            <div
              style={{
                fontSize: fonts.mainValue,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              {temp.toFixed(1)}
              <span
                style={{
                  fontSize: fonts.unitSuffix,
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                }}
              >
                °
              </span>
            </div>
          )}
          {vis.secondaryValue && (tempSet !== undefined || mode) && (
            <div
              style={{
                fontSize: fonts.typeLabel,
                color: 'var(--text-secondary)',
                marginTop: 6,
                display: 'flex',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              {tempSet !== undefined && (
                <span>
                  cíl{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {tempSet.toFixed(1)}°
                  </strong>
                </span>
              )}
              {vis.modeLabel && mode && (
                <span
                  style={{
                    color: '#ff9500',
                    fontWeight: 600,
                    textTransform: 'capitalize' as const,
                  }}
                >
                  {mode}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    // --- HEATING bez teploty (on/off) ---
    if (
      (cardType === 'heating' || cardType === 'boiler') &&
      temp === undefined
    ) {
      return (
        <div style={{ textAlign: 'center' }}>
          {vis.mainValue && (
            <div style={{ fontSize: fonts.statusIcon }}>
              {isOn ? '🔥' : '❄️'}
            </div>
          )}
          {vis.modeLabel && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: isOn ? '#00d4aa' : 'var(--text-secondary)',
                marginTop: 6,
              }}
            >
              {isOn ? 'ZAPNUTO' : 'VYPNUTO'}
            </div>
          )}
        </div>
      );
    }

    // --- SENZOR (teplota + vlhkost) ---
    if (temp !== undefined) {
      return (
        <div
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: fonts.mainValue,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {temp.toFixed(1)}
              <span
                style={{
                  fontSize: fonts.unitSuffix,
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                }}
              >
                °
              </span>
            </div>
            {!isXS && (
              <div
                style={{
                  fontSize: fonts.typeLabel,
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                }}
              >
                teplota
              </div>
            )}
          </div>
          {vis.secondaryValue && humidity !== undefined && (
            <>
              <div
                style={{
                  width: 1,
                  height: 30,
                  background: 'var(--card-divider, rgba(255,255,255,0.08))',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: fonts.mainValue,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {Math.round(humidity)}
                  <span
                    style={{
                      fontSize: fonts.unitSuffix,
                      fontWeight: 400,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    %
                  </span>
                </div>
                <div
                  style={{
                    fontSize: fonts.typeLabel,
                    color: 'var(--text-secondary)',
                    marginTop: 4,
                  }}
                >
                  vlhkost
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // --- KONTAKT ---
    if (device.category === 'mcs') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: fonts.statusIcon }}>
            {contactOpen ? '🔓' : '🔒'}
          </div>
          {!isXS && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
                color: contactOpen ? '#ff6b6b' : '#00d4aa',
              }}
            >
              {contactOpen ? 'Otevřeno' : 'Zavřeno'}
            </div>
          )}
        </div>
      );
    }

    // --- POHYB ---
    if (device.category === 'pir') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: fonts.statusIcon }}>
            {hasMotion ? '🏃' : '🧘'}
          </div>
          {!isXS && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
                color: hasMotion ? '#ff6b6b' : '#00d4aa',
              }}
            >
              {hasMotion ? 'POHYB!' : 'Klid'}
            </div>
          )}
        </div>
      );
    }

    // --- ÚNIK VODY ---
    if (device.category === 'sj') {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: fonts.statusIcon }}>
            {waterAlarm ? '🚨' : '💧'}
          </div>
          {!isXS && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginTop: 4,
                color: waterAlarm ? '#ff6b6b' : '#00d4aa',
              }}
            >
              {waterAlarm ? 'ZATOPENO!' : 'V pořádku'}
            </div>
          )}
        </div>
      );
    }

    // --- SVĚTLO ---
    if (cardType === 'smart_light') {
      const brightness = Math.round((brightVal / 1000) * 100);
      return (
        <div style={{ textAlign: 'center', width: '100%' }}>
          {vis.mainValue && (
            <div
              style={{
                fontSize: fonts.mainValue,
                fontWeight: 800,
                color: isOn ? '#ff9500' : 'var(--text-secondary)',
              }}
            >
              {brightness}
              <span style={{ fontSize: fonts.unitSuffix, fontWeight: 400 }}>
                %
              </span>
            </div>
          )}
          {vis.slider && (
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'var(--input-bg)',
                margin: '10px 12px 0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${brightness}%`,
                  background: 'linear-gradient(90deg, #ff9500, #fbbf24)',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // --- SWITCHES ---
    if (switches.length > 0 && vis.switchList) {
      // Jeden switch → power button
      if (switches.length === 1) {
        const sw = switches[0];
        const isLoading = loadingSwitches.includes(sw.code);
        return (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={(e) => handleSwitchClick(e, sw.code, sw.val as boolean)}
              disabled={!device.online || isLoading}
              style={{
                width: isXS ? 36 : 56,
                height: isXS ? 36 : 56,
                borderRadius: '50%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: sw.val ? 'rgba(0,212,170,0.2)' : 'var(--input-bg)',
                color: sw.val ? '#00d4aa' : 'var(--text-secondary)',
                boxShadow: sw.val ? '0 0 20px rgba(0,212,170,0.3)' : 'none',
                transition: 'all 0.3s',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              <svg
                width={isXS ? 18 : 24}
                height={isXS ? 18 : 24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </button>
            {!isXS && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: sw.val ? '#00d4aa' : 'var(--text-secondary)',
                }}
              >
                {sw.val ? 'ZAPNUTO' : 'VYPNUTO'}
              </div>
            )}
          </div>
        );
      }

      // Multi-switch → toggle list
      const maxVisible = cardSize === 'S' ? 2 : switches.length;
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            width: '100%',
          }}
        >
          {switches.slice(0, maxVisible).map((sw) => {
            const isLoading = loadingSwitches.includes(sw.code);
            return (
              <div
                key={sw.code}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  background: sw.val ? 'rgba(0,212,170,0.08)' : 'transparent',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>
                  {sw.label === 'USB' ? '⚡ USB' : sw.label}
                </span>
                <div
                  onClick={(e: React.MouseEvent) =>
                    handleSwitchClick(e, sw.code, sw.val as boolean)
                  }
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    position: 'relative',
                    cursor: isLoading ? 'wait' : 'pointer',
                    background: sw.val
                      ? '#00d4aa'
                      : 'var(--switch-bg-off, rgba(255,255,255,0.1))',
                    transition: 'background 0.25s',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 2,
                      left: sw.val ? 18 : 2,
                      transition: 'left 0.25s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // --- SWITCH (bez switchList visibility) → jen power ikona ---
    if (switches.length > 0 && !vis.switchList) {
      const anyOn = switches.some((s) => s.val === true);
      return (
        <div style={{ textAlign: 'center', fontSize: fonts.statusIcon }}>
          {anyOn ? '🟢' : '⚫'}
        </div>
      );
    }

    // --- FALLBACK ---
    return (
      <div
        style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: 13,
        }}
      >
        {device.online ? 'Připojeno' : 'Offline'}
      </div>
    );
  };

  // ============================================================
  // RENDER CARD
  // ============================================================
  return (
    <div
      className="glass-card"
      onClick={onHeaderClick}
      style={{
        padding: isXS ? 10 : 16,
        opacity: device.online ? 1 : 0.5,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
      }}
    >
      {/* Glow */}
      {device.online && glowColor !== 'transparent' && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            pointerEvents: 'none',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: isXS ? 4 : 8,
        }}
      >
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {vis.typeLabel && (
            <div
              style={{
                fontSize: fonts.typeLabel,
                color: 'var(--text-secondary)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {vis.typeIcon && typeIcon} {typeLabel}
            </div>
          )}
          <div
            style={{
              fontSize: fonts.name,
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: isXS ? 0 : 2,
            }}
          >
            {isXS ? `${typeIcon} ${displayName}` : displayName}
          </div>
        </div>
        {vis.onlineDot && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: isXS ? 2 : 4,
              background: device.online ? '#00d4aa' : '#666',
              boxShadow: device.online ? '0 0 8px #00d4aa' : 'none',
            }}
          />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {renderContent()}
      </div>

      {/* Footer */}
      {vis.footer && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: fonts.footer,
            color: 'var(--text-tertiary, rgba(255,255,255,0.3))',
            marginTop: 6,
          }}
        >
          <span>
            {battery !== undefined
              ? `🔋 ${battery}%`
              : power !== undefined
              ? `⚡ ${(power / 10).toFixed(1)}W`
              : device.online
              ? '● Online'
              : '○ Offline'}
          </span>
          {lastUpdate && <span>{lastUpdate}</span>}
        </div>
      )}
    </div>
  );
};

export default React.memo(GlassCard);
