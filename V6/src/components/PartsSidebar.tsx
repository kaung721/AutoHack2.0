import type { Robot, RobotPart, SensorSnapshot } from '../types';

interface PartsSidebarProps {
  robot: Robot;
  selectedPartId: string | null;
  onSelectPart: (part: RobotPart) => void;
  sensorData: SensorSnapshot;
  connected: boolean;
}

const STATUS_COLORS = {
  normal: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
} as const;

const STATUS_LABELS = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
} as const;

export default function PartsSidebar({
  robot,
  selectedPartId,
  onSelectPart,
  sensorData,
  connected,
}: PartsSidebarProps) {
  return (
    <div className="w-[320px] bg-[#16213e] border-l border-[#334155] flex flex-col shrink-0 h-full">
      {/* Robot info header */}
      <div className="p-4 border-b border-[#334155]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🔧</span>
          <h2 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider">
            Parts Breakdown
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#e2e8f0] mb-1">
          {robot.name}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#94a3b8]">
          <span>Axes: {robot.specs.axes}</span>
          <span>|</span>
          <span>Payload: {robot.specs.payload}</span>
          <span>|</span>
          <span>Reach: {robot.specs.reach}</span>
        </div>

        {/* Connection indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? 'bg-emerald-400 animate-pulse' : 'bg-[#475569]'
            }`}
          />
          <span className={connected ? 'text-emerald-400' : 'text-[#475569]'}>
            {connected ? 'Live sensor feed' : 'Sensor feed offline'}
          </span>
        </div>
      </div>

      {/* Parts list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {robot.parts.map((part) => {
          const reading = sensorData[part.id];
          return (
            <button
              key={part.id}
              onClick={() => onSelectPart(part)}
              className={`w-full text-left px-4 py-3 border-b border-[#334155]/50 transition-all duration-150 cursor-pointer ${
                selectedPartId === part.id
                  ? 'bg-[#3b82f6]/15 border-l-2 border-l-[#3b82f6]'
                  : 'hover:bg-[#1a1a2e]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs ${
                    selectedPartId === part.id
                      ? 'text-[#3b82f6]'
                      : 'text-[#94a3b8]'
                  }`}
                >
                  ▸
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium truncate ${
                        selectedPartId === part.id
                          ? 'text-[#3b82f6]'
                          : 'text-[#e2e8f0]'
                      }`}
                    >
                      {part.name}
                    </p>
                    {reading && (
                      <span
                        className={`inline-block w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[reading.status]}`}
                        title={STATUS_LABELS[reading.status]}
                      />
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8]">{part.material}</p>

                  {/* Live mini-stats */}
                  {reading && (
                    <div className="flex gap-3 mt-1 text-[10px] text-[#94a3b8]/80">
                      <span>🌡 {reading.temperature.toFixed(1)}°C</span>
                      <span>📳 {reading.vibration.toFixed(2)}g</span>
                      <span>⚡ {reading.load.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
