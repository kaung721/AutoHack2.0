import serial
import json
import threading
import time
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler

# config
ARDUINO_PORT     = "COM4"
ARDUINO_BAUDRATE = 115200
SERVER_PORT      = 5000

# universal robot
UR_ROBOT_IP      = "192.168.1.100"
UR_ENABLED       = False

# sensors - temperature
TEMP_WARNING_DELTA      = 5.0
TEMP_POOR_DELTA         = 15.0
TEMP_CRITICAL_DELTA     = 25.0

# sensors - humidity
HUMIDITY_WARNING_DELTA  = 10.0
HUMIDITY_POOR_DELTA     = 20.0
HUMIDITY_CRITICAL_DELTA = 30.0

# sensors - sound
SOUND_WARNING_DELTA     = 100
SOUND_POOR_DELTA        = 250
SOUND_CRITICAL_DELTA    = 450

# sensors - distance
DIST_WARNING_DELTA      = 5.0
DIST_POOR_DELTA         = 10.0
DIST_CRITICAL_DELTA     = 20.0

# sensors - piezo vibration
PIEZO_WARNING_DELTA     = 10
PIEZO_POOR_DELTA        = 40
PIEZO_CRITICAL_DELTA    = 100

# universal robot - thresholds
UR_TEMP_WARNING         = 50.0
UR_TEMP_POOR            = 65.0
UR_TEMP_CRITICAL        = 80.0
UR_CURRENT_WARNING      = 2.5
UR_CURRENT_POOR         = 3.2
UR_CURRENT_CRITICAL     = 3.8

# shared state
latest_data = {
    "timestamp":      None,
    "arduino":        {},
    "ur_robot":       {},
    "condition":      {},
    "overall_status": "UNKNOWN",
    "fault":          None,
    "alerts":         [],
    "sensor_health":  {},
    "history":        []
}
data_lock = threading.Lock()

# sensors - expected list for health check
EXPECTED_SENSORS = [
    "temp_base", "temp_joint", "temp_tool",
    "humid_base", "humid_joint", "humid_tool",
    "vib_base", "vib_mid", "vib_tool",
    "sound", "distance"
]

def check_sensor_health(arduino_data):
    health = {}
    for sensor in EXPECTED_SENSORS:
        val = arduino_data.get(sensor)
        if val is None:
            health[sensor] = "offline"
        elif sensor == "distance" and val == -1.0:
            health[sensor] = "offline"
        else:
            health[sensor] = "online"
    return health

def get_offline_sensors(sensor_health):
    return [s for s, status in sensor_health.items() if status == "offline"]

def generate_alerts(arduino_data, sensor_health):
    alerts = []
    now    = datetime.now().strftime("%H:%M:%S")

    for s in get_offline_sensors(sensor_health):
        alerts.append({
            "time": now, "level": "WARNING", "sensor": s,
            "type": "SENSOR OFFLINE",
            "message": f"{s.replace('_',' ').upper()} not responding — check wiring"
        })

    if not arduino_data:
        return alerts

    # sensors - piezo alerts
    for sensor, delta_key, location in [
        ("vib_base", "delta_vib_base", "BASE"),
        ("vib_mid",  "delta_vib_mid",  "MIDDLE ARM"),
        ("vib_tool", "delta_vib_tool", "TOOL END"),
    ]:
        if sensor_health.get(sensor) == "offline": continue
        delta = abs(arduino_data.get(delta_key, 0))
        if delta >= PIEZO_CRITICAL_DELTA:
            alerts.append({"time":now,"level":"CRITICAL","sensor":sensor,
                "type":f"VIBRATION — {location}",
                "message":f"Critical vibration at {location} (delta: {delta:.0f}) — stop machine"})
        elif delta >= PIEZO_POOR_DELTA:
            alerts.append({"time":now,"level":"WARNING","sensor":sensor,
                "type":f"VIBRATION — {location}",
                "message":f"High vibration at {location} (delta: {delta:.0f}) — inspect soon"})
        elif delta >= PIEZO_WARNING_DELTA:
            alerts.append({"time":now,"level":"NOTICE","sensor":sensor,
                "type":f"VIBRATION — {location}",
                "message":f"Vibration rising at {location} (delta: {delta:.0f}) — monitor closely"})

    # sensors - temperature alerts
    for sensor, delta_key, location in [
        ("temp_base",  "delta_temp_base",  "BASE"),
        ("temp_joint", "delta_temp_joint", "JOINT"),
        ("temp_tool",  "delta_temp_tool",  "TOOL END"),
    ]:
        if sensor_health.get(sensor) == "offline": continue
        delta = arduino_data.get(delta_key, 0)
        val   = arduino_data.get(sensor, 0)
        if delta >= TEMP_CRITICAL_DELTA:
            alerts.append({"time":now,"level":"CRITICAL","sensor":sensor,
                "type":f"TEMPERATURE — {location}",
                "message":f"Critical temp at {location}: {val}°C (+{delta:.1f}°C above baseline)"})
        elif delta >= TEMP_POOR_DELTA:
            alerts.append({"time":now,"level":"WARNING","sensor":sensor,
                "type":f"TEMPERATURE — {location}",
                "message":f"High temp at {location}: {val}°C (+{delta:.1f}°C above baseline)"})
        elif delta >= TEMP_WARNING_DELTA:
            alerts.append({"time":now,"level":"NOTICE","sensor":sensor,
                "type":f"TEMPERATURE — {location}",
                "message":f"Temp rising at {location}: {val}°C (+{delta:.1f}°C above baseline)"})

    # sensors - humidity alerts
    for sensor, delta_key, location in [
        ("humid_base",  "delta_humid_base",  "BASE"),
        ("humid_joint", "delta_humid_joint", "JOINT"),
        ("humid_tool",  "delta_humid_tool",  "TOOL END"),
    ]:
        if sensor_health.get(sensor) == "offline": continue
        delta = abs(arduino_data.get(delta_key, 0))
        val   = arduino_data.get(sensor, 0)
        if delta >= HUMIDITY_CRITICAL_DELTA:
            alerts.append({"time":now,"level":"CRITICAL","sensor":sensor,
                "type":f"HUMIDITY — {location}",
                "message":f"Critical humidity at {location}: {val}% (+{delta:.1f}% above baseline)"})
        elif delta >= HUMIDITY_WARNING_DELTA:
            alerts.append({"time":now,"level":"WARNING","sensor":sensor,
                "type":f"HUMIDITY — {location}",
                "message":f"High humidity at {location}: {val}% (+{delta:.1f}% above baseline)"})

    # sensors - sound alert
    if sensor_health.get("sound") == "online":
        delta = abs(arduino_data.get("delta_sound", 0))
        if delta >= SOUND_CRITICAL_DELTA:
            alerts.append({"time":now,"level":"CRITICAL","sensor":"sound",
                "type":"ACOUSTIC ANOMALY","message":f"Critical sound spike (delta: {delta:.0f})"})
        elif delta >= SOUND_WARNING_DELTA:
            alerts.append({"time":now,"level":"WARNING","sensor":"sound",
                "type":"ACOUSTIC ANOMALY","message":f"Abnormal sound detected (delta: {delta:.0f})"})

    return alerts

def rate_condition(value, delta, warning, poor, critical):
    d = abs(delta)
    if d >= critical:        return "CRITICAL"
    elif d >= poor:          return "POOR"
    elif d >= warning:       return "FAIR"
    elif d >= warning * 0.5: return "GOOD"
    else:                    return "EXCELLENT"

def condition_to_score(c):
    return {"EXCELLENT":100,"GOOD":75,"FAIR":50,"POOR":25,"CRITICAL":0}.get(c, 50)

def score_to_status(score):
    if score >= 85:   return "EXCELLENT"
    elif score >= 70: return "GOOD"
    elif score >= 50: return "FAIR"
    elif score >= 25: return "POOR"
    else:             return "CRITICAL"

def classify_fault(conditions, deltas):
    temp_base_bad  = conditions.get("temp_base")  in ["POOR","CRITICAL"]
    temp_joint_bad = conditions.get("temp_joint") in ["POOR","CRITICAL"]
    temp_tool_bad  = conditions.get("temp_tool")  in ["POOR","CRITICAL"]
    any_temp_bad   = temp_base_bad or temp_joint_bad or temp_tool_bad

    any_humid_bad  = any(conditions.get(k) in ["POOR","CRITICAL"]
                        for k in ["humid_base","humid_joint","humid_tool"])

    vib_base_bad   = conditions.get("vib_base") in ["POOR","CRITICAL"]
    vib_mid_bad    = conditions.get("vib_mid")  in ["POOR","CRITICAL"]
    vib_tool_bad   = conditions.get("vib_tool") in ["POOR","CRITICAL"]
    any_vib_bad    = vib_base_bad or vib_mid_bad or vib_tool_bad

    sound_bad      = conditions.get("sound")    in ["POOR","CRITICAL"]
    dist_bad       = conditions.get("distance") in ["POOR","CRITICAL"]

    any_temp_fair  = any(conditions.get(k) in ["FAIR","POOR","CRITICAL"]
                        for k in ["temp_base","temp_joint","temp_tool"])
    any_vib_fair   = any(conditions.get(k) in ["FAIR","POOR","CRITICAL"]
                        for k in ["vib_base","vib_mid","vib_tool"])

    if temp_base_bad and vib_base_bad:
        return {"type":"BASE MOTOR FAULT","confidence":"HIGH",
                "description":"Heat and vibration both elevated at the base",
                "action":"Inspect base motor and bearings immediately"}
    if temp_joint_bad and vib_mid_bad:
        return {"type":"JOINT MECHANICAL FAULT","confidence":"HIGH",
                "description":"Heat and vibration elevated at the joint area",
                "action":"Inspect middle joint — possible bearing or gear wear"}
    if temp_tool_bad and vib_tool_bad:
        return {"type":"END EFFECTOR FAULT","confidence":"HIGH",
                "description":"Heat and vibration elevated at the tool end",
                "action":"Inspect tool end — check for loose components"}
    if any_temp_bad and sound_bad and any_vib_bad:
        return {"type":"MULTI-SYSTEM FAILURE","confidence":"HIGH",
                "description":"Heat, vibration and sound all abnormal",
                "action":"Stop machine immediately — full inspection required"}
    if any_temp_bad and any_humid_bad:
        return {"type":"THERMAL OVERLOAD + HUMIDITY SPIKE","confidence":"HIGH",
                "description":"Heat and moisture both elevated — corrosion and seal risk",
                "action":"Check ventilation and cooling system immediately"}
    if any_temp_bad and sound_bad:
        return {"type":"THERMAL + ACOUSTIC ANOMALY","confidence":"HIGH",
                "description":"Machine running hot with abnormal noise",
                "action":"Stop machine — inspect cooling and mechanical components"}
    if any_vib_bad and sound_bad:
        return {"type":"MECHANICAL VIBRATION + NOISE","confidence":"HIGH",
                "description":"Abnormal vibration and sound — possible loose or worn component",
                "action":"Inspect all joints and fasteners"}
    if any_temp_bad:
        zone = "base" if temp_base_bad else "joint" if temp_joint_bad else "tool end"
        return {"type":f"THERMAL OVERLOAD — {zone.upper()}","confidence":"HIGH",
                "description":f"Temperature significantly above baseline at {zone}",
                "action":f"Check cooling and lubrication at {zone}"}
    if any_vib_bad:
        zone = "base" if vib_base_bad else "middle arm" if vib_mid_bad else "tool end"
        return {"type":f"VIBRATION ANOMALY — {zone.upper()}","confidence":"HIGH",
                "description":f"Abnormal vibration detected at {zone}",
                "action":f"Inspect {zone} for loose components or bearing wear"}
    if sound_bad:
        return {"type":"ACOUSTIC ANOMALY","confidence":"MEDIUM",
                "description":"Abnormal sound detected",
                "action":"Inspect for loose components or external impact"}
    if dist_bad:
        return {"type":"POSITION / ALIGNMENT ANOMALY","confidence":"MEDIUM",
                "description":"Distance reading deviated from baseline",
                "action":"Check part positioning and alignment"}
    if any_humid_bad:
        return {"type":"HUMIDITY SPIKE","confidence":"MEDIUM",
                "description":"Moisture levels elevated — risk to electronics and seals",
                "action":"Check ventilation and environmental controls"}
    if any_temp_fair and any_vib_fair:
        return {"type":"EARLY WARNING — HEAT + VIBRATION","confidence":"MEDIUM",
                "description":"Temperature and vibration both slightly above baseline",
                "action":"Monitor closely — schedule inspection soon"}
    if any_temp_fair:
        return {"type":"EARLY THERMAL WARNING","confidence":"LOW",
                "description":"Temperature creeping above baseline",
                "action":"Monitor — check again in 30 minutes"}
    if any_vib_fair:
        return {"type":"EARLY VIBRATION WARNING","confidence":"LOW",
                "description":"Vibration slightly above baseline",
                "action":"Monitor — could indicate early wear"}
    return None

def run_condition_analysis(arduino_data, ur_data=None):
    conditions, scores, deltas = {}, [], {}

    # sensors - read all arduino sensors
    for key, delta_key in [
        ("temp_base","delta_temp_base"),("temp_joint","delta_temp_joint"),("temp_tool","delta_temp_tool")]:
        d = arduino_data.get(delta_key, 0); deltas[key] = d
        conditions[key] = rate_condition(arduino_data.get(key,0), d, TEMP_WARNING_DELTA, TEMP_POOR_DELTA, TEMP_CRITICAL_DELTA)
        scores.append(condition_to_score(conditions[key]))

    for key, delta_key in [
        ("humid_base","delta_humid_base"),("humid_joint","delta_humid_joint"),("humid_tool","delta_humid_tool")]:
        d = arduino_data.get(delta_key, 0); deltas[key] = d
        conditions[key] = rate_condition(arduino_data.get(key,0), d, HUMIDITY_WARNING_DELTA, HUMIDITY_POOR_DELTA, HUMIDITY_CRITICAL_DELTA)
        scores.append(condition_to_score(conditions[key]))

    for key, delta_key in [
        ("vib_base","delta_vib_base"),("vib_mid","delta_vib_mid"),("vib_tool","delta_vib_tool")]:
        d = arduino_data.get(delta_key, 0); deltas[key] = d
        conditions[key] = rate_condition(arduino_data.get(key,0), d, PIEZO_WARNING_DELTA, PIEZO_POOR_DELTA, PIEZO_CRITICAL_DELTA)
        scores.append(condition_to_score(conditions[key]))

    d = arduino_data.get("delta_sound", 0); deltas["sound"] = d
    conditions["sound"] = rate_condition(arduino_data.get("sound",0), d, SOUND_WARNING_DELTA, SOUND_POOR_DELTA, SOUND_CRITICAL_DELTA)
    scores.append(condition_to_score(conditions["sound"]))

    d = arduino_data.get("delta_dist", 0); deltas["distance"] = d
    conditions["distance"] = rate_condition(arduino_data.get("distance",0), d, DIST_WARNING_DELTA, DIST_POOR_DELTA, DIST_CRITICAL_DELTA)
    scores.append(condition_to_score(conditions["distance"]))

    # universal robot - read joint data if connected
    if ur_data:
        for i, jt in enumerate(ur_data.get("joint_temperatures", [])):
            key = f"joint_{i+1}_temp"
            delta = jt - 35.0
            conditions[key] = rate_condition(jt, delta, UR_TEMP_WARNING-35, UR_TEMP_POOR-35, UR_TEMP_CRITICAL-35)
            scores.append(condition_to_score(conditions[key]))
        for i, jc in enumerate(ur_data.get("joint_currents", [])):
            key = f"joint_{i+1}_current"
            delta = jc - 1.5
            conditions[key] = rate_condition(jc, delta, UR_CURRENT_WARNING-1.5, UR_CURRENT_POOR-1.5, UR_CURRENT_CRITICAL-1.5)
            scores.append(condition_to_score(conditions[key]))

    overall_score = sum(scores) / len(scores) if scores else 100
    return {
        "conditions":     conditions,
        "overall_score":  round(overall_score, 1),
        "overall_status": score_to_status(overall_score),
        "fault":          classify_fault(conditions, deltas)
    }

# universal robot - connect and pull joint data
def connect_ur_robot():
    if not UR_ENABLED:
        return None
    try:
        import rtde_receive
        rtde_r = rtde_receive.RTDEReceiveInterface(UR_ROBOT_IP)
        if not rtde_r.isConnected():
            print("[UR] Could not connect")
            return None
        actual_q = rtde_r.getActualQ()
        target_q = rtde_r.getTargetQ()
        return {
            "joint_temperatures": rtde_r.getJointTemperatures(),
            "joint_currents":     rtde_r.getJointCurrents(),
            "joint_voltages":     rtde_r.getJointVoltages(),
            "position_errors":    [abs(a-t)*57.2958 for a,t in zip(actual_q, target_q)],
            "robot_mode":         rtde_r.getRobotMode(),
            "connected":          True
        }
    except Exception as e:
        print(f"[UR] Error: {e}")
        return None

def read_arduino():
    print(f"[Arduino] Connecting to {ARDUINO_PORT}...")
    while True:
        try:
            ser = serial.Serial(ARDUINO_PORT, ARDUINO_BAUDRATE, timeout=2)
            print(f"[Arduino] Connected on {ARDUINO_PORT}")
            while True:
                try:
                    line = ser.readline().decode("utf-8").strip()
                    if not line: continue
                    data = json.loads(line)
                    if data.get("status") != "data":
                        print(f"[Arduino] {data.get('msg', line)}")
                        continue

                    ur_data  = connect_ur_robot()
                    analysis = run_condition_analysis(data, ur_data)
                    health   = check_sensor_health(data)
                    alerts   = generate_alerts(data, health)

                    for a in alerts:
                        print(f"[{a['level']}] {a['type']} — {a['message']}")
                    offline = get_offline_sensors(health)
                    if offline:
                        print(f"[OFFLINE] {', '.join(offline)}")

                    with data_lock:
                        latest_data["timestamp"]      = datetime.now().isoformat()
                        latest_data["arduino"]        = data
                        latest_data["ur_robot"]       = ur_data or {"connected": False}
                        latest_data["condition"]      = analysis["conditions"]
                        latest_data["overall_status"] = analysis["overall_status"]
                        latest_data["overall_score"]  = analysis["overall_score"]
                        latest_data["fault"]          = analysis["fault"]
                        latest_data["alerts"]         = alerts
                        latest_data["sensor_health"]  = health
                        latest_data["history"].append({
                            "time":  datetime.now().strftime("%H:%M:%S"),
                            "temp":  data.get("temp_base"),
                            "score": analysis["overall_score"]
                        })
                        if len(latest_data["history"]) > 60:
                            latest_data["history"].pop(0)

                    print(f"[Data] T:{data.get('temp_base')}/{data.get('temp_joint')}/{data.get('temp_tool')}°C | "
                          f"Vib:{data.get('vib_base')}/{data.get('vib_mid')}/{data.get('vib_tool')} | "
                          f"Sound:{data.get('sound')} | Status:{analysis['overall_status']}")

                except json.JSONDecodeError:
                    pass
                except Exception as e:
                    print(f"[Arduino] Read error: {e}")

        except serial.SerialException as e:
            print(f"[Arduino] Connection failed: {e} — retrying in 3s")
            time.sleep(3)

class DataHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/data":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            with data_lock:
                self.wfile.write(json.dumps(latest_data).encode())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_response(404)
            self.end_headers()
    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "unknown"

    print("=" * 50)
    print("  MANUFACTURING MONITOR")
    print(f"  Arduino  : {ARDUINO_PORT} @ {ARDUINO_BAUDRATE} baud")
    print(f"  Sensors  : 3x DHT11 | 3x Piezo | Sound | HC-SR04")
    print(f"  UR Robot : {'Enabled @ ' + UR_ROBOT_IP if UR_ENABLED else 'Disabled'}")
    print(f"  Local    : http://localhost:{SERVER_PORT}/data")
    print(f"  Network  : http://{local_ip}:{SERVER_PORT}/data")
    print("=" * 50)

    threading.Thread(target=read_arduino, daemon=True).start()
    HTTPServer(("0.0.0.0", SERVER_PORT), DataHandler).serve_forever()