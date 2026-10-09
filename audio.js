/**
 * Type Loom — Studio Audio Synthesizer by Ramya
 * Dual Synthesizers: Acoustic Pluck (crisp string transient) + Velvet Harp (warm resonant body)
 * Synchronous AudioContext wake on every gesture & boosted master gain for laptop speakers.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
    this.isMuted = false;

    // Rich Pentatonic Harp Scale (C5 to E6 octave, optimal acoustic presence on laptop speakers)
    this.scale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00, // A5
      1046.50, // C6
      1174.66, // D6
      1318.51, // E6
      1567.98  // G6
    ];
    this.scaleIndex = 0;

    // Rate limiter for high-speed cursor sweeps
    this.lastPluckTime = 0;
    this.minPluckInterval = 32; // ms

    this.initInstantWake();
  }

  // Synchronously wake/resume AudioContext on EVERY click, keydown, and mouse move
  initInstantWake() {
    const wake = () => {
      this.wake();
    };

    const events = [
      'pointerdown', 'mousedown', 'touchstart', 'click',
      'keydown', 'keyup', 'mousemove', 'touchmove', 'pointermove'
    ];

    events.forEach(evt => {
      window.addEventListener(evt, wake, { capture: true, passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.wake();
    });

    window.addEventListener('focus', () => this.wake());
  }

  wake() {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        this.ctx = new AudioContextClass();

        // 1. Soft-Knee Output Limiter (protects speakers & eliminates distortion)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-6.0, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(12.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.001, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime);

        // 2. Master Gain Boost (1.25x for loud, crystal-clear presence)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.25, this.ctx.currentTime);

        // Audio Chain: Synths -> Limiter -> MasterGain -> Speakers
        this.limiter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx && this.ctx.state !== 'running') {
        this.ctx.resume();
      }
    } catch (err) {
      console.warn('AudioContext wake note:', err);
    }
    return this.ctx;
  }

  toggleMute() {
    this.wake();
    this.isMuted = !this.isMuted;

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.25, now);
    }

    if (!this.isMuted) {
      this.playChord(523.25, 3);
    }
    return this.isMuted;
  }

  /**
   * Dual Synthesizer:
   * 1. Synth A (Acoustic Pluck): Crisp transient strike + triangle body
   * 2. Synth B (Velvet Harp): Warm sine fundamental + sparkling 2nd & 3rd harmonic overtones
   */
  playPluck(frequency = null, intensity = 0.85, force = false) {
    if (this.isMuted) return;

    const nowMs = performance.now();
    if (!force && (nowMs - this.lastPluckTime < this.minPluckInterval)) {
      return;
    }
    this.lastPluckTime = nowMs;

    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      let freq = frequency;
      if (!freq) {
        freq = this.scale[this.scaleIndex % this.scale.length];
        this.scaleIndex++;
      }

      const cleanVol = Math.min(Math.max(intensity, 0.35), 1.0);

      // ==========================================
      // SYNTH 1: ACOUSTIC PLUCK (Snappy Transient)
      // ==========================================
      const oscA = ctx.createOscillator();
      oscA.type = 'triangle';
      // Slight pitch droop on initial strike mimics string tension snap
      oscA.frequency.setValueAtTime(freq * 1.025, now);
      oscA.frequency.exponentialRampToValueAtTime(freq, now + 0.015);

      const filterA = ctx.createBiquadFilter();
      filterA.type = 'lowpass';
      filterA.frequency.setValueAtTime(Math.min(freq * 6, 6500), now);
      filterA.frequency.exponentialRampToValueAtTime(Math.min(freq * 2, 1800), now + 0.35);

      const gainA = ctx.createGain();
      gainA.gain.setValueAtTime(0.0001, now);
      gainA.gain.linearRampToValueAtTime(cleanVol * 0.75, now + 0.004);
      gainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      oscA.connect(filterA);
      filterA.connect(gainA);
      gainA.connect(this.limiter);

      oscA.start(now);
      oscA.stop(now + 0.5);

      // ==========================================
      // SYNTH 2: VELVET HARP (Warm Body & Overtones)
      // ==========================================
      const oscB1 = ctx.createOscillator(); // Fundamental
      oscB1.type = 'sine';
      oscB1.frequency.setValueAtTime(freq, now);

      const oscB2 = ctx.createOscillator(); // 2nd Harmonic Shimmer
      oscB2.type = 'sine';
      oscB2.frequency.setValueAtTime(freq * 2, now);

      const gainB1 = ctx.createGain();
      gainB1.gain.setValueAtTime(0.0001, now);
      gainB1.gain.linearRampToValueAtTime(cleanVol * 0.65, now + 0.008);
      gainB1.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

      const gainB2 = ctx.createGain();
      gainB2.gain.setValueAtTime(0.0001, now);
      gainB2.gain.linearRampToValueAtTime(cleanVol * 0.35, now + 0.008);
      gainB2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      oscB1.connect(gainB1);
      oscB2.connect(gainB2);
      gainB1.connect(this.limiter);
      gainB2.connect(this.limiter);

      oscB1.start(now);
      oscB2.start(now);
      oscB1.stop(now + 1.0);
      oscB2.stop(now + 0.7);
    } catch (e) {
      console.warn('playPluck note:', e);
    }
  }

  // Plays a rich acoustic harp chord arpeggio
  playChord(baseFreq = 523.25, noteCount = 3) {
    if (this.isMuted) return;
    const intervals = [1.0, 1.25, 1.5, 1.875, 2.0];
    for (let i = 0; i < noteCount; i++) {
      const f = baseFreq * (intervals[i % intervals.length] || 1.0);
      setTimeout(() => {
        this.playPluck(f, 0.85 - i * 0.08, true);
      }, i * 36);
    }
  }

  // Tactile string stretch tick
  playStretchTick(pitch = 880) {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.limiter);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }

  // Scissor snip sound on Spacebar
  playSnip() {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

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
      filter.frequency.setValueAtTime(3600, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.limiter);

      noise.start(now);
      noise.stop(now + 0.06);
    } catch (e) {}
  }

  // Unravel sound on Backspace
  playUnravel() {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);

      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.limiter);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }
}

window.LoomAudio = new LoomAudio();
