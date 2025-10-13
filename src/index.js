#!/usr/bin/env node

/**
 * Main entry point for the baby-cam application
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_PATH = path.join(__dirname, '..', 'public')


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
