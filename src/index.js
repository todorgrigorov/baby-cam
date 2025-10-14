#!/usr/bin/env node

/**
 * Main entry point for the baby-cam application
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || '8010';
const PUBLIC_PATH = path.join(__dirname, '..', 'public');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

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
    const data = JSON.parse(msg);

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
server.listen(PORT, () => {
  console.log(`Baby Cam server is running on http://localhost:${PORT}`);
  console.log(`Static files served from: ${PUBLIC_PATH}`);
});
