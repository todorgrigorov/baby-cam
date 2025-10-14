class App {
  constructor() {
    this.ws = new WebSocket(`ws://${location.host}`);
    // this.pcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    this.pcConfig = {};
    this.role = null;
    this.pc = null;
    this.localStream = null;

    this.init();
  }

  async init() {
    this.ws.onmessage = async e => {
      const data = JSON.parse(e.data);
      console.log('Received message:', data);

      if (data.type === 'role') {
        this.role = data.role;
        document.title = `${this.role === 'leader' ? '👶' : '👫'} Baby Cam`;
        if (this.role === 'leader') {
          await this.startLeader();
        } else {
          await this.startViewer();
        }
      }

      if (this.role === 'leader') {
        if (data.type === 'offer') {
          await this.handleViewerOffer(data);
        } else if (data.type === 'candidate')
          await this.pc.addIceCandidate(data.candidate);
      } else if (this.role === 'viewer') {
        if (data.type === 'answer') {
          await this.pc.setRemoteDescription(data.sdp);
        } else if (data.type === 'candidate')
          await this.pc.addIceCandidate(data.candidate);
      }
    };
  }

  async startLeader() {
    const [localVideo] = document.getElementsByTagName('video');
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    localVideo.srcObject = this.localStream;
  }

  async startViewer() {
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

  async handleViewerOffer(data) {
    this.pc = new RTCPeerConnection(this.pcConfig);

    this.pc.onicecandidate = e => {
      console.log('Leader candidate', e);
      if (e.candidate) {
        this.ws.send(
          JSON.stringify({ type: 'candidate', candidate: e.candidate })
        );
      }
    };
    this.pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', this.pc.iceGatheringState);
    };

    this.localStream.getTracks().forEach(t => {
      console.log('Track added:', t);
      this.pc.addTrack(t, this.localStream);
    });

    await this.pc.setRemoteDescription(data.sdp);
    console.log('Remote description set:', this.pc.remoteDescription);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
