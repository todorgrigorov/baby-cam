export class Viewer {
  constructor(ws, pcConfig) {
    this.ws = ws;
    this.pcConfig = pcConfig;
    this.pc = null;
  }

  async start() {
    // Hide camera switch button for viewers
    this.updateCameraSwitchVisibility();

    this.pc = new RTCPeerConnection(this.pcConfig);

    // Ensure we advertise ability to receive video
    if (this.pc.addTransceiver) {
      try {
        this.pc.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {
        console.warn('addTransceiver failed', e);
      }
    }

    this.pc.ontrack = e => {
      console.log('Remote track:', e.streams);
      const [remoteVideo] = document.getElementsByTagName('video');
      remoteVideo.srcObject = e.streams[0];
    };
    this.pc.onicecandidateerror = e => {
      console.error('Candidate error', e);
    };
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE:', this.pc.iceConnectionState);
    };
    this.pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.pc.iceGatheringState);
    };
    this.pc.onicecandidate = e => {
      console.log('Viewer candidate', e);
      if (e.candidate) {
        this.ws.send(
          JSON.stringify({ type: 'candidate', candidate: e.candidate })
        );
      }
    };

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: true
    });
    await this.pc.setLocalDescription(offer);
    this.ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
  }

  async handleAnswer(sdp) {
    if (this.pc) {
      await this.pc.setRemoteDescription(sdp);
    }
  }

  async handleCandidate(candidate) {
    if (this.pc) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  updateCameraSwitchVisibility() {
    const cameraSwitchBtn = document.getElementById('camera-switch');
    if (cameraSwitchBtn) {
      // Hide camera switch button for viewers
      cameraSwitchBtn.style.display = 'none';
    }
  }
}
