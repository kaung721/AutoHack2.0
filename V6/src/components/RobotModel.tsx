import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Robot, JointAlert } from '../types';

interface RobotModelProps {
  robot: Robot;
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  hoveredPartId: string | null;
  onHoverPart: (partId: string | null) => void;
  liveJointIds: string[];
  alerts: JointAlert[];
}

// Color constants
const COLORS = {
  selected: '#3b82f6',
  hovered: '#60a5fa',
  hitbox: '#3b82f6',
};

/* ------------------------------------------------------------------ */
/*  Invisible hitbox for part selection on the 3D model               */
/* ------------------------------------------------------------------ */
interface HitboxProps {
  partId: string;
  position: [number, number, number];
  size: number[] ;
  shape: 'sphere' | 'cylinder' | 'box';
  selectedPartId: string | null;
  hoveredPartId: string | null;
  onSelectPart: (partId: string) => void;
  onHoverPart: (partId: string | null) => void;
  rotation?: [number, number, number];
}

function Hitbox({
  partId,
  position,
  size,
  shape,
  selectedPartId,
  hoveredPartId,
  onSelectPart,
  onHoverPart,
  rotation,
}: HitboxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(0);
  const isSelected = selectedPartId === partId;
  const isHovered = hoveredPartId === partId;

  useFrame(() => {
    const target = isSelected ? 0.35 : isHovered ? 0.25 : 0.08;
    setOpacity((prev) => THREE.MathUtils.lerp(prev, target, 0.1));
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelectPart(partId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverPart(partId);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        onHoverPart(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {shape === 'sphere' && <sphereGeometry args={[size[0], 16, 16]} />}
      {shape === 'cylinder' && (
        <cylinderGeometry args={[size[0], size[1], size[2], 16]} />
      )}
      {shape === 'box' && <boxGeometry args={[size[0], size[1], size[2]]} />}
      <meshStandardMaterial
        color={isSelected ? COLORS.selected : isHovered ? COLORS.hovered : COLORS.hitbox}
        transparent
        opacity={opacity}
        depthWrite={false}
        wireframe={!isSelected && !isHovered}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Hitbox layout for the FANUC CRX-5iA model                        */
/*  Positions calibrated to the .glb bounding box (scaled 2.2x)      */
/* ------------------------------------------------------------------ */
// The model after root transform stands ~1.65 units tall; we scale by 2.2
// so total height ≈ 3.6 units. The arm extends forward/up.
const FANUC_HITBOXES: Array<{
  partId: string;
  position: [number, number, number];
  size: number[];
  shape: 'sphere' | 'cylinder' | 'box';
  rotation?: [number, number, number];
}> = [
  // J1 Waist
  { partId: 'j1-waist', position: [.05, 2.5, -.55], size: [0.2, 0.2, 0.2], shape: 'sphere' },
  // J2 Shoulder
  { partId: 'j2-shoulder', position: [-.45, 2.5, -.55], size: [0.2, 0.2, 0.2], shape: 'sphere' },
  // J3 Elbow
  { partId: 'j3-elbow', position: [-.4, 3.4, -0.55], size: [0.2, 0.2, 0.5], shape: 'sphere' },
  // J4 Wrist Roll
  { partId: 'j4-wrist-roll', position: [0, 3.4, -0.55], size: [0.2, 0.2, 0.5], shape: 'sphere' },
  // J5 Wrist Pitch
  { partId: 'j5-wrist-pitch', position: [0, 3.4, 0.38], size: [0.2, 0, 0], shape: 'sphere' },
  // J6 Tool Flange
  { partId: 'j6-wrist-yaw', position: [-.4, 3.40, 0.35], size: [0.18, 0, 0], shape: 'sphere' },
];

/* ------------------------------------------------------------------ */
/*  FANUC model loaded from .glb + hitbox overlays                    */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/*  Green "!" badge for joints receiving real live data                */
/* ------------------------------------------------------------------ */
function LiveDataIndicator({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const [pulse, setPulse] = useState(1);

  useFrame(({ clock }) => {
    // gentle pulse between 0.85 and 1.15
    setPulse(1 + Math.sin(clock.getElapsedTime() * 3) * 0.15);
  });

  return (
    <group ref={ref} position={[position[0] + 0.3, position[1] + 0.25, position[2]]}>
      <Html center distanceFactor={4} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            transform: `scale(${pulse})`,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(34, 197, 94, 0.18)',
            border: '1.5px solid #22c55e',
            borderRadius: '8px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span
            style={{
              color: '#22c55e',
              fontWeight: 900,
              fontSize: '14px',
              lineHeight: 1,
              textShadow: '0 0 6px rgba(34,197,94,0.6)',
            }}
          >
            !
          </span>
          <span
            style={{
              color: '#bbf7d0',
              fontSize: '9px',
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Live
          </span>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Red "!" fault indicator — shown when a condition goes POOR/CRITICAL */
/* ------------------------------------------------------------------ */
function FaultIndicator({
  position,
  alerts,
}: {
  position: [number, number, number];
  alerts: JointAlert[];
}) {
  const [hovered, setHovered] = useState(false);
  const [pulse, setPulse] = useState(1);

  useFrame(({ clock }) => {
    setPulse(1 + Math.sin(clock.getElapsedTime() * 4) * 0.18);
  });

  const hasCritical = alerts.some((a) => a.condition === 'CRITICAL');

  return (
    <group position={[position[0] + 0.3, position[1] - 0.25, position[2]]}>
      <Html center distanceFactor={4} style={{ pointerEvents: 'auto' }}>
        <div
          style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* The red "!" badge */}
          <div
            style={{
              transform: `scale(${pulse})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: hasCritical
                ? 'rgba(239, 68, 68, 0.25)'
                : 'rgba(245, 158, 11, 0.25)',
              border: `2px solid ${hasCritical ? '#ef4444' : '#f59e0b'}`,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              boxShadow: `0 0 8px ${hasCritical ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)'}`,
            }}
          >
            <span
              style={{
                color: hasCritical ? '#ef4444' : '#f59e0b',
                fontWeight: 900,
                fontSize: '14px',
                lineHeight: 1,
                textShadow: `0 0 6px ${hasCritical ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.6)'}`,
              }}
            >
              !
            </span>
          </div>

          {/* Hover tooltip */}
          {hovered && (
            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                minWidth: '220px',
                background: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${hasCritical ? '#ef4444' : '#f59e0b'}`,
                borderRadius: '10px',
                padding: '10px 14px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: hasCritical ? '#fca5a5' : '#fcd34d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                ⚠ Fault Detected
              </div>
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: '#e2e8f0',
                    fontFamily: 'system-ui, sans-serif',
                    padding: '3px 0',
                    borderTop: i > 0 ? '1px solid rgba(51,65,85,0.5)' : 'none',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: alert.condition === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                      marginRight: '6px',
                      verticalAlign: 'middle',
                    }}
                  />
                  {alert.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function FanucGLBModel({
  selectedPartId,
  hoveredPartId,
  onSelectPart,
  onHoverPart,
  liveJointIds,
  alerts,
}: Omit<RobotModelProps, 'robot'>) {
  const { scene } = useGLTF('/models/robot_fanuc_crx-5ia.glb');

  return (
    <group>
      {/* The actual 3D model — scaled up and positioned on the grid */}
      <primitive
        object={scene}
        scale={2.2}
        position={[0, 0, 0]}
      />

      {/* Invisible hitboxes for part selection */}
      {FANUC_HITBOXES.map((hb) => (
        <Hitbox
          key={hb.partId}
          partId={hb.partId}
          position={hb.position}
          size={hb.size}
          shape={hb.shape}
          rotation={hb.rotation}
          selectedPartId={selectedPartId}
          hoveredPartId={hoveredPartId}
          onSelectPart={onSelectPart}
          onHoverPart={onHoverPart}
        />
      ))}

      {/* Green "! Live" indicators for joints with real data */}
      {FANUC_HITBOXES.filter((hb) => liveJointIds.includes(hb.partId)).map((hb) => (
        <LiveDataIndicator key={`live-${hb.partId}`} position={hb.position} />
      ))}

      {/* Red "!" fault indicators for joints with POOR/CRITICAL conditions */}
      {FANUC_HITBOXES.filter((hb) => alerts.some((a) => a.jointId === hb.partId)).map((hb) => (
        <FaultIndicator
          key={`fault-${hb.partId}`}
          position={hb.position}
          alerts={alerts.filter((a) => a.jointId === hb.partId)}
        />
      ))}
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/robot_fanuc_crx-5ia.glb');

/* ------------------------------------------------------------------ */
/*  YASKAWA — primitive geometry (no .glb available)                  */
/* ------------------------------------------------------------------ */
function YaskawaModel({
  selectedPartId,
  hoveredPartId,
  onSelectPart,
  onHoverPart,
}: Omit<RobotModelProps, 'robot'>) {
  // Yaskawa doesn't have live data — liveJointIds & alerts are not used
  const ip = { selectedPartId, hoveredPartId, onSelectPart, onHoverPart };

  return (
    <group>
      {/* Base */}
      <Hitbox partId="base" position={[0, 0.1, 0]} size={[0.5, 0.55, 0.2]} shape="cylinder" {...ip} />
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.1, 32]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.14, 32]} />
        <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* J1 rotation turret */}
      <Hitbox partId="j1-rotation" position={[0, 0.38, 0]} size={[0.38, 0.4, 0.2]} shape="cylinder" {...ip} />
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.36, 0.4, 0.15, 32]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Shoulder tower */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.36]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* J2 Lower arm — angled */}
      <Hitbox partId="j2-lower-arm" position={[0, 1.15, 0.2]} size={[0.35, 0, 0]} shape="sphere" {...ip} />
      <group position={[0, 0.85, 0]} rotation={[0.35, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.28, 0.95, 0.24]} />
          <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* J3 Upper arm — angled forward from elbow */}
        <group position={[0, 1.05, 0]}>
          <Hitbox partId="j3-upper-arm" position={[0, 0, 0]} size={[0.28, 0, 0]} shape="sphere" {...ip} />
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
          </mesh>

          <group rotation={[-0.85, 0, 0]}>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[0.22, 0.75, 0.2]} />
              <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Wrist unit (J4/J5/J6) */}
            <group position={[0, 0.82, 0]}>
              <Hitbox partId="wrist-unit" position={[0, 0.05, 0]} size={[0.2, 0, 0]} shape="sphere" {...ip} />
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.12, 0.2, 16]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.12, 0]}>
                <sphereGeometry args={[0.08, 12, 12]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.09, 0.09, 0.03, 32]} />
                <meshStandardMaterial color="#d1d5db" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Controller */}
      <Hitbox partId="controller" position={[1.4, 0.45, 0]} size={[0.55, 0.9, 0.4]} shape="box" {...ip} />
      <mesh position={[1.4, 0.45, 0]}>
        <boxGeometry args={[0.55, 0.9, 0.4]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[1.12, 0.45, 0]}>
        <boxGeometry args={[0.02, 0.75, 0.32]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[1.11, 0.78, 0.12]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */
export default function RobotModel({
  robot,
  selectedPartId,
  onSelectPart,
  hoveredPartId,
  onHoverPart,
  liveJointIds,
  alerts,
}: RobotModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  const isFanuc = robot.id === 'fanuc-r2000ia';

  return (
    <group ref={groupRef}>
      {isFanuc ? (
        <FanucGLBModel
          selectedPartId={selectedPartId}
          hoveredPartId={hoveredPartId}
          onSelectPart={onSelectPart}
          onHoverPart={onHoverPart}
          liveJointIds={liveJointIds}
          alerts={alerts}
        />
      ) : (
        <YaskawaModel
          selectedPartId={selectedPartId}
          hoveredPartId={hoveredPartId}
          onSelectPart={onSelectPart}
          onHoverPart={onHoverPart}
          liveJointIds={liveJointIds}
          alerts={alerts}
        />
      )}
    </group>
  );
}
