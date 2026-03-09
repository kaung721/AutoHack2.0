import type { JointAlert } from '../types';
import { useErrorLog } from '../hooks/useErrorLog';

interface ErrorLogSidebarProps {
  alerts: JointAlert[];
}

export default function ErrorLogSidebar({ alerts }: ErrorLogSidebarProps) {
  const { liveAlerts, recentAlerts } = useErrorLog(alerts);

  return (
    <div className="w-[320px] bg-[#1a1a2e] border-r border-[#334155] flex flex-col shrink-0 h-full">
      <div className="p-4 border-b border-[#334155]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">❗</span>
          <h2 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
            Error Log
          </h2>
        </div>
        <p className="text-xs text-[#94a3b8]">Live & recent exclamation alerts</p>
      </div>
      {/* Live Error Log */}
      <div className="px-4 py-2 border-b border-[#334155]/50">
        <div className="font-bold text-xs text-[#e2e8f0] mb-2">Live Errors</div>
        {liveAlerts.length === 0 ? (
          <div className="text-[#475569] text-xs">No live errors.</div>
        ) : (
          liveAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`py-2 flex gap-2 items-start ${
                alert.condition === 'CRITICAL' ? 'bg-[#ef4444]/10' : 'bg-[#f59e0b]/10'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mt-1 ${
                  alert.condition === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#e2e8f0]">
                    {alert.sensor.charAt(0).toUpperCase() + alert.sensor.slice(1)}
                  </span>
                  <span className="text-xs text-[#94a3b8]">{alert.value}{alert.unit}</span>
                  <span className="text-xs text-[#94a3b8]">{alert.condition}</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">{alert.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Recent Error Log */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2">
        <div className="font-bold text-xs text-[#e2e8f0] mb-2">Recent Errors</div>
        {recentAlerts.length === 0 ? (
          <div className="text-[#475569] text-xs">No recent errors.</div>
        ) : (
          recentAlerts.map((entry, idx) => (
            <div
              key={entry.key}
              className={`py-2 flex gap-2 items-start border-b border-[#334155]/30 ${
                entry.alert.condition === 'CRITICAL' ? 'bg-[#ef4444]/5' : 'bg-[#f59e0b]/5'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mt-1 ${
                  entry.alert.condition === 'CRITICAL' ? 'bg-red-500' : 'bg-amber-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#e2e8f0]">
                    {entry.alert.sensor.charAt(0).toUpperCase() + entry.alert.sensor.slice(1)}
                  </span>
                  <span className="text-xs text-[#94a3b8]">{entry.alert.value}{entry.alert.unit}</span>
                  <span className="text-xs text-[#94a3b8]">{entry.alert.condition}</span>
                  <span className="text-xs text-[#475569]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">{entry.alert.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
