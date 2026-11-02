# ESP32 RFID Attendance Tracker

This project scans RFID cards with an RC522 reader, identifies registered users, gives buzzer feedback, and prints attendance events to the Serial Monitor.

## 1. Hardware and wiring

Use an ESP32 board with the Arduino pin labels shown below. The RC522 must be powered from **3.3 V**, not 5 V.

| Component pin | ESP32 pin | Function |
| --- | ---: | --- |
| RC522 3.3V | 3V3 | Reader power |
| RC522 GND | GND | Common ground |
| RC522 SDA/SS | GPIO 5 | SPI chip select |
| RC522 SCK | GPIO 18 | SPI clock |
| RC522 MOSI | GPIO 23 | ESP32 to RC522 data |
| RC522 MISO | GPIO 19 | RC522 to ESP32 data |
| RC522 RST | GPIO 22 | Reader reset |
| RC522 IRQ | Not connected | Not used by this sketch |
| Buzzer positive/+ | GPIO 25 | Buzzer control |
| Buzzer negative/- | GND | Common ground |

For a 3-pin active buzzer, connect `S` or `+` to GPIO 25 and `-` to GND. An active buzzer should sound when its input is held HIGH. Do not connect an unknown buzzer directly if it requires more current than an ESP32 GPIO can safely supply; use a transistor driver and resistor if its datasheet requires one.

### Safety

- Never connect the RC522 VCC pin to 5 V. Its logic and power are 3.3 V.
- Turn off USB power while changing wiring.
- Check that ESP32 GND, RC522 GND, and buzzer GND are connected together.
- Do not short a GPIO to 3.3 V or GND.

## 2. Software setup

1. Install the Arduino IDE 2.x.
2. In **Boards Manager**, install **esp32 by Espressif Systems**.
3. Select an appropriate ESP32 board, such as **ESP32 Dev Module**.
4. In **Library Manager**, search for and install **MFRC522** by GithubCommunity (Miguel Balboa RFID).
5. Open `RFID.ino`, select the correct board and COM port, and upload it.
6. Open Serial Monitor at **115200 baud**.

`SPI.h` is supplied by the ESP32 Arduino core. `MFRC522.h` comes from the MFRC522 library.

## 3. Registering cards

The code initially contains example values:

```cpp
{"DE AD BE EF", "Alice"}
{"12 34 56 78", "Bob"}
```

These are not normally your cards. Upload the sketch, scan a card, and copy the `UID:` printed by the Serial Monitor. Replace the example UID with that exact uppercase, space-separated value, then upload again. Add more entries in the `users` array as needed.

Example:

```cpp
RegisteredUser users[] = {
  {"A1 B2 C3 D4", "Sam"},
  {"04 7F 2A 91 6C 12 80", "Taylor"}
};
```

Cards can have 4, 7, or another supported UID length, so copy every byte exactly. UID-only identification is suitable for a prototype, but it is not a secure access-control mechanism because some cards can be cloned.

## 4. Attendance behavior

- A registered card gets one attendance record per power/reset session.
- The record contains the user's name and `millis()` uptime in seconds.
- Scanning the same registered card again reports that the user is already marked.
- An unknown UID is reported as unregistered and produces two longer beeps.
- A registered first scan produces one short beep.
- A repeated registered scan produces two short beeps.
- A card must leave the reader before another event can be processed, preventing one card held over the antenna from generating repeated events.
- The in-memory attendance flags reset when the ESP32 restarts. There is no permanent record with the listed hardware alone.

The printed uptime is not a date or accurate clock time. Accurate timestamps require an additional DS3231 or similar RTC module, or internet time synchronization through Wi-Fi and an NTP server.

## 5. Test procedure

1. Disconnect USB power and check every wire against the table.
2. Connect the ESP32 by USB and upload `RFID.ino`.
3. Set Serial Monitor to 115200 baud and confirm `RFID attendance tracker ready.`.
4. Scan a card. Confirm that a UID is printed.
5. Register that UID in the `users` array and upload again.
6. Scan it once and confirm `Attendance recorded for ...` and one beep.
7. Scan it again after the cooldown and confirm `already marked`.
8. Scan a different, unregistered card and confirm `UNREGISTERED CARD` and two longer beeps.

### Common problems

**No card detected:** Confirm RC522 power is 3.3 V, common ground is present, the card is close to the antenna, and the card is compatible with the RC522 (13.56 MHz ISO/IEC 14443A cards such as many MIFARE cards).

**SPI communication failure:** Check SCK=18, MISO=19, MOSI=23, SDA/SS=5, and RST=22. Keep wires short. Remove other devices using the SPI bus while testing.

**Wrong UID or unknown card:** Copy the complete UID exactly as printed, including leading zeroes and spaces. UID format is case-insensitive in the sketch, but the stored example should be uppercase for clarity.

**Buzzer does not sound:** Confirm polarity and the common ground, test the buzzer with a simple HIGH/LOW sketch, and verify it is an active buzzer. Passive buzzers need a tone/PWM signal and are not equivalent to the listed active buzzer.

**Upload or board errors:** Select the correct ESP32 board and COM port, close other serial terminals, and install/update the Espressif ESP32 board package.

## 6. Example Serial Monitor output

```text
RFID attendance tracker ready.
Scan a card...
UID: A1 B2 C3 D4
Attendance recorded for Sam at uptime 18 seconds.
UID: A1 B2 C3 D4
Sam already marked for this attendance session.
UID: 99 88 77 66
UNREGISTERED CARD - attendance not recorded.
```

## 7. Limitations and practical improvements

The current prototype prints records only and keeps duplicate state in RAM. It cannot survive a reset, produce calendar timestamps, or export a file using only the listed components.

For permanent local storage, add a microSD module and save CSV records, or use the ESP32's built-in flash through a suitable filesystem such as LittleFS. Flash has finite write endurance, so do not write continuously without considering wear.

For accurate time, add a DS3231 RTC module and set its clock, or connect the ESP32 to Wi-Fi and obtain UTC time from an NTP server. Wi-Fi/NTP requires network credentials and internet access; it is not available from the listed hardware alone.

For export, use the microSD card, send records over USB Serial to a computer, or add Wi-Fi communication to an HTTP/MQTT service. Each option requires extra software and, except Serial, additional hardware or a network service.
