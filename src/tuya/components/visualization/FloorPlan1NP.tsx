// src/tuya/components/visualization/FloorPlan1NP.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { TuyaDevice } from '../../../types';
import { useFloors } from '../../hooks/useFloors';
import { getCardIcon, getDeviceCardType } from '../../utils/deviceHelpers';
import './FloorPlan1NP.css';

interface FloorPlan1NPProps {
  devices: TuyaDevice[];
  onDeviceClick?: (device: TuyaDevice) => void;
  onDeviceDrop?: (deviceId: string, x: number, y: number) => void;
}

const FloorPlan1NP: React.FC<FloorPlan1NPProps> = ({
  devices,
  onDeviceClick,
  onDeviceDrop,
}) => {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeviceEditMode, setIsDeviceEditMode] = useState(false);
  const [draggedDeviceId, setDraggedDeviceId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 🔥 FIREBASE: Načtení a ukládání layoutu
  const { rooms, isLoading, saveLayout } = useFloors('floor-first');
  const [localRooms, setLocalRooms] = useState<any[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Rozměry SVG viewBox
  const viewBoxWidth = 1200;
  const viewBoxHeight = 1000;

  // Cesta k obrázku půdorysu
  const floorPlanImage = '/images/prizemi.webp';
  const floorPlanImageFallback = '/images/prizemi.png';

  // Výchozí pozice místností
  const defaultRooms = [
    {
      id: 'pracovna',
      name: 'Pracovna',
      type: 'office',
      x: 57,
      y: 65,
      width: 351,
      height: 356,
    },
    {
      id: 'zadaveri',
      name: 'Zádveří',
      type: 'hallway',
      x: 827,
      y: 155,
      width: 298,
      height: 296,
    },
    {
      id: 'chodba',
      name: 'Chodba',
      type: 'hallway',
      x: 423,
      y: 183,
      width: 375,
      height: 231,
    },
    {
      id: 'schody-1patro',
      name: '🪜 Schody do 1. patra',
      type: 'hallway',
      x: 427,
      y: 67,
      width: 353,
      height: 105,
    },
    {
      id: 'schody-sklep',
      name: '🪜 Schody do sklepa',
      type: 'hallway',
      x: 431,
      y: 67,
      width: 132,
      height: 100,
    },
    {
      id: 'wc',
      name: 'WC',
      type: 'toilet',
      x: 1030,
      y: 149,
      width: 102,
      height: 163,
    },
    {
      id: 'terasa',
      name: '🌿 Terasa',
      type: 'garden',
      x: 832,
      y: 479,
      width: 317,
      height: 455,
    },
    {
      id: 'obyvak',
      name: 'Obývací pokoj',
      type: 'living-room',
      x: 50,
      y: 429,
      width: 443,
      height: 500,
    },
    {
      id: 'kuchyne',
      name: 'Kuchyně',
      type: 'kitchen',
      x: 500,
      y: 427,
      width: 284,
      height: 512,
    },
  ];

  // Načíst místnosti z Firebase nebo použít výchozí
  useEffect(() => {
    if (!isLoading) {
      if (rooms.length > 0) {
        setLocalRooms(rooms);
      } else {
        setLocalRooms(defaultRooms);
      }
    }
  }, [rooms, isLoading]);

  // Handler pro změnu pozice/velikosti místnosti s auto-save
  const handleRoomChange = (
    roomId: string,
    field: 'x' | 'y' | 'width' | 'height',
    value: number
  ) => {
    const updatedRooms = localRooms.map((room) =>
      room.id === roomId ? { ...room, [field]: value } : room
    );
    setLocalRooms(updatedRooms);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveLayout(updatedRooms);
    }, 1000);
  };

  // Manuální uložení
  const handleSave = async () => {
    try {
      await saveLayout(localRooms);
      alert('✅ Layout uložen!');
    } catch (error) {
      alert('❌ Chyba při ukládání layoutu');
    }
  };

  // Kopírování kódu
  const copyRoomsCode = () => {
    const code = `const rooms = ${JSON.stringify(localRooms, null, 2)};`;
    navigator.clipboard.writeText(code);
    alert('✅ Kód zkopírován!');
  };

  // Handler pro drop zařízení
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!svgRef.current || !onDeviceDrop) return;

    const deviceId = e.dataTransfer.getData('deviceId');
    if (!deviceId) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgCoords = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    onDeviceDrop(deviceId, Math.round(svgCoords.x), Math.round(svgCoords.y));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Loading state
  if (isLoading) {
    return (
<div className="floor-plan-1np loading">
  <div className="spinner-mini"></div>
  <p>Načítám půdorys...</p>
</div>
    );
  }

  const devicesWithPosition = devices.filter((d) => d.position);

  return (
    <div className="floor-plan-1np">
      {/* ===== KOMPAKTNÍ TOOLBAR ===== */}
      <div className="floorplan-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-info">
            📍 {devicesWithPosition.length}/{devices.length} umístěno
          </span>
        </div>
        <div className="toolbar-right">
          <button
            className={`toolbar-btn ${isEditMode ? 'active' : ''}`}
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (isDeviceEditMode) setIsDeviceEditMode(false);
            }}
            title="Upravit rozvržení místností"
          >
            🏠 {isEditMode ? 'Hotovo' : 'Místnosti'}
          </button>
          <button
            className={`toolbar-btn ${isDeviceEditMode ? 'active' : ''}`}
            onClick={() => {
              setIsDeviceEditMode(!isDeviceEditMode);
              if (isEditMode) setIsEditMode(false);
            }}
            title="Upravit pozice zařízení"
          >
            📍 {isDeviceEditMode ? 'Hotovo' : 'Pozice'}
          </button>
        </div>
      </div>

      {/* ===== EDITAČNÍ PANEL ===== */}
      {isEditMode && (
        <div className="edit-panel">
          <div className="edit-panel-header">
            <h3>⚙️ Úprava místností</h3>
            <div className="edit-panel-actions">
              <button className="btn-small" onClick={copyRoomsCode}>
                📋 Kopírovat
              </button>
              <button className="btn-small btn-success" onClick={handleSave}>
                💾 Uložit
              </button>
            </div>
          </div>
          <div className="rooms-editor">
            {localRooms.map((room) => (
              <div key={room.id} className="room-editor">
                <h4>{room.name}</h4>
                <div className="room-controls">
                  <div className="control-row">
                    <label>X: {room.x}</label>
                    <input
                      type="range"
                      min="0"
                      max={viewBoxWidth}
                      value={room.x}
                      onChange={(e) =>
                        handleRoomChange(room.id, 'x', parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="control-row">
                    <label>Y: {room.y}</label>
                    <input
                      type="range"
                      min="0"
                      max={viewBoxHeight}
                      value={room.y}
                      onChange={(e) =>
                        handleRoomChange(room.id, 'y', parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div className="control-row">
                    <label>Š: {room.width}</label>
                    <input
                      type="range"
                      min="50"
                      max="800"
                      value={room.width}
                      onChange={(e) =>
                        handleRoomChange(
                          room.id,
                          'width',
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                  <div className="control-row">
                    <label>V: {room.height}</label>
                    <input
                      type="range"
                      min="50"
                      max="800"
                      value={room.height}
                      onChange={(e) =>
                        handleRoomChange(
                          room.id,
                          'height',
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SVG PŮDORYS ===== */}
      <div className="floor-plan-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="floor-plan-svg"
          preserveAspectRatio="xMidYMid meet"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseMove={(e: any) => {
            if (draggedDeviceId && svgRef.current) {
              const svg = svgRef.current;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const coords = pt.matrixTransform(svg.getScreenCTM()?.inverse());
              const deviceElement = document.querySelector(
                `[data-device-id="${draggedDeviceId}"]`
              );
              if (deviceElement) {
                deviceElement.setAttribute(
                  'transform',
                  `translate(${coords.x}, ${coords.y})`
                );
              }
            }
          }}
          onMouseUp={(e: any) => {
            if (draggedDeviceId && svgRef.current && onDeviceDrop) {
              const svg = svgRef.current;
              const pt = svg.createSVGPoint();
              pt.x = e.clientX;
              pt.y = e.clientY;
              const coords = pt.matrixTransform(svg.getScreenCTM()?.inverse());
              onDeviceDrop(
                draggedDeviceId,
                Math.round(coords.x),
                Math.round(coords.y)
              );
              setDraggedDeviceId(null);
            }
          }}
        >
          {/* Obrázek půdorysu */}
          <image
            href={floorPlanImage}
            x="0"
            y="0"
            width={viewBoxWidth}
            height={viewBoxHeight}
            preserveAspectRatio="xMidYMid slice"
            onError={(e) => {
              (e.target as SVGImageElement).setAttribute(
                'href',
                floorPlanImageFallback
              );
            }}
          />

          {/* Interaktivní zóny místností */}
          {localRooms.map((room) => (
            <g
              key={room.id}
              className={`room-zone ${
                hoveredRoom === room.id ? 'hovered' : ''
              } ${isEditMode ? 'edit-mode' : ''}`}
              onMouseEnter={() => !isEditMode && setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                fill={isEditMode ? 'rgba(102, 126, 234, 0.1)' : 'transparent'}
                stroke={
                  hoveredRoom === room.id || isEditMode
                    ? '#667eea'
                    : 'transparent'
                }
                strokeWidth={
                  isEditMode ? '2' : hoveredRoom === room.id ? '3' : '0'
                }
                strokeDasharray={
                  hoveredRoom === room.id && !isEditMode ? '10,5' : 'none'
                }
                className="room-overlay"
              />
              {(hoveredRoom === room.id || isEditMode) && (
                <g className="room-label-group" pointerEvents="none">
                  <rect
                    x={room.x + room.width / 2 - 60}
                    y={room.y + 5}
                    width="120"
                    height="26"
                    fill="white"
                    stroke="#667eea"
                    strokeWidth="2"
                    rx="4"
                    opacity="0.95"
                  />
                  <text
                    x={room.x + room.width / 2}
                    y={room.y + 22}
                    textAnchor="middle"
                    fill="#333"
                    fontSize="12"
                    fontWeight="600"
                  >
                    {room.name}
                  </text>
                </g>
              )}
            </g>
          ))}

          {/* Zařízení na půdorysu */}
          {devicesWithPosition.map((device) => {
            const deviceType = getDeviceCardType(device.category);
            const icon = device.customIcon || getCardIcon(deviceType);
            return (
              <g
                key={device.id}
                data-device-id={device.id}
                className={`device-on-plan ${
                  isDeviceEditMode ? 'draggable' : ''
                }`}
                transform={`translate(${device.position!.x}, ${
                  device.position!.y
                })`}
                style={{
                  cursor: isDeviceEditMode ? 'move' : 'pointer',
                  opacity: draggedDeviceId === device.id ? 0.5 : 1,
                }}
              >
                <rect
                  x="-30"
                  y="-30"
                  width="60"
                  height="80"
                  fill="transparent"
                  style={{ pointerEvents: 'auto' }}
                  onMouseDown={(e: any) => {
                    if (isDeviceEditMode) {
                      e.stopPropagation();
                      setDraggedDeviceId(device.id);
                    }
                  }}
                  onClick={(e: any) => {
                    if (!isDeviceEditMode) {
                      e.stopPropagation();
                      onDeviceClick?.(device);
                    }
                  }}
                />
                <circle
                  r="30"
                  fill={device.online ? '#4CAF50' : '#9E9E9E'}
                  stroke="#fff"
                  strokeWidth="3"
                  pointerEvents="none"
                />
                <text
                  textAnchor="middle"
                  dy="7"
                  fontSize="24"
                  fill="white"
                  pointerEvents="none"
                >
                  {icon}
                </text>
                <text
                  y="42"
                  textAnchor="middle"
                  fontSize="16"
                  fill="#333"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {(device.customName || device.name).substring(0, 15)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default FloorPlan1NP;
