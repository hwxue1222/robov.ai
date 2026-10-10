(function (root) {
  class CameraScanner {
    constructor({ video, canvas, decode, onResult, onError, mediaDevices }) {
      Object.assign(this, { video, canvas, decode, onResult, onError, mediaDevices });
      this.generation = 0; this.stream = null; this.timer = null;
    }

    stop() {
      this.generation++;
      clearTimeout(this.timer); this.timer = null;
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.video.pause(); this.video.srcObject = null;
    }

    async start(deviceId) {
      this.stop();
      const generation = this.generation;
      const stream = await this.mediaDevices.getUserMedia({ audio: false, video: {
        facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 },
        ...(deviceId ? { deviceId: { exact: deviceId } } : {})
      } });
      // A cancelled permission request must never leave a camera running.
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream; this.video.srcObject = stream;
      try { await this.video.play(); } catch (error) { this.stop(); throw error; }
      if (generation !== this.generation) return false;
      const tick = () => {
        if (generation !== this.generation) return;
        try {
          if (this.video.readyState >= 2 && this.video.videoWidth) {
            const scale = Math.min(1, 960 / Math.max(this.video.videoWidth,this.video.videoHeight));
            this.canvas.width = Math.round(this.video.videoWidth * scale);
            this.canvas.height = Math.round(this.video.videoHeight * scale);
            const context = this.canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const token = this.decode(context.getImageData(0, 0, this.canvas.width, this.canvas.height));
            if (token) {
              this.stop();
              Promise.resolve(this.onResult(token)).catch(this.onError);
              return;
            }
          }
          this.timer = setTimeout(tick, 150);
        } catch (error) { this.stop(); this.onError(error); }
      };
      this.timer = setTimeout(tick, 150);
      return true;
    }
  }
  if (typeof module !== 'undefined') module.exports = { CameraScanner };
  else root.RobovCameraScanner = CameraScanner;
})(typeof window !== 'undefined' ? window : globalThis);
