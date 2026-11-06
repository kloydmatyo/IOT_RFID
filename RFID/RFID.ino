/*
 * IoT-Based RFID Access Control System
 * ESP32 + MFRC522 + OLED SSD1306 + LEDs + Buzzer + Firebase
 *
 * Pin Configuration:
 *   RFID SDA/SS  -> GPIO 5
 *   RFID RST     -> GPIO 21
 *   Green LED    -> GPIO 2
 *   Red LED      -> GPIO 4
 *   Buzzer       -> GPIO 22
 *   OLED SDA     -> GPIO 16
 *   OLED SCL     -> GPIO 17
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FirebaseESP32.h>
#include <ArduinoJson.h>
#include <time.h>

// ─── Pin Definitions ────────────────────────────────────────────────────────
#define SS_PIN       5
#define RST_PIN      21
#define Green_LED    2
#define Red_LED      4
#define BUZZER_PIN   22
#define OLED_SDA     16
#define OLED_SCL     17

// ─── OLED ────────────────────────────────────────────────────────────────────
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_ADDRESS  0x3C

// ─── WiFi Credentials ────────────────────────────────────────────────────────
#define WIFI_SSID     "HUAWEI-2.4G-9HCe"
#define WIFI_PASSWORD "wNhKn2Tn"

// ─── Firebase Configuration ──────────────────────────────────────────────────
#define FIREBASE_HOST "iot-rfid-592c9-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "Id8Z5DX4uFG9Ha3kNuQKfUXMyp5Im0kmMVeaZcKt"

// ─── Device Identity ─────────────────────────────────────────────────────────
#define DEVICE_ID     "ESP32-RFID-001"
#define DEVICE_NAME   "Main Entrance RFID"

// ─── Timing Constants ────────────────────────────────────────────────────────
#define HEARTBEAT_INTERVAL    30000   // 30 seconds
#define AUTH_SYNC_INTERVAL    60000   // 1 minute
#define NTP_RETRY_INTERVAL    5000    // 5 seconds

// ─── Objects ─────────────────────────────────────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
FirebaseData fbData;
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

// ─── State Variables ─────────────────────────────────────────────────────────
bool oledReady        = false;
bool firebaseReady    = false;
bool timeReady        = false;

unsigned long lastHeartbeat   = 0;
unsigned long lastAuthSync    = 0;
unsigned long lastScanTime    = 0;
const unsigned long SCAN_COOLDOWN = 2000; // prevent duplicate scans

// ─── Authorized UIDs (local cache, synced from Firebase) ─────────────────────
// Format: comma-separated hex bytes, e.g. "3C:18:19:49"
#define MAX_AUTHORIZED  20
String authorizedUIDs[MAX_AUTHORIZED];
int authorizedCount = 0;

// Fallback hardcoded UID used if Firebase is unreachable on first boot
// Replace with your actual key fob UID
const String FALLBACK_UID = "3C:18:19:49";

// ─── Offline Log Queue ────────────────────────────────────────────────────────
#define MAX_QUEUE 10
struct LogEntry {
  String uid;
  String name;
  bool   authorized;
  String timestamp;
  bool   pending;
};
LogEntry logQueue[MAX_QUEUE];
int queueCount = 0;

// ────────────────────────────────────────────────────────────────────────────
// Utility: Format UID bytes to colon-separated hex string
// ────────────────────────────────────────────────────────────────────────────
String formatUID(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (i > 0) result += ":";
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Utility: Get current ISO8601 timestamp
// ────────────────────────────────────────────────────────────────────────────
String getTimestamp() {
  if (!timeReady) return "1970-01-01T00:00:00Z";
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// ────────────────────────────────────────────────────────────────────────────
// OLED helpers
// ────────────────────────────────────────────────────────────────────────────
void showMessage(const char *line1, const char *line2 = "") {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(line1);
  display.println();
  display.println(line2);
  display.display();
}

void showStatus(const char *line1, const char *line2, const char *line3) {
  if (!oledReady) return;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(line1);
  display.println(line2);
  display.println(line3);
  display.display();
}

// ────────────────────────────────────────────────────────────────────────────
// WiFi Connection
// ────────────────────────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  showMessage("Connecting...", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
    showStatus("WiFi OK", WiFi.localIP().toString().c_str(), "");
  } else {
    Serial.println("\nWiFi failed - running in offline mode");
    showMessage("WiFi Failed", "Offline Mode");
    delay(2000);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// NTP Time Sync
// ────────────────────────────────────────────────────────────────────────────
void syncTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing time");
  unsigned long start = millis();
  while (!time(nullptr) && millis() - start < 10000) {
    delay(NTP_RETRY_INTERVAL);
    Serial.print(".");
  }
  time_t now = time(nullptr);
  if (now > 1000) {
    timeReady = true;
    Serial.println("\nTime synced: " + String(ctime(&now)));
  } else {
    Serial.println("\nTime sync failed");
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Firebase Initialization
// ────────────────────────────────────────────────────────────────────────────
void initFirebase() {
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  fbData.setResponseSize(4096);

  firebaseReady = true;
  Serial.println("Firebase initialized");
}

// ────────────────────────────────────────────────────────────────────────────
// Sync Authorized UIDs from Firebase
// ────────────────────────────────────────────────────────────────────────────
void syncAuthorizedUIDs() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  Serial.println("Syncing authorized UIDs from Firebase...");
  authorizedCount = 0;

  if (Firebase.getJSON(fbData, "/authorizedCards")) {
    FirebaseJson &json = fbData.jsonObject();
    FirebaseJsonData result;
    size_t len = json.iteratorBegin();

    for (size_t i = 0; i < len && authorizedCount < MAX_AUTHORIZED; i++) {
      String key, val;
      int type;
      json.iteratorGet(i, type, key, val);

      // Each entry: { "uid": "3C:18:19:49", "active": true, ... }
      FirebaseJson entry;
      entry.setJsonData(val);

      FirebaseJsonData uidData, activeData;
      entry.get(uidData, "uid");
      entry.get(activeData, "active");

      if (uidData.success) {
        bool active = true;
        if (activeData.success) active = activeData.boolValue;

        if (active) {
          authorizedUIDs[authorizedCount++] = uidData.stringValue;
          Serial.println("  Loaded: " + uidData.stringValue);
        }
      }
    }
    json.iteratorEnd();
    Serial.printf("Loaded %d authorized UIDs\n", authorizedCount);
  } else {
    Serial.println("Failed to sync UIDs: " + fbData.errorReason());
    // Load fallback UID if nothing cached yet
    if (authorizedCount == 0) {
      authorizedUIDs[authorizedCount++] = FALLBACK_UID;
      Serial.println("Using fallback UID: " + FALLBACK_UID);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Check if a UID is authorized
// ────────────────────────────────────────────────────────────────────────────
bool isAuthorized(const String &uid) {
  for (int i = 0; i < authorizedCount; i++) {
    if (authorizedUIDs[i].equalsIgnoreCase(uid)) return true;
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Lookup cardholder name from Firebase
// ────────────────────────────────────────────────────────────────────────────
String getCardholderName(const String &uid) {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return "Unknown";

  // Search authorizedCards for matching UID
  if (Firebase.getJSON(fbData, "/authorizedCards")) {
    FirebaseJson &json = fbData.jsonObject();
    size_t len = json.iteratorBegin();

    for (size_t i = 0; i < len; i++) {
      String key, val;
      int type;
      json.iteratorGet(i, type, key, val);

      FirebaseJson entry;
      entry.setJsonData(val);

      FirebaseJsonData uidData, nameData;
      entry.get(uidData, "uid");
      entry.get(nameData, "name");

      if (uidData.success && uidData.stringValue.equalsIgnoreCase(uid)) {
        json.iteratorEnd();
        return nameData.success ? nameData.stringValue : "Unknown";
      }
    }
    json.iteratorEnd();
  }
  return "Unknown";
}

// ────────────────────────────────────────────────────────────────────────────
// Upload access log to Firebase (or queue if offline)
// ────────────────────────────────────────────────────────────────────────────
void uploadAccessLog(const String &uid, const String &name,
                     bool authorized, const String &timestamp) {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) {
    // Queue for later upload
    if (queueCount < MAX_QUEUE) {
      logQueue[queueCount] = {uid, name, authorized, timestamp, true};
      queueCount++;
      Serial.println("Log queued (offline): " + uid);
    }
    return;
  }

  FirebaseJson logEntry;
  logEntry.set("uid",        uid);
  logEntry.set("name",       name);
  logEntry.set("authorized", authorized);
  logEntry.set("status",     authorized ? "Granted" : "Denied");
  logEntry.set("timestamp",  timestamp);
  logEntry.set("deviceId",   DEVICE_ID);
  logEntry.set("deviceName", DEVICE_NAME);

  String path = "/accessLogs/" + String(millis());

  if (Firebase.pushJSON(fbData, "/accessLogs", logEntry)) {
    Serial.println("Log uploaded: " + uid + " -> " + (authorized ? "Granted" : "Denied"));

    // Update dashboard counters atomically
    Firebase.setTimestamp(fbData, "/devices/" + String(DEVICE_ID) + "/lastScan");

    if (authorized) {
      Firebase.setInt(fbData, "/stats/authorizedCount",
        fbData.intData() + 1);
    } else {
      Firebase.setInt(fbData, "/stats/unauthorizedCount",
        fbData.intData() + 1);
    }
  } else {
    Serial.println("Upload failed: " + fbData.errorReason());
    if (queueCount < MAX_QUEUE) {
      logQueue[queueCount] = {uid, name, authorized, timestamp, true};
      queueCount++;
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Flush offline log queue
// ────────────────────────────────────────────────────────────────────────────
void flushLogQueue() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;
  for (int i = 0; i < queueCount; i++) {
    if (logQueue[i].pending) {
      uploadAccessLog(logQueue[i].uid, logQueue[i].name,
                      logQueue[i].authorized, logQueue[i].timestamp);
      logQueue[i].pending = false;
    }
  }
  queueCount = 0;
  Serial.println("Log queue flushed");
}

// ────────────────────────────────────────────────────────────────────────────
// Heartbeat – update device last-seen and online status
// ────────────────────────────────────────────────────────────────────────────
void sendHeartbeat() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  String basePath = "/devices/" + String(DEVICE_ID);
  FirebaseJson deviceInfo;
  deviceInfo.set("deviceId",   DEVICE_ID);
  deviceInfo.set("deviceName", DEVICE_NAME);
  deviceInfo.set("online",     true);
  deviceInfo.set("lastSeen",   getTimestamp());
  deviceInfo.set("ip",         WiFi.localIP().toString());
  deviceInfo.set("rssi",       WiFi.RSSI());
  deviceInfo.set("freeHeap",   ESP.getFreeHeap());

  if (Firebase.updateNode(fbData, basePath, deviceInfo)) {
    Serial.println("Heartbeat sent");
  } else {
    Serial.println("Heartbeat failed: " + fbData.errorReason());
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Handle AUTHORIZED access
// ────────────────────────────────────────────────────────────────────────────
void handleAuthorized(const String &uid, const String &name) {
  Serial.println("ACCESS GRANTED: " + uid + " (" + name + ")");
  showMessage("Access Granted", ("Welcome, " + name).c_str());

  digitalWrite(Green_LED, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(1800);
  digitalWrite(Green_LED, LOW);
}

// ────────────────────────────────────────────────────────────────────────────
// Handle UNAUTHORIZED access
// ────────────────────────────────────────────────────────────────────────────
void handleUnauthorized(const String &uid) {
  Serial.println("ACCESS DENIED: " + uid);
  showMessage("Access Denied", "Unknown card");

  digitalWrite(Red_LED, HIGH);
  for (byte beep = 0; beep < 2; beep++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(200);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
  delay(1200);
  digitalWrite(Red_LED, LOW);
}

// ────────────────────────────────────────────────────────────────────────────
// SETUP
// ────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== RFID Access Control System ===");

  // GPIO setup
  pinMode(Green_LED,  OUTPUT);
  pinMode(Red_LED,    OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(Green_LED,  LOW);
  digitalWrite(Red_LED,    LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED init failed");
  } else {
    oledReady = true;
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    showMessage("Booting...", "Please wait");
  }

  // SPI + RFID
  SPI.begin();
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");

  // WiFi
  connectWiFi();

  if (WiFi.status() == WL_CONNECTED) {
    syncTime();
    initFirebase();
    syncAuthorizedUIDs();
    sendHeartbeat();
  } else {
    // Load fallback UID for offline operation
    authorizedUIDs[authorizedCount++] = FALLBACK_UID;
    Serial.println("Offline: using fallback UID");
  }

  showMessage("RFID Ready", "Scan a card...");
  Serial.println("System ready. Waiting for card...\n");
}

// ────────────────────────────────────────────────────────────────────────────
// LOOP
// ────────────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Heartbeat ──────────────────────────────────────────────────────────────
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
    flushLogQueue();
  }

  // ── Auth sync ──────────────────────────────────────────────────────────────
  if (now - lastAuthSync >= AUTH_SYNC_INTERVAL) {
    lastAuthSync = now;
    syncAuthorizedUIDs();
  }

  // ── WiFi reconnect ─────────────────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost – reconnecting...");
    showMessage("WiFi Lost", "Reconnecting...");
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED && !timeReady) syncTime();
    if (WiFi.status() == WL_CONNECTED && !firebaseReady) {
      initFirebase();
      syncAuthorizedUIDs();
    }
  }

  // ── Scan cooldown: ignore rapid repeated reads ──────────────────────────────
  if (now - lastScanTime < SCAN_COOLDOWN) return;

  // ── Wait for RFID card ─────────────────────────────────────────────────────
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  lastScanTime = now;

  String uid = formatUID(rfid.uid.uidByte, rfid.uid.size);
  String timestamp = getTimestamp();
  Serial.println("Card detected: " + uid);

  bool auth = isAuthorized(uid);
  String name = auth ? getCardholderName(uid) : "Unknown";

  if (auth) {
    handleAuthorized(uid, name);
  } else {
    handleUnauthorized(uid);
  }

  // Upload log (queued if offline)
  uploadAccessLog(uid, name, auth, timestamp);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  showMessage("RFID Ready", "Scan a card...");
}
