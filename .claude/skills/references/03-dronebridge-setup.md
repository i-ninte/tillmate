# Reference 03 — DroneBridge ESP32 Setup

## What DroneBridge Does

DroneBridge is open-source ESP32 firmware that acts as a transparent WiFi-to-UART bridge. It:
- Creates a WiFi access point the phone joins
- Forwards MAVLink 2 frames bidirectionally between the WiFi (UDP :14550) and the Pixhawk UART
- Injects RSSI (signal strength) data into the stream
- Requires zero custom code — configuration only

---

## Hardware Wiring

### ESP32 → Pixhawk TELEM1

| ESP32 Pin | Pixhawk TELEM1 Pin | JST-GH Pin # |
|---|---|---|
| GPIO 17 (TX) | RX | 3 |
| GPIO 16 (RX) | TX | 2 |
| GND | GND | 6 |
| 5V / 3.3V | VCC | 1 |

> **Check your ESP32 board.** Most DevKit boards accept 5V on VIN. Some accept only 3.3V on 3V3. Never apply 5V to a 3.3V pin.

TELEM1 JST-GH 6-pin order (from pin 1): **VCC, TX, RX, CTS, RTS, GND**. You only need VCC, TX, RX, GND.

---

## Flashing DroneBridge Firmware

1. Download the latest release from https://github.com/DroneBridge/ESP32/releases
2. Use `esptool.py` or the ESP Flash Download Tool:
   ```bash
   esptool.py --chip esp32 --port /dev/ttyUSB0 \
     write_flash 0x1000 bootloader.bin \
                 0x8000 partition-table.bin \
                 0x10000 DroneBridge_ESP32.bin
   ```
3. Power cycle the ESP32

---

## DroneBridge Web Configuration

After flashing, the ESP32 broadcasts its own temporary WiFi SSID (`DroneBridge_ESP32` or similar). Connect to it, then open `http://192.168.2.1`.

### Required Settings

| Parameter | Value |
|---|---|
| UART baud rate | **115200** (must match Pixhawk SERIAL1_BAUD = 115) |
| WiFi SSID | `AgriMachine_001` (use machine serial number suffix) |
| WiFi Password | Set strong password — store in machine docs |
| UDP output port | **14550** |
| UDP output IP | `192.168.2.255` (broadcast) or phone's IP |
| MAVLink mode | **Enabled** (MAVLink-aware — injects RSSI) |
| WiFi mode | **Access Point (AP)** |
| WiFi channel | 6 (or whichever has least interference in the field) |

---

## Pixhawk Parameter Settings

Set in Mission Planner or QGC parameter editor during initial hardware setup:

| Parameter | Value | Meaning |
|---|---|---|
| SERIAL1_BAUD | 115 | 115200 baud |
| SERIAL1_PROTOCOL | 2 | MAVLink 2 |
| BATT_MONITOR | 8 | DroneCAN / UAVCAN for CAN BMS |

---

## App-Side Connection Logic

The app connects to the machine's WiFi SSID and opens a UDP socket.

```typescript
// services/MavlinkService.ts (connection logic sketch)

const MAVLINK_PORT = 14550;
const HEARTBEAT_INTERVAL_MS = 1000;
const STALE_THRESHOLD_MS = 5000;

class MavlinkService {
  private socket: UdpSocket | null = null;
  private remoteAddress = '192.168.2.1';  // DroneBridge default gateway

  async connect() {
    this.socket = dgram.createSocket({ type: 'udp4', reusePort: true });
    this.socket.bind(MAVLINK_PORT);
    this.socket.on('message', (msg, rinfo) => {
      this.remoteAddress = rinfo.address;  // learn the bridge's actual IP
      mavlinkParser.push(Buffer.from(msg));
    });
    this.startHeartbeat();
  }

  private startHeartbeat() {
    setInterval(() => {
      const hb = buildHeartbeat();  // MAV_TYPE_GCS, MAV_AUTOPILOT_INVALID
      this.socket?.send(hb, 0, hb.length, MAVLINK_PORT, this.remoteAddress);
    }, HEARTBEAT_INTERVAL_MS);
  }
}
```

---

## Connection Screen Logic (for the UI)

1. Prompt user to join the machine's WiFi network (deep-link to WiFi settings on Android/iOS)
2. Once phone is on the WiFi, start listening on UDP :14550
3. Wait for a `HEARTBEAT` from sys_id=1 (Pixhawk) — timeout 10 s
4. On heartbeat received → set `connected = true` in Zustand store
5. Show: **Connected / GPS Fix / Machine Ready** status row

```typescript
// Listen for first heartbeat to confirm connection
mavlinkParser.on('message', (msg: MavlinkMessage) => {
  if (msg.header.msgId === 0 /* HEARTBEAT */ && msg.header.sysId === 1) {
    connectionStore.setConnected(true);
    connectionStore.setLastHeartbeat(Date.now());
  }
});

// Stale check — run every 2 s
setInterval(() => {
  const age = Date.now() - connectionStore.lastHeartbeat;
  if (age > STALE_THRESHOLD_MS) {
    connectionStore.setConnected(false);
    telemetryStore.clearAll();  // show '--' not stale values
  }
}, 2000);
```

---

## WiFi Range Note

In open fields expect reliable MAVLink at 50–100 m line-of-sight with the stock ESP32 antenna. An external 2.4 GHz dipole antenna on the ESP32 extends this to 200–300 m. The app must show a clear **"Connection Lost"** banner when the heartbeat times out, and must NOT allow mission start.