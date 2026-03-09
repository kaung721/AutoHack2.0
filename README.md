# AutoHack2.0
# Sentinel — Predictive Maintenance Monitor

A real-time predictive maintenance system built for a Honda / Universal Robots manufacturing environment. Developed at a hackathon focused on preventing downtime, predicting failures, and minimizing recovery time.

The system uses an Arduino Mega with multiple sensors to monitor a robotic workstation, runs condition analysis on a Python bridge, and displays live results on a web dashboard accessible from any device on the same network.

---

## How It Works

```
Arduino (sensors) → USB Serial → bridge.py → localhost:5000/data → dashboard.html
```

The Arduino reads all sensors every 500ms and outputs JSON over serial. The Python bridge reads that JSON, runs condition analysis against a calibrated baseline, classifies any faults, and serves everything over HTTP. The dashboard polls every second and updates live.

---

## Hardware

| Component | Quantity | Purpose |
|---|---|---|
| Elegoo Mega (Arduino Mega 2560) | 1 | Main microcontroller |
| DHT11 Temperature & Humidity Sensor | 3 | Monitor heat and moisture at base, joint, and tool end |
| Piezoelectric Vibration Sensor (M0168) | 3 | Detect vibration at base, middle arm, and tool end |
| KY-037 Sound Sensor | 1 | Detect acoustic anomalies |
| HC-SR04 Ultrasonic Sensor | 1 | Monitor part positioning and alignment |
| Breadboard | 1 | Power distribution |

---

## Wiring

```
DHT11 Base    Signal → Pin 2   | VCC → 5V | GND → GND
DHT11 Joint   Signal → Pin 3   | VCC → 5V | GND → GND
DHT11 Tool    Signal → Pin 4   | VCC → 5V | GND → GND

HC-SR04       Trig   → Pin 9   | Echo → Pin 10 | VCC → 5V | GND → GND

Sound KY-037  AO     → A1      | VCC → 5V | GND → GND

Piezo Base    OUT    → A2      | VCC → 5V | GND → GND
Piezo Mid     OUT    → A3      | VCC → 5V | GND → GND
Piezo Tool    OUT    → A4      | VCC → 5V | GND → GND
```

5V and GND are distributed via breadboard rails since the Mega only has one 5V pin.

---

## Files

| File | Description |
|---|---|
| `all_sensors.ino` | Main Arduino sketch — reads all sensors, calibrates baseline on boot, outputs JSON |
| `bridge.py` | Python bridge — reads serial, runs condition analysis, serves data over HTTP |
| `dashboard.html` | Web dashboard — live sensor readings, condition ratings, alerts, fault classification |
| `piezo_test.ino` | Test sketch for piezo sensors only |
| `dht11_triple_test.ino` | Test sketch for 3x DHT11 sensors only |
| `serial_test.ino` | Full sensor output test without baseline calculation |

---

## Setup

### Arduino
1. Install the **DHT sensor library** by Adafruit (+ Adafruit Unified Sensor dependency) via Arduino IDE Library Manager
2. Select board: **Arduino Mega 2560**, port: **COM4** (or your port)
3. Upload `all_sensors.ino`
4. Open Serial Monitor at 115200 baud — wait for `Baseline established. Monitoring started.`
5. Close Arduino IDE / Serial Monitor before running the Python bridge

### Python Bridge
```bash
pip install pyserial
python bridge.py
```

The terminal will print your local IP address. Open `http://localhost:5000/data` to verify data is flowing.

### Dashboard
Open `dashboard.html` directly in a browser — no server needed. It fetches from `http://localhost:5000/data` automatically.

To view from another device on the same network, edit the `API` constant at the top of the script in `dashboard.html`:
```js
const API = 'http://YOUR_LAPTOP_IP:5000/data';
```

---

## Condition Rating System

Every sensor is rated independently based on its delta from the calibrated baseline:

| Rating | Meaning |
|---|---|
| EXCELLENT | Within normal range |
| GOOD | Slightly above baseline, no concern |
| FAIR | Noticeably above baseline, worth watching |
| POOR | Significantly above baseline, inspect soon |
| CRITICAL | Far above baseline, action required |

An overall score is calculated from all sensor ratings and displayed as the system-wide condition.

---

## Fault Classification

The system identifies faults by matching patterns across multiple sensors rather than reacting to individual readings. Examples:

- **BASE MOTOR FAULT** — heat and vibration both elevated at the base
- **JOINT MECHANICAL FAULT** — heat and vibration elevated at the joint
- **THERMAL + ACOUSTIC ANOMALY** — temperature high with abnormal sound
- **MULTI-SYSTEM FAILURE** — heat, vibration, and sound all abnormal simultaneously
- **EARLY VIBRATION WARNING** — vibration slightly above baseline, possible early wear

This approach reduces false positives and gives maintenance teams a specific location and probable cause rather than just a raw sensor reading.

---

## Baseline Calibration

On boot, the Arduino takes 20 samples from every sensor over approximately 4 seconds and establishes a baseline. All condition ratings and deltas are calculated relative to this baseline — not absolute values. This means the system adapts to the environment it starts in and flags deviations rather than fixed thresholds.

---

## Alerts

Any sensor crossing a threshold triggers an immediate alert displayed in the dashboard and printed to the terminal. Alert levels:

- **NOTICE** — small deviation, monitor closely
- **WARNING** — significant deviation, inspect soon  
- **CRITICAL** — stop machine, immediate action required

Sensors that go offline (null readings, disconnected wires) are also flagged immediately.

---

## Universal Robot Integration

The bridge supports connecting to a Universal Robots arm via the RTDE interface. To enable:

1. Install the library:
```bash
pip install ur-rtde
```

2. Connect your laptop directly to the UR controller box via ethernet

3. Edit `bridge.py`:
```python
UR_ROBOT_IP = "192.168.x.x"  # robot's IP shown on the teach pendant
UR_ENABLED  = True
```

When connected, the dashboard will display joint temperature and current draw ratings for all 6 joints alongside the Arduino sensor data.

---

## Network Access

When `bridge.py` starts it prints two URLs:

```
Local   : http://localhost:5000/data
Network : http://192.168.x.x:5000/data
```

The network URL can be opened from any laptop or phone on the same WiFi. If another device cannot connect, run this in Command Prompt as administrator on the host machine:

```
netsh advfirewall firewall add rule name="Sentinel Monitor" dir=in action=allow protocol=TCP localport=5000
```

---

## Built With

- Arduino / C++
- Python 3 — pyserial, http.server
- HTML / CSS / JavaScript (vanilla, no frameworks)
- ur-rtde (optional, for Universal Robots connection)
