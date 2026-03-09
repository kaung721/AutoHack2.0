import { useState, useCallback } from 'react';
import Header from './components/Header';
import RobotSelector from './components/RobotSelector';
import Scene from './components/Scene';
import PartsSidebar from './components/PartsSidebar';
import PartDetail from './components/PartDetail';
import ErrorLogSidebar from './components/ErrorLogSidebar';
import { robots } from './data/robots';
import { useSensorData } from './hooks/useSensorData';
import type { RobotPart } from './types';

function App() {
  const [selectedRobotId, setSelectedRobotId] = useState(robots[0].id);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [detailPart, setDetailPart] = useState<RobotPart | null>(null);
  const { sensorData, connected, liveJointIds, alerts } = useSensorData();

  const selectedRobot = robots.find((r) => r.id === selectedRobotId) ?? robots[0];

  const handleSelectRobot = useCallback((id: string) => {
    setSelectedRobotId(id);
    setSelectedPartId(null);
    setDetailPart(null);
  }, []);

  const handleSelectPartFromSidebar = useCallback(
    (part: RobotPart) => {
      setSelectedPartId(part.id);
      setDetailPart(part);
    },
    []
  );

  const handleSelectPartFrom3D = useCallback(
    (partId: string) => {
      setSelectedPartId(partId);
      const part = selectedRobot.parts.find((p) => p.id === partId);
      if (part) {
        setDetailPart(part);
      }
    },
    [selectedRobot]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailPart(null);
    setSelectedPartId(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Header />

      {/* Robot Selector */}
      <RobotSelector
        robots={robots}
        selectedId={selectedRobotId}
        onSelect={handleSelectRobot}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Error Log Sidebar */}
        <ErrorLogSidebar alerts={alerts} />
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Scene
            robot={selectedRobot}
            selectedPartId={selectedPartId}
            onSelectPart={handleSelectPartFrom3D}
            hoveredPartId={hoveredPartId}
            onHoverPart={setHoveredPartId}
            liveJointIds={liveJointIds}
            alerts={alerts}
          />

          {/* Instructions overlay */}
          <div className="absolute bottom-4 left-4 bg-[#1a1a2e]/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-[#334155]/50">
            <p className="text-xs text-[#94a3b8]">
              🖱️ Drag to rotate &nbsp;|&nbsp; Scroll to zoom &nbsp;|&nbsp;
              Click a part for details
            </p>
          </div>
        </div>

        {/* Parts Sidebar */}
        <PartsSidebar
          robot={selectedRobot}
          selectedPartId={selectedPartId}
          onSelectPart={handleSelectPartFromSidebar}
          sensorData={sensorData}
          connected={connected}
        />
      </div>

      {/* Bottom bar */}
      <div className="bg-[#0f1729] border-t border-[#334155] px-6 py-2 flex items-center gap-4 text-xs text-[#94a3b8] shrink-0">
        <span className="font-medium text-[#e2e8f0]">
          {selectedRobot.name}
        </span>
        <span>|</span>
        <span>{selectedRobot.specs.axes} Axes</span>
        <span>|</span>
        <span>{selectedRobot.specs.payload}</span>
        <span>|</span>
        <span>{selectedRobot.specs.reach}</span>
        <span>|</span>
        <span>{selectedRobot.specs.repeatability}</span>
        <span>|</span>
        <span className="text-[#94a3b8]/60">
          {selectedRobot.application}
        </span>
      </div>

      {/* Part Detail overlay */}
      {detailPart && (
        <PartDetail
          part={detailPart}
          onClose={handleCloseDetail}
          sensorReading={sensorData[detailPart.id]}
        />
      )}
    </div>
  );
}

export default App;
