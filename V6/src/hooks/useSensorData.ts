import { useEffect, useRef, useState } from 'react';
import type { JointAlert, SensorReading, SensorSnapshot } from '../types';

// ── Your buddy's live data endpoint (proxied through Vite dev server) ──
const LIVE_DATA_URL = '/api/buddy/data';
const POLL_INTERVAL = 2000; // ms

const REAL_JOINT = 'j1-waist';

const JOINTS = [
  'j1-waist',
  'j2-shoulder',
  'j3-elbow',
  'j4-wrist-roll',
  'j5-wrist-pitch',
  'j6-wrist-yaw',
];

function randomBetween(min: number, max: number, decimals = 1): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(decimals));
}

function deriveStatus(temp: number, vib: number, load: number): SensorReading['status'] {
  if (temp > 80 || vib > 0.6 || load > 95) return 'critical';
  if (temp > 60 || vib > 0.35 || load > 80) return 'warning';
  return 'normal';
}

function simulateReading(jointId: string): SensorReading {
  const temperature = randomBetween(30, 55);
  const vibration = randomBetween(0.02, 0.25, 3);
  const load = randomBetween(20, 70);
  const speed = randomBetween(40, 140);
  return {
    jointId,
    temperature,
    vibration,
    load,
    speed,
    timestamp: new Date().toISOString(),
    status: deriveStatus(temperature, vibration, load),
  };
}

/**
 * Map the buddy's Arduino environmental data → joint sensor format for J1.
 *
 * Arduino: temp (°C), humidity (%), sound (raw), distance (cm)
 * App:     temperature (°C), vibration (g), load (%), speed (°/s)
 */
function mapArduinoToJoint(arduino: {
  temp?: number;
  humidity?: number;
  sound?: number;
  distance?: number;
}, condition: Record<string, string>, timestamp: string): SensorReading {
  const temperature = arduino.temp ?? 0;
  const vibration = (arduino.sound ?? 0) / 1000;
  const load = arduino.humidity ?? 0;
  const speed = Math.max(0, (arduino.distance ?? 0)) * 5;

  // Map overall condition string to our status
  const conditionMap: Record<string, SensorReading['status']> = {
    EXCELLENT: 'normal',
    GOOD: 'normal',
    FAIR: 'warning',
    POOR: 'warning',
    CRITICAL: 'critical',
  };
  const worstCondition = Object.values(condition).reduce((worst, c) => {
    const order = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'CRITICAL'];
    return order.indexOf(c) > order.indexOf(worst) ? c : worst;
  }, 'EXCELLENT');

  return {
    jointId: REAL_JOINT,
    temperature: Math.round(temperature * 10) / 10,
    vibration: Math.round(vibration * 1000) / 1000,
    load: Math.round(load * 10) / 10,
    speed: Math.round(speed * 10) / 10,
    timestamp,
    status: conditionMap[worstCondition] ?? 'normal',
  };
}

export interface UseSensorDataReturn {
  sensorData: SensorSnapshot;
  connected: boolean;
  liveJointIds: string[];
  alerts: JointAlert[];
}

const ALERT_CONDITIONS = ['POOR', 'CRITICAL'];

function buildAlerts(
  arduino: { temp?: number; humidity?: number; sound?: number; distance?: number },
  condition: Record<string, string>,
): JointAlert[] {
  const alerts: JointAlert[] = [];
  const sensorMeta: Record<string, { value: number; unit: string; label: string }> = {
    temperature: { value: arduino.temp ?? 0, unit: '°C', label: 'Temperature' },
    humidity:    { value: arduino.humidity ?? 0, unit: '%', label: 'Humidity' },
    sound:       { value: arduino.sound ?? 0, unit: 'raw', label: 'Sound (vibration)' },
    distance:    { value: arduino.distance ?? 0, unit: 'cm', label: 'Distance (speed)' },
  };
  for (const [sensor, cond] of Object.entries(condition)) {
    if (ALERT_CONDITIONS.includes(cond)) {
      const meta = sensorMeta[sensor];
      if (meta) {
        alerts.push({
          jointId: REAL_JOINT,
          sensor,
          condition: cond,
          value: meta.value,
          unit: meta.unit,
          message: `${meta.label} reading at ${meta.value}${meta.unit} — condition: ${cond}`,
        });
      }
    }
  }
  return alerts;
}

export function useSensorData(): UseSensorDataReturn {
  const [sensorData, setSensorData] = useState<SensorSnapshot>({});
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<JointAlert[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    async function fetchData() {
      try {
        const resp = await fetch(LIVE_DATA_URL);
        const data = await resp.json();
        setConnected(true);

        const snapshot: SensorSnapshot = {};

        // J1 = real data from Arduino
        if (data.arduino) {
          snapshot[REAL_JOINT] = mapArduinoToJoint(
            data.arduino,
            data.condition ?? {},
            data.timestamp ?? new Date().toISOString(),
          );
          setAlerts(buildAlerts(data.arduino, data.condition ?? {}));
        } else {
          snapshot[REAL_JOINT] = simulateReading(REAL_JOINT);
          setAlerts([]);
        }

        // J2–J6 = simulated
        for (const id of JOINTS) {
          if (id !== REAL_JOINT) {
            snapshot[id] = simulateReading(id);
          }
        }

        setSensorData(snapshot);
      } catch {
        setConnected(false);
        setAlerts([]);
        // Fall back to all simulated if server unreachable
        const snapshot: SensorSnapshot = {};
        for (const id of JOINTS) {
          snapshot[id] = simulateReading(id);
        }
        setSensorData(snapshot);
      }
    }

    // Fetch immediately, then poll
    fetchData();
    timerRef.current = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(timerRef.current);
  }, []);

  return { sensorData, connected, liveJointIds: connected ? [REAL_JOINT] : [], alerts };
}
