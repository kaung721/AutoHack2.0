import { useEffect, useRef, useState } from 'react';
import type { JointAlert } from '../types';

export interface ErrorLogEntry {
  key: string; // unique key: jointId + sensor + condition
  alert: JointAlert;
  timestamp: string;
}

export function useErrorLog(liveAlerts: JointAlert[]): {
  liveAlerts: JointAlert[];
  recentAlerts: ErrorLogEntry[];
} {
  const [recentAlerts, setRecentAlerts] = useState<ErrorLogEntry[]>([]);
  const prevLiveKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date().toISOString();
    const liveKeys = new Set(liveAlerts.map(a => `${a.jointId}|${a.sensor}|${a.condition}`));
    // Add new alerts to log
    liveAlerts.forEach(alert => {
      const key = `${alert.jointId}|${alert.sensor}|${alert.condition}`;
      if (!prevLiveKeys.current.has(key)) {
        setRecentAlerts(prev => {
          // Only add if not already present (deduplication)
          if (prev.some(e => e.key === key)) return prev;
          return [...prev, { key, alert, timestamp: now }];
        });
      }
    });
    prevLiveKeys.current = liveKeys;
  }, [liveAlerts]);

  return {
    liveAlerts,
    recentAlerts,
  };
}
