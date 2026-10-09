/**
 * Type Loom — Studio Edition by Ramya
 * Generative Tactile Typography Engine with Multi-Line Wrapping, Mixed Case & Smooth Canvas Transitions.
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

    // Sub-Ribbon Active State
    this.activeSubMenu = null;

    // Effect State: 'breathe' | 'gust' | 'zerog' | 'shimmer' | 'visitor'
    this.currentEffect = 'breathe';
    this.effectTime = 0;

    // Pin & Thread State
    this.showPins = true;
    this.threadThickness = 2.6;
    this.tension = 0.95;
    this.gravity = 0.08;

    // Typography State
    this.textString = '';
    this.characters = [];
    this.threads = [];
    this.baseFontSize = 96;

    // Mouse Tracking
    this.mousePrev = { x: 0, y: 0 };
    this.mouseCurr = { x: 0, y: 0 };

    // Visitor Entity
    this.visitor = { x: 200, y: 200, angle: 0 };

    this.init();
  }

  init() {
    this.resize();

    // Smooth continuous resize handling via ResizeObserver
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.artboardContainer);
    } else {
      window.addEventListener('resize', () => this.resize());
    }

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
    this.width = this.artboardContainer.clientWidth || 800;
    this.height = this.artboardContainer.clientHeight || 600;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    if (this.width < 600) {
      this.baseFontSize = 60;
    } else {
      this.baseFontSize = 96;
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
        this.handleEnter();
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
          } else if (char === '\n') {
            this.handleEnter();
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

  handleEnter() {
    this.textString += '\n';
    this.rebuildAllCharacters();
    window.LoomAudio.playPluck(329.63, 0.7);
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

  // Responsive Multi-Line Wrapping & Dynamic Centering
  rebuildAllCharacters() {
    if (this.textString.length === 0) {
      this.characters = [];
      this.threads = [];
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    // Safe Canvas Margins / Padding
    const padX = Math.max(36, this.width * 0.08);
    const padY = Math.max(48, this.height * 0.12);
    const maxAvailableWidth = Math.max(120, this.width - padX * 2);

    // Adaptive font scaling
    let fontSize = this.baseFontSize;
    if (this.textString.length > 24) {
      fontSize = Math.max(42, this.baseFontSize * 0.65);
    } else if (this.textString.length > 14) {
      fontSize = Math.max(52, this.baseFontSize * 0.8);
    }

    const charHeight = fontSize;
    const letterSpacing = Math.max(6, fontSize * 0.12);
    const spaceWidth = fontSize * 0.38;
    const lineHeight = fontSize * 1.28;

    // Proportional character width calculator
    const getCharWidth = (ch) => {
      const wideChars = 'MWmw#%@';
      const narrowChars = 'Iijl!|.,:;\'"1tfr`';
      const mediumNarrow = 'Jksxz';
      if (wideChars.includes(ch)) return fontSize * 0.82;
      if (narrowChars.includes(ch)) return fontSize * 0.36;
      if (mediumNarrow.includes(ch)) return fontSize * 0.52;
      return fontSize * 0.62;
    };

    // Helper: calculate total pixel width of any string segment
    const getSegmentWidth = (seg) => {
      if (!seg || seg.length === 0) return 0;
      let total = 0;
      for (let i = 0; i < seg.length; i++) {
        total += getCharWidth(seg[i]);
        if (i < seg.length - 1) total += letterSpacing;
      }
      return total;
    };

    // 1. Break text into lines supporting both explicit newlines (\n) and auto-wrapping
    const paragraphs = this.textString.split('\n');
    const lines = []; // array of { words: [], width: 0 }

    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p];
      if (para.length === 0) {
        lines.push({ words: [''], width: 0 });
        continue;
      }

      const words = para.split(' ');
      let curLineWords = [];
      let curLineWidth = 0;

      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        const wWidth = getSegmentWidth(word);

        // If a single word itself is wider than maxAvailableWidth, split it into chunks
        if (wWidth > maxAvailableWidth && word.length > 1) {
          if (curLineWords.length > 0) {
            lines.push({ words: curLineWords, width: curLineWidth });
            curLineWords = [];
            curLineWidth = 0;
          }

          let chunk = '';
          for (let i = 0; i < word.length; i++) {
            const testChunk = chunk + word[i];
            if (getSegmentWidth(testChunk) > maxAvailableWidth && chunk.length > 0) {
              lines.push({ words: [chunk], width: getSegmentWidth(chunk) });
              chunk = word[i];
            } else {
              chunk = testChunk;
            }
          }
          if (chunk.length > 0) {
            curLineWords = [chunk];
            curLineWidth = getSegmentWidth(chunk);
          }
          continue;
        }

        const testWidth = curLineWords.length === 0 ? wWidth : curLineWidth + spaceWidth + wWidth;

        if (testWidth <= maxAvailableWidth || curLineWords.length === 0) {
          curLineWords.push(word);
          curLineWidth = testWidth;
        } else {
          lines.push({ words: curLineWords, width: curLineWidth });
          curLineWords = [word];
          curLineWidth = wWidth;
        }
      }

      if (curLineWords.length > 0) {
        lines.push({ words: curLineWords, width: curLineWidth });
      }
    }

    // 2. Calculate Total Block Dimensions for Vertical Centering
    const totalBlockHeight = lines.length * charHeight + (lines.length - 1) * (lineHeight - charHeight);
    const blockStartY = Math.max(padY, (this.height - totalBlockHeight) / 2);

    this.characters = [];
    this.threads = [];

    let globalCharIndex = 0;

    // 3. Render lines with exact horizontal centering & clean typographic strokes
    for (let l = 0; l < lines.length; l++) {
      const lineObj = lines[l];
      const lineY = blockStartY + l * lineHeight;
      const lineStartX = Math.max(padX, (this.width - lineObj.width) / 2);

      let currentX = lineStartX;

      for (let w = 0; w < lineObj.words.length; w++) {
        const word = lineObj.words[w];

        for (let c = 0; c < word.length; c++) {
          const char = word[c];
          const charW = getCharWidth(char);
          const topo = window.getGlyphTopology(char);
          const charId = `c_${l}_${w}_${c}_${char}`;

          const pins = topo.pins.map(p => ({
            x: currentX + p.x * charW,
            y: lineY + p.y * charHeight
          }));

          this.characters.push({
            id: charId,
            char: char,
            x: currentX,
            y: lineY,
            width: charW,
            height: charHeight,
            pins: pins
          });

          const palette = this.theme.threadColors;
          const charColor = palette[globalCharIndex % palette.length];

          // Primary typographic glyph strokes
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

          currentX += charW + letterSpacing;
          globalCharIndex++;
        }

        // Space gap between words
        if (w < lineObj.words.length - 1) {
          currentX += spaceWidth;
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
