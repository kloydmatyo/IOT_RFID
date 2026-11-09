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
 *
 * Firebase paths used:
 *   /activeSessions/{DEVICE_ID}         – read: classKey, className, classCode, active
 *   /students                           – read: rfidUid, name, studentId, classKeys
 *   /attendance/{classKey}/{date}/{studentKey} – write: tap-in / tap-out records
 *   /accessLogs                         – write: every scan (admin dashboard)
 *   /devices/{DEVICE_ID}               – write: heartbeat
 *   /authorizedCards                    – read: admin-registered cards (legacy check)
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
#define SESSION_SYNC_INTERVAL 10000   // 10 seconds – check for active class session
#define TEST_CLOCK_SYNC_INTERVAL 5000 // 5 seconds – check for browser test clock
#define NTP_RETRY_INTERVAL    5000    // 5 seconds
#define SCAN_COOLDOWN         2000    // prevent duplicate scans

// ─── Late threshold ──────────────────────────────────────────────────────────
// Minutes after class start time before a tap is considered "late"
#define LATE_GRACE_MIN 15

// ─── Objects ─────────────────────────────────────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
FirebaseData fbData;
FirebaseData fbData2;   // second stream for student lookup (avoids reuse conflict)
FirebaseAuth fbAuth;
FirebaseConfig fbConfig;

// ─── State Variables ─────────────────────────────────────────────────────────
bool oledReady     = false;
bool firebaseReady = false;
bool timeReady     = false;

unsigned long lastHeartbeat    = 0;
unsigned long lastAuthSync     = 0;
unsigned long lastSessionSync  = 0;
unsigned long lastTestClockSync = 0;
unsigned long lastScanTime     = 0;
bool testClockEnabled          = false;
unsigned long long testClockBaseMs = 0;
unsigned long testClockSetAtMillis = 0;

// ─── Authorized UIDs cache (for admin /accessLogs path) ──────────────────────
#define MAX_AUTHORIZED 20
String authorizedUIDs[MAX_AUTHORIZED];
int    authorizedCount = 0;
const String FALLBACK_UID = "3C:18:19:49";

// ─── Active session (set by the teacher via the web app) ─────────────────────
struct ActiveSession {
  bool   active      = false;
  String classKey;
  String className;
  String classCode;
  String teacherUid;
  String startedAt;   // ISO timestamp stored by the web app
  String classStart;  // "HH:MM" scheduled class start, e.g. "08:00"
};
ActiveSession currentSession;

// ─── Offline log queue ────────────────────────────────────────────────────────
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

// ─── Student lookup result ────────────────────────────────────────────────────
struct StudentInfo {
  bool   found      = false;
  String key;          // Firebase push key
  String name;
  String studentId;
  String rfidUid;
  String classKeys[10];
  int    classCount = 0;
};

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

/**
 * Plain UID without separators – matches how students are stored in Firebase
 * e.g. "3C:18:19:49" → "3C181949"
 */
String uidPlain(byte *uid, byte size) {
  String result = "";
  for (byte i = 0; i < size; i++) {
    if (uid[i] < 0x10) result += "0";
    result += String(uid[i], HEX);
  }
  result.toUpperCase();
  return result;
}

unsigned long long getCurrentEpochMs() {
  if (testClockEnabled) {
    return testClockBaseMs + (unsigned long)(millis() - testClockSetAtMillis);
  }
  if (!timeReady) return 0;
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  return (unsigned long long)tv.tv_sec * 1000ULL + tv.tv_usec / 1000ULL;
}

// ────────────────────────────────────────────────────────────────────────────
// Utility: Get current ISO8601 timestamp (UTC)
// ────────────────────────────────────────────────────────────────────────────
String getTimestamp() {
  if (!timeReady && !testClockEnabled) return "1970-01-01T00:00:00Z";
  time_t now = (time_t)(getCurrentEpochMs() / 1000ULL);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

// Returns "YYYY-MM-DD" in local time (UTC+8 baked into configTime)
String getLocalDatePH() {
  if (!timeReady && !testClockEnabled) return "1970-01-01";
  time_t now = (time_t)(getCurrentEpochMs() / 1000ULL);
  struct tm ti;
  localtime_r(&now, &ti);
  char buf[12];
  strftime(buf, sizeof(buf), "%Y-%m-%d", &ti);
  return String(buf);
}

// Returns current minutes-since-midnight in local time
int getLocalMinutesPH() {
  if (!timeReady && !testClockEnabled) return 0;
  time_t now = (time_t)(getCurrentEpochMs() / 1000ULL);
  struct tm ti;
  localtime_r(&now, &ti);
  return ti.tm_hour * 60 + ti.tm_min;
}

// Returns epoch milliseconds as String
String getEpochMs() {
  return String(getCurrentEpochMs());
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
  // UTC+8 (Philippines) — baked into configTime so local date helpers work directly
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");
  Serial.print("Syncing time");

  // Wait up to 20 seconds, polling every 500 ms
  unsigned long start = millis();
  time_t now = 0;
  while (millis() - start < 20000) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    if (now > 100000UL) break;  // valid epoch (well past 1970-01-01)
  }

  if (now > 100000UL) {
    timeReady = true;
    Serial.println("\nTime synced: " + String(ctime(&now)));
  } else {
    Serial.println("\nTime sync failed - timestamps will show 1970");
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
  fbData2.setResponseSize(4096);

  firebaseReady = true;
  Serial.println("Firebase initialized");
}

// ────────────────────────────────────────────────────────────────────────────
// Sync Authorized UIDs from /authorizedCards (admin side, for access log)
// ────────────────────────────────────────────────────────────────────────────
void syncAuthorizedUIDs() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  Serial.println("Syncing authorized UIDs...");
  authorizedCount = 0;

  if (Firebase.getJSON(fbData, "/authorizedCards")) {
    FirebaseJson &json = fbData.jsonObject();
    size_t len = json.iteratorBegin();

    for (size_t i = 0; i < len && authorizedCount < MAX_AUTHORIZED; i++) {
      String key, val;
      int type;
      json.iteratorGet(i, type, key, val);

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
        }
      }
    }
    json.iteratorEnd();
    Serial.printf("Loaded %d authorized UIDs\n", authorizedCount);
  } else {
    Serial.println("Failed to sync UIDs: " + fbData.errorReason());
    if (authorizedCount == 0) {
      authorizedUIDs[authorizedCount++] = FALLBACK_UID;
    }
  }
}

bool isAuthorized(const String &uid) {
  for (int i = 0; i < authorizedCount; i++) {
    if (authorizedUIDs[i].equalsIgnoreCase(uid)) return true;
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Sync Active Session from Firebase
// ────────────────────────────────────────────────────────────────────────────
void syncActiveSession() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  String path = "/activeSessions/" + String(DEVICE_ID);
  if (!Firebase.getJSON(fbData, path)) {
    // No session node at all – clear
    currentSession.active = false;
    return;
  }

  FirebaseJson &json = fbData.jsonObject();
  FirebaseJsonData activeData, classKeyData, classNameData, classCodeData,
                   teacherData, startedAtData, classStartData;

  json.get(activeData,     "active");
  json.get(classKeyData,   "classKey");
  json.get(classNameData,  "className");
  json.get(classCodeData,  "classCode");
  json.get(teacherData,    "teacherUid");
  json.get(startedAtData,  "startedAt");
  json.get(classStartData, "classStart");

  bool sessionActive = activeData.success && activeData.boolValue;

  if (!sessionActive) {
    currentSession.active = false;
    Serial.println("No active session.");
    return;
  }

  currentSession.active     = true;
  currentSession.classKey   = classKeyData.success  ? classKeyData.stringValue  : "";
  currentSession.className  = classNameData.success ? classNameData.stringValue : "";
  currentSession.classCode  = classCodeData.success ? classCodeData.stringValue : "";
  currentSession.teacherUid = teacherData.success   ? teacherData.stringValue   : "";
  currentSession.startedAt  = startedAtData.success  ? startedAtData.stringValue : "";
  currentSession.classStart = classStartData.success ? classStartData.stringValue : "";

  Serial.println("Active session: " + currentSession.className + " / " + currentSession.classKey);
}

// ────────────────────────────────────────────────────────────────────────────
// Sync browser test clock from Firebase
// ────────────────────────────────────────────────────────────────────────────
void syncTestClock() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  if (!Firebase.getJSON(fbData, "/settings/testClock")) return;

  FirebaseJson &json = fbData.jsonObject();
  FirebaseJsonData enabledData, epochData;
  json.get(enabledData, "enabled");
  json.get(epochData, "epochMs");

  bool enabled = enabledData.success && enabledData.boolValue;
  if (!enabled || !epochData.success) {
    if (testClockEnabled) Serial.println("Test clock disabled; using NTP time.");
    testClockEnabled = false;
    return;
  }

  unsigned long long configuredMs = (unsigned long long)epochData.doubleValue;
  if (!testClockEnabled || configuredMs != testClockBaseMs) {
    testClockBaseMs = configuredMs;
    testClockSetAtMillis = millis();
    testClockEnabled = true;
    Serial.println("Test clock enabled: " + String((unsigned long)(configuredMs / 1000ULL)));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Look up a student in /students by plain UID (e.g. "7F3A91C2")
// Returns: studentKey in `outKey`, populates name/studentId/classKeys
// ────────────────────────────────────────────────────────────────────────────
StudentInfo lookupStudentByUID(const String &plainUID) {
  StudentInfo info;
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return info;

  if (!Firebase.getJSON(fbData2, "/students")) {
    Serial.println("Failed to read /students: " + fbData2.errorReason());
    return info;
  }

  FirebaseJson &root = fbData2.jsonObject();
  size_t len = root.iteratorBegin();

  for (size_t i = 0; i < len; i++) {
    String key, val;
    int type;
    root.iteratorGet(i, type, key, val);

    FirebaseJson entry;
    entry.setJsonData(val);

    FirebaseJsonData rfidData;
    entry.get(rfidData, "rfidUid");

    if (rfidData.success && rfidData.stringValue.equalsIgnoreCase(plainUID)) {
      info.found = true;
      info.key   = key;

      FirebaseJsonData nameData, idData;
      entry.get(nameData, "name");
      entry.get(idData,   "studentId");
      info.name      = nameData.success ? nameData.stringValue : "Unknown";
      info.studentId = idData.success   ? idData.stringValue   : "";
      info.rfidUid   = plainUID;

      // Parse classKeys array
      FirebaseJson classKeysJson;
      FirebaseJsonData classKeysData;
      entry.get(classKeysData, "classKeys");
      if (classKeysData.success && classKeysData.type == "array") {
        classKeysJson.setJsonData(classKeysData.stringValue);
        size_t cLen = classKeysJson.iteratorBegin();
        for (size_t c = 0; c < cLen && info.classCount < 10; c++) {
          String ck, cv;
          int ct;
          classKeysJson.iteratorGet(c, ct, ck, cv);
          if (cv.startsWith("\"")) cv = cv.substring(1, cv.length() - 1);
          info.classKeys[info.classCount++] = cv;
        }
        classKeysJson.iteratorEnd();
      }
      break;
    }
  }
  root.iteratorEnd();
  return info;
}

// ────────────────────────────────────────────────────────────────────────────
// Write attendance record to Firebase
// Path: /attendance/{classKey}/{date}/{studentKey}
// ────────────────────────────────────────────────────────────────────────────
void writeAttendance(const String &classKey, const String &date,
                     const StudentInfo &student, bool isTapOut,
                     unsigned long long epochMs, const String &status) {
  String path = "/attendance/" + classKey + "/" + date + "/" + student.key;

  // Check if a tap-in record already exists
  bool existing = false;
  if (Firebase.getJSON(fbData, path)) {
    existing = true;
  }

  FirebaseJson rec;

  if (isTapOut && existing) {
    // Second tap: only update timeOutMs
    rec.set("timeOutMs", (int64_t)epochMs);
    Firebase.updateNode(fbData, path, rec);
    Serial.println("Tap-OUT recorded for: " + student.name);
  } else if (!existing) {
    // First tap: create full record
    rec.set("studentKey",  student.key);
    rec.set("studentId",   student.studentId);
    rec.set("studentName", student.name);
    rec.set("classKey",    classKey);
    rec.set("date",        date);
    rec.set("status",      status);
    rec.set("timeInMs",    (int64_t)epochMs);
    rec.set("writtenBy",   "rfid");
    Firebase.set(fbData, path, rec);
    Serial.println("Tap-IN recorded for: " + student.name + " [" + status + "]");
  } else {
    // Already has a tap-in — treat as tap-out
    rec.set("timeOutMs", (int64_t)epochMs);
    Firebase.updateNode(fbData, path, rec);
    Serial.println("Tap-OUT (2nd tap) recorded for: " + student.name);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Upload access log to /accessLogs (admin dashboard)
// ────────────────────────────────────────────────────────────────────────────
void uploadAccessLog(const String &uid, const String &name,
                     bool authorized, const String &timestamp) {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) {
    if (queueCount < MAX_QUEUE) {
      logQueue[queueCount++] = {uid, name, authorized, timestamp, true};
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

  if (!Firebase.pushJSON(fbData, "/accessLogs", logEntry)) {
    Serial.println("Access log upload failed: " + fbData.errorReason());
    if (queueCount < MAX_QUEUE) {
      logQueue[queueCount++] = {uid, name, authorized, timestamp, true};
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
}

// ────────────────────────────────────────────────────────────────────────────
// Heartbeat
// ────────────────────────────────────────────────────────────────────────────
void sendHeartbeat() {
  if (!firebaseReady || WiFi.status() != WL_CONNECTED) return;

  String basePath = "/devices/" + String(DEVICE_ID);
  FirebaseJson info;
  info.set("deviceId",   DEVICE_ID);
  info.set("deviceName", DEVICE_NAME);
  info.set("online",     true);
  info.set("lastSeen",   getTimestamp());
  info.set("ip",         WiFi.localIP().toString());
  info.set("rssi",       WiFi.RSSI());
  info.set("freeHeap",   ESP.getFreeHeap());

  // Report whether a class session is active
  if (currentSession.active) {
    info.set("activeClass",     currentSession.className);
    info.set("activeClassCode", currentSession.classCode);
  } else {
    info.set("activeClass",     "—");
    info.set("activeClassCode", "—");
  }

  if (!Firebase.updateNode(fbData, basePath, info)) {
    Serial.println("Heartbeat failed: " + fbData.errorReason());
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Handle AUTHORIZED access (green LED + short beep)
// ────────────────────────────────────────────────────────────────────────────
void handleAuthorized(const String &name, const String &status) {
  Serial.println("ACCESS OK: " + name + " [" + status + "]");
  String line2 = (status == "late") ? "Late: " + name : "Welcome, " + name;
  showMessage(status == "late" ? "Late Tap-In" : "Tap-In OK", line2.c_str());

  digitalWrite(Green_LED, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);
  delay(1800);
  digitalWrite(Green_LED, LOW);
}

void handleTapOut(const String &name) {
  Serial.println("TAP-OUT: " + name);
  showMessage("Tap-Out OK", ("Bye, " + name).c_str());

  digitalWrite(Green_LED, HIGH);
  for (byte b = 0; b < 2; b++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(100);
    digitalWrite(BUZZER_PIN, LOW);  delay(100);
  }
  delay(1400);
  digitalWrite(Green_LED, LOW);
}

// ────────────────────────────────────────────────────────────────────────────
// Handle UNAUTHORIZED / not enrolled
// ────────────────────────────────────────────────────────────────────────────
void handleUnauthorized(const String &uid, const char *reason = "Unknown card") {
  Serial.println("ACCESS DENIED: " + uid);
  showMessage("Access Denied", reason);

  digitalWrite(Red_LED, HIGH);
  for (byte b = 0; b < 2; b++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(200);
    digitalWrite(BUZZER_PIN, LOW);  delay(200);
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
  Serial.println("\n=== RFID Attendance System ===");

  // GPIO
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
    syncActiveSession();
    syncTestClock();
    sendHeartbeat();
  } else {
    authorizedUIDs[authorizedCount++] = FALLBACK_UID;
  }

  if (currentSession.active) {
    String ready = currentSession.className + " " + currentSession.classCode;
    showMessage("Ready", ready.c_str());
  } else {
    showMessage("RFID Ready", "No active session");
  }
  Serial.println("System ready.\n");
}

// ────────────────────────────────────────────────────────────────────────────
// LOOP
// ────────────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Heartbeat
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
    flushLogQueue();
  }

  // Auth sync (admin cards)
  if (now - lastAuthSync >= AUTH_SYNC_INTERVAL) {
    lastAuthSync = now;
    syncAuthorizedUIDs();
  }

  // Session sync (which class is active)
  if (now - lastSessionSync >= SESSION_SYNC_INTERVAL) {
    lastSessionSync = now;
    syncActiveSession();

    // Update OLED to reflect current session state
    if (currentSession.active) {
      String line = currentSession.className + " " + currentSession.classCode;
      showMessage("Session Active", line.c_str());
    } else {
      showMessage("RFID Ready", "No active session");
    }
  }

  if (now - lastTestClockSync >= TEST_CLOCK_SYNC_INTERVAL) {
    lastTestClockSync = now;
    syncTestClock();
  }

  // WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost – reconnecting...");
    showMessage("WiFi Lost", "Reconnecting...");
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED) {
      if (!timeReady)     syncTime();
      if (!firebaseReady) { initFirebase(); syncAuthorizedUIDs(); }
      syncActiveSession();
    }
  }

  // Scan cooldown
  if (now - lastScanTime < SCAN_COOLDOWN) return;

  // Wait for card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  lastScanTime = now;

  String uidFormatted = formatUID(rfid.uid.uidByte, rfid.uid.size);
  String uidPlainStr  = uidPlain(rfid.uid.uidByte, rfid.uid.size);
  String timestamp    = getTimestamp();
  String date         = getLocalDatePH();
  unsigned long long epochMs = 0;
  epochMs = getCurrentEpochMs();

  Serial.println("Card: " + uidFormatted + " (plain: " + uidPlainStr + ")");

  // ── Teacher attendance path ───────────────────────────────────────────────
  if (currentSession.active && currentSession.classKey.length() > 0) {
    StudentInfo student = lookupStudentByUID(uidPlainStr);

    if (!student.found) {
      // Not in /students at all
      handleUnauthorized(uidFormatted, "Not registered");
      uploadAccessLog(uidFormatted, "Unknown", false, timestamp);
    } else {
      // Check if enrolled in the active class
      bool enrolled = false;
      for (int i = 0; i < student.classCount; i++) {
        if (student.classKeys[i] == currentSession.classKey) {
          enrolled = true;
          break;
        }
      }

      if (!enrolled) {
        handleUnauthorized(uidFormatted, "Not in class");
        uploadAccessLog(uidFormatted, student.name, false, timestamp);
      } else {
        // Determine tap-in status
        String attPath = "/attendance/" + currentSession.classKey + "/" + date + "/" + student.key;
        bool hasTapIn  = Firebase.getJSON(fbData, attPath);
        bool hasTapOut = false;

        if (hasTapIn) {
          FirebaseJson &rec = fbData.jsonObject();
          FirebaseJsonData tapOutData;
          rec.get(tapOutData, "timeOutMs");
          hasTapOut = tapOutData.success;
        }

        if (!hasTapIn) {
          // First tap → tap-in, check lateness against scheduled class start
          String status = "present";
          if (timeReady && currentSession.classStart.length() == 5) {
            int classHour = currentSession.classStart.substring(0, 2).toInt();
            int classMin  = currentSession.classStart.substring(3, 5).toInt();
            int classStartTotalMin = classHour * 60 + classMin;
            int nowMin = getLocalMinutesPH();
            if (nowMin > classStartTotalMin + LATE_GRACE_MIN) {
              status = "late";
            }
            Serial.printf("Class start: %02d:%02d | Now: %d min | Threshold: %d | Status: %s\n",
              classHour, classMin, nowMin, classStartTotalMin + LATE_GRACE_MIN, status.c_str());
          }
          writeAttendance(currentSession.classKey, date, student, false, epochMs, status);
          handleAuthorized(student.name, status);
          uploadAccessLog(uidFormatted, student.name, true, timestamp);

        } else if (hasTapIn && !hasTapOut) {
          // Second tap → tap-out
          writeAttendance(currentSession.classKey, date, student, true, epochMs, "");
          handleTapOut(student.name);
          uploadAccessLog(uidFormatted, student.name, true, timestamp);

        } else {
          // Already has both tap-in and tap-out
          showMessage("Already tapped", student.name.c_str());
          delay(2000);
        }
      }
    }
  }
  // ── Admin-only path (no active session) ───────────────────────────────────
  else {
    bool auth = isAuthorized(uidFormatted);
    String name = "Unknown";

    if (auth) {
      // Try to get name from /authorizedCards
      if (Firebase.getJSON(fbData, "/authorizedCards")) {
        FirebaseJson &json = fbData.jsonObject();
        size_t len = json.iteratorBegin();
        for (size_t i = 0; i < len; i++) {
          String key, val; int type;
          json.iteratorGet(i, type, key, val);
          FirebaseJson entry; entry.setJsonData(val);
          FirebaseJsonData uidData, nameData;
          entry.get(uidData, "uid");
          entry.get(nameData, "name");
          if (uidData.success && uidData.stringValue.equalsIgnoreCase(uidFormatted)) {
            if (nameData.success) name = nameData.stringValue;
            break;
          }
        }
        json.iteratorEnd();
      }
      handleAuthorized(name, "present");
    } else {
      handleUnauthorized(uidFormatted, "Unknown card");
    }
    uploadAccessLog(uidFormatted, name, auth, timestamp);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Restore OLED
  if (currentSession.active) {
    String line = currentSession.className + " " + currentSession.classCode;
    showMessage("Session Active", line.c_str());
  } else {
    showMessage("RFID Ready", "Scan a card...");
  }
}
