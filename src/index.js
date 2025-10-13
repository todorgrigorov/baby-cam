#!/usr/bin/env node

/**
 * Main entry point for the baby-cam application
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || '8010';
const PUBLIC_PATH = path.join(__dirname, '..', 'public');

// Serve static files from the 'public' directory
app.use(express.static(PUBLIC_PATH));

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
});

// API route example
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Baby Cam server is running!',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Baby Cam server is running on http://localhost:${PORT}`);
  console.log(`Static files served from: ${PUBLIC_PATH}`);
});
