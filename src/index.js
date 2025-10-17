#!/usr/bin/env node

/**
 * Main entry point for the baby-cam application
 */

import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || '8443';
const PUBLIC_PATH = path.join(__dirname, '..', 'public');

const app = express();

const options = {
  key: fs.readFileSync(path.join(__dirname, '..', 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'certs', 'cert.pem'))
};
const server = createServer(options, app);
const wss = new WebSocketServer({ server });

// Heartbeat / stale-client configuration
const PING_INTERVAL_MS = 15_000; // how often clients are expected to ping
const STALE_THRESHOLD_MS = 45_000; // if no message within this, consider client stale

// Periodically check for stale clients and terminate them
setInterval(() => {
  const now = Date.now();
  for (const ws of wss.clients) {
    // some clients may not have lastSeen set yet
    const last = ws.lastSeen || 0;
    if (ws.readyState === WebSocket.OPEN && now - last > STALE_THRESHOLD_MS) {
      console.log('Terminating stale client');
      try {
        ws.terminate();
      } catch (e) {
        console.warn('Failed to terminate ws', e);
      }
    }
  }
}, PING_INTERVAL_MS);

let leader = null; // single broadcaster
let viewers = new Set(); // many viewers

// Serve static files from the 'public' directory
app.use(express.static(PUBLIC_PATH));

// Index route
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

wss.on('connection', ws => {
  console.log('New client connected');

  // initialize last-seen for this connection
  ws.lastSeen = Date.now();

  // Assign as leader if none exists
  if (!leader) {
    leader = ws;
    ws.role = 'leader';
    ws.send(JSON.stringify({ type: 'role', role: 'leader' }));
    console.log('Assigned new leader');
  } else {
    viewers.add(ws);
    ws.role = 'viewer';
    ws.send(JSON.stringify({ type: 'role', role: 'viewer' }));
    console.log('Added viewer');
  }

  ws.on('message', msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      console.warn('Received non-JSON message');
      return;
    }

    // update heartbeat timestamp on any received message
    ws.lastSeen = Date.now();

    // respond to ping messages so clients can measure round-trip if desired
    if (data.type === 'ping') {
      try {
        ws.send(
          JSON.stringify({ type: 'pong', ts: data.ts, serverTs: Date.now() })
        );
      } catch (e) {
        console.warn('Failed to send pong', e);
      }
      return;
    }

    switch (data.type) {
      case 'offer':
        if (leader && ws.role === 'viewer') {
          leader.send(
            JSON.stringify({ type: 'offer', sdp: data.sdp, id: data.id })
          );
        }
        break;

      case 'answer':
        if (ws.role === 'leader') {
          for (const v of viewers) {
            if (v.readyState === WebSocket.OPEN) {
              v.send(JSON.stringify({ type: 'answer', sdp: data.sdp }));
            }
          }
        }
        break;

      case 'candidate':
        if (ws.role === 'leader') {
          for (const v of viewers) {
            if (v.readyState === WebSocket.OPEN) {
              v.send(
                JSON.stringify({ type: 'candidate', candidate: data.candidate })
              );
            }
          }
        } else if (leader && ws.role === 'viewer') {
          leader.send(
            JSON.stringify({ type: 'candidate', candidate: data.candidate })
          );
        }
        break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (ws === leader) {
      console.log('Leader disconnected — electing new one...');
      leader = null;

      // Promote next viewer to leader
      const nextLeader = viewers.values().next().value;
      if (nextLeader) {
        viewers.delete(nextLeader);
        leader = nextLeader;
        nextLeader.role = 'leader';
        nextLeader.send(JSON.stringify({ type: 'role', role: 'leader' }));
        console.log('New leader promoted');
      }
    } else {
      viewers.delete(ws);
    }
  });
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Baby Cam server is running on https://localhost:${PORT}`);
  console.log(`Static files served from: ${PUBLIC_PATH}`);
});
