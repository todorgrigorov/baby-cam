import { Leader } from './leader.js';
import { Viewer } from './viewer.js';

const PING_INTERVAL_MS = 15_000;

class App {
  constructor() {
    this.ws = new WebSocket(`wss://${location.host}`);
    this.pcConfig = {};
    this.role = null;
    this.roleHandler = null; // Will hold Leader or Viewer instance

    // heartbeat/ping support
    this.pingTimer = null;
    this.lastPong = null;

    this.setupConnection();
    this.setupActions();
  }

  setupActions() {
    // Fullscreen button
    const fsBtn = document.getElementById('fullscreen-btn');
    const cameraBtn = document.getElementById('camera-switch');

    if (fsBtn) {
      fsBtn.addEventListener('click', async () => {
        const [el] = document.getElementsByTagName('video');
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen)
          await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
      });
    }

    // ensure camera button wiring remains functional
    if (cameraBtn) {
      cameraBtn.addEventListener('click', async () => {
        // if roleHandler has switchCamera, call it
        if (
          this.roleHandler &&
          typeof this.roleHandler.switchCamera === 'function'
        ) {
          await this.roleHandler.switchCamera();
        }
      });
    }
  }

  async setupConnection() {
    this.ws.onopen = () => {
      console.log('WebSocket open');
      // start sending pings
      this.startPinging();
    };

    this.ws.onmessage = async e => {
      const data = JSON.parse(e.data);
      // handle pong separately
      if (data.type === 'pong') {
        this.lastPong = data.serverTs || Date.now();
        console.log('PONG from server, ts:', data);
        return;
      }

      console.log('Received message:', data);

      if (data.type === 'role') {
        this.role = data.role;
        const heading = document.getElementById('title');
        heading.textContent = `${this.role === 'leader' ? '👶' : '👫'} Baby Cam`;

        // Instantiate appropriate role handler
        if (this.role === 'leader') {
          this.roleHandler = new Leader(this.ws, this.pcConfig);
          await this.roleHandler.start();
        } else {
          this.roleHandler = new Viewer(this.ws, this.pcConfig);
          await this.roleHandler.start();
        }
      }

      // Route messages to appropriate role handler
      if (this.roleHandler) {
        if (this.role === 'leader') {
          if (data.type === 'offer') {
            await this.roleHandler.handleViewerOffer(data);
          } else if (data.type === 'candidate') {
            await this.roleHandler.handleCandidate(data.candidate);
          }
        } else if (this.role === 'viewer') {
          if (data.type === 'answer') {
            await this.roleHandler.handleAnswer(data.sdp);
          } else if (data.type === 'candidate') {
            await this.roleHandler.handleCandidate(data.candidate);
          }
        }
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.stopPinging();
    };
  }

  startPinging() {
    if (this.pingTimer) {
      return;
    }
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        } catch (e) {
          console.warn('Failed to send ping', e);
        }
      }
    }, PING_INTERVAL_MS);
  }

  stopPinging() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
