export interface RobotPart {
  id: string;
  name: string;
  description: string;
  specs: string[];
  material: string;
  maintenanceNotes: string;
}

export interface Robot {
  id: string;
  name: string;
  manufacturer: string;
  modelFile: string;
  description: string;
  application: string;
  specs: {
    axes: number;
    payload: string;
    reach: string;
    repeatability: string;
    weight: string;
    mounting: string;
  };
  parts: RobotPart[];
}

/* ── Live sensor data from the relay server ─────────────────────── */

export interface SensorReading {
  jointId: string;
  temperature: number;   // °C
  vibration: number;      // g (RMS)
  load: number;           // % of rated load
  speed: number;          // °/sec
  timestamp: string;      // ISO 8601
  status: 'normal' | 'warning' | 'critical';
}

/** Map of jointId → latest reading */
export type SensorSnapshot = Record<string, SensorReading>;

/** Alert raised when a specific condition on a live joint goes POOR / CRITICAL */
export interface JointAlert {
  jointId: string;
  sensor: string;        // e.g. "humidity", "temperature"
  condition: string;     // raw condition string from buddy, e.g. "POOR"
  value: number;         // actual sensor value
  unit: string;          // e.g. "%", "°C"
  message: string;       // human-readable explanation
}

