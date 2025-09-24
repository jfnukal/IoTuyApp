import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Room, TuyaDevice } from '../types';
import styles from '../styles/RoomVisualization3D.module.css';

interface RoomVisualization3DProps {
  room: Room;
  devices: TuyaDevice[];
  onDevicePositionChange: (deviceId: string, position: { x: number; y: number; z: number }) => void;
  onDeviceSelect?: (device: TuyaDevice | null) => void;
  readonly?: boolean;
}

interface Device3D {
  id: string;
  mesh: THREE.Mesh;
  label: THREE.Sprite;
  device: TuyaDevice;
}

const RoomVisualization3D: React.FC<RoomVisualization3DProps> = ({
  room,
  devices,
  onDeviceSelect,
  // Removed unused props 'onDevicePositionChange' and 'readonly' from destructuring
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  // FIX: All useRef hooks must be initialized with a value, in this case `null`
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const devicesRef = useRef<Device3D[]>([]);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [cameraControls, setCameraControls] = useState({
    rotation: { x: -0.3, y: 0 },
    zoom: 1
  });
  const [isDragging, setIsDragging] = useState(false);

  const roomDevices = devices.filter(d => d.roomId === room.id);

  // Vytvoření místnosti
  const createRoom = useCallback((scene: THREE.Scene) => {
    const roomWidth = 8;
    const roomHeight = 6;
    const wallHeight = 3;

    // Podlaha
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: room.color ? new THREE.Color(room.color) : 0xeeeeee 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Stěny
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.8 });

    // Zadní stěna
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomWidth, wallHeight), 
      wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -roomHeight / 2);
    scene.add(backWall);

    // Boční stěny
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomHeight, wallHeight),
      wallMaterial
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomWidth / 2, wallHeight / 2, 0);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roomHeight, wallHeight),
      wallMaterial
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(roomWidth / 2, wallHeight / 2, 0);
    scene.add(rightWall);
  }, [room.color]);

  // Vytvoření device geometrie
  const createDeviceGeometry = (device: TuyaDevice) => {
    switch (device.category) {
      case 'light':
        return new THREE.SphereGeometry(0.2, 16, 16);
      case 'switch':
        return new THREE.BoxGeometry(0.3, 0.3, 0.15);
      case 'sensor':
        return new THREE.ConeGeometry(0.15, 0.4, 8);
      case 'garden':
        return new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
      default:
        return new THREE.BoxGeometry(0.25, 0.25, 0.25);
    }
  };

  // Materiál podle stavu
  const createDeviceMaterial = (device: TuyaDevice) => {
    const isOn = device.status?.some(s => 
      (s.code === 'switch_1' || s.code === 'switch_led') && s.value === true
    );
    
    let color = device.online ? 
      (isOn ? 0x4ade80 : 0x6b7280) : 
      0xef4444;

    if (device.category === 'light' && isOn) {
      return new THREE.MeshPhongMaterial({ 
        color, 
        emissive: 0x333300,
        shininess: 100
      });
    }

    return new THREE.MeshPhongMaterial({ color });
  };

  // Vytvoření text labelu
  const createDeviceLabel = (device: TuyaDevice, position: THREE.Vector3) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText(device.customName || device.name, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.position.y += 0.5;
    sprite.scale.set(1, 0.25, 1);
    
    return sprite;
  };

  // Vytvoření zařízení
  const createDevices = useCallback(() => {
    if (!sceneRef.current) return;

    // Vyčisti předchozí zařízení
    devicesRef.current.forEach(({ mesh, label }) => {
      sceneRef.current?.remove(mesh);
      sceneRef.current?.remove(label);
    });
    devicesRef.current = [];

    roomDevices.forEach((device, index) => {
      const geometry = createDeviceGeometry(device);
      const material = createDeviceMaterial(device);
      const mesh = new THREE.Mesh(geometry, material);

      // Pozice - automatické rozmístění v kruhu
      const angle = (index / roomDevices.length) * 2 * Math.PI;
      const radius = 2;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.3,
        Math.sin(angle) * radius
      );

      mesh.position.copy(position);
      mesh.castShadow = true;
      mesh.userData = { deviceId: device.id, device };
      sceneRef.current?.add(mesh);

      // Label
      const label = createDeviceLabel(device, position);
      if (label) {
        sceneRef.current?.add(label);
        devicesRef.current.push({
          id: device.id,
          mesh,
          label: label,
          device
        });
      }
    });

    console.log(`Created ${devicesRef.current.length} 3D devices`);
  }, [roomDevices]);

  // Mouse handling
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mountRef.current || !mouseRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging) {
      const deltaX = event.movementX * 0.01;
      const deltaY = event.movementY * 0.01;

      setCameraControls(prev => ({
        rotation: {
          x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.rotation.x + deltaY)),
          y: prev.rotation.y + deltaX
        },
        zoom: prev.zoom
      }));
    }
  }, [isDragging]);

  // FIX: Unused 'event' parameter is renamed to '_event' to satisfy TypeScript
  const handleMouseDown = useCallback((_event: MouseEvent) => {
    if (!raycasterRef.current || !mouseRef.current || !cameraRef.current) return;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(
      devicesRef.current.map(d => d.mesh)
    );

    if (intersects.length > 0) {
      const deviceId = intersects[0].object.userData.deviceId;
      setSelectedDevice(deviceId);
      
      const device3D = devicesRef.current.find(d => d.id === deviceId);
      if (device3D) {
        onDeviceSelect?.(device3D.device);
      }
    } else {
      setIsDragging(true);
      setSelectedDevice(null);
      onDeviceSelect?.(null);
    }
  }, [onDeviceSelect]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Render loop
  const animate = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      // Highlight vybrané zařízení
      devicesRef.current.forEach(({ mesh, id }) => {
        if (id === selectedDevice) {
          mesh.scale.setScalar(1.2);
          (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x444444);
        } else {
          mesh.scale.setScalar(1);
          (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [selectedDevice]);

  // Aktualizace kamery
  useEffect(() => {
    if (!cameraRef.current) return;

    const radius = 8 * cameraControls.zoom;
    cameraRef.current.position.x = Math.sin(cameraControls.rotation.y) * Math.cos(cameraControls.rotation.x) * radius;
    cameraRef.current.position.y = Math.sin(cameraControls.rotation.x) * radius + 3;
    cameraRef.current.position.z = Math.cos(cameraControls.rotation.y) * Math.cos(cameraControls.rotation.x) * radius;
    cameraRef.current.lookAt(0, 0, 0);
  }, [cameraControls]);

  // Inicializace Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    try {
      // Scéna
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);
      sceneRef.current = scene;

      // Kamera
      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 5, 8);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Raycaster
      raycasterRef.current = new THREE.Raycaster();
      mouseRef.current = new THREE.Vector2();

      // Osvětlení
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Vytvoř místnost a zařízení
      createRoom(scene);
      createDevices();

      // Spusť render loop
      animate();

      console.log('3D visualization initialized successfully');
    } catch (error) {
      console.error('3D initialization error:', error);
    }

    // Event listeners
    const canvas = rendererRef.current?.domElement;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [createRoom, createDevices, animate, handleMouseMove, handleMouseDown, handleMouseUp]);

  // Aktualizuj zařízení při změně dat
  useEffect(() => {
    createDevices();
  }, [createDevices]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.roomTitle}>
          {room.icon && <span className={styles.roomIcon}>{room.icon}</span>}
          {room.name} - 3D Pohled
        </h3>
        <div className={styles.controls}>
          <span className={styles.deviceCount}>
            {roomDevices.length} zařízení
          </span>
          <div className={styles.cameraControls}>
            <button 
              onClick={() => setCameraControls(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.2) }))}
              className={styles.controlBtn}
            >
              🔍+
            </button>
            <button 
              onClick={() => setCameraControls(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.2) }))}
              className={styles.controlBtn}
            >
              🔍-
            </button>
            <button 
              onClick={() => setCameraControls({ rotation: { x: -0.3, y: 0 }, zoom: 1 })}
              className={styles.controlBtn}
            >
              🎯 Reset
            </button>
          </div>
        </div>
      </div>
      
      <div 
        ref={mountRef} 
        className={styles.canvas}
        style={{ 
          minHeight: '500px',
          width: '100%',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
      
      <div className={styles.instructions}>
        <p>Tažením otáčejte kameru • Klik pro výběr zařízení</p>
        {selectedDevice && (
          <p>Vybráno: {devicesRef.current.find(d => d.id === selectedDevice)?.device.customName || 'Zařízení'}</p>
        )}
      </div>
    </div>
  );
};

export default RoomVisualization3D;