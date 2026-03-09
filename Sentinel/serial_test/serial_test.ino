/*
 * SERIAL OUTPUT TEST
 * Just prints all sensor values as JSON
 * Same pins as your full setup
 *
 * DHT11 Base  → Pin 2
 * DHT11 Joint → Pin 3
 * DHT11 Tool  → Pin 4
 * Piezo Base  → A2
 * Piezo Mid   → A3
 * Piezo Tool  → A4
 * Sound       → A1
 * HC-SR04     → Trig 9, Echo 10
 */

#include <DHT.h>

DHT dht1(2, DHT11);
DHT dht2(3, DHT11);
DHT dht3(4, DHT11);

#define TRIG 9
#define ECHO 10

void setup() {
  Serial.begin(115200);
  dht1.begin();
  dht2.begin();
  dht3.begin();
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  delay(2000);
  Serial.println("{\"status\":\"ready\",\"msg\":\"Starting output\"}");
}

void loop() {
  float t1 = dht1.readTemperature();
  float h1 = dht1.readHumidity();
  float t2 = dht2.readTemperature();
  float h2 = dht2.readHumidity();
  float t3 = dht3.readTemperature();
  float h3 = dht3.readHumidity();

  int vib1 = analogRead(A2);
  int vib2 = analogRead(A3);
  int vib3 = analogRead(A4);
  int snd  = analogRead(A1);

  // Ultrasonic
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur  = pulseIn(ECHO, HIGH, 30000);
  float dist = dur > 0 ? (dur * 0.0343) / 2.0 : -1.0;

  Serial.print("{\"status\":\"data\"");

  // Temp — send null if DHT failed
  Serial.print(",\"temp_base\":"); Serial.print(isnan(t1) ? "null" : String(t1, 1));
  Serial.print(",\"temp_joint\":"); Serial.print(isnan(t2) ? "null" : String(t2, 1));
  Serial.print(",\"temp_tool\":"); Serial.print(isnan(t3) ? "null" : String(t3, 1));

  // Humidity
  Serial.print(",\"humid_base\":"); Serial.print(isnan(h1) ? "null" : String(h1, 1));
  Serial.print(",\"humid_joint\":"); Serial.print(isnan(h2) ? "null" : String(h2, 1));
  Serial.print(",\"humid_tool\":"); Serial.print(isnan(h3) ? "null" : String(h3, 1));

  // Vibration
  Serial.print(",\"vib_base\":"); Serial.print(vib1);
  Serial.print(",\"vib_mid\":"); Serial.print(vib2);
  Serial.print(",\"vib_tool\":"); Serial.print(vib3);

  // Sound + distance
  Serial.print(",\"sound\":"); Serial.print(snd);
  Serial.print(",\"distance\":"); Serial.print(dist, 1);

  // Deltas all zero for now — bridge will calculate from baseline
  Serial.print(",\"delta_temp_base\":0,\"delta_temp_joint\":0,\"delta_temp_tool\":0");
  Serial.print(",\"delta_humid_base\":0,\"delta_humid_joint\":0,\"delta_humid_tool\":0");
  Serial.print(",\"delta_vib_base\":0,\"delta_vib_mid\":0,\"delta_vib_tool\":0");
  Serial.print(",\"delta_sound\":0,\"delta_dist\":0");

  Serial.print(",\"uptime\":"); Serial.print(millis());
  Serial.println("}");

  delay(500);
}
