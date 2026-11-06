# IoT-Based RFID Access Control and Monitoring System

An ESP32 + Firebase + Web App system for real-time RFID access control. Scan RFID cards, control access with LEDs and buzzer, and monitor everything from a live web dashboard.

---

## Hardware

| Component          | ESP32 Pin |
|--------------------|-----------|
| RFID SDA/SS        | GPIO 5    |
| RFID RST           | GPIO 21   |
| Green LED          | GPIO 2    |
| Red LED            | GPIO 4    |
| Buzzer             | GPIO 22   |
| OLED SDA (SSD1306) | GPIO 16   |
| OLED SCL (SSD1306) | GPIO 17   |

---

## Project Structure

```
IOT_RFID/
├── RFID.ino              ← Enhanced ESP32 firmware (WiFi + Firebase)
└── web/
    ├── index.html        ← Single-page web application
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── firebase-config.js   ← Your Firebase credentials go here
    │   ├── auth.js
    │   ├── app.js               ← Router & global utilities
    │   ├── dashboard.js
    │   ├── rfid-management.js
    │   ├── access-logs.js
    │   ├── device-monitoring.js
    │   ├── reports.js
    │   └── settings.js
    ├── firebase.json            ← Firebase Hosting config
    └── database.rules.json      ← Firebase security rules
```

---

## Setup Guide

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** and follow the steps
3. Enable **Realtime Database** (Start in test mode, then apply rules)
4. Enable **Authentication → Email/Password**
5. Create an admin account: Authentication → Users → Add user
6. Go to **Project Settings → Your Apps → Add App (Web)** and copy your config

### 2. Configure the Web App

Open `web/js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 3. Configure the Arduino Firmware

Open `RFID.ino` and update these lines:

```cpp
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define FIREBASE_HOST "YOUR_PROJECT_ID-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"   // Project Settings → Service Accounts → Database Secrets
```

Also update the fallback UID to match your key fob:
```cpp
const String FALLBACK_UID = "3C:18:19:49";  // Replace with your actual UID
```

### 4. Required Arduino Libraries

Install these in Arduino IDE (Tools → Manage Libraries):

| Library | Version |
|---------|---------|
| MFRC522 | Latest  |
| Adafruit SSD1306 | Latest |
| Adafruit GFX Library | Latest |
| Firebase ESP32 Client (by Mobizt) | Latest |
| ArduinoJson | 6.x |

### 5. Deploy the Firebase Security Rules

Install Firebase CLI and deploy:
```bash
npm install -g firebase-tools
firebase login
cd web
firebase deploy --only database,hosting
```

Or paste `database.rules.json` contents manually in Firebase Console → Realtime Database → Rules.

### 6. Run Locally (No Hosting Required)

Open `web/index.html` directly in your browser. Since Firebase is cloud-based, it works without a local server.

---

## How It Works

```
RFID Card → ESP32 (MFRC522)
                ↓ checks against local cache
            Access Decision (fast, local)
                ↓ LEDs + Buzzer + OLED
            Firebase Realtime Database
                ↓ real-time sync
            Web Dashboard
```

- **Access decisions are made locally** on the ESP32 for instant response
- **Authorized UID list is synced** from Firebase every 60 seconds
- **Offline mode**: if WiFi is lost, the ESP32 uses its last synced UID list and queues logs
- **Log queue** is flushed automatically when connectivity returns
- **Heartbeat** is sent every 30 seconds so the dashboard shows online/offline status

---

## Web App Pages

| Page | Description |
|------|-------------|
| Dashboard | Live stats, access overview charts, recent activity |
| RFID Management | Register/edit/disable/delete authorized cards |
| Access Logs | Full history with search, filter by status/date, CSV export |
| Device Monitor | ESP32 online status, IP, signal strength, last seen |
| Reports | Hourly distribution, success rate, 30-day trend charts |
| Settings | System config, admin password change, danger zone |

---

## Firebase Database Structure

```
/authorizedCards/{key}
  uid:       "3C:18:19:49"
  name:      "Juan dela Cruz"
  role:      "Student"
  active:    true
  createdAt: "2024-01-01T00:00:00Z"

/accessLogs/{key}
  uid:        "3C:18:19:49"
  name:       "Juan dela Cruz"
  authorized: true
  status:     "Granted"
  timestamp:  "2024-01-01T08:30:00Z"
  deviceId:   "ESP32-RFID-001"
  deviceName: "Main Entrance RFID"

/devices/ESP32-RFID-001
  online:     true
  lastSeen:   "2024-01-01T08:30:00Z"
  ip:         "192.168.1.100"
  rssi:       -55
  freeHeap:   120000

/stats
  authorizedCount:   100
  unauthorizedCount: 20

/settings
  systemName:        "RFID Access Control System"
  scanCooldown:      2000
  heartbeatInterval: 30
```
