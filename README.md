# Sentinel — Predictive Maintenance Monitor

A real-time predictive maintenance system built for a Honda / Universal Robots manufacturing environment. Developed at a hackathon focused on preventing downtime, predicting failures, and minimizing recovery time.

The system uses an Arduino Mega with multiple sensors to monitor a robotic workstation, runs condition analysis on a Python bridge, and displays live results on a web dashboard accessible from any device on the same network.

---

## How It Works

```
Arduino (sensors) → USB Serial → bridge.py → :5000/data → dashboard.html
                                                   ↓
                                            V6 React App (3D visualization)
```

The Arduino reads all sensors every 500ms and outputs JSON over serial. The Python bridge reads that JSON, runs condition analysis against a calibrated baseline, classifies any faults, and serves everything over HTTP on port 5000. Two frontends consume this data — a standalone `dashboard.html` for quick monitoring, and the **V6 React application** which renders an interactive 3D visualization of the robotic arm with live sensor data overlaid.

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

## V6 React Application — 3D Visualization

The V6 app is the primary interface for the system. Rather than displaying raw numbers, it renders a fully interactive 3D model of the Universal Robots arm and maps live sensor data directly onto the physical locations of the machine. Operators can see exactly where a problem is developing — not just that something is wrong.

### Joint-Level Warning System

Every sensor in the system is physically mounted at a specific location on the robot — base, middle joint, or tool end. When a sensor reading deviates from its baseline, the corresponding part of the 3D model reacts in real time:

- The affected joint **changes color** based on condition — green for healthy, yellow for fair, orange for poor, red for critical
- A **floating warning label** appears directly on the joint in 3D space, showing the fault type and severity
- As conditions worsen, the warning escalates from a subtle indicator to a prominent alert overlay on that specific joint
- When conditions return to normal, the warning clears and the joint returns to its healthy color

This means an operator glancing at the screen can immediately see which part of the arm has a problem and how serious it is — no need to read a table or interpret numbers.

### Example Scenarios

If the piezo sensor at the base detects rising vibration, the base joint of the 3D arm turns yellow and a `VIBRATION WARNING — BASE` label floats above it. If temperature also rises at the same location, the joint turns red and the label updates to `BASE MOTOR FAULT — CRITICAL`. If the middle joint sensor detects heat and vibration together, only the middle joint highlights while the rest of the arm stays green.

Multiple joints can be in warning states simultaneously, each with their own independent label and color, giving a full picture of the machine's health across all monitored locations at once.

### Tech Stack

- React 19 + TypeScript
- Vite (dev server + build)
- Three.js via React Three Fiber + Drei — 3D rendering and scene management
- TailwindCSS — UI and overlay styling

### Setup

```bash
cd V6
npm install
npm run dev
```

The Vite dev server proxies all `/api/buddy` requests to `http://10.250.15.115:5000` to avoid CORS issues. To point it at a different machine, update the proxy target in `vite.config.ts`:

```ts
proxy: {
  '/api/buddy': {
    target: 'http://YOUR_LAPTOP_IP:5000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/buddy/, '')
  }
}
```

**Scripts:**
```bash
npm run dev      # start dev server with HMR
npm run build    # production build
npm run preview  # preview production build
npm run lint     # run ESLint
```

---

## API Response Format

`bridge.py` serves the following JSON structure at `GET /data`:

```json
{
  "timestamp": "2025-03-08T14:32:01.123",
  "arduino": {
    "temp_base": 22.1,  "temp_joint": 23.4,  "temp_tool": 21.8,
    "humid_base": 45.0, "humid_joint": 44.0, "humid_tool": 46.0,
    "vib_base": 12,     "vib_mid": 8,        "vib_tool": 10,
    "sound": 46,        "distance": 15.2,
    "delta_temp_base": 0.3,  "delta_vib_base": 2, ...
  },
  "condition": {
    "temp_base": "EXCELLENT", "vib_mid": "FAIR", ...
  },
  "overall_status": "GOOD",
  "overall_score": 87.5,
  "fault": {
    "type": "EARLY VIBRATION WARNING",
    "confidence": "LOW",
    "description": "Vibration slightly above baseline",
    "action": "Monitor — could indicate early wear"
  },
  "alerts": [
    {
      "time": "14:32:01",
      "level": "NOTICE",
      "sensor": "vib_mid",
      "type": "VIBRATION — MIDDLE ARM",
      "message": "Vibration rising at MIDDLE ARM (delta: 14) — monitor closely"
    }
  ],
  "sensor_health": {
    "temp_base": "online", "vib_tool": "online", "distance": "offline", ...
  },
  "history": [
    { "time": "14:31:55", "temp": 22.0, "score": 88.1 }, ...
  ]
}
```

---

## Built With

- Arduino / C++ — sensor reading and baseline calibration
- Python 3 — pyserial, http.server
- React 19 + TypeScript + Three.js — 3D robotic arm visualization (V6 app)
- HTML / CSS / JavaScript — standalone dashboard
- ur-rtde (optional) — Universal Robots RTDE interface
