/**
 * Type Loom — Studio Acoustic Synthesizer by Ramya
 * Soothing Acoustic Velvet Harp & Celestial Marimba
 * Synchronous AudioContext wake on every gesture with warm harmonic reverberation.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.limiter = null;
    this.delayNode = null;
    this.delayGain = null;
    this.isMuted = false;

    // Warm, soothing Pentatonic scale across comfortable C4–A5 octaves
    this.scale = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00  // A5
    ];
    this.scaleIndex = 0;

    // Rate limiter for high-speed cursor sweeps to avoid audio clutter
    this.lastPluckTime = 0;
    this.minPluckInterval = 40; // ms

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

        // 1. Soft Limiter (warm gentle compression)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-12.0, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(10.0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(4.0, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.20, this.ctx.currentTime);

        // 2. Gentle Ambient Delay for lush reverberation tail
        this.delayNode = this.ctx.createDelay(0.5);
        this.delayNode.delayTime.setValueAtTime(0.18, this.ctx.currentTime);

        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);

        this.delayGain = this.ctx.createGain();
        this.delayGain.gain.setValueAtTime(0.22, this.ctx.currentTime);

        // Delay feedback loop
        this.delayNode.connect(delayFilter);
        delayFilter.connect(this.delayGain);
        this.delayGain.connect(this.delayNode);
        this.delayGain.connect(this.limiter);

        // 3. Master Gain (pleasantly balanced volume)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.70, this.ctx.currentTime);

        // Audio routing: Dry -> Limiter -> MasterGain -> Destination
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
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.70, now);
    }

    if (!this.isMuted) {
      this.playChord(440.0, 3);
    }
    return this.isMuted;
  }

  /**
   * Pleasant Acoustic Velvet Pluck:
   * Warm pure sine fundamental with silky marimba attack and gentle air shimmer.
   */
  playPluck(frequency = null, intensity = 0.75, force = false) {
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

      const vol = Math.min(Math.max(intensity * 0.45, 0.15), 0.65);

      // Layer 1: Fundamental Sine (Velvety & Round)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.setValueAtTime(Math.min(freq * 3.5, 2400), now);
      filter1.frequency.exponentialRampToValueAtTime(Math.min(freq * 1.5, 900), now + 0.4);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(vol, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(this.limiter);
      if (this.delayNode) gain1.connect(this.delayNode);

      osc1.start(now);
      osc1.stop(now + 0.9);

      // Layer 2: Soft 2nd Harmonic Chime (Adds gentle acoustic body)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(vol * 0.32, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc2.connect(gain2);
      gain2.connect(this.limiter);

      osc2.start(now);
      osc2.stop(now + 0.5);

      // Layer 3: Warm Sub-harmonic resonance for deep soothing resonance
      if (freq > 350) {
        const oscSub = ctx.createOscillator();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(freq * 0.5, now);

        const gainSub = ctx.createGain();
        gainSub.gain.setValueAtTime(0.0001, now);
        gainSub.gain.linearRampToValueAtTime(vol * 0.20, now + 0.012);
        gainSub.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

        oscSub.connect(gainSub);
        gainSub.connect(this.limiter);

        oscSub.start(now);
        oscSub.stop(now + 0.7);
      }
    } catch (e) {
      console.warn('playPluck note:', e);
    }
  }

  // Plays a soothing acoustic harp chord arpeggio
  playChord(baseFreq = 440.0, noteCount = 3) {
    if (this.isMuted) return;
    const chordPitches = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.75];
    for (let i = 0; i < noteCount; i++) {
      const f = chordPitches[i % chordPitches.length];
      setTimeout(() => {
        this.playPluck(f, 0.70 - i * 0.08, true);
      }, i * 45);
    }
  }

  // Soft string stretch sound
  playStretchTick(pitch = 520) {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.limiter);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // Soft breath/whisper chime on Spacebar
  playSnip() {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      // Soft gentle dual tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392.0, now);
      osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.limiter);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  // Delicate gentle droplet on Backspace
  playUnravel() {
    if (this.isMuted) return;
    const ctx = this.wake();
    if (!ctx || !this.limiter) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.15);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.limiter);

      osc.start(now);
      osc.stop(now + 0.20);
    } catch (e) {}
  }
}

// Global singleton instance
window.LoomAudio = new LoomAudio();
