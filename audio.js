/**
 * Type Loom — Web Audio Synthesizer
 * Generates procedural plucked string harmonics (Karplus-Strong inspired) and snip sounds.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    // Pentatonic & harmonic scales for melodic plucking
    this.scale = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.25, 739.99, 880];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Plays a rich acoustic plucked string harmonic
  playPluck(frequency = null, intensity = 0.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freq = frequency || this.scale[Math.floor(Math.random() * this.scale.length)];

    // Fundamental oscillator + harmonic resonance
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Triangle / saw wave blend for rich cello/harp timbre
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 2, t); // 1st octave overtone

    // Lowpass filter damping for acoustic body simulation
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 4, 3000), t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.8);

    // Fast attack, exponential acoustic decay
    const volume = Math.min(Math.max(intensity, 0.1), 1.0) * 0.25;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    subOsc.start(t);
    osc.stop(t + 1.3);
    subOsc.stop(t + 1.3);
  }

  // Scissor cut sound on spacebar
  playSnip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.08;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.linearRampToValueAtTime(3600, t + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  // Gentle unspooling/unravel chime on backspace
  playUnravel() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.25);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }
}

window.LoomAudio = new LoomAudio();
