import React, { useState, useRef, useEffect } from 'react';
import type { TuyaDevice, Room } from '../types';
import styles from '../styles/RoomVisualization2D.module.css';
import DeviceTooltip from './DeviceTooltip';

interface RoomVisualization2DProps {
  room: Room;
  devices: TuyaDevice[];
  onDevicePositionChange: (
    deviceId: string,
    position: { x: number; y: number }
  ) => Promise<void>;
  onDeviceSelect?: (device: TuyaDevice | null) => void;
  readonly?: boolean;
}

interface DragState {
  isDragging: boolean;
  deviceId: string | null;
  offset: { x: number; y: number };
  startPosition: { x: number; y: number };
}

const RoomVisualization2D: React.FC<RoomVisualization2DProps> = ({
  room,
  devices,
  onDevicePositionChange,
  onDeviceSelect,
  readonly = false,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    deviceId: null,
    offset: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
  });

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Výchozí rozměry místnosti
  const roomWidth = room.layout?.width || 600;
  const roomHeight = room.layout?.height || 400;

  // Získání zařízení pro tuto místnost
  // const roomDevices = devices.filter(device => device.roomId === room.id);
  const roomDevices = devices;

  // Funkce pro získání ikony zařízení podle kategorie
  const getDeviceIcon = (device: TuyaDevice): string => {
    const categoryIcons: Record<string, string> = {
      switch: '🔌', // zásuvky/spínače
      light: '💡', // světla
      sensor: '📱', // senzory
      garden: '🌱', // zahradní zařízení
      thermostat: '🌡️', // termostat
      camera: '📷', // kamery
      assistant: '🏠', // domácí asistent
      default: '📱',
    };

    return categoryIcons[device.category] || categoryIcons.default;
  };

  // Funkce pro získání pozice zařízení
  const getDevicePosition = (device: TuyaDevice) => {
    if (device.position) {
      return device.position;
    }

    // Výchozí pozice - rozmístit zařízení rovnoměrně
    const index = roomDevices.findIndex((d) => d.id === device.id);
    const cols = Math.ceil(Math.sqrt(roomDevices.length));
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      x: (col + 0.5) * (roomWidth / cols),
      y: (row + 0.5) * (roomHeight / Math.ceil(roomDevices.length / cols)),
    };
  };

    // Handler pro start tažení
    const handleMouseDown = (e: React.MouseEvent, device: TuyaDevice) => {
      if (readonly) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const devicePosition = getDevicePosition(device);
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      console.log('=== MOUSE DOWN DEBUG ===');
      console.log('Device:', device.id);
      console.log('Device position:', devicePosition);
      console.log('Mouse position:', { mouseX, mouseY });
      console.log('Canvas rect:', rect);

      setDragState({
        isDragging: true,
        deviceId: device.id,
        offset: {
          x: mouseX - devicePosition.x,
          y: mouseY - devicePosition.y
        },
        startPosition: devicePosition
      });
      
      setSelectedDevice(device.id);
      onDeviceSelect?.(device);
    };

      // Handler pro pohyb myši
        const handleMouseMove = (e: React.MouseEvent) => {
          if (!dragState.isDragging || !dragState.deviceId) return;
          
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;

          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Výpočet nové pozice
          let newX = mouseX - dragState.offset.x;
          let newY = mouseY - dragState.offset.y;

          console.log('=== MOUSE MOVE DEBUG ===');
          console.log('Mouse:', { mouseX, mouseY });
          console.log('Offset:', dragState.offset);
          console.log('Calculated new position:', { newX, newY });
          
          // Omezení na hranice místnosti s rezervou pro velikost zařízení
          const deviceRadius = 30;
          newX = Math.max(deviceRadius, Math.min(roomWidth - deviceRadius, newX));
          newY = Math.max(deviceRadius, Math.min(roomHeight - deviceRadius, newY));

          console.log('Clamped position:', { newX, newY });
          console.log('Room bounds:', { roomWidth, roomHeight });
          
          // Aktualizace pozice v real-time (vizuálně)
          const deviceElement = document.getElementById(`device-${dragState.deviceId}`);
          if (deviceElement) {
            // KLÍČOVÁ OPRAVA: kontroluj jestli dragState je stále aktivní
            if (dragState.isDragging && dragState.deviceId) {
              const transformValue = `translate(${newX - 30}px, ${newY - 30}px)`;
              console.log('Setting transform during drag:', transformValue);
              deviceElement.style.transform = transformValue;
              deviceElement.style.transition = 'none';
            }
          }
        };

  // Handler pro klik na zařízení
  const handleDeviceClick = (device: TuyaDevice) => {
    if (!dragState.isDragging) {
      setSelectedDevice(selectedDevice === device.id ? null : device.id);
      onDeviceSelect?.(selectedDevice === device.id ? null : device);
    }
  };

// Globální mouse up listener
useEffect(() => {
  if (dragState.isDragging) {
    const handleGlobalMouseUp = async () => {
      console.log('=== GLOBAL MOUSE UP DEBUG ===');
      
      // OKAMŽITĚ resetuj drag state aby se zastavil handleMouseMove
      const currentDragDeviceId = dragState.deviceId;
      const currentStartPosition = dragState.startPosition;
      
      if (!currentDragDeviceId) return;
      
      // Reset drag state HNED NA ZAČÁTKU
      setDragState({
        isDragging: false,
        deviceId: null,
        offset: { x: 0, y: 0 },
        startPosition: { x: 0, y: 0 }
      });
      
      const deviceElement = document.getElementById(`device-${currentDragDeviceId}`);
      if (deviceElement) {
        deviceElement.style.transition = '';
        
        const transform = deviceElement.style.transform;
        console.log('Global mouseUp transform:', transform);
        
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        
        if (match) {
          const newPosition = {
            x: parseFloat(match[1]) + 30,
            y: parseFloat(match[2]) + 30
          };
          
          console.log('Global mouseUp position to save:', newPosition);
          
          try {
            await onDevicePositionChange(currentDragDeviceId, newPosition);
            console.log('Global position saved successfully');
          } catch (error) {
            console.error('Global error updating device position:', error);
            deviceElement.style.transform = `translate(${currentStartPosition.x - 30}px, ${currentStartPosition.y - 30}px)`;
          }
        }
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mouseleave', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }
}, [dragState.isDragging, dragState.deviceId, dragState.startPosition, onDevicePositionChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDevice(null);
        onDeviceSelect?.(null);

        if (dragState.isDragging) {
          setDragState({
            isDragging: false,
            deviceId: null,
            offset: { x: 0, y: 0 },
            startPosition: { x: 0, y: 0 },
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragState.isDragging, onDeviceSelect]);

  // Přidej toto před return
  console.log('RoomVisualization2D render:', {
    roomId: room.id,
    totalDevices: devices.length,
    roomDevices: roomDevices.length,
    roomDeviceIds: roomDevices.map((d) => d.id),
  });

  // return (
  //   <div className="room-visualization-modern">
  //     <header className="viz-header">
  //       <div className="viz-title-section">
  //         <h3 className="viz-title">
  //           {room.icon && <span className="viz-room-icon">{room.icon}</span>}
  //           <span className="viz-room-name">{room.name}</span>
  //           <span className="viz-mode-badge">2D Vizualizace</span>
  //         </h3>
  //         <p className="viz-description">
  //           Přetahování zařízení pro změnu pozice v místnosti
  //         </p>
  //       </div>

  //       <div className="viz-controls">
  //         <div className="viz-stats">
  //           <div className="stat-item">
  //             <span className="stat-value">{roomDevices.length}</span>
  //             <span className="stat-label">zařízení</span>
  //           </div>
  //           <div className="stat-item">
  //             <span className="stat-value">
  //               {roomDevices.filter(d => d.online).length}
  //             </span>
  //             <span className="stat-label">online</span>
  //           </div>
  //         </div>

  //         {!readonly && (
  //           <div className="viz-help">
  //             <span className="help-icon">💡</span>
  //             <span className="help-text">Drag & Drop aktivní</span>
  //           </div>
  //         )}
  //       </div>
  //     </header>

  //     <div className="viz-canvas-container">
  //       <div
  //         ref={canvasRef}
  //         className={`viz-canvas ${dragState.isDragging ? 'dragging' : ''}`}
  //         style={{
  //           width: roomWidth,
  //           height: roomHeight,
  //           background: room.color
  //             ? `linear-gradient(135deg, ${room.color}10, ${room.color}05)`
  //             : 'linear-gradient(135deg, #f8f9fa, #e9ecef)'
  //         }}
  //         onMouseMove={handleMouseMove}
  //         onMouseUp={handleMouseUp}
  //       >
  //         {/* Moderní mřížka pozadí */}
  //         <div className="viz-grid">
  //           <div className="grid-pattern" style={{
  //             backgroundImage: `
  //               radial-gradient(circle at 1px 1px, rgba(102,126,234,0.15) 1px, transparent 0),
  //               linear-gradient(90deg, rgba(102,126,234,0.05) 1px, transparent 1px),
  //               linear-gradient(rgba(102,126,234,0.05) 1px, transparent 1px)
  //             `,
  //             backgroundSize: '40px 40px, 40px 40px, 40px 40px'
  //           }} />
  //         </div>

  //         {/* Zařízení s moderním designem */}
  //         {roomDevices.map((device) => {
  //           const position = getDevicePosition(device);
  //           const isSelected = selectedDevice === device.id;
  //           const isDragging = dragState.isDragging && dragState.deviceId === device.id;

  //           return (
  //             <div
  //               key={device.id}
  //               id={`device-${device.id}`}
  //               className={`viz-device ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${!device.online ? 'offline' : 'online'}`}
  //               style={{
  //                 transform: `translate(${position.x - 30}px, ${position.y - 30}px)`,
  //                 zIndex: isDragging ? 1000 : isSelected ? 100 : 10
  //               }}
  //               onMouseDown={(e) => handleMouseDown(e, device)}
  //               onClick={() => handleDeviceClick(device)}
  //               title={`${device.customName || device.name}\n${device.category}\n${device.online ? 'Online' : 'Offline'}`}
  //             >
  //               <div className="device-container">
  //                 <div className="device-icon-wrapper">
  //                   <span className="device-icon-viz">
  //                     {getDeviceIcon(device)}
  //                   </span>
  //                   <div className={`device-status-ring ${device.online ? 'online' : 'offline'}`} />
  //                 </div>

  //                 <div className="device-info-viz">
  //                   <div className="device-name-viz">
  //                     {device.customName || device.name}
  //                   </div>
  //                   <div className="device-category-viz">
  //                     {device.category}
  //                   </div>
  //                 </div>

  //                 {/* Indikátor výběru */}
  //                 {isSelected && (
  //                   <div className="selection-indicator">
  //                     <div className="selection-ring" />
  //                     <div className="selection-handles">
  //                       <div className="handle handle-nw" />
  //                       <div className="handle handle-ne" />
  //                       <div className="handle handle-sw" />
  //                       <div className="handle handle-se" />
  //                     </div>
  //                   </div>
  //                 )}

  //                 {/* Indikátor tažení */}
  //                 {isDragging && (
  //                   <div className="drag-shadow" />
  //                 )}
  //               </div>
  //             </div>
  //           );
  //         })}

  //         {/* Prázdná místnost */}
  //         {roomDevices.length === 0 && (
  //           <div className="viz-empty-state">
  //             <div className="empty-icon">🏠</div>
  //             <h4 className="empty-title">Prázdná místnost</h4>
  //             <p className="empty-description">
  //               V této místnosti nejsou žádná zařízení.<br />
  //               Přidejte zařízení pomocí správy místností.
  //             </p>
  //           </div>
  //         )}
  //       </div>
  //     </div>

  //     {/* Moderní legenda */}
  //     <footer className="viz-legend">
  //       <div className="legend-section">
  //         <h4 className="legend-title">Legenda:</h4>
  //         <div className="legend-items">
  //           <div className="legend-item">
  //             <div className="legend-indicator online" />
  //             <span className="legend-label">Online zařízení</span>
  //           </div>
  //           <div className="legend-item">
  //             <div className="legend-indicator offline" />
  //             <span className="legend-label">Offline zařízení</span>
  //           </div>
  //           <div className="legend-item">
  //             <div className="legend-indicator selected" />
  //             <span className="legend-label">Vybrané zařízení</span>
  //           </div>
  //           {!readonly && (
  //             <div className="legend-item">
  //               <div className="legend-indicator dragging" />
  //               <span className="legend-label">Přetahování</span>
  //             </div>
  //           )}
  //         </div>
  //       </div>

  //       <div className="legend-shortcuts">
  //         <h4 className="legend-title">Ovládání:</h4>
  //         <div className="shortcut-items">
  //           <span className="shortcut">Klik = Výběr</span>
  //           {!readonly && <span className="shortcut">Drag = Přesun</span>}
  //           <span className="shortcut">ESC = Zrušit výběr</span>
  //         </div>
  //       </div>
  //     </footer>
  //   </div>
  // );

  return (
    <div className={styles.roomVisualizationModern}>
      <header className={styles.vizHeader}>
        <div className={styles.vizTitleSection}>
          <h3 className={styles.vizTitle}>
            {room.icon && (
              <span className={styles.vizRoomIcon}>{room.icon}</span>
            )}
            <span className={styles.vizRoomName}>{room.name}</span>
            <span className={styles.vizModeBadge}>2D Vizualizace</span>
          </h3>
          <p className={styles.vizDescription}>
            Přetahování zařízení pro změnu pozice v místnosti
          </p>
        </div>

        <div className={styles.vizControls}>
          <div className={styles.vizStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{roomDevices.length}</span>
              <span className={styles.statLabel}>zařízení</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {roomDevices.filter((d) => d.online).length}
              </span>
              <span className={styles.statLabel}>online</span>
            </div>
          </div>

          {!readonly && (
            <div className={styles.vizHelp}>
              <span className={styles.helpIcon}>💡</span>
              <span className={styles.helpText}>Drag & Drop aktivní</span>
            </div>
          )}
        </div>
      </header>

      <div className={styles.vizCanvasContainer}>
        <div
          ref={canvasRef}
          className={`${styles.vizCanvas} ${
            dragState.isDragging ? styles.dragging : ''
          }`}
          style={{
            width: roomWidth,
            height: roomHeight,
            background: room.color
              ? `linear-gradient(135deg, ${room.color}10, ${room.color}05)`
              : 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
          }}
          onMouseMove={handleMouseMove}
        >
          {/* Moderní mřížka pozadí */}
          <div className={styles.vizGrid}>
            <div
              className={styles.gridPattern}
              style={{
                backgroundImage: `
                    radial-gradient(circle at 1px 1px, rgba(102,126,234,0.15) 1px, transparent 0),
                    linear-gradient(90deg, rgba(102,126,234,0.05) 1px, transparent 1px),
                    linear-gradient(rgba(102,126,234,0.05) 1px, transparent 1px)
                  `,
                backgroundSize: '40px 40px, 40px 40px, 40px 40px',
              }}
            />
          </div>

          {/* Zařízení s moderním designem */}
          {roomDevices.map((device) => {
            const position = getDevicePosition(device);
            const isSelected = selectedDevice === device.id;
            const isDragging =
              dragState.isDragging && dragState.deviceId === device.id;

            return (
              <div
                key={device.id}
                id={`device-${device.id}`}
                className={`${styles.vizDevice} ${
                  isSelected ? styles.selected : ''
                } ${isDragging ? styles.dragging : ''} ${
                  !device.online ? styles.offline : styles.online
                }`}
                style={{
                  transform: `translate(${position.x - 30}px, ${
                    position.y - 30
                  }px)`,
                  zIndex: isDragging ? 1000 : isSelected ? 100 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, device)}
                onClick={() => handleDeviceClick(device)}
                title={`${device.customName || device.name}\n${
                  device.category
                }\n${device.online ? 'Online' : 'Offline'}`}
              >
                <div className={styles.deviceContainer}>
                  <div className={styles.deviceIconWrapper}>
                    <span className={styles.deviceIconViz}>
                      {getDeviceIcon(device)}
                    </span>
                    <div
                      className={`${styles.deviceStatusRing} ${
                        device.online ? styles.online : styles.offline
                      }`}
                    />
                  </div>
                  <DeviceTooltip device={device}>
                    <div className={styles.deviceInfoIcon}>
                      <span className={styles.infoSymbol}>i</span>
                    </div>
                  </DeviceTooltip>

                  <div className={styles.deviceInfoViz}>
                    <div className={styles.deviceNameViz}>
                      {device.customName || device.name}
                    </div>
                    <div className={styles.deviceCategoryViz}>
                      {device.category}
                    </div>
                  </div>

                  {/* Indikátor výběru */}
                  {isSelected && (
                    <div className={styles.selectionIndicator}>
                      <div className={styles.selectionRing}>
                        <div className={styles.selectionHandles}>
                          <div
                            className={`${styles.handle} ${styles.handleNw}`}
                          />
                          <div
                            className={`${styles.handle} ${styles.handleNe}`}
                          />
                          <div
                            className={`${styles.handle} ${styles.handleSw}`}
                          />
                          <div
                            className={`${styles.handle} ${styles.handleSe}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indikátor tažení */}
                  {isDragging && <div className={styles.dragShadow} />}
                </div>
              </div>
            );
          })}

          {/* Prázdná místnost */}
          {roomDevices.length === 0 && (
            <div className={styles.vizEmptyState}>
              <div className={styles.emptyIcon}>🏠</div>
              <h4 className={styles.emptyTitle}>Prázdná místnost</h4>
              <p className={styles.emptyDescription}>
                V této místnosti nejsou žádná zařízení.
                <br />
                Přidejte zařízení pomocí správy místností.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Moderní legenda */}
      <footer className={styles.vizLegend}>
        {' '}
        {/* <footer className={styles.vizEmptyState}> */}
        <div className={styles.legendSection}>
          <h4 className={styles.legendTitle}>Legenda:</h4>
          <div className={styles.legendItems}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIndicator} ${styles.online}`} />
              <span className={styles.legendLabel}>Online zařízení</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIndicator} ${styles.offline}`} />
              <span className={styles.legendLabel}>Offline zařízení</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendIndicator} ${styles.selected}`} />
              <span className={styles.legendLabel}>Vybrané zařízení</span>
            </div>
            {!readonly && (
              <div className={styles.legendItem}>
                <div
                  className={`${styles.legendIndicator} ${styles.dragging}`}
                />
                <span className={styles.legendLabel}>Přetahování</span>
              </div>
            )}
          </div>
        </div>
        <div className={styles.legendShortcuts}>
          <h4 className={styles.legendTitle}>Ovládání:</h4>
          <div className={styles.shortcutItems}>
            <span className={styles.shortcut}>Klik = Výběr</span>
            {!readonly && (
              <span className={styles.shortcut}>Drag = Přesun</span>
            )}
            <span className={styles.shortcut}>ESC = Zrušit výběr</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RoomVisualization2D;
