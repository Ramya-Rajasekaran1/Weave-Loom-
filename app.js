/**
 * Type Loom — Main Interactive Application Controller
 */

class TypeLoomApp {
  constructor() {
    this.canvas = document.getElementById('loom-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.typeInput = document.getElementById('type-input');
    this.emptyState = document.getElementById('empty-state');

    // Stats & UI elements
    this.charCountEl = document.getElementById('char-count');
    this.threadCountEl = document.getElementById('thread-count');
    this.themeNameEl = document.getElementById('theme-name');
    this.soundIconEl = document.getElementById('sound-icon');

    // Controls
    this.sliderTension = document.getElementById('slider-tension');
    this.sliderGravity = document.getElementById('slider-gravity');
    this.sliderDensity = document.getElementById('slider-density');
    this.selectPins = document.getElementById('select-pins');

    // Themes
    this.themeKeys = Object.keys(LOOM_THEMES);
    this.currentThemeIndex = 0;
    this.theme = LOOM_THEMES[this.themeKeys[this.currentThemeIndex]];

    // State
    this.characters = []; // { id, char, x, y, width, height, pins: [] }
    this.threads = [];    // LoomThread instances
    this.lastPin = null;  // For bridging between consecutive letters

    // Layout settings
    this.fontSize = 72;
    this.lineHeight = 110;
    this.letterSpacing = 16;
    this.startX = 80;
    this.startY = 180;
    this.cursorX = this.startX;
    this.cursorY = this.startY;

    // Mouse Tracking for String Plucking
    this.mousePrev = { x: 0, y: 0 };
    this.mouseCurr = { x: 0, y: 0 };
    this.isMouseDown = false;

    // Needle Flying Shuttles (Visual FX)
    this.shuttles = [];

    // Configuration
    this.tension = parseFloat(this.sliderTension.value);
    this.gravity = parseFloat(this.sliderGravity.value);
    this.weaveDensity = parseInt(this.sliderDensity.value, 10);
    this.pinStyle = this.selectPins.value;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Auto-focus hidden input on any click
    window.addEventListener('click', (e) => {
      // Ignore clicks on control panels
      if (!e.target.closest('.controls-card') && !e.target.closest('.top-nav')) {
        this.focusInput();
      }
    });

    this.setupKeyEvents();
    this.setupMouseEvents();
    this.setupUIEvents();

    // Start 60fps loop
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Responsive layout scaling
    if (this.width < 600) {
      this.fontSize = 46;
      this.lineHeight = 74;
      this.startX = 28;
      this.startY = 140;
    } else {
      this.fontSize = 72;
      this.lineHeight = 110;
      this.startX = 80;
      this.startY = 180;
    }
  }

  focusInput() {
    this.typeInput.focus();
  }

  setupKeyEvents() {
    // Hidden input receives characters
    this.typeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.unravelLastCharacter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.newLine();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.snipAndSpace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.clearCanvas();
      }
    });

    this.typeInput.addEventListener('input', (e) => {
      const val = this.typeInput.value;
      if (val.length > 0) {
        for (let i = 0; i < val.length; i++) {
          const char = val[i];
          if (char === ' ') {
            this.snipAndSpace();
          } else {
            this.addCharacter(char);
          }
        }
        this.typeInput.value = '';
      }
    });
  }

  setupMouseEvents() {
    const onMove = (clientX, clientY) => {
      this.mousePrev = { ...this.mouseCurr };
      this.mouseCurr = { x: clientX, y: clientY };

      // Check plucking collision across all active threads
      let pluckedAny = false;
      for (const thread of this.threads) {
        if (thread.checkPluck(this.mousePrev.x, this.mousePrev.y, this.mouseCurr.x, this.mouseCurr.y)) {
          pluckedAny = true;
        }
      }

      if (pluckedAny) {
        const speed = Math.hypot(this.mouseCurr.x - this.mousePrev.x, this.mouseCurr.y - this.mousePrev.y);
        window.LoomAudio.playPluck(null, Math.min(speed / 15, 0.9));
      }
    };

    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('mousedown', () => { this.isMouseDown = true; });
    window.addEventListener('mouseup', () => { this.isMouseDown = false; });
  }

  setupUIEvents() {
    // Sound Toggle
    document.getElementById('btn-sound').addEventListener('click', () => {
      const isMuted = window.LoomAudio.toggleMute();
      this.soundIconEl.textContent = isMuted ? '🔇' : '🔊';
    });

    // Theme Switcher
    document.getElementById('btn-theme').addEventListener('click', () => {
      this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themeKeys.length;
      const key = this.themeKeys[this.currentThemeIndex];
      this.theme = LOOM_THEMES[key];
      this.themeNameEl.textContent = this.theme.name;
      document.body.style.backgroundColor = this.theme.bg;
      document.documentElement.style.setProperty('--bg-color', this.theme.bg);

      // Re-tint threads to new theme palette
      this.threads.forEach((t, i) => {
        if (!t.isBridge) {
          t.color = this.theme.threadColors[i % this.theme.threadColors.length];
        } else {
          t.color = this.theme.bridgeColor;
        }
      });
    });

    // Export High-Res Image
    document.getElementById('btn-export').addEventListener('click', () => this.exportImage());

    // Clear Canvas
    document.getElementById('btn-clear').addEventListener('click', () => this.clearCanvas());

    // Controls Panel Collapse
    const panel = document.getElementById('controls-panel');
    const toggleBtn = document.getElementById('toggle-panel-btn');
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      toggleBtn.textContent = panel.classList.contains('collapsed') ? '+' : '_';
    });

    // Sliders
    this.sliderTension.addEventListener('input', (e) => {
      this.tension = parseFloat(e.target.value);
      this.threads.forEach(t => {
        t.tension = this.tension;
      });
    });

    this.sliderGravity.addEventListener('input', (e) => {
      this.gravity = parseFloat(e.target.value);
    });

    this.sliderDensity.addEventListener('input', (e) => {
      this.weaveDensity = parseInt(e.target.value, 10);
    });

    this.selectPins.addEventListener('change', (e) => {
      this.pinStyle = e.target.value;
    });
  }

  // --- Weaving Core ---

  addCharacter(char) {
    if (this.emptyState) {
      this.emptyState.classList.add('hidden');
    }

    const topo = window.getGlyphTopology(char);
    const charWidth = this.fontSize * 0.75;
    const charHeight = this.fontSize;

    // Check line wrapping
    if (this.cursorX + charWidth + this.startX > this.width - 40) {
      this.newLine();
    }

    const charId = `char_${Date.now()}_${Math.random()}`;
    const x = this.cursorX;
    const y = this.cursorY;

    // Instantiate physical pins for this character
    const pins = topo.pins.map(p => ({
      x: x + p.x * charWidth,
      y: y + p.y * charHeight
    }));

    const charRecord = {
      id: charId,
      char: char,
      x: x,
      y: y,
      width: charWidth,
      height: charHeight,
      pins: pins
    };
    this.characters.push(charRecord);

    // Pick thread color
    const palette = this.theme.threadColors;
    const charColor = palette[this.characters.length % palette.length];

    // 1. Weave primary strokes defined by font topology
    topo.strokes.forEach((strokeIndices) => {
      for (let i = 0; i < strokeIndices.length - 1; i++) {
        const p1 = pins[strokeIndices[i]];
        const p2 = pins[strokeIndices[i + 1]];
        if (p1 && p2) {
          const thread = new LoomThread(p1, p2, {
            color: charColor,
            tension: this.tension,
            charId: charId
          });
          this.threads.push(thread);
          this.spawnShuttle(p1, p2, charColor);
        }
      }
    });

    // 2. Weave cross-density decorative string lattice
    if (this.weaveDensity > 1 && pins.length >= 3) {
      const extraPasses = Math.min(this.weaveDensity - 1, pins.length - 1);
      for (let i = 0; i < extraPasses; i++) {
        const idxA = i % pins.length;
        const idxB = (i + Math.floor(pins.length / 2)) % pins.length;
        if (idxA !== idxB) {
          const thread = new LoomThread(pins[idxA], pins[idxB], {
            color: palette[(this.characters.length + i + 1) % palette.length],
            thickness: 1.2,
            tension: this.tension * 0.9,
            charId: charId
          });
          this.threads.push(thread);
        }
      }
    }

    // 3. Connect bridge yarn from previous letter to this letter
    if (this.lastPin && pins.length > 0) {
      const bridgePin = pins[0];
      const bridgeThread = new LoomThread(this.lastPin, bridgePin, {
        color: this.theme.bridgeColor,
        thickness: 1.4,
        tension: this.tension * 0.75,
        charId: charId,
        isBridge: true
      });
      this.threads.push(bridgeThread);
    }

    // Set last pin for next bridge
    this.lastPin = pins[pins.length - 1];

    // Advance cursor
    this.cursorX += charWidth + this.letterSpacing;

    // Acoustic sound
    window.LoomAudio.playPluck(null, 0.6);

    this.updateStats();
  }

  snipAndSpace() {
    // Cut the active bridge thread with scissors
    const bridgeThreads = this.threads.filter(t => t.isBridge && !t.isCut);
    if (bridgeThreads.length > 0) {
      const lastBridge = bridgeThreads[bridgeThreads.length - 1];
      lastBridge.cut();
    }

    this.lastPin = null;
    this.cursorX += this.fontSize * 0.55; // Word space gap
    window.LoomAudio.playSnip();
    this.updateStats();
  }

  newLine() {
    this.cursorX = this.startX;
    this.cursorY += this.lineHeight;
    this.lastPin = null;

    // If typing reaches bottom of canvas, gently scroll up
    if (this.cursorY + this.lineHeight > this.height - 80) {
      const shiftY = this.lineHeight;
      this.cursorY -= shiftY;
      this.characters.forEach(c => {
        c.y -= shiftY;
        c.pins.forEach(p => p.y -= shiftY);
      });
      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          n.y -= shiftY;
          n.oldY -= shiftY;
        });
      });
    }
  }

  unravelLastCharacter() {
    if (this.characters.length === 0) return;

    const lastChar = this.characters.pop();
    
    // Trigger unraveling decay animation on this letter's threads
    this.threads.forEach(t => {
      if (t.charId === lastChar.id) {
        t.isUnraveling = true;
      }
    });

    // Reset cursor to previous character position
    this.cursorX = lastChar.x;
    this.cursorY = lastChar.y;

    // Reset last pin to previous character
    if (this.characters.length > 0) {
      const prev = this.characters[this.characters.length - 1];
      this.lastPin = prev.pins[prev.pins.length - 1];
    } else {
      this.lastPin = null;
      if (this.emptyState) {
        this.emptyState.classList.remove('hidden');
      }
    }

    window.LoomAudio.playUnravel();
    this.updateStats();
  }

  clearCanvas() {
    this.characters = [];
    this.threads = [];
    this.shuttles = [];
    this.lastPin = null;
    this.cursorX = this.startX;
    this.cursorY = this.startY;
    if (this.emptyState) {
      this.emptyState.classList.remove('hidden');
    }
    this.updateStats();
  }

  spawnShuttle(p1, p2, color) {
    this.shuttles.push({
      x: p1.x,
      y: p1.y,
      targetX: p2.x,
      targetY: p2.y,
      progress: 0,
      color: color,
      speed: 0.15
    });
  }

  updateStats() {
    this.charCountEl.textContent = `${this.characters.length} character${this.characters.length === 1 ? '' : 's'} woven`;
    const activeThreads = this.threads.filter(t => !t.isUnraveling);
    this.threadCountEl.textContent = `${activeThreads.length} thread${activeThreads.length === 1 ? '' : 's'} active`;
  }

  exportImage() {
    const link = document.createElement('a');
    link.download = `type-loom-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  // --- Rendering Loop ---

  renderLoop(time) {
    // 1. Clear & Paint Background Texture
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Optional background tactile grid / dots
    if (this.theme.bgPattern === 'grid') {
      this.drawGridOverlay();
    }

    // 2. Physics Simulation Step
    for (let i = this.threads.length - 1; i >= 0; i--) {
      const t = this.threads[i];
      t.update(this.gravity, 0.96);
      if (t.isUnraveling && t.unravelProgress >= 1) {
        this.threads.splice(i, 1);
      }
    }

    // 3. Draw All Loom Threads
    for (const thread of this.threads) {
      thread.draw(this.ctx, time, this.theme);
    }

    // 4. Draw Flying Needle Shuttles (Sparks as threads are cast)
    for (let i = this.shuttles.length - 1; i >= 0; i--) {
      const s = this.shuttles[i];
      s.progress += s.speed;
      s.x += (s.targetX - s.x) * 0.25;
      s.y += (s.targetY - s.y) * 0.25;

      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (s.progress >= 1) {
        this.shuttles.splice(i, 1);
      }
    }

    // 5. Draw Pins / Pegs on top of threads
    if (this.pinStyle !== 'none') {
      this.drawPins();
    }

    // 6. Draw Subtle Blinking Loom Needle / Cursor
    this.drawCursor(time);

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  drawPins() {
    this.ctx.save();
    for (const char of this.characters) {
      for (const pin of char.pins) {
        if (this.pinStyle === 'brass') {
          // Brass Wood Peg with Metallic Highlight
          this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
          this.ctx.shadowBlur = 4;
          this.ctx.shadowOffsetY = 2;

          this.ctx.fillStyle = this.theme.pinFill;
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 4, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = this.theme.pinStroke;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          // Highlight glint
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.beginPath();
          this.ctx.arc(pin.x - 1, pin.y - 1, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.pinStyle === 'pearl') {
          // Pearl / Bead Pin
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 4.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.pinStyle === 'neon') {
          // Glowing Neon Node
          this.ctx.fillStyle = '#ffffff';
          this.ctx.shadowColor = this.theme.pinFill;
          this.ctx.shadowBlur = 12;
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 3, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.pinStyle === 'minimal') {
          // Minimal Clean Dot
          this.ctx.fillStyle = this.theme.textMain;
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    this.ctx.restore();
  }

  drawCursor(time) {
    const blink = Math.sin(time * 0.006) * 0.5 + 0.5;
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(229, 179, 103, ${blink * 0.8})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.cursorX, this.cursorY);
    this.ctx.lineTo(this.cursorX, this.cursorY + this.fontSize);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawGridOverlay() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TypeLoomApp();
});
