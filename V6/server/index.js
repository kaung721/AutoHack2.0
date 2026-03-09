import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// ── WebSocket server (frontend connects here) ─────────────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send the latest snapshot so the new client isn't empty
  if (latestSnapshot) {
    ws.send(JSON.stringify({ type: 'snapshot', data: latestSnapshot }));
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
});

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(payload);
    }
  }
}

// ── In-memory store of latest readings per joint ───────────────────
let latestSnapshot = {};

// ── HTTP endpoint — buddy's laptop POSTs sensor data here ──────────
//
// Expected body (single reading):
//   {
//     "jointId": "j1-waist",
//     "temperature": 42.3,
//     "vibration": 0.15,
//     "load": 65,
//     "speed": 110.5,
//     "timestamp": "2026-03-07T14:30:00Z"  ← optional, server adds one if missing
//   }
//
// Or an array of readings:
//   [ { jointId: "j1-waist", ... }, { jointId: "j2-shoulder", ... } ]
//
app.post('/api/sensor-data', (req, res) => {
  const readings = Array.isArray(req.body) ? req.body : [req.body];

  for (const reading of readings) {
    if (!reading.jointId) {
      return res.status(400).json({ error: 'Missing jointId' });
    }

    // Default timestamp to now
    if (!reading.timestamp) {
      reading.timestamp = new Date().toISOString();
    }

    // Derive a simple status from the values
    reading.status = deriveStatus(reading);

    // Update snapshot
    latestSnapshot[reading.jointId] = reading;
  }

  // Broadcast to all connected frontends
  broadcast({ type: 'sensor-update', data: readings });

  console.log(
    `[HTTP] Received ${readings.length} reading(s):`,
    readings.map((r) => r.jointId).join(', ')
  );
  res.json({ ok: true, received: readings.length });
});

// ── GET latest snapshot (for debugging / polling fallback) ─────────
app.get('/api/sensor-data', (_req, res) => {
  res.json(latestSnapshot);
});

// ── Health check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', clients: clients.size });
});

// ── Sender page — your buddy opens this in Chrome ──────────────────
app.get('/sender', (_req, res) => {
  res.sendFile(join(__dirname, 'sender.html'));
});

// ── Derive a traffic-light status from sensor values ───────────────
function deriveStatus(reading) {
  const { temperature, vibration, load } = reading;

  // Critical thresholds
  if (temperature > 80 || vibration > 0.6 || load > 95) return 'critical';
  // Warning thresholds
  if (temperature > 60 || vibration > 0.35 || load > 80) return 'warning';
  // Normal
  return 'normal';
}

// ── Start ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────────────────────┐
  │  Sensor Relay Server running on port ${PORT}            │
  │                                                      │
  │  HTTP endpoint:  http://localhost:${PORT}/api/sensor-data │
  │  WebSocket:      ws://localhost:${PORT}                   │
  │                                                      │
  │  Your buddy should POST sensor data to the HTTP URL. │
  │  The React app connects via WebSocket automatically.  │
  └──────────────────────────────────────────────────────┘
  `);
});
