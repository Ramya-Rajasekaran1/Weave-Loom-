/**
 * Type Loom — Audio Synthesizer by Ramya
 * Rock-solid acoustic plucked harp/string synthesis engine with voice limiting, master bus compressor, and auto-resume.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.isMuted = false;
    
    // Clear, audible pentatonic harp scale (C5 to C6 octave)
    this.scale = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
    this.scaleIndex = 0;

    // Rate limiting to protect WebAudio thread from cursor hover floods
    this.lastPluckTime = 0;
    this.minPluckInterval = 45; // ms

    this.initOnGesture();
  }

  initOnGesture() {
    const unlock = () => {
      this.ensureContext();
    };

    ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });

    // Auto-resume when tab regains focus or visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.ensureContext();
      }
    });

    window.addEventListener('focus', () => this.ensureContext());
  }

  ensureContext() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        this.ctx = new AudioContextClass();
        
        // Master Compressor to prevent clipping / distortion
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);

        // Connect master chain: [Voices] -> Compressor -> MasterGain -> Destination
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (err) {
      console.warn('AudioContext check note:', err);
    }
    return this.ctx;
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, now);
    }

    if (!this.isMuted) {
      // Immediate feedback chime
      this.playPluck(523.25, 0.85, true);
    }
    return this.isMuted;
  }

  // Plays an acoustic plucked string note with exponential decay
  playPluck(frequency = null, intensity = 0.7, force = false) {
    if (this.isMuted) return;

    // Prevent audio engine choking during high-speed mouse sweeps
    const nowMs = performance.now();
    if (!force && (nowMs - this.lastPluckTime < this.minPluckInterval)) {
      return;
    }
    this.lastPluckTime = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.compressor) return;

    try {
      const now = ctx.currentTime;
      let freq = frequency;
      if (!freq) {
        freq = this.scale[this.scaleIndex % this.scale.length];
        this.scaleIndex++;
      }

      // 1. Primary string oscillator (Triangle wave for physical string warmth)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // 2. Secondary overtone oscillator (Sine wave for shimmering harmonic resonance)
      const overtone = ctx.createOscillator();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, now);

      // 3. Lowpass Filter (dampens higher harmonics naturally like real strings)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 4.5, 4200), now);
      filter.frequency.setTargetAtTime(360, now + 0.02, 0.18);

      // 4. Volume Gain Envelopes using bulletproof setTargetAtTime
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();

      const mainVol = Math.min(Math.max(intensity, 0.25), 1.0) * 0.42;
      const overVol = mainVol * 0.32;

      // Attack
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(mainVol, now + 0.006);
      gain.gain.setTargetAtTime(0.0001, now + 0.015, 0.22); // Smooth acoustic decay

      overtoneGain.gain.setValueAtTime(0.0001, now);
      overtoneGain.gain.linearRampToValueAtTime(overVol, now + 0.006);
      overtoneGain.gain.setTargetAtTime(0.0001, now + 0.015, 0.14);

      // Connect graph: [Oscillators] -> [Gains] -> Filter -> Compressor -> Master
      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(filter);
      overtoneGain.connect(filter);
      filter.connect(this.compressor);

      // Trigger
      osc.start(now);
      overtone.start(now);
      osc.stop(now + 0.9);
      overtone.stop(now + 0.7);
    } catch (e) {
      console.warn('playPluck note:', e);
    }
  }

  // Scissor snip sound on Spacebar
  playSnip() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.compressor) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, now);
      filter.Q.setValueAtTime(2.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.setTargetAtTime(0.0001, now + 0.01, 0.018);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      noise.start(now);
      noise.stop(now + 0.06);
    } catch (e) {}
  }

  // Unravel sound on Backspace
  playUnravel() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.compressor) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.setTargetAtTime(280, now, 0.06);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.setTargetAtTime(0.0001, now + 0.02, 0.05);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }
}

window.LoomAudio = new LoomAudio();
