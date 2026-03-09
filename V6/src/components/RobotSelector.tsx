import type { Robot } from '../types';

interface RobotSelectorProps {
  robots: Robot[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function RobotSelector({
  robots,
  selectedId,
  onSelect,
}: RobotSelectorProps) {
  return (
    <div className="bg-[#0f1729] border-b border-[#334155] px-6 py-2 flex gap-2 shrink-0">
      {robots.map((robot) => (
        <button
          key={robot.id}
          onClick={() => onSelect(robot.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            selectedId === robot.id
              ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/25'
              : 'bg-[#1a1a2e] text-[#94a3b8] hover:bg-[#16213e] hover:text-[#e2e8f0]'
          }`}
        >
          {robot.name}
        </button>
      ))}
    </div>
  );
}
