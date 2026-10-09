/**
 * Type Loom — Studio Edition by Ramya
 * Generative Tactile Typography Engine with Multi-Line Word Wrapping & Dynamic Centering.
 */

class TypeLoomStudio {
  constructor() {
    this.canvas = document.getElementById('loom-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.typeInput = document.getElementById('type-input');
    this.emptyState = document.getElementById('empty-state');
    this.toastEl = document.getElementById('toast');
    this.artboardContainer = document.getElementById('artboard-container');

    // Dock & Sub-Ribbon Elements
    this.paletteMenuTrigger = document.getElementById('palette-menu-trigger');
    this.motionMenuTrigger = document.getElementById('motion-menu-trigger');
    this.dockSubRibbon = document.getElementById('dock-sub-ribbon');
    this.subRibbonPalettes = document.getElementById('sub-ribbon-palettes');
    this.subRibbonEffects = document.getElementById('sub-ribbon-effects');
    this.currentPalettePreview = document.getElementById('current-palette-preview');
    this.activeEffectNameEl = document.getElementById('active-effect-name');

    // Controls
    this.sliderStroke = document.getElementById('slider-stroke');
    this.valStroke = document.getElementById('val-stroke');
    this.btnTogglePins = document.getElementById('btn-toggle-pins');
    this.pinStatusDot = document.getElementById('pin-status-dot');
    this.pinStatusText = document.getElementById('pin-status-text');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.soundStatusDot = document.getElementById('sound-status-dot');
    this.soundStatusText = document.getElementById('sound-status-text');

    // Themes
    this.themeKeys = Object.keys(LOOM_THEMES);
    this.currentThemeKey = 'figma'; // Default to Figma Brand Spectrum
    this.theme = LOOM_THEMES[this.currentThemeKey];

    // Sub-Ribbon Active State: null | 'palettes' | 'effects'
    this.activeSubMenu = null;

    // Effect State: 'breathe' | 'gust' | 'reach' | 'resonate' | 'visitor'
    this.currentEffect = 'breathe';
    this.effectTime = 0;

    // Pin & Thread State
    this.showPins = true;
    this.threadThickness = 2.5;
    this.tension = 0.85;
    this.gravity = 0.22;

    // Typography State (Starts Blank)
    this.textString = '';
    this.characters = [];
    this.threads = [];
    this.baseFontSize = 104;
    this.letterSpacing = 20;

    // Mouse Tracking
    this.mousePrev = { x: 0, y: 0 };
    this.mouseCurr = { x: 0, y: 0 };

    // Visitor Entity
    this.visitor = { x: 200, y: 200, angle: 0 };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Auto-focus input on canvas click & handle outside clicks for ribbon
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.bottom-dock-wrapper')) {
        this.closeSubRibbon();
      }

      if (!e.target.closest('.studio-header') && !e.target.closest('.bottom-dock-wrapper')) {
        this.focusInput();
      }
    });

    this.buildPaletteRibbon();
    this.setupSubRibbonTriggers();
    this.setupAspectControls();
    this.setupKeyEvents();
    this.setupMouseEvents();
    this.setupActionControls();

    // Start with clean Figma theme
    this.applyTheme(this.currentThemeKey);

    // 60 FPS animation loop
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.artboardContainer.clientWidth;
    this.height = this.artboardContainer.clientHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    if (this.width < 600) {
      this.baseFontSize = 64;
      this.letterSpacing = 12;
    } else {
      this.baseFontSize = 104;
      this.letterSpacing = 20;
    }

    this.rebuildAllCharacters();
  }

  focusInput() {
    this.typeInput.focus();
  }

  // --- Sub-Ribbon Horizontal Row Management ---
  buildPaletteRibbon() {
    this.subRibbonPalettes.innerHTML = '';
    this.themeKeys.forEach((key) => {
      const t = LOOM_THEMES[key];
      const btn = document.createElement('button');
      btn.className = `ribbon-opt ${key === this.currentThemeKey ? 'active' : ''}`;
      btn.setAttribute('data-theme', key);

      const dotsHTML = t.previewDots.map(d => `<div class="r-dot" style="background:${d}"></div>`).join('');

      btn.innerHTML = `
        <div class="r-dots">${dotsHTML}</div>
        <span class="r-title">${t.name}</span>
      `;

      btn.addEventListener('click', () => {
        this.applyTheme(key);
      });

      this.subRibbonPalettes.appendChild(btn);
    });
  }

  setupSubRibbonTriggers() {
    // 1. Palette Trigger
    this.paletteMenuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeSubMenu === 'palettes') {
        this.closeSubRibbon();
      } else {
        this.openSubRibbon('palettes');
      }
    });

    // 2. Effects Trigger
    this.motionMenuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeSubMenu === 'effects') {
        this.closeSubRibbon();
      } else {
        this.openSubRibbon('effects');
      }
    });

    // Effects Option Buttons inside sub-ribbon
    const effectBtns = this.subRibbonEffects.querySelectorAll('.ribbon-opt');
    effectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        effectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentEffect = btn.getAttribute('data-motion');
        this.activeEffectNameEl.textContent = btn.querySelector('.r-title').textContent;
        this.effectTime = 0;
      });
    });
  }

  openSubRibbon(menuType) {
    this.activeSubMenu = menuType;
    this.dockSubRibbon.classList.add('open');

    if (menuType === 'palettes') {
      this.paletteMenuTrigger.classList.add('active');
      this.motionMenuTrigger.classList.remove('active');
      this.subRibbonPalettes.classList.add('active');
      this.subRibbonEffects.classList.remove('active');
    } else if (menuType === 'effects') {
      this.motionMenuTrigger.classList.add('active');
      this.paletteMenuTrigger.classList.remove('active');
      this.subRibbonEffects.classList.add('active');
      this.subRibbonPalettes.classList.remove('active');
    }
  }

  closeSubRibbon() {
    this.activeSubMenu = null;
    this.dockSubRibbon.classList.remove('open');
    this.paletteMenuTrigger.classList.remove('active');
    this.motionMenuTrigger.classList.remove('active');
    this.subRibbonPalettes.classList.remove('active');
    this.subRibbonEffects.classList.remove('active');
  }

  applyTheme(themeKey) {
    this.currentThemeKey = themeKey;
    this.theme = LOOM_THEMES[themeKey];

    this.artboardContainer.style.backgroundColor = this.theme.artboardBg;
    document.body.style.backgroundColor = this.theme.bg;

    // Update palette preview dots in dock
    this.currentPalettePreview.innerHTML = this.theme.previewDots.map(d => 
      `<div class="preview-dot" style="background:${d}"></div>`
    ).join('');

    // Update active state in sub-ribbon
    const btns = this.subRibbonPalettes.querySelectorAll('.ribbon-opt');
    btns.forEach(b => {
      if (b.getAttribute('data-theme') === themeKey) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Re-tint threads
    this.threads.forEach((t, i) => {
      if (!t.isBridge) {
        t.color = this.theme.threadColors[i % this.theme.threadColors.length];
      } else {
        t.color = this.theme.bridgeColor;
      }
    });
  }

  setupAspectControls() {
    const btns = document.querySelectorAll('.aspect-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const aspect = btn.getAttribute('data-aspect');
        this.artboardContainer.className = `artboard-container frame-${aspect}`;
        setTimeout(() => this.resize(), 420);
      });
    });
  }

  setupActionControls() {
    // Stroke Thickness Slider
    this.sliderStroke.addEventListener('input', (e) => {
      this.threadThickness = parseFloat(e.target.value);
      this.valStroke.textContent = `${this.threadThickness.toFixed(1)}px`;
      this.threads.forEach(t => {
        t.thickness = this.threadThickness;
      });
    });

    // Pin Toggle
    this.btnTogglePins.addEventListener('click', () => {
      this.showPins = !this.showPins;
      if (this.showPins) this.pinStatusDot.classList.add('active');
      else this.pinStatusDot.classList.remove('active');
      this.pinStatusText.textContent = this.showPins ? 'Pins: On' : 'Pins: Off';
    });

    // Sound Toggle
    this.btnToggleSound.addEventListener('click', () => {
      const isMuted = window.LoomAudio.toggleMute();
      if (!isMuted) this.soundStatusDot.classList.add('active');
      else this.soundStatusDot.classList.remove('active');
      this.soundStatusText.textContent = isMuted ? 'Audio: Off' : 'Audio: On';
    });

    // Clear Canvas
    document.getElementById('btn-clear-canvas').addEventListener('click', () => {
      this.clearCanvas();
    });

    // Copy Link
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      this.showToast('Link copied to clipboard!');
    });

    // Coffee
    document.getElementById('btn-coffee').addEventListener('click', () => {
      window.open('https://buymeacoffee.com', '_blank');
    });

    // Exports
    document.getElementById('btn-export-png').addEventListener('click', () => this.exportHighResPNG());
    document.getElementById('btn-export-svg').addEventListener('click', () => this.exportSVG());
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }

  // --- Keyboard & Centering ---
  setupKeyEvents() {
    this.typeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.clearCanvas();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.handleSpace();
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
            this.handleSpace();
          } else {
            this.textString += char;
            this.rebuildAllCharacters();
            window.LoomAudio.playPluck(null, 0.7);
          }
        }
        this.typeInput.value = '';
      }
    });
  }

  handleSpace() {
    this.textString += ' ';
    this.rebuildAllCharacters();
    window.LoomAudio.playSnip();
  }

  handleBackspace() {
    if (this.textString.length === 0) return;
    this.textString = this.textString.slice(0, -1);
    this.rebuildAllCharacters();
    window.LoomAudio.playUnravel();
  }

  clearCanvas() {
    this.textString = '';
    this.characters = [];
    this.threads = [];
    this.emptyState.classList.remove('hidden');
  }

  // Multi-line word wrapping with dynamic centering and generous padding
  rebuildAllCharacters() {
    if (this.textString.length === 0) {
      this.characters = [];
      this.threads = [];
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    // Safe Canvas Margins / Padding
    const padX = Math.max(40, this.width * 0.07);
    const padY = Math.max(50, this.height * 0.10);
    const maxAvailableWidth = this.width - padX * 2;
    const maxAvailableHeight = this.height - padY * 2;

    // Adapt font size dynamically based on length so it fits comfortably
    let fontSize = this.baseFontSize;
    if (this.textString.length > 18) {
      fontSize = Math.max(48, this.baseFontSize * 0.75);
    } else if (this.textString.length > 10) {
      fontSize = Math.max(58, this.baseFontSize * 0.88);
    }

    const charWidth = fontSize * 0.72;
    const charHeight = fontSize;
    const letterSpacing = Math.max(10, fontSize * 0.2);
    const spaceWidth = fontSize * 0.45;
    const lineHeight = fontSize * 1.35; // Generous vertical breathing room for dangling threads

    // 1. Split text into words and calculate multi-line wrapping
    const words = this.textString.split(' ');
    const lines = []; // array of { words: [], width: 0 }
    let currentLine = { words: [], width: 0 };

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const wordWidth = word.length > 0 ? (word.length * charWidth + (word.length - 1) * letterSpacing) : 0;

      // Check if word fits on current line
      const testWidth = currentLine.words.length === 0 
        ? wordWidth 
        : currentLine.width + spaceWidth + wordWidth;

      if (testWidth <= maxAvailableWidth || currentLine.words.length === 0) {
        // Fits on current line
        currentLine.words.push(word);
        currentLine.width = testWidth;
      } else {
        // Wrap to next line
        lines.push(currentLine);
        currentLine = { words: [word], width: wordWidth };
      }
    }
    if (currentLine.words.length > 0) {
      lines.push(currentLine);
    }

    // 2. Calculate Total Block Dimensions for Vertical Centering
    const totalBlockHeight = lines.length * charHeight + (lines.length - 1) * (lineHeight - charHeight);
    const blockStartY = Math.max(padY, (this.height - totalBlockHeight) / 2);

    this.characters = [];
    this.threads = [];

    let globalCharIndex = 0;

    // 3. Position characters line-by-line with exact horizontal centering
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      const lineY = blockStartY + l * lineHeight;
      const lineStartX = Math.max(padX, (this.width - line.width) / 2);

      let currentX = lineStartX;
      let lastPin = null;

      for (let w = 0; w < line.words.length; w++) {
        const word = line.words[w];

        for (let c = 0; c < word.length; c++) {
          const char = word[c];
          const topo = window.getGlyphTopology(char);
          const charId = `c_${l}_${w}_${c}_${char}`;

          const pins = topo.pins.map(p => ({
            x: currentX + p.x * charWidth,
            y: lineY + p.y * charHeight
          }));

          this.characters.push({
            id: charId,
            char: char,
            x: currentX,
            y: lineY,
            width: charWidth,
            height: charHeight,
            pins: pins
          });

          const palette = this.theme.threadColors;
          const charColor = palette[globalCharIndex % palette.length];

          // Primary glyph strokes
          topo.strokes.forEach((strokeIndices) => {
            for (let i = 0; i < strokeIndices.length - 1; i++) {
              const p1 = pins[strokeIndices[i]];
              const p2 = pins[strokeIndices[i + 1]];
              if (p1 && p2) {
                const thread = new LoomThread(p1, p2, {
                  color: charColor,
                  thickness: this.threadThickness,
                  tension: this.tension,
                  charId: charId
                });
                this.threads.push(thread);
              }
            }
          });

          // Cross-weave lattice
          if (pins.length >= 3) {
            for (let i = 0; i < 2; i++) {
              const idxA = i % pins.length;
              const idxB = (i + Math.floor(pins.length / 2)) % pins.length;
              if (idxA !== idxB) {
                const thread = new LoomThread(pins[idxA], pins[idxB], {
                  color: palette[(globalCharIndex + i + 1) % palette.length],
                  thickness: this.threadThickness * 0.8,
                  tension: this.tension * 0.9,
                  charId: charId
                });
                this.threads.push(thread);
              }
            }
          }

          // Inter-letter bridge within the same word
          if (lastPin && pins.length > 0) {
            const bridgeThread = new LoomThread(lastPin, pins[0], {
              color: this.theme.bridgeColor,
              thickness: this.threadThickness * 0.9,
              tension: this.tension * 0.8,
              charId: charId,
              isBridge: true
            });
            this.threads.push(bridgeThread);
          }

          lastPin = pins[pins.length - 1];
          currentX += charWidth + letterSpacing;
          globalCharIndex++;
        }

        // Add space gap between words (and reset lastPin so threads don't jump across space)
        if (w < line.words.length - 1) {
          currentX += spaceWidth - letterSpacing;
          lastPin = null;
        }
      }
    }
  }

  // --- Mouse Pluck Interaction ---
  setupMouseEvents() {
    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      this.mousePrev = { ...this.mouseCurr };
      this.mouseCurr = { x, y };

      let pluckedAny = false;
      for (const thread of this.threads) {
        if (thread.checkPluck(this.mousePrev.x, this.mousePrev.y, this.mouseCurr.x, this.mouseCurr.y)) {
          pluckedAny = true;
        }
      }

      if (pluckedAny) {
        const speed = Math.hypot(this.mouseCurr.x - this.mousePrev.x, this.mouseCurr.y - this.mousePrev.y);
        window.LoomAudio.playPluck(null, Math.min(speed / 12, 0.95));
      }
    };

    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  // --- Exporting ---
  exportHighResPNG() {
    const off = document.createElement('canvas');
    const scale = 2.5;
    off.width = this.width * scale;
    off.height = this.height * scale;
    const offCtx = off.getContext('2d');
    offCtx.scale(scale, scale);

    // Background
    offCtx.fillStyle = this.theme.artboardBg;
    offCtx.fillRect(0, 0, this.width, this.height);

    // Render Canvas Content
    offCtx.drawImage(this.canvas, 0, 0, this.width, this.height);

    // Watermark
    offCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
    offCtx.font = "500 13px 'JetBrains Mono', monospace";
    offCtx.fillText("TYPE LOOM · BY RAMYA", 24, this.height - 24);

    const link = document.createElement('a');
    link.download = `type-loom-ramya-${Date.now()}.png`;
    link.href = off.toDataURL('image/png');
    link.click();
  }

  exportSVG() {
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
    if (this.showPins) {
      this.characters.forEach(c => {
        c.pins.forEach(p => {
          svgPins += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${this.theme.pinFill}" stroke="${this.theme.pinStroke}" stroke-width="1" />\n`;
        });
      });
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
  <!-- Type Loom by Ramya -->
  <rect width="100%" height="100%" fill="${this.theme.artboardBg}" />
  <g id="threads">${svgPaths}</g>
  <g id="pins">${svgPins}</g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `type-loom-ramya-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- 60 FPS Loop ---
  renderLoop(time) {
    this.effectTime += 0.016;

    // 1. Clear Canvas with Theme Artboard Color
    this.ctx.fillStyle = this.theme.artboardBg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Apply Kinetic Effects
    this.applyKineticEffects(time);

    // 3. Update Physics
    for (let i = this.threads.length - 1; i >= 0; i--) {
      const t = this.threads[i];
      t.update(this.gravity, 0.96);
      if (t.isUnraveling && t.unravelProgress >= 1) {
        this.threads.splice(i, 1);
      }
    }

    // 4. Draw Threads
    for (const thread of this.threads) {
      thread.draw(this.ctx, time, this.theme);
    }

    // 5. Draw Pins (if enabled)
    if (this.showPins) {
      this.drawPins();
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  applyKineticEffects(time) {
    if (this.currentEffect === 'breathe') {
      const sway = Math.sin(time * 0.002) * 1.8;
      this.threads.forEach(t => {
        t.nodes.forEach((n, idx) => {
          if (!n.isPinned) {
            n.y += Math.sin(time * 0.0025 + idx * 0.4) * 0.4;
            n.x += sway * 0.18;
          }
        });
      });
    } else if (this.currentEffect === 'gust') {
      const gustCycle = (time * 0.001) % 4;
      if (gustCycle < 1.6) {
        const gustForce = Math.sin((gustCycle / 1.6) * Math.PI) * 3.2;
        this.threads.forEach(t => {
          t.nodes.forEach(n => {
            if (!n.isPinned) n.x += gustForce * (0.8 + Math.random() * 0.4);
          });
        });
      }
    } else if (this.currentEffect === 'zerog') {
      // 3. Zero-G Drift: Weightless strings float and undulate with buoyant micro-turbulence
      this.threads.forEach(t => {
        t.nodes.forEach((n, idx) => {
          if (!n.isPinned) {
            const floatOffset = Math.sin(time * 0.003 + idx * 0.6) * 1.5;
            const floatDrift = Math.cos(time * 0.002 + idx * 0.4) * 1.0;
            n.y -= 0.32 + floatOffset * 0.3;
            n.x += floatDrift * 0.25;
          }
        });
      });
    } else if (this.currentEffect === 'shimmer') {
      // 4. Prism Shimmer: Travelling iridescent light pulse sweeping across threads
      const wavePos = (time * 0.18) % (this.width + 300);
      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          const distToWave = Math.abs(n.x - wavePos);
          if (distToWave < 100 && !n.isPinned) {
            const shimmerPower = (1 - distToWave / 100) * 2.2;
            n.y += (Math.random() - 0.5) * shimmerPower;
          }
        });
      });
    } else if (this.currentEffect === 'visitor') {
      this.visitor.angle += 0.03;
      this.visitor.x = this.width * 0.5 + Math.sin(this.visitor.angle) * (this.width * 0.35);
      this.visitor.y = this.height * 0.5 + Math.sin(this.visitor.angle * 2) * 90;

      this.ctx.save();
      this.ctx.fillStyle = '#1ABCFE';
      this.ctx.shadowColor = '#F24E1E';
      this.ctx.shadowBlur = 16;
      this.ctx.beginPath();
      this.ctx.arc(this.visitor.x, this.visitor.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          if (Math.hypot(n.x - this.visitor.x, n.y - this.visitor.y) < 32) {
            t.pluck(9);
          }
        });
      });
    }
  }

  drawPins() {
    this.ctx.save();
    for (const char of this.characters) {
      for (const pin of char.pins) {
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

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.arc(pin.x - 1, pin.y - 1, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TypeLoomStudio();
});
