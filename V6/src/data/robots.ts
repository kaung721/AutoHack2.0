import type { Robot } from '../types';

export const robots: Robot[] = [
  {
    id: 'fanuc-r2000ia',
    name: 'FANUC R-2000iA/165F',
    manufacturer: 'FANUC',
    modelFile: '/models/robot_fanuc_crx-5ia.glb',
    description:
      'Heavy-duty 6-axis articulated robot widely used in Honda assembly lines for spot welding, material handling, and part transfer. One of the most deployed industrial robots in automotive manufacturing worldwide.',
    application: 'Spot welding, material handling, part transfer',
    specs: {
      axes: 6,
      payload: '165 kg',
      reach: '2655 mm',
      repeatability: '±0.3 mm',
      weight: '1200 kg',
      mounting: 'Floor',
    },
    parts: [
      {
        id: 'j1-waist',
        name: 'J1 — Waist Rotation',
        description:
          "The first axis. Rotates the entire arm left and right around the base. Provides the robot's full rotational workspace.",
        specs: [
          'Rotation range: ±360°',
          'Max speed: 120°/sec',
          'Driven by AC servo motor + harmonic drive',
        ],
        material: 'Aluminum alloy housing',
        maintenanceNotes:
          'Listen for unusual grinding sounds during rotation. Monitor motor temperature. Grease harmonic drive per schedule.',
      },
      {
        id: 'j2-shoulder',
        name: 'J2 — Shoulder (Lower Arm)',
        description:
          'The second axis. Moves the lower arm forward and backward. Bears the most load as it supports the entire upper structure.',
        specs: [
          'Rotation range: ±136°',
          'Max speed: 105°/sec',
          'Highest torque joint',
        ],
        material: 'High-strength steel',
        maintenanceNotes:
          'Highest stress joint — inspect for fatigue cracks. Check counterbalance cylinder pressure. Monitor servo motor current draw.',
      },
      {
        id: 'j3-elbow',
        name: 'J3 — Elbow (Upper Arm)',
        description:
          'The third axis. Moves the upper arm up and down. Works in tandem with J2 to position the wrist assembly.',
        specs: [
          'Rotation range: ±300°',
          'Max speed: 120°/sec',
          'Linked to J2 via timing belt on some variants',
        ],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Check timing belt tension if applicable. Inspect elbow cover for impact damage. Grease bearings.',
      },
      {
        id: 'j4-wrist-roll',
        name: 'J4 — Wrist Roll',
        description:
          'The fourth axis. Rotates the wrist assembly along the axis of the forearm. Enables the tool to spin.',
        specs: [
          'Rotation range: ±400°',
          'Max speed: 175°/sec',
          'Part of the 3-axis wrist assembly',
        ],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Check for cable twisting inside wrist. Inspect wrist seal for contamination ingress.',
      },
      {
        id: 'j5-wrist-pitch',
        name: 'J5 — Wrist Pitch',
        description:
          'The fifth axis. Bends the wrist up and down. Provides the tilting motion for precise tool positioning.',
        specs: [
          'Rotation range: ±360°',
          'Max speed: 180°/sec',
          'Compact servo motor inside wrist housing',
        ],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Inspect for backlash in pitch motion. Check for vibration during high-speed direction changes.',
      },
      {
        id: 'j6-wrist-yaw',
        name: 'J6 — Wrist Yaw (Tool Flange)',
        description:
          'The sixth axis. Twists the end effector (tool) left and right. The final axis before the tool mounting flange.',
        specs: [
          'Rotation range: ±720°',
          'Max speed: 180°/sec',
          'ISO 9409-1 tool mounting flange',
        ],
        material: 'Steel flange, aluminum housing',
        maintenanceNotes:
          'Check flange bolts and tool mounting. Inspect wrist gasket for dust/spatter ingress. Monitor for end-of-arm tooling vibration.',
      },
    ],
  },
  {
    id: 'yaskawa-mh24',
    name: 'Yaskawa Motoman MH24',
    manufacturer: 'Yaskawa',
    modelFile: '/models/yaskawa-mh24.glb',
    description:
      'Versatile 6-axis handling robot used in Honda plants for assembly, welding, and general material handling. Known for its speed and compact footprint.',
    application: 'Assembly, arc welding, material handling',
    specs: {
      axes: 6,
      payload: '24 kg',
      reach: '1730 mm',
      repeatability: '±0.06 mm',
      weight: '250 kg',
      mounting: 'Floor, wall, ceiling',
    },
    parts: [
      {
        id: 'j1-rotation',
        name: 'J1 — Base Rotation',
        description:
          'Rotates the entire robot arm. Provides the widest sweep of motion.',
        specs: ['Rotation range: ±180°', 'Max speed: 260°/sec'],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Grease J1 bearings. Check for play in rotation.',
      },
      {
        id: 'j2-lower-arm',
        name: 'J2 — Lower Arm',
        description:
          'Shoulder joint that raises and lowers the main arm body.',
        specs: ['Rotation range: +155° / -90°', 'Max speed: 200°/sec'],
        material: 'High-strength aluminum',
        maintenanceNotes:
          'Inspect counterbalance spring. Check for arm drift when powered off.',
      },
      {
        id: 'j3-upper-arm',
        name: 'J3 — Upper Arm',
        description: 'Elbow joint connecting to the wrist unit.',
        specs: ['Rotation range: +170° / -175°', 'Max speed: 260°/sec'],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Check timing belt if applicable. Inspect joint covers.',
      },
      {
        id: 'wrist-unit',
        name: 'J4/J5/J6 — Wrist Unit',
        description:
          'Compact 3-axis wrist providing roll, pitch, and yaw for the end effector.',
        specs: [
          'J4 range: ±360°',
          'J5 range: ±130°',
          'J6 range: ±360°',
          'Hollow wrist for cable routing',
        ],
        material: 'Aluminum alloy',
        maintenanceNotes:
          'Check wrist cables for wear. Inspect tool flange. Grease wrist bearings per schedule.',
      },
    ],
  },
];
