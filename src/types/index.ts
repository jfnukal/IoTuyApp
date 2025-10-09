export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface TuyaStatus {
  code: string;
  value: any;
}

export interface TuyaDevice {
  id: string;
  name: string;
  local_key: string;
  category: string;
  product_id: string;
  product_name: string;
  sub: boolean;
  uuid: string;
  owner_id: string;
  online: boolean;
  status?: TuyaStatus[] | null;
  lastUpdated?: number;
  isVisible?: boolean;
  roomId?: string;
  position?: {
    x: number;
    y: number;
  };
  customName?: string;
  customIcon?: string;
  customColor?: string;
  notes?: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  devices: string[];
  owner: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
  icon?: string;
  backgroundImage?: string;
  isDefault?: boolean;
  layout?: {
    width: number;
    height: number;
    type: '2d' | '3d';
  };
}

export interface DeviceCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description?: string;
  defaultCommands?: string[];
}

export interface UserSettings {
  id?: string;
  uid: string;
  familyMemberId?: string; // 'dad', 'mom', 'jarecek', 'johanka'
  theme: 'light' | 'dark' | 'auto';
  language: 'cs' | 'en';
  notifications: boolean;
  createdAt: number;
  updatedAt: number;
  preferences?: {
    autoRefreshInterval: number;
    showOfflineDevices: boolean;
    defaultRoomView: 'grid' | 'list' | '2d' | '3d';
    soundEnabled: boolean;
    emailNotifications: boolean;
    defaultRoomId?: string;
    showEmptyRooms: boolean;
    roomSortOrder: 'name' | 'created' | 'updated' | 'custom';
  };
  tuyaConfig?: {
    hasValidCredentials: boolean;
    lastSync: number;
    deviceCount: number;
  };
}

export interface SharedRoom {
  id: string;
  roomId: string;
  ownerId: string;
  sharedWithUserId: string;
  permissions: {
    canView: boolean;
    canControl: boolean;
    canEdit: boolean;
    canShare: boolean;
  };
  createdAt: number;
  expiresAt?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  owner: string;
  roomId?: string;
  isEnabled: boolean;
  trigger: {
    type: 'device' | 'time' | 'scene';
    deviceId?: string;
    condition?: string;
    time?: string;
  };
  actions: {
    deviceId: string;
    commands: { code: string; value: any }[];
  }[];
  createdAt: number;
  updatedAt: number;
}

