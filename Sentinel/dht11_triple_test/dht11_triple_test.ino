/*
 * 3x DHT11 TEST
 * DHT11 #1 (Base)  → Pin 2
 * DHT11 #2 (Joint) → Pin 3
 * DHT11 #3 (Tool)  → Pin 4
 */

#include <DHT.h>

#define DHT_PIN_1  2
#define DHT_PIN_2  3
#define DHT_PIN_3  4

DHT dht1(DHT_PIN_1, DHT11);
DHT dht2(DHT_PIN_2, DHT11);
DHT dht3(DHT_PIN_3, DHT11);

void setup() {
  Serial.begin(115200);
  dht1.begin();
  dht2.begin();
  dht3.begin();

  Serial.println("3x DHT11 Test");
  Serial.println("Base(Pin2) | Joint(Pin3) | Tool(Pin4)");
  Serial.println("---------------------------------------");
  delay(2000);
}

void loop() {
  float t1 = dht1.readTemperature();
  float h1 = dht1.readHumidity();

  float t2 = dht2.readTemperature();
  float h2 = dht2.readHumidity();

  float t3 = dht3.readTemperature();
  float h3 = dht3.readHumidity();

  // Sensor 1
  Serial.print("Base  — Temp: ");
  if (isnan(t1)) Serial.print("FAIL");
  else { Serial.print(t1); Serial.print("°C"); }
  Serial.print("  Humidity: ");
  if (isnan(h1)) Serial.println("FAIL");
  else { Serial.print(h1); Serial.println("%"); }

  // Sensor 2
  Serial.print("Joint — Temp: ");
  if (isnan(t2)) Serial.print("FAIL");
  else { Serial.print(t2); Serial.print("°C"); }
  Serial.print("  Humidity: ");
  if (isnan(h2)) Serial.println("FAIL");
  else { Serial.print(h2); Serial.println("%"); }

  // Sensor 3
  Serial.print("Tool  — Temp: ");
  if (isnan(t3)) Serial.print("FAIL");
  else { Serial.print(t3); Serial.print("°C"); }
  Serial.print("  Humidity: ");
  if (isnan(h3)) Serial.println("FAIL");
  else { Serial.print(h3); Serial.println("%"); }

  Serial.println("---------------------------------------");
  delay(2000);
}
