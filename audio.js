/**
 * Type Loom — Bulletproof Web Audio Synthesizer by Ramya
 * Generates rich acoustic plucked string harmonics, scissor snips, and unspooling chimes.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    // Pentatonic scale frequencies for harmonic plucks (C Major / A Minor Pentatonic)
    this.scale = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.50];
    this.scaleIndex = 0;

    // Attach immediate unlock listeners
    this.setupAutoUnlock();
  }

  setupAutoUnlock() {
    const unlock = () => {
      this.ensureAudioContext();
    };
    ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  ensureAudioContext() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  toggleMute() {
    this.ensureAudioContext();
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      // Play instant pleasant confirmation chime
      this.playPluck(523.25, 0.8);
    }
    return this.isMuted;
  }

  // Plays a rich acoustic plucked string harmonic
  playPluck(frequency = null, intensity = 0.7) {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      let freq = frequency;
      if (!freq) {
        freq = this.scale[this.scaleIndex % this.scale.length];
        this.scaleIndex++;
      }

      // Dual oscillators for string body and shimmer
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Triangle for warm acoustic string, Sine for harmonic overtone
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, t);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.01, t);

      // Lowpass acoustic resonance filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 4.5, 4500), t);
      filter.frequency.exponentialRampToValueAtTime(150, t + 0.8);

      // Amplitude envelope
      const vol = Math.min(Math.max(intensity, 0.3), 1.0) * 0.55;
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.linearRampToValueAtTime(vol, t + 0.006);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1.25);
      osc2.stop(t + 1.25);
    } catch (e) {
      console.warn('playPluck error:', e);
    }
  }

  // Scissor snip sound on spacebar
  playSnip() {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.Q.setValueAtTime(3.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(t);
    } catch (e) {}
  }

  // Unravel chime on backspace
  playUnravel() {
    if (this.isMuted) return;
    this.ensureAudioContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.25);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch (e) {}
  }
}

window.LoomAudio = new LoomAudio();
