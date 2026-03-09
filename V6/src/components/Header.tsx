export default function Header() {
  return (
    <header className="bg-[#0f1729] border-b border-[#334155] px-6 py-3 flex items-center gap-4 shrink-0">
      <span className="text-2xl">🏭</span>
      <div>
        <h1 className="text-lg font-bold text-[#e2e8f0] leading-tight">
          Honda Manufacturing — Robotic Arm Viewer
        </h1>
        <p className="text-xs text-[#94a3b8]">
          Predictive Maintenance System
        </p>
      </div>
    </header>
  );
}
