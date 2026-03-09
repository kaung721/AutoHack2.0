/*
 * ============================================================
 *  MANUFACTURING PREDICTIVE MAINTENANCE MONITOR
 *  Elegoo Mega — Full Sensor Array
 * ============================================================
 *  Sensors:
 *    DHT11 #1 (Base)   — Pin 2
 *    DHT11 #2 (Joint)  — Pin 3
 *    DHT11 #3 (Tool)   — Pin 4
 *    HC-SR04            — Trig: 9, Echo: 10
 *    Sound Sensor       — A1
 *    Piezo #1 (Base)   — A2
 *    Piezo #2 (Mid)    — A3
 *    Piezo #3 (Tool)   — A4
 * ============================================================
 */

#include <DHT.h>

// ─── PINS ────────────────────────────────────────────────────
#define DHT_PIN_BASE   2
#define DHT_PIN_JOINT  3
#define DHT_PIN_TOOL   4
#define DHT_TYPE       DHT11

#define TRIG_PIN       9
#define ECHO_PIN       10

#define SOUND_PIN      A1
#define PIEZO_BASE     A2
#define PIEZO_MID      A3
#define PIEZO_TOOL     A4

// ─── SETTINGS ────────────────────────────────────────────────
#define SAMPLE_INTERVAL_MS  500
#define BUFFER_SIZE         10
#define CALIB_SAMPLES       20

// ─── DHT OBJECTS ─────────────────────────────────────────────
DHT dht_base (DHT_PIN_BASE,  DHT_TYPE);
DHT dht_joint(DHT_PIN_JOINT, DHT_TYPE);
DHT dht_tool (DHT_PIN_TOOL,  DHT_TYPE);

// ─── BASELINES ───────────────────────────────────────────────
float base_temp_base  = 0, base_temp_joint  = 0, base_temp_tool  = 0;
float base_humid_base = 0, base_humid_joint = 0, base_humid_tool = 0;
float base_vib_base   = 0, base_vib_mid     = 0, base_vib_tool   = 0;
float base_sound      = 0, base_dist        = 0;
bool  calibrated      = false;

// ─── ROLLING BUFFERS ─────────────────────────────────────────
float buf_temp_base [BUFFER_SIZE] = {0};
float buf_temp_joint[BUFFER_SIZE] = {0};
float buf_temp_tool [BUFFER_SIZE] = {0};
float buf_humid_base [BUFFER_SIZE] = {0};
float buf_humid_joint[BUFFER_SIZE] = {0};
float buf_humid_tool [BUFFER_SIZE] = {0};
float buf_vib_base  [BUFFER_SIZE] = {0};
float buf_vib_mid   [BUFFER_SIZE] = {0};
float buf_vib_tool  [BUFFER_SIZE] = {0};
float buf_sound     [BUFFER_SIZE] = {0};
float buf_dist      [BUFFER_SIZE] = {0};

int  buf_index = 0;
bool buf_full  = false;

unsigned long lastSampleTime = 0;

// ════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);

  dht_base.begin();
  dht_joint.begin();
  dht_tool.begin();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  Serial.println(F("{\"status\":\"boot\",\"msg\":\"All sensors initializing...\"}"));
  delay(2000);

  // ── CALIBRATION ──────────────────────────────────────────
  Serial.println(F("{\"status\":\"calibrating\",\"msg\":\"Establishing baseline...\"}"));

  float s_tb=0,s_tj=0,s_tt=0;
  float s_hb=0,s_hj=0,s_ht=0;
  float s_vb=0,s_vm=0,s_vt=0;
  float s_snd=0, s_dst=0;
  int valid = 0;

  for (int i = 0; i < CALIB_SAMPLES; i++) {
    float tb = dht_base.readTemperature();
    float tj = dht_joint.readTemperature();
    float tt = dht_tool.readTemperature();
    float hb = dht_base.readHumidity();
    float hj = dht_joint.readHumidity();
    float ht = dht_tool.readHumidity();

    if (!isnan(tb) && !isnan(tj) && !isnan(tt)) {
      s_tb  += tb;  s_tj  += tj;  s_tt  += tt;
      s_hb  += hb;  s_hj  += hj;  s_ht  += ht;
      s_vb  += analogRead(PIEZO_BASE);
      s_vm  += analogRead(PIEZO_MID);
      s_vt  += analogRead(PIEZO_TOOL);
      s_snd += analogRead(SOUND_PIN);
      s_dst += readUltrasonicCM();
      valid++;
    }
    delay(200);
  }

  if (valid > 0) {
    base_temp_base  = s_tb  / valid;
    base_temp_joint = s_tj  / valid;
    base_temp_tool  = s_tt  / valid;
    base_humid_base  = s_hb / valid;
    base_humid_joint = s_hj / valid;
    base_humid_tool  = s_ht / valid;
    base_vib_base   = s_vb  / valid;
    base_vib_mid    = s_vm  / valid;
    base_vib_tool   = s_vt  / valid;
    base_sound      = s_snd / valid;
    base_dist       = s_dst / valid;
    calibrated      = true;
  }

  Serial.println(F("{\"status\":\"ready\",\"msg\":\"Baseline established. Monitoring started.\"}"));
}

// ════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

    // ── READ ALL SENSORS ─────────────────────────────────────
    float temp_base  = dht_base.readTemperature();
    float temp_joint = dht_joint.readTemperature();
    float temp_tool  = dht_tool.readTemperature();
    float humid_base  = dht_base.readHumidity();
    float humid_joint = dht_joint.readHumidity();
    float humid_tool  = dht_tool.readHumidity();

    float vib_base = analogRead(PIEZO_BASE);
    float vib_mid  = analogRead(PIEZO_MID);
    float vib_tool = analogRead(PIEZO_TOOL);
    float sound    = analogRead(SOUND_PIN);
    float distance = readUltrasonicCM();

    // Validate DHT readings
    if (isnan(temp_base) || isnan(temp_joint) || isnan(temp_tool)) {
      Serial.println(F("{\"error\":\"DHT read failed — check wiring\"}"));
      return;
    }

    // ── UPDATE BUFFERS ────────────────────────────────────────
    buf_temp_base [buf_index] = temp_base;
    buf_temp_joint[buf_index] = temp_joint;
    buf_temp_tool [buf_index] = temp_tool;
    buf_humid_base [buf_index] = humid_base;
    buf_humid_joint[buf_index] = humid_joint;
    buf_humid_tool [buf_index] = humid_tool;
    buf_vib_base  [buf_index] = vib_base;
    buf_vib_mid   [buf_index] = vib_mid;
    buf_vib_tool  [buf_index] = vib_tool;
    buf_sound     [buf_index] = sound;
    buf_dist      [buf_index] = distance;

    buf_index = (buf_index + 1) % BUFFER_SIZE;
    if (buf_index == 0) buf_full = true;
    int n = buf_full ? BUFFER_SIZE : buf_index;

    // ── AVERAGED VALUES ───────────────────────────────────────
    float avg_tb  = avg(buf_temp_base,  n);
    float avg_tj  = avg(buf_temp_joint, n);
    float avg_tt  = avg(buf_temp_tool,  n);
    float avg_hb  = avg(buf_humid_base,  n);
    float avg_hj  = avg(buf_humid_joint, n);
    float avg_ht  = avg(buf_humid_tool,  n);
    float avg_vb  = avg(buf_vib_base,   n);
    float avg_vm  = avg(buf_vib_mid,    n);
    float avg_vt  = avg(buf_vib_tool,   n);
    float avg_snd = avg(buf_sound,      n);
    float avg_dst = avg(buf_dist,       n);

    // ── OUTPUT JSON ───────────────────────────────────────────
    Serial.print(F("{\"status\":\"data\""));

    // Temperature readings
    Serial.print(F(",\"temp_base\":")); Serial.print(avg_tb, 1);
    Serial.print(F(",\"temp_joint\":")); Serial.print(avg_tj, 1);
    Serial.print(F(",\"temp_tool\":")); Serial.print(avg_tt, 1);

    // Humidity readings
    Serial.print(F(",\"humid_base\":")); Serial.print(avg_hb, 1);
    Serial.print(F(",\"humid_joint\":")); Serial.print(avg_hj, 1);
    Serial.print(F(",\"humid_tool\":")); Serial.print(avg_ht, 1);

    // Vibration readings
    Serial.print(F(",\"vib_base\":")); Serial.print(avg_vb, 0);
    Serial.print(F(",\"vib_mid\":")); Serial.print(avg_vm, 0);
    Serial.print(F(",\"vib_tool\":")); Serial.print(avg_vt, 0);

    // Sound and distance
    Serial.print(F(",\"sound\":")); Serial.print(avg_snd, 0);
    Serial.print(F(",\"distance\":")); Serial.print(avg_dst, 1);

    // Deltas from baseline
    if (calibrated) {
      Serial.print(F(",\"delta_temp_base\":")); Serial.print(avg_tb - base_temp_base, 1);
      Serial.print(F(",\"delta_temp_joint\":")); Serial.print(avg_tj - base_temp_joint, 1);
      Serial.print(F(",\"delta_temp_tool\":")); Serial.print(avg_tt - base_temp_tool, 1);

      Serial.print(F(",\"delta_humid_base\":")); Serial.print(avg_hb - base_humid_base, 1);
      Serial.print(F(",\"delta_humid_joint\":")); Serial.print(avg_hj - base_humid_joint, 1);
      Serial.print(F(",\"delta_humid_tool\":")); Serial.print(avg_ht - base_humid_tool, 1);

      Serial.print(F(",\"delta_vib_base\":")); Serial.print(avg_vb - base_vib_base, 0);
      Serial.print(F(",\"delta_vib_mid\":")); Serial.print(avg_vm - base_vib_mid, 0);
      Serial.print(F(",\"delta_vib_tool\":")); Serial.print(avg_vt - base_vib_tool, 0);

      Serial.print(F(",\"delta_sound\":")); Serial.print(avg_snd - base_sound, 0);
      Serial.print(F(",\"delta_dist\":")); Serial.print(avg_dst - base_dist, 1);
    }

    Serial.print(F(",\"uptime\":")); Serial.print(now);
    Serial.println(F("}"));
  }
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

float readUltrasonicCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  if (dur == 0) return -1.0;
  return (dur * 0.0343) / 2.0;
}

float avg(float* buf, int n) {
  float sum = 0;
  for (int i = 0; i < n; i++) sum += buf[i];
  return sum / n;
}
