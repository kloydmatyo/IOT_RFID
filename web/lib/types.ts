export interface RFIDCard {
  key: string;
  uid: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessLog {
  key: string;
  uid: string;
  name: string;
  authorized: boolean;
  status: "Granted" | "Denied";
  timestamp: string;
  deviceId: string;
  deviceName: string;
}

export interface Device {
  deviceId: string;
  deviceName: string;
  online: boolean;
  lastSeen: string;
  lastScan?: string;
  ip?: string;
  rssi?: number;
  freeHeap?: number;
}

export interface Stats {
  authorizedCount: number;
  unauthorizedCount: number;
}

export interface SystemSettings {
  systemName: string;
  scanCooldown: number;
  heartbeatInterval: number;
  updatedAt?: string;
}
