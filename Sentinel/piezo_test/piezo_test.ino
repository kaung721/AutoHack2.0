/*
 * PIEZO VIBRATION SENSOR TEST
 * Piezo #1 → A2
 * Piezo #2 → A3
 * Piezo #3 → A4
 */

#define PIEZO_BASE  A2
#define PIEZO_MID   A3
#define PIEZO_TOOL  A4

void setup() {
  Serial.begin(115200);
  Serial.println("Piezo Test — tap each sensor to test");
  Serial.println("Base(A2) | Mid(A3) | Tool(A4)");
  Serial.println("------------------------------------");
}

void loop() {
  int base = analogRead(PIEZO_BASE);
  int mid  = analogRead(PIEZO_MID);
  int tool = analogRead(PIEZO_TOOL);

  Serial.print("Base: "); Serial.print(base);
  Serial.print("  |  Mid: "); Serial.print(mid);
  Serial.print("  |  Tool: "); Serial.println(tool);

  delay(200);
}
