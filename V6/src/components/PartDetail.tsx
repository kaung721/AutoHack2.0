import type { RobotPart, SensorReading } from '../types';

interface PartDetailProps {
  part: RobotPart;
  onClose: () => void;
  sensorReading?: SensorReading;
}

const STATUS_COLORS = {
  normal: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/30', dot: 'bg-emerald-400' },
  warning: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/30', dot: 'bg-amber-400' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
} as const;

function SensorGauge({ label, value, unit, max, warn, crit }: {
  label: string; value: number; unit: string; max: number; warn: number; crit: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= crit ? 'bg-red-500' : value >= warn ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#94a3b8]">{label}</span>
        <span className="text-[#e2e8f0] font-mono">{value.toFixed(1)} {unit}</span>
      </div>
      <div className="h-1.5 w-full bg-[#334155] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function PartDetail({ part, onClose, sensorReading }: PartDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-[420px] bg-[#1a1a2e] border-l border-[#334155] h-full overflow-y-auto custom-scrollbar animate-slide-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideIn 0.25s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-[#334155]/50 hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition-colors cursor-pointer"
        >
          ✕
        </button>

        <div className="p-6">
          {/* Part name */}
          <h2 className="text-xl font-bold text-[#e2e8f0] mb-4 pr-8 uppercase tracking-wide">
            {part.name}
          </h2>

          {/* ── Live Sensor Data ──────────────────────────────── */}
          {sensorReading ? (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-8 h-px bg-[#334155]" />
                Live Sensor Data
                <span className="flex-1 h-px bg-[#334155]" />
              </h3>

              {/* Status badge */}
              {(() => {
                const c = STATUS_COLORS[sensorReading.status];
                return (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${c.bg} border ${c.border}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${c.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
                      {sensorReading.status}
                    </span>
                    <span className="ml-auto text-[10px] text-[#94a3b8] font-mono">
                      {new Date(sensorReading.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })()}

              {/* Gauges */}
              <div className="bg-[#0f1729] rounded-lg p-4 border border-[#334155]">
                <SensorGauge label="Temperature" value={sensorReading.temperature} unit="°C" max={100} warn={60} crit={80} />
                <SensorGauge label="Vibration" value={sensorReading.vibration} unit="g" max={1} warn={0.35} crit={0.6} />
                <SensorGauge label="Load" value={sensorReading.load} unit="%" max={100} warn={80} crit={95} />
                <SensorGauge label="Speed" value={sensorReading.speed} unit="°/s" max={200} warn={160} crit={190} />
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-[#0f1729] rounded-lg p-4 border border-[#334155] text-center">
              <p className="text-xs text-[#475569]">No live sensor data available</p>
              <p className="text-[10px] text-[#475569] mt-1">Waiting for sensor feed…</p>
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
            {part.description}
          </p>

          {/* Specifications */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-[#334155]" />
              Specifications
              <span className="flex-1 h-px bg-[#334155]" />
            </h3>
            <ul className="space-y-2">
              {part.specs.map((spec, i) => (
                <li
                  key={i}
                  className="text-sm text-[#94a3b8] flex items-start gap-2"
                >
                  <span className="text-[#3b82f6] mt-1 text-xs">•</span>
                  {spec}
                </li>
              ))}
            </ul>
          </div>

          {/* Material */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-[#334155]" />
              Material
              <span className="flex-1 h-px bg-[#334155]" />
            </h3>
            <p className="text-sm text-[#94a3b8]">{part.material}</p>
          </div>

          {/* Maintenance Notes */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#e2e8f0] uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-[#334155]" />
              Maintenance Notes
              <span className="flex-1 h-px bg-[#334155]" />
            </h3>
            <div className="bg-[#0f1729] rounded-lg p-4 border border-[#334155]">
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                {part.maintenanceNotes}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
