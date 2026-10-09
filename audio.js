/**
 * Type Loom — Audio Synthesizer by Ramya
 * Generates crisp acoustic plucked harp/string notes, scissor cuts, and unspooling chimes.
 */

class LoomAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    // Clear, audible pentatonic harp scale (Middle C5 to C6 octave for crystal-clear laptop speaker playback)
    this.scale = [392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
    this.scaleIndex = 0;

    // Immediately listen to any user gesture to unlock audio
    this.initOnGesture();
  }

  initOnGesture() {
    const unlock = () => {
      this.getAudioContext();
    };
    ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  getAudioContext() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (err) {
      console.warn('AudioContext initialization note:', err);
    }
    return this.ctx;
  }

  toggleMute() {
    const ctx = this.getAudioContext();
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      // Play instant pleasant harp chime
      this.playPluck(523.25, 0.8);
    }
    return this.isMuted;
  }

  // Plays a rich acoustic plucked string note
  playPluck(frequency = null, intensity = 0.7) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      let freq = frequency;
      if (!freq) {
        freq = this.scale[this.scaleIndex % this.scale.length];
        this.scaleIndex++;
      }

      // 1. Primary string oscillator (Triangle wave for acoustic warmth)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // 2. Secondary overtone oscillator (Sine wave for shimmering harmonic resonance)
      const overtone = ctx.createOscillator();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2, now);

      // 3. Acoustic Lowpass Filter (gives body and natural dampening)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 4, 3800), now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.65);

      // 4. Volume Gain Envelope
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();

      const mainVol = Math.min(Math.max(intensity, 0.3), 1.0) * 0.45;
      const overVol = mainVol * 0.35;

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(mainVol, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      overtoneGain.gain.setValueAtTime(0.001, now);
      overtoneGain.gain.linearRampToValueAtTime(overVol, now + 0.008);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      // Connect graph: osc -> gain -> filter -> destination
      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(filter);
      overtoneGain.connect(filter);
      filter.connect(ctx.destination);

      // Trigger oscillators
      osc.start(now);
      overtone.start(now);
      osc.stop(now + 0.8);
      overtone.stop(now + 0.6);
    } catch (e) {
      console.warn('playPluck error:', e);
    }
  }

  // Scissor snip sound on Spacebar
  playSnip() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {}
  }

  // Unravel sound on Backspace
  playUnravel() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.21);
    } catch (e) {}
  }
}

window.LoomAudio = new LoomAudio();
