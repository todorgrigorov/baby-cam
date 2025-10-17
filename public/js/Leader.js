export class Leader {
  constructor(ws, pcConfig) {
    this.ws = ws;
    this.pcConfig = pcConfig;
    this.pc = null;
    this.localStream = null;
    this.currentFacingMode = 'environment'; // 'user' for front camera, 'environment' for back camera
    this.availableCameras = [];

    this.setupCameraSwitch();
  }

  async start() {
    const [localVideo] = document.getElementsByTagName('video');
    await this.initializeCamera();

    localVideo.srcObject = this.localStream;

    // Show camera switch button only for leaders
    this.updateCameraSwitchVisibility();
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

  async handleCandidate(candidate) {
    if (this.pc) {
      await this.pc.addIceCandidate(candidate);
    }
  }

  updateCameraSwitchVisibility() {
    const cameraSwitchBtn = document.getElementById('camera-switch');
    if (cameraSwitchBtn) {
      // Show camera switch button for leaders
      cameraSwitchBtn.style.display = 'block';
    }
  }

  setupCameraSwitch() {
    document.addEventListener('DOMContentLoaded', () => {
      const cameraSwitchBtn = document.getElementById('camera-switch');
      if (cameraSwitchBtn) {
        // Hide button initially - will be shown when leader starts
        cameraSwitchBtn.style.display = 'none';

        cameraSwitchBtn.addEventListener('click', async () => {
          await this.switchCamera();
        });
      }
    });
  }

  async getAvailableCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(
        device => device.kind === 'videoinput'
      );
      return this.availableCameras.length > 1;
    } catch (error) {
      console.error('Error getting available cameras:', error);
      return false;
    }
  }

  async initializeCamera() {
    try {
      // Check if multiple cameras are available
      const hasMultipleCameras = await this.getAvailableCameras();

      const constraints = {
        video: {
          facingMode: this.currentFacingMode
        },
        audio: false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Enable/disable camera switch button based on available cameras
      const cameraSwitchBtn = document.getElementById('camera-switch');
      if (cameraSwitchBtn) {
        cameraSwitchBtn.disabled = !hasMultipleCameras;
        if (!hasMultipleCameras) {
          cameraSwitchBtn.title = 'No additional cameras available';
        }
      }
    } catch (error) {
      console.error('Error initializing camera:', error);
      // Fallback to basic video constraints if facingMode fails
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (fallbackError) {
        console.error('Fallback camera initialization failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async switchCamera() {
    if (!this.localStream) return;

    const cameraSwitchBtn = document.getElementById('camera-switch');
    if (cameraSwitchBtn) {
      cameraSwitchBtn.disabled = true;
    }

    try {
      // Stop current stream
      this.localStream.getTracks().forEach(track => track.stop());

      // Switch facing mode
      this.currentFacingMode =
        this.currentFacingMode === 'user' ? 'environment' : 'user';

      // Get new stream with switched camera
      await this.initializeCamera();

      // Update video element
      const [localVideo] = document.getElementsByTagName('video');
      localVideo.srcObject = this.localStream;

      // If we have an active peer connection, replace the video track
      if (this.pc && this.pc.connectionState !== 'closed') {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const sender = this.pc
          .getSenders()
          .find(s => s.track && s.track.kind === 'video');

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
          console.log('Video track replaced successfully');
        }
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      // Try to restore previous camera if switch failed
      this.currentFacingMode =
        this.currentFacingMode === 'user' ? 'environment' : 'user';
      try {
        await this.initializeCamera();
        const [localVideo] = document.getElementsByTagName('video');
        localVideo.srcObject = this.localStream;
      } catch (restoreError) {
        console.error('Failed to restore previous camera:', restoreError);
      }
    } finally {
      // Re-enable button
      if (cameraSwitchBtn) {
        cameraSwitchBtn.disabled = false;
      }
    }
  }
}
