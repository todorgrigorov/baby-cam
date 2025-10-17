import { Leader } from './Leader.js';
import { Viewer } from './Viewer.js';

class App {
  constructor() {
    this.ws = new WebSocket(`ws://${location.host}`);
    this.pcConfig = {};
    this.role = null;
    this.roleHandler = null; // Will hold Leader or Viewer instance

    this.handleWS();
  }

  async handleWS() {
    this.ws.onmessage = async e => {
      const data = JSON.parse(e.data);
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
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
