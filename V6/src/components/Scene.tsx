import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import RobotModel from './RobotModel';
import type { Robot, JointAlert } from '../types';

interface SceneProps {
  robot: Robot;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  hoveredPartId: string | null;
  onHoverPart: (partId: string | null) => void;
  liveJointIds: string[];
  alerts: JointAlert[];
}

export default function Scene({
  robot,
  selectedPartId,
  onSelectPart,
  hoveredPartId,
  onHoverPart,
  liveJointIds,
  alerts,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 50 }}
      style={{ background: '#0a0a1a' }}
      onClick={(e) => {
        // Clicking empty space deselects
        if ((e.target as HTMLCanvasElement).tagName === 'CANVAS') {
          // Only deselect if we clicked the canvas background (no Three.js object)
        }
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 5, -3]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.2} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Grid floor */}
      <Grid
        position={[0, 0, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Robot model */}
      <RobotModel
        robot={robot}
        selectedPartId={selectedPartId}
        onSelectPart={onSelectPart}
        hoveredPartId={hoveredPartId}
        onHoverPart={onHoverPart}
        liveJointIds={liveJointIds}
        alerts={alerts}
      />

      {/* Orbit controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={12}
        target={[0, 1.5, 0]}
      />
    </Canvas>
  );
}
