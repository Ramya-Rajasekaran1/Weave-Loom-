/**
 * Type Loom — Main Interactive Application Controller
 * High-craft generative tactile typography with Type Garden style UI controls.
 */

class TypeLoomApp {
  constructor() {
    this.canvas = document.getElementById('loom-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.typeInput = document.getElementById('type-input');
    this.emptyState = document.getElementById('empty-state');

    // UI elements
    this.soundIconEl = document.getElementById('sound-icon');
    this.paletteGroupEl = document.getElementById('palette-swatches');

    // Controls
    this.sliderTension = document.getElementById('slider-tension');
    this.sliderGravity = document.getElementById('slider-gravity');
    this.sliderDensity = document.getElementById('slider-density');
    this.valTension = document.getElementById('val-tension');
    this.valGravity = document.getElementById('val-gravity');
    this.valDensity = document.getElementById('val-density');
    this.pinStyleControl = document.getElementById('pin-style-control');

    // Themes
    this.themeKeys = Object.keys(LOOM_THEMES);
    this.currentThemeKey = 'rose'; // Default to iconic Type Garden-esque vibrant red/blue/black
    this.theme = LOOM_THEMES[this.currentThemeKey];

    // State
    this.characters = []; // { id, char, x, y, width, height, pins: [] }
    this.threads = [];    // LoomThread instances
    this.lastPin = null;  // For bridging between consecutive letters

    // Layout settings
    this.fontSize = 80;
    this.lineHeight = 124;
    this.letterSpacing = 18;
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
    this.pinStyle = 'brass';

    // Sample showcase words for shuffle / quick demo
    this.sampleWords = ['TYPE GARDEN', 'WEAVE', 'TACTILE', 'STRINGS', 'CREATIVE', 'HARMONY', 'AESTHETIC', 'BLOOM'];

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Auto-focus hidden input on any click (unless clicking on interactive UI)
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.bottom-dock-container') && !e.target.closest('.top-actions')) {
        this.focusInput();
      }
    });

    this.renderPaletteSwatches();
    this.setupKeyEvents();
    this.setupMouseEvents();
    this.setupUIEvents();

    // Start with default theme styling
    this.applyTheme(this.currentThemeKey);

    // Initial 60fps loop
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
      this.fontSize = 50;
      this.lineHeight = 80;
      this.startX = 24;
      this.startY = 130;
    } else {
      this.fontSize = 80;
      this.lineHeight = 124;
      this.startX = 80;
      this.startY = 180;
    }
  }

  focusInput() {
    this.typeInput.focus();
  }

  renderPaletteSwatches() {
    this.paletteGroupEl.innerHTML = '';
    this.themeKeys.forEach((key) => {
      const themeObj = LOOM_THEMES[key];
      const btn = document.createElement('button');
      btn.className = `palette-btn ${key === this.currentThemeKey ? 'active' : ''}`;
      btn.title = themeObj.name;
      btn.style.background = themeObj.previewGradient;
      btn.addEventListener('click', () => {
        this.applyTheme(key);
      });
      this.paletteGroupEl.appendChild(btn);
    });
  }

  applyTheme(themeKey) {
    this.currentThemeKey = themeKey;
    this.theme = LOOM_THEMES[themeKey];

    document.body.style.backgroundColor = this.theme.bg;
    document.documentElement.style.setProperty('--bg-color', this.theme.bg);

    // Update active swatch state
    const btns = this.paletteGroupEl.querySelectorAll('.palette-btn');
    btns.forEach((b, idx) => {
      if (this.themeKeys[idx] === themeKey) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    // Re-tint threads to new theme palette
    this.threads.forEach((t, i) => {
      if (!t.isBridge) {
        t.color = this.theme.threadColors[i % this.theme.threadColors.length];
      } else {
        t.color = this.theme.bridgeColor;
      }
    });
  }

  setupKeyEvents() {
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

      let pluckedAny = false;
      for (const thread of this.threads) {
        if (thread.checkPluck(this.mousePrev.x, this.mousePrev.y, this.mouseCurr.x, this.mouseCurr.y)) {
          pluckedAny = true;
        }
      }

      if (pluckedAny) {
        const speed = Math.hypot(this.mouseCurr.x - this.mousePrev.x, this.mouseCurr.y - this.mousePrev.y);
        window.LoomAudio.playPluck(null, Math.min(speed / 14, 0.95));
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

    // Randomize / Shuffle Showcase Word
    document.getElementById('btn-random').addEventListener('click', () => this.shufflePreset());

    // Clear Canvas
    document.getElementById('btn-clear').addEventListener('click', () => this.clearCanvas());

    // Export PNG
    document.getElementById('btn-export-png').addEventListener('click', () => this.exportPNG());

    // Export SVG
    document.getElementById('btn-export-svg').addEventListener('click', () => this.exportSVG());

    // Sliders
    this.sliderTension.addEventListener('input', (e) => {
      this.tension = parseFloat(e.target.value);
      this.valTension.textContent = `${Math.round(this.tension * 100)}%`;
      this.threads.forEach(t => { t.tension = this.tension; });
    });

    this.sliderGravity.addEventListener('input', (e) => {
      this.gravity = parseFloat(e.target.value);
      this.valGravity.textContent = `${Math.round(this.gravity * 100)}`;
    });

    this.sliderDensity.addEventListener('input', (e) => {
      this.weaveDensity = parseInt(e.target.value, 10);
      this.valDensity.textContent = `${this.weaveDensity}x`;
    });

    // Pin Style Segmented Selector
    const segBtns = this.pinStyleControl.querySelectorAll('.segment-btn');
    segBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        segBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.pinStyle = btn.getAttribute('data-style');
      });
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

    // Map physical pins for this character
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

    const palette = this.theme.threadColors;
    const charColor = palette[this.characters.length % palette.length];

    // 1. Primary letter strokes
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

    // 2. Weave cross-density decorative strings
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

    this.lastPin = pins[pins.length - 1];
    this.cursorX += charWidth + this.letterSpacing;

    window.LoomAudio.playPluck(null, 0.6);
  }

  snipAndSpace() {
    const bridgeThreads = this.threads.filter(t => t.isBridge && !t.isCut);
    if (bridgeThreads.length > 0) {
      const lastBridge = bridgeThreads[bridgeThreads.length - 1];
      lastBridge.cut();
    }

    this.lastPin = null;
    this.cursorX += this.fontSize * 0.55;
    window.LoomAudio.playSnip();
  }

  newLine() {
    this.cursorX = this.startX;
    this.cursorY += this.lineHeight;
    this.lastPin = null;

    if (this.cursorY + this.lineHeight > this.height - 110) {
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
    this.threads.forEach(t => {
      if (t.charId === lastChar.id) {
        t.isUnraveling = true;
      }
    });

    this.cursorX = lastChar.x;
    this.cursorY = lastChar.y;

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
  }

  shufflePreset() {
    this.clearCanvas();
    const word = this.sampleWords[Math.floor(Math.random() * this.sampleWords.length)];
    // Random theme
    const randomTheme = this.themeKeys[Math.floor(Math.random() * this.themeKeys.length)];
    this.applyTheme(randomTheme);

    // Weave word character by character
    let i = 0;
    const interval = setInterval(() => {
      if (i < word.length) {
        const char = word[i];
        if (char === ' ') {
          this.snipAndSpace();
        } else {
          this.addCharacter(char);
        }
        i++;
      } else {
        clearInterval(interval);
      }
    }, 120);
  }

  spawnShuttle(p1, p2, color) {
    this.shuttles.push({
      x: p1.x,
      y: p1.y,
      targetX: p2.x,
      targetY: p2.y,
      progress: 0,
      color: color,
      speed: 0.16
    });
  }

  exportPNG() {
    const link = document.createElement('a');
    link.download = `type-loom-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  exportSVG() {
    const svgWidth = this.width;
    const svgHeight = this.height;

    let svgPaths = '';
    this.threads.forEach(t => {
      if (t.nodes.length < 2 || t.unravelProgress >= 1) return;
      let d = `M ${t.nodes[0].x.toFixed(1)} ${t.nodes[0].y.toFixed(1)} `;
      for (let i = 1; i < t.nodes.length; i++) {
        d += `L ${t.nodes[i].x.toFixed(1)} ${t.nodes[i].y.toFixed(1)} `;
      }
      svgPaths += `<path d="${d}" fill="none" stroke="${t.color}" stroke-width="${t.thickness}" stroke-linecap="round" />\n`;
    });

    let svgPins = '';
    if (this.pinStyle !== 'none') {
      this.characters.forEach(c => {
        c.pins.forEach(p => {
          svgPins += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${this.theme.pinFill}" stroke="${this.theme.pinStroke}" stroke-width="1" />\n`;
        });
      });
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <rect width="100%" height="100%" fill="${this.theme.bg}" />
  <g id="threads">
    ${svgPaths}
  </g>
  <g id="pins">
    ${svgPins}
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `type-loom-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- 60 FPS Loop ---

  renderLoop(time) {
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Physics Update
    for (let i = this.threads.length - 1; i >= 0; i--) {
      const t = this.threads[i];
      t.update(this.gravity, 0.96);
      if (t.isUnraveling && t.unravelProgress >= 1) {
        this.threads.splice(i, 1);
      }
    }

    // Draw Threads
    for (const thread of this.threads) {
      thread.draw(this.ctx, time, this.theme);
    }

    // Draw Flying Needle Shuttles
    for (let i = this.shuttles.length - 1; i >= 0; i--) {
      const s = this.shuttles[i];
      s.progress += s.speed;
      s.x += (s.targetX - s.x) * 0.28;
      s.y += (s.targetY - s.y) * 0.28;

      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = s.color;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      if (s.progress >= 1) {
        this.shuttles.splice(i, 1);
      }
    }

    // Draw Pins
    if (this.pinStyle !== 'none') {
      this.drawPins();
    }

    // Draw Blinking Cursor
    this.drawCursor(time);

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  drawPins() {
    this.ctx.save();
    for (const char of this.characters) {
      for (const pin of char.pins) {
        if (this.pinStyle === 'brass') {
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

          // Highlight
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.beginPath();
          this.ctx.arc(pin.x - 1, pin.y - 1, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.pinStyle === 'pearl') {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 4.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (this.pinStyle === 'neon') {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.shadowColor = this.theme.pinFill;
          this.ctx.shadowBlur = 12;
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, 3, 0, Math.PI * 2);
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
}

// Bootstrap once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new TypeLoomApp();
});
