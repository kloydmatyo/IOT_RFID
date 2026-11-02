#include <SPI.h>           // SPI library for RFID
#include <MFRC522.h>       // RFID library
#include <Wire.h>          // I2C library
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// RFID pins
#define SS_PIN 5           // SDA for RFID
#define RST_PIN 21         // RST for RFID

#define Green_LED 2         // Green LED for authorized key fob access
#define Red_LED 4          // Red LED and buzzer for unauthorized access
#define BUZZER_PIN 22      // Buzzer output
#define OLED_SDA 16
#define OLED_SCL 17

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDRESS 0x3C

MFRC522 rfid(SS_PIN, RST_PIN);    // Create MFRC522 instance
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledReady = false;

// Predefined UID for authorized card (Replace with your blue key fob's actual UID)
byte authorizedUID[] = {0x3C, 0x18, 0x19, 0x49};

void showMessage(const char* line1, const char* line2 = "") {
  if (!oledReady) {
    return;
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println(line1);
  display.println();
  display.println(line2);
  display.display();
}

void setup() {
  Serial.begin(115200);

  pinMode(Green_LED, OUTPUT);
  pinMode(Red_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(Green_LED, LOW);
  digitalWrite(Red_LED, LOW);

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED initialization failed. Check power, GND, SDA, SCL, and address.");
  } else {
    oledReady = true;
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    showMessage("RFID ready", "Scan a card");
  }

  SPI.begin();             // Init SPI bus
  rfid.PCD_Init();         // Init RFID reader
  Serial.println("Place your RFID card near the reader...");
}

void loop() {
  // Wait for a new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }

  Serial.print("UID tag: ");
  String content = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
    content.concat(String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " "));
    content.concat(String(rfid.uid.uidByte[i], HEX));
  }
  Serial.println();

  // Check if UID matches authorized key fob
  bool authorized = rfid.uid.size == sizeof(authorizedUID);
  for (byte i = 0; authorized && i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] != authorizedUID[i]) {
      authorized = false;
      break;
    }
  }

  // Access control decision
if (authorized) {
  Serial.println("Access Granted!");
  showMessage("Access Granted", "Welcome");

  digitalWrite(Green_LED, HIGH);

  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
  digitalWrite(BUZZER_PIN, LOW);

  delay(1800);
  digitalWrite(Green_LED, LOW);
} else {
  Serial.println("Access Denied!");
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

  rfid.PICC_HaltA();  // Stop reading current card
  showMessage("RFID ready", "Scan a card");
}