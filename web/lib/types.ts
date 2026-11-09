// ─── Admin / RFID system types ───────────────────────────────────────────────

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

// ─── Teacher / attendance types ──────────────────────────────────────────────

export interface TeacherProfile {
  uid: string;       // Firebase Auth UID
  name: string;
  email: string;
  createdAt: string;
}

export interface ClassRecord {
  key: string;         // Firebase push key
  teacherUid: string;
  name: string;        // e.g. "BSCS"
  code: string;        // e.g. "NSTP101"
  year: number;
  schedule: string;    // human-readable "Mon/Wed 8:00-9:00 AM"
  start: string;       // "08:00"
  end: string;         // "09:00"
  room: string;
  createdAt: string;
  archived?: boolean;
}

export interface StudentRecord {
  key: string;         // Firebase push key
  teacherUid: string;
  firstName: string;
  lastName: string;
  name: string;
  studentId: string;   // e.g. "202310417"
  email: string;
  program: string;
  year: number;
  section: string;
  rfidUid: string;     // uppercase, no separators e.g. "7F3A91C2"
  classKeys: string[]; // array of ClassRecord.key values
  archived?: boolean;
}

/**
 * Stored at /attendance/{classKey}/{date}/{studentKey}
 * date format: "YYYY-MM-DD"
 */
export interface AttendanceRecord {
  studentKey: string;
  studentId: string;
  studentName: string;
  classKey: string;
  date: string;
  status: "present" | "late" | "absent" | "incomplete";
  timeInMs?: number | string;   // epoch ms of tap-in (ESP32 stores as string)
  timeOutMs?: number | string;  // epoch ms of tap-out
  writtenBy: "rfid" | "manual";
}

/**
 * Stored at /activeSessions/{deviceId}
 * The teacher sets this before class starts so the ESP32 knows which class
 * to record attendance for.
 */
export interface ActiveSession {
  classKey: string;
  className: string;
  classCode: string;
  teacherUid: string;
  startedAt: string;  // ISO timestamp when teacher clicked Start
  classStart: string; // "HH:MM" — the scheduled class start time
  classEnd: string;   // "HH:MM" — the scheduled class end time
  scanMode: "timeIn" | "timeOut";
  active: boolean;
}
