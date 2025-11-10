// src/tuya/components/cards/DoorbellCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import './DoorbellCard.css';
import type { DeviceCardProps } from '../../../types';
import { getStatusValue } from '../../utils/deviceHelpers';
import DebugSection from './DebugSection';
import { tuyaService } from '../../services/tuyaService';

// Definice HLS.js typu
declare global {
  interface Window {
    Hls: any;
  }
}

const DoorbellCard: React.FC<
  DeviceCardProps & { isDebugVisible?: boolean }
> = ({ device, onControl: _onControl, isDebugVisible = false }) => {
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [showStream, setShowStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // 🎨 Zjisti nastavení karty
  const cardSize = device.cardSettings?.size || 'medium';
  const cardLayout = device.cardSettings?.layout || 'default';

  // Získej status hodnoty
  const doorbell_active = getStatusValue(device.status, 'doorbell_active');
  const battery = getStatusValue(device.status, 'battery_percentage');
  const snapshot_url = getStatusValue(device.status, 'snapshot_url');

  // 🎬 HLS Stream Handler
  useEffect(() => {
    if (!streamUrl || !videoRef.current || !showStream) return;

    const video = videoRef.current;
    const Hls = window.Hls;

    console.log('🎬 Inicializuji přehrávání:', streamUrl);

    // Zničení starého HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Detekce typu streamu
    const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('hls');
    const isTestMode =
      streamUrl.includes('test-streams.mux.dev') ||
      streamUrl.includes('gtv-videos-bucket');

    if (isTestMode) {
      // 🧪 TEST MODE - klasické MP4
      console.log('🧪 TEST MODE: Přehrávám MP4 video');
      video.src = streamUrl;
      video.play().catch((err) => {
        console.error('Chyba přehrávání:', err);
        setStreamError('Nelze přehrát video');
      });
    } else if (isHLS) {
      // 🔴 PRODUCTION - HLS stream
      if (Hls && Hls.isSupported()) {
        console.log('✅ HLS.js je podporováno, inicializuji...');

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest načten, spouštím přehrávání...');
          video.play().catch((err) => {
            console.error('Chyba přehrávání:', err);
            setStreamError('Nelze spustit přehrávání');
          });
        });

        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          console.error('❌ HLS Error:', data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error, trying recovery...');
                hls.startLoad();
                setStreamError('Chyba sítě, zkouším obnovit...');
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error, trying recovery...');
                hls.recoverMediaError();
                setStreamError('Chyba média, zkouším obnovit...');
                break;
              default:
                console.error('Fatal error, destroying HLS instance');
                hls.destroy();
                setStreamError('Kritická chyba přehrávání');
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // 🍎 Safari - nativní HLS podpora
        console.log('🍎 Safari: Používám nativní HLS');
        video.src = streamUrl;
        video.play().catch((err) => {
          console.error('Chyba přehrávání:', err);
          setStreamError('Nelze přehrát stream');
        });
      } else {
        console.error('❌ HLS není podporováno v tomto prohlížeči');
        setStreamError('HLS není podporováno v tomto prohlížeči');
      }
    } else {
      // 📹 Klasické video (MP4/WebM)
      console.log('📹 Přehrávám klasické video');
      video.src = streamUrl;
      video.play().catch((err) => {
        console.error('Chyba přehrávání:', err);
        setStreamError('Nelze přehrát video');
      });
    }

    // Cleanup při unmount
    return () => {
      if (hlsRef.current) {
        console.log('🧹 Čistím HLS instance');
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, showStream]);

  // Funkce pro načtení live streamu
  const handleLoadStream = async () => {
    if (!device.online) return;

    setIsLoadingStream(true);
    setStreamError(null);

    try {
      console.log('📡 Načítám stream pro zařízení:', device.id);
      const stream = await tuyaService.getDoorbellStream(device.id, 'hls');

      console.log('✅ Stream získán:', stream);
      setStreamUrl(stream.url);
      setShowStream(true);
    } catch (error) {
      console.error('❌ Chyba při načítání streamu:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Neznámá chyba';

      // Fallback na demo video v případě chyby
      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch')
      ) {
        console.warn('⚠️ Netlify funkce nedostupné, používám demo video');
        setStreamUrl(
          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
        );
        setShowStream(true);
      } else {
        setStreamError(errorMessage);
        alert(`Nepodařilo se načíst video stream:\n${errorMessage}`);
      }
    } finally {
      setIsLoadingStream(false);
    }
  };

  // Funkce pro zavření streamu
  const handleCloseStream = () => {
    console.log('🛑 Zavírám stream');

    // Zastavení přehrávání
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }

    // Zničení HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setShowStream(false);
    setStreamUrl(null);
    setStreamError(null);
  };

  return (
    <div
      className={`tuya-device-card doorbell ${
        device.online ? 'online' : 'offline'
      } size-${cardSize} layout-${cardLayout}`}
    >
      {/* Header */}
      <div className="tuya-card-header">
        <div className="device-info">
          <span className="device-icon">🔔</span>
          <div className="device-names">
            <h3 className="device-name">{device.customName || device.name}</h3>
            <span className="device-category">Video Zvonek</span>
          </div>
        </div>

        <div className="device-status-indicator">
          <div className="status-badges">
            {battery !== undefined && (
              <span className="battery-badge" title={`Baterie: ${battery}%`}>
                🔋 {battery}%
              </span>
            )}
            <span
              className={`status-dot ${device.online ? 'online' : 'offline'}`}
            ></span>
          </div>
          {device.lastUpdated && (
            <div className="last-updated-header">
              {new Date(device.lastUpdated).toLocaleTimeString('cs-CZ', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="tuya-card-body doorbell-body">
        {!showStream ? (
          <>
            {/* Snapshot Preview */}
            <div className="doorbell-preview">
              {snapshot_url ? (
                <img
                  src={snapshot_url}
                  alt="Poslední snímek"
                  className="doorbell-snapshot"
                />
              ) : (
                <div className="doorbell-placeholder">
                  <span className="placeholder-icon">📷</span>
                  <span className="placeholder-text">Žádný snímek</span>
                </div>
              )}

              {/* Overlay s tlačítky */}
              <div className="doorbell-overlay">
                <button
                  className="stream-button"
                  onClick={handleLoadStream}
                  disabled={!device.online || isLoadingStream}
                >
                  {isLoadingStream ? (
                    <>
                      <span className="loading-spinner"></span>
                      <span>Načítám...</span>
                    </>
                  ) : (
                    <>
                      <span className="button-icon">📹</span>
                      <span>Live Stream</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status indikátory */}
            <div className="doorbell-status">
              {doorbell_active && (
                <div className="status-item active">
                  <span className="status-icon">🔔</span>
                  <span className="status-text">Zvoní!</span>
                </div>
              )}

              {!device.online && (
                <div className="status-item offline">
                  <span className="status-icon">⚠️</span>
                  <span className="status-text">Offline</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Live Stream Video */}
            <div className="doorbell-stream-container">
              {streamError ? (
                <div className="stream-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{streamError}</span>
                  <button className="retry-button" onClick={handleLoadStream}>
                    Zkusit znovu
                  </button>
                </div>
              ) : streamUrl ? (
                <video
                  ref={videoRef}
                  className="doorbell-video"
                  controls
                  muted
                  playsInline
                  autoPlay
                >
                  Váš prohlížeč nepodporuje video přehrávání.
                </video>
              ) : (
                <div className="stream-loading">
                  <span className="loading-spinner"></span>
                  <span>Připojuji se ke streamu...</span>
                </div>
              )}

              {/* Tlačítko pro zavření */}
              <button
                className="close-stream-button"
                onClick={handleCloseStream}
              >
                <span>✕</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Debug Section */}
      <DebugSection device={device} isVisible={isDebugVisible} />
    </div>
  );
};

export default DoorbellCard;
