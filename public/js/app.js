import { Leader } from './leader.js';
import { Viewer } from './viewer.js';

class App {
  constructor() {
    this.ws = new WebSocket(`wss://${location.host}`);
    this.pcConfig = {};
    this.role = null;
    this.roleHandler = null; // Will hold Leader or Viewer instance

    // heartbeat/ping support
    this._pingInterval = 15_000; // ms
    this._pingTimer = null;
    this._lastPong = null;

    this.handleWS();
  }

  async handleWS() {
    this.ws.onopen = () => {
      console.log('WebSocket open');
      // start sending pings
      this._startPinging();
    };

    this.ws.onmessage = async e => {
      const data = JSON.parse(e.data);
      // handle pong separately
      if (data.type === 'pong') {
        this._lastPong = data.serverTs || Date.now();
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
      this._stopPinging();
    };
  }

  _startPinging() {
    if (this._pingTimer) return;
    this._pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        } catch (e) {
          console.warn('Failed to send ping', e);
        }
      }
    }, this._pingInterval);
  }

  _stopPinging() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
