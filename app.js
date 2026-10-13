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
    this.btnTogglePins = document.getElementById('btn-toggle-pins');
    this.pinsStatusDot = document.getElementById('pins-status-dot');
    this.pinsStatusText = document.getElementById('pins-status-text');
    this.btnToggleFlakes = document.getElementById('btn-toggle-flakes');
    this.flakesStatusDot = document.getElementById('flakes-status-dot');
    this.flakesStatusText = document.getElementById('flakes-status-text');
    this.sliderStroke = document.getElementById('slider-stroke');
    this.valStroke = document.getElementById('val-stroke');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.soundStatusDot = document.getElementById('sound-status-dot');
    this.soundStatusText = document.getElementById('sound-status-text');

    // Themes
    this.themeKeys = Object.keys(LOOM_THEMES);
    this.currentThemeKey = 'figma'; // Default to Figma Brand Spectrum
    this.theme = LOOM_THEMES[this.currentThemeKey];

    // Sub-Ribbon Active State
    this.activeSubMenu = null;

    // Effect State: 'breathe' | 'gust' | 'visitor' (Luminous Needle) | 'shuttles' (Twin Shuttles)
    this.currentEffect = 'breathe';
    this.effectTime = 0;

    // Pin & Thread State (Clean On/Off Toggles)
    this.showPins = true;
    this.showSnowFlakes = true; // Minute glowing dots/snowflakes falling in the UI by default
    this.threadThickness = 3.5; // Increased default stroke size
    this.tension = 0.95;
    this.gravity = 0.08;

    // Elastic Dragging Pin State
    this.draggedPin = null;
    this.lastStretchTick = 0;

    // Typography State
    this.textString = '';
    this.characters = [];
    this.threads = [];
    this.baseFontSize = 96;

    // Mouse Tracking
    this.mousePrev = { x: -999, y: -999 };
    this.mouseCurr = { x: -999, y: -999 };

    // Kinetic Entity States
    this.visitor = { x: 200, y: 200, angle: 0, trail: [] };
    this.shuttles = [
      { x: 0, y: 0, trail: [], color: '#1ABCFE', glow: '#00F0FF', radius: 5 },
      { x: 0, y: 0, trail: [], color: '#FF7262', glow: '#F24E1E', radius: 5 }
    ];

    this.init();
  }

  initSnowFlakes() {
    const count = 85;
    const w = this.width || this.artboardContainer?.clientWidth || 800;
    const h = this.height || this.artboardContainer?.clientHeight || 600;
    this.snowFlakes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * 1.6 + 1.0, // minute size: 1.0px to 2.6px
      baseAlpha: Math.random() * 0.4 + 0.45, // 0.45 to 0.85
      twinkleSpeed: Math.random() * 0.003 + 0.0015,
      phase: Math.random() * Math.PI * 2,
      vy: Math.random() * 0.9 + 0.6, // gentle falling speed
      swayAmp: Math.random() * 0.5 + 0.25, // horizontal sway
      swayFreq: Math.random() * 0.0018 + 0.0008,
      isStar: Math.random() > 0.55 // ~45% have crystalline glint
    }));
  }

  init() {
    this.resize();
    this.initSnowFlakes();

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

    if (this.snowFlakes) {
      this.snowFlakes.forEach(f => {
        if (f.x > this.width) f.x = Math.random() * this.width;
        if (f.y > this.height) f.y = Math.random() * this.height;
      });
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
        window.LoomAudio.playPluck(587.33, 0.6, true);
      });
    });
  }

  openSubRibbon(menuType) {
    this.activeSubMenu = menuType;
    this.dockSubRibbon.classList.add('open');

    // Reset all trigger highlights
    this.paletteMenuTrigger.classList.remove('active');
    this.motionMenuTrigger.classList.remove('active');

    this.subRibbonPalettes.classList.remove('active');
    this.subRibbonEffects.classList.remove('active');

    if (menuType === 'palettes') {
      this.paletteMenuTrigger.classList.add('active');
      this.subRibbonPalettes.classList.add('active');
    } else if (menuType === 'effects') {
      this.motionMenuTrigger.classList.add('active');
      this.subRibbonEffects.classList.add('active');
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
    // Pin On/Off Toggle
    this.btnTogglePins.addEventListener('click', () => {
      this.showPins = !this.showPins;
      if (this.showPins) {
        this.pinsStatusDot.classList.add('active');
        this.pinsStatusText.textContent = 'Pins: On';
        this.btnTogglePins.classList.add('active');
        window.LoomAudio.playPluck(523.25, 0.65, true);
      } else {
        this.pinsStatusDot.classList.remove('active');
        this.pinsStatusText.textContent = 'Pins: Off';
        this.btnTogglePins.classList.remove('active');
        window.LoomAudio.playSnip();
      }
    });

    // Snow / Glowing Dots On/Off Toggle
    if (this.btnToggleFlakes) {
      this.btnToggleFlakes.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.showSnowFlakes = !this.showSnowFlakes;
        if (this.showSnowFlakes) {
          if (this.flakesStatusDot) this.flakesStatusDot.classList.add('active');
          if (this.flakesStatusText) this.flakesStatusText.textContent = 'Snow: On';
          this.btnToggleFlakes.classList.add('active');
          try {
            if (window.LoomAudio) window.LoomAudio.playPluck(880, 0.55, true);
          } catch (_) {}
        } else {
          if (this.flakesStatusDot) this.flakesStatusDot.classList.remove('active');
          if (this.flakesStatusText) this.flakesStatusText.textContent = 'Snow: Off';
          this.btnToggleFlakes.classList.remove('active');
          try {
            if (window.LoomAudio) window.LoomAudio.playSnip();
          } catch (_) {}
        }
      });
    }

    // Stroke Thickness Slider
    this.sliderStroke.addEventListener('input', (e) => {
      this.threadThickness = parseFloat(e.target.value);
      this.valStroke.textContent = `${this.threadThickness.toFixed(1)}px`;
      this.threads.forEach(t => {
        t.thickness = this.threadThickness;
      });
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
    // Global keyboard listener (works immediately without needing to click or focus first)
    window.addEventListener('keydown', (e) => {
      // Don't intercept when focusing on slider or special controls
      if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;

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
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this.textString += e.key;
        this.rebuildAllCharacters();
        window.LoomAudio.playPluck(null, 0.85, true);
      }
    });

    // Mobile / IME virtual input listener
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
            window.LoomAudio.playPluck(null, 0.85, true);
          }
        }
        this.typeInput.value = '';
      }
    });
  }

  handleEnter() {
    this.textString += '\n';
    this.rebuildAllCharacters();
    window.LoomAudio.playPluck(329.63, 0.8, true);
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

    // Strict Fixed Canvas Safe-Zone Padding (Top, Bottom, Left, Right)
    const padLeft = Math.max(40, Math.round(this.width * 0.08));
    const padRight = padLeft;
    const padTop = Math.max(48, Math.round(this.height * 0.10));
    const padBottom = padTop;

    const maxAvailableWidth = Math.max(100, this.width - (padLeft + padRight));
    const maxAvailableHeight = Math.max(80, this.height - (padTop + padBottom));

    // Adaptive font scaling
    let fontSize = this.baseFontSize;

    // Proportional character width calculator
    const getCharWidth = (ch, fSize) => {
      const wideChars = 'MWmw#%@';
      const narrowChars = 'Iijl!|.,:;\'"1tfr`';
      const mediumNarrow = 'Jksxz';
      if (wideChars.includes(ch)) return fSize * 0.82;
      if (narrowChars.includes(ch)) return fSize * 0.36;
      if (mediumNarrow.includes(ch)) return fSize * 0.52;
      return fSize * 0.62;
    };

    // Helper: calculate total pixel width of any string segment
    const getSegmentWidth = (seg, fSize, lSpacing) => {
      if (!seg || seg.length === 0) return 0;
      let total = 0;
      for (let i = 0; i < seg.length; i++) {
        total += getCharWidth(seg[i], fSize);
        if (i < seg.length - 1) total += lSpacing;
      }
      return total;
    };

    // Function to compute lines and total height for a given font size
    const layoutLines = (fSize) => {
      const charH = fSize;
      const lSpacing = Math.max(5, fSize * 0.12);
      const spWidth = fSize * 0.38;
      const lHeight = fSize * 1.28;

      const paragraphs = this.textString.split('\n');
      const lines = [];

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
          const wWidth = getSegmentWidth(word, fSize, lSpacing);

          if (wWidth > maxAvailableWidth && word.length > 1) {
            if (curLineWords.length > 0) {
              lines.push({ words: curLineWords, width: curLineWidth });
              curLineWords = [];
              curLineWidth = 0;
            }

            let chunk = '';
            for (let i = 0; i < word.length; i++) {
              const testChunk = chunk + word[i];
              if (getSegmentWidth(testChunk, fSize, lSpacing) > maxAvailableWidth && chunk.length > 0) {
                lines.push({ words: [chunk], width: getSegmentWidth(chunk, fSize, lSpacing) });
                chunk = word[i];
              } else {
                chunk = testChunk;
              }
            }
            if (chunk.length > 0) {
              curLineWords = [chunk];
              curLineWidth = getSegmentWidth(chunk, fSize, lSpacing);
            }
            continue;
          }

          const testWidth = curLineWords.length === 0 ? wWidth : curLineWidth + spWidth + wWidth;

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

      const totalH = lines.length * charH + (lines.length - 1) * (lHeight - charH);
      return { lines, totalH, charH, lSpacing, spWidth, lHeight };
    };

    // Auto-fit font size if content exceeds available height
    let layout = layoutLines(fontSize);
    while (layout.totalH > maxAvailableHeight && fontSize > 24) {
      fontSize -= 4;
      layout = layoutLines(fontSize);
    }

    const { lines, totalH, charH, lSpacing, spWidth, lHeight } = layout;

    // 2. Strict Safe-Zone Centering (Guarantees top, bottom, left, right padding)
    const blockStartY = padTop + Math.max(0, (maxAvailableHeight - totalH) / 2);

    this.characters = [];
    this.threads = [];

    let globalCharIndex = 0;

    // 3. Render lines with exact horizontal centering & clean typographic strokes
    for (let l = 0; l < lines.length; l++) {
      const lineObj = lines[l];
      const lineY = blockStartY + l * lHeight;
      const lineStartX = padLeft + Math.max(0, (maxAvailableWidth - lineObj.width) / 2);

      let currentX = lineStartX;

      for (let w = 0; w < lineObj.words.length; w++) {
        const word = lineObj.words[w];

        for (let c = 0; c < word.length; c++) {
          const char = word[c];
          const charW = getCharWidth(char, fontSize);
          const topo = window.getGlyphTopology(char);
          const charId = `c_${l}_${w}_${c}_${char}`;

          const pins = topo.pins.map(p => {
            const px = currentX + p.x * charW;
            const py = lineY + p.y * charH;
            return {
              x: px,
              y: py,
              origX: px,
              origY: py,
              vx: 0,
              vy: 0,
              isDragging: false
            };
          });

          this.characters.push({
            id: charId,
            char: char,
            x: currentX,
            y: lineY,
            width: charW,
            height: charH,
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

          currentX += charW + lSpacing;
          globalCharIndex++;
        }

        // Space gap between words
        if (w < lineObj.words.length - 1) {
          currentX += spWidth;
        }
      }
    }
  }

  // --- Mouse Pluck & Draggable Pin Interaction ---
  setupMouseEvents() {
    const getPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const onDown = (clientX, clientY) => {
      window.LoomAudio.wake();
      const pos = getPos(clientX, clientY);

      // Check if grabbing any pin within 32px (finds the closest pin to click)
      let foundPin = null;
      let closestDist = 32;
      for (const char of this.characters) {
        for (const pin of char.pins) {
          const d = Math.hypot(pin.x - pos.x, pin.y - pos.y);
          if (d < closestDist) {
            closestDist = d;
            foundPin = pin;
          }
        }
      }

      if (foundPin) {
        this.draggedPin = foundPin;
        foundPin.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        window.LoomAudio.playPluck(659.25, 0.85, true);
        this.lastStretchTick = performance.now();
      }
    };

    const onMove = (clientX, clientY) => {
      const pos = getPos(clientX, clientY);
      this.mousePrev = { ...this.mouseCurr };
      this.mouseCurr = pos;

      if (this.draggedPin) {
        this.draggedPin.x = pos.x;
        this.draggedPin.y = pos.y;

        const stretch = Math.hypot(pos.x - this.draggedPin.origX, pos.y - this.draggedPin.origY);
        const now = performance.now();
        if (now - this.lastStretchTick > 36 && stretch > 6) {
          this.lastStretchTick = now;
          window.LoomAudio.playStretchTick(380 + Math.min(stretch * 3.5, 750));
        }
        return;
      }

      // Dynamic cursor: grab when hovering over pins within 30px
      let hoveredPin = false;
      for (const char of this.characters) {
        for (const pin of char.pins) {
          if (Math.hypot(pin.x - pos.x, pin.y - pos.y) < 30) {
            hoveredPin = true;
            break;
          }
        }
        if (hoveredPin) break;
      }
      this.canvas.style.cursor = hoveredPin ? 'grab' : 'default';

      let pluckedAny = false;
      for (const thread of this.threads) {
        if (thread.checkPluck(this.mousePrev.x, this.mousePrev.y, this.mouseCurr.x, this.mouseCurr.y)) {
          pluckedAny = true;
        }
      }

      if (pluckedAny) {
        const speed = Math.hypot(this.mouseCurr.x - this.mousePrev.x, this.mouseCurr.y - this.mousePrev.y);
        window.LoomAudio.playPluck(null, Math.min(speed / 10, 0.95));
      }
    };

    const onUp = () => {
      if (this.draggedPin) {
        const stretch = Math.hypot(this.draggedPin.x - this.draggedPin.origX, this.draggedPin.y - this.draggedPin.origY);
        this.draggedPin.isDragging = false;

        if (stretch > 12) {
          // Pluck all attached threads with elastic spring energy
          this.threads.forEach(t => {
            if (t.p1 === this.draggedPin || t.p2 === this.draggedPin) {
              t.pluck(Math.min(stretch * 0.45, 24));
            }
          });
          window.LoomAudio.playChord(523.25 + Math.min(stretch * 1.6, 400), Math.min(5, Math.floor(stretch / 28) + 3));
        }
        this.draggedPin = null;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', onUp);
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
    if (this.pinStyle !== 'none') {
      this.characters.forEach(c => {
        c.pins.forEach(p => {
          svgPins += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${this.theme.pinFill}" stroke="${this.theme.pinStroke}" stroke-width="1.2" />\n`;
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

    // 1. Clear Canvas & Draw Tactile Micro-Linen Background
    this.ctx.fillStyle = this.theme.artboardBg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Subtle Canvas Texture Vignette (Type Garden tactile feel)
    const vignette = this.ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.5, this.width * 0.2,
      this.width * 0.5, this.height * 0.5, this.width * 0.75
    );
    vignette.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Ambient Falling Glowing Dots / Snowflakes (Toggleable)
    this.drawSnowFlakes(time);

    // 2b. Luminous Cursor Proximity Aura (Evident visual field on hover)
    if (this.mouseCurr.x > 0 && this.mouseCurr.y > 0) {
      this.ctx.save();
      const aura = this.ctx.createRadialGradient(
        this.mouseCurr.x, this.mouseCurr.y, 2,
        this.mouseCurr.x, this.mouseCurr.y, 85
      );
      aura.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      aura.addColorStop(0.4, 'rgba(26, 188, 254, 0.08)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = aura;
      this.ctx.beginPath();
      this.ctx.arc(this.mouseCurr.x, this.mouseCurr.y, 85, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 3. Pin Physics: Remain stable at rest positions, spring back smoothly after drag
    for (const char of this.characters) {
      for (const pin of char.pins) {
        if (!pin.isDragging) {
          const dx = pin.origX - pin.x;
          const dy = pin.origY - pin.y;
          if (Math.hypot(dx, dy) > 0.2 || Math.hypot(pin.vx, pin.vy) > 0.2) {
            const ax = dx * 0.28;
            const ay = dy * 0.28;
            pin.vx = (pin.vx + ax) * 0.74;
            pin.vy = (pin.vy + ay) * 0.74;
            pin.x += pin.vx;
            pin.y += pin.vy;
          } else {
            pin.x = pin.origX;
            pin.y = pin.origY;
            pin.vx = 0;
            pin.vy = 0;
          }
        }
      }
    }

    // 4. Apply Kinetic Effects
    this.applyKineticEffects(time);

    // 5. Update Physics
    for (let i = this.threads.length - 1; i >= 0; i--) {
      const t = this.threads[i];
      t.update(this.gravity, 0.96);
      if (t.isUnraveling && t.unravelProgress >= 1) {
        this.threads.splice(i, 1);
      }
    }

    // 6. Draw Threads (Passing mouse coordinates for active hover illumination)
    for (const thread of this.threads) {
      thread.draw(this.ctx, time, this.theme, this.mouseCurr);
    }

    // 7. Draw Pins (On/Off Toggle with dynamic hover grab cue)
    if (this.showPins) {
      this.drawPins(time);
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  drawSnowFlakes(time) {
    if (!this.showSnowFlakes || !this.snowFlakes) return;
    const now = typeof time === 'number' && !isNaN(time) ? time : performance.now();
    this.ctx.save();

    const mouseX = this.mouseCurr.x;
    const mouseY = this.mouseCurr.y;

    for (let i = 0; i < this.snowFlakes.length; i++) {
      const f = this.snowFlakes[i];

      // 1. Fall downward with gentle steady gravity
      f.y += f.vy;

      // 2. Natural sway / flutter in air
      f.x += Math.sin(now * f.swayFreq + f.phase) * f.swayAmp;

      // 3. Gentle fluid interaction with mouse
      if (mouseX > 0 && mouseY > 0) {
        const dx = f.x - mouseX;
        const dy = f.y - mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist < 80 && dist > 1) {
          const push = ((80 - dist) / 80) * 1.1;
          f.x += (dx / dist) * push;
          f.y += (dy / dist) * push * 0.4;
        }
      }

      // 4. Wrap around canvas edges
      if (f.y > this.height + 15) {
        f.y = -15;
        f.x = Math.random() * this.width;
      }
      if (f.x < -15) f.x = this.width + 15;
      if (f.x > this.width + 15) f.x = -15;

      // 5. Shimmering pulse / twinkle
      const alpha = Math.max(0.35, Math.min(1.0, f.baseAlpha + Math.sin(now * f.twinkleSpeed + f.phase) * 0.25));

      // 6. Draw outer radial glowing aura
      const glowR = Math.max(3.5, f.radius * 3.0);
      const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.95})`);
      grad.addColorStop(0.35, `rgba(200, 235, 255, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(180, 220, 255, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
      this.ctx.fill();

      // 7. Crisp bright solid minute core with luminous shadow
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      this.ctx.shadowBlur = Math.max(3, f.radius * 2.5);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha + 0.2)})`;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, Math.max(1.1, f.radius * 0.8), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // 8. Delicate crystalline 4-point snowflake glint for select flakes
      if (f.isStar && f.radius >= 1.4 && alpha > 0.45) {
        const glintLen = f.radius * 2.5;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
        this.ctx.lineWidth = 0.65;
        this.ctx.beginPath();
        this.ctx.moveTo(f.x - glintLen, f.y);
        this.ctx.lineTo(f.x + glintLen, f.y);
        this.ctx.moveTo(f.x, f.y - glintLen);
        this.ctx.lineTo(f.x, f.y + glintLen);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  applyKineticEffects(time) {
    if (this.currentEffect === 'breathe') {
      const sway = Math.sin(time * 0.002) * 2.5;
      this.threads.forEach(t => {
        t.nodes.forEach((n, idx) => {
          if (!n.isPinned) {
            n.y += Math.sin(time * 0.003 + idx * 0.5) * 0.6;
            n.x += sway * 0.25;
          }
        });
      });
    } else if (this.currentEffect === 'gust') {
      const gustCycle = (time * 0.0012) % 4;
      if (gustCycle < 1.8) {
        const gustForce = Math.sin((gustCycle / 1.8) * Math.PI) * 4.2;
        this.threads.forEach(t => {
          t.nodes.forEach(n => {
            if (!n.isPinned) n.x += gustForce * (0.9 + Math.random() * 0.3);
          });
        });
      }
    } else if (this.currentEffect === 'visitor') {
      // 03. Luminous Needle (orbits smoothly and gently plucks strings)
      this.visitor.angle += 0.022;
      this.visitor.x = this.width * 0.5 + Math.sin(this.visitor.angle) * (this.width * 0.38);
      this.visitor.y = this.height * 0.5 + Math.sin(this.visitor.angle * 2.2) * (this.height * 0.28);

      this.visitor.trail.push({ x: this.visitor.x, y: this.visitor.y });
      if (this.visitor.trail.length > 14) this.visitor.trail.shift();

      this.ctx.save();
      for (let i = 0; i < this.visitor.trail.length - 1; i++) {
        const p1 = this.visitor.trail[i];
        const p2 = this.visitor.trail[i + 1];
        const alpha = (i / this.visitor.trail.length) * 0.7;
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = 2.2;
        this.ctx.shadowColor = '#FFB800';
        this.ctx.shadowBlur = 12;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
      this.ctx.restore();

      this.ctx.save();
      this.ctx.shadowColor = '#1ABCFE';
      this.ctx.shadowBlur = 24;
      this.ctx.fillStyle = '#00F0FF';
      this.ctx.beginPath();
      this.ctx.arc(this.visitor.x, this.visitor.y, 5.5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(this.visitor.x, this.visitor.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      const pulseR = 8 + Math.sin(time * 0.008) * 3;
      this.ctx.strokeStyle = 'rgba(26, 188, 254, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(this.visitor.x, this.visitor.y, pulseR, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      let needlePluck = false;
      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          if (Math.hypot(n.x - this.visitor.x, n.y - this.visitor.y) < 32) {
            t.pluck(10);
            needlePluck = true;
          }
        });
      });
      if (needlePluck) {
        window.LoomAudio.playPluck(null, 0.6);
      }
    } else if (this.currentEffect === 'shuttles') {
      // 04. Twin Shuttles
      const s1 = this.shuttles[0];
      const s2 = this.shuttles[1];

      s1.x = this.width * 0.5 + Math.sin(time * 0.0018) * (this.width * 0.42);
      s1.y = this.height * 0.5 + Math.sin(time * 0.0036) * (this.height * 0.3);

      s2.x = this.width * 0.5 + Math.cos(time * 0.0015 + 1.2) * (this.width * 0.4);
      s2.y = this.height * 0.5 + Math.sin(time * 0.003 + 0.8) * (this.height * 0.32);

      this.shuttles.forEach((s) => {
        s.trail.push({ x: s.x, y: s.y });
        if (s.trail.length > 10) s.trail.shift();

        this.ctx.save();
        for (let i = 0; i < s.trail.length - 1; i++) {
          const pA = s.trail[i];
          const pB = s.trail[i + 1];
          const alpha = (i / s.trail.length) * 0.6;
          this.ctx.strokeStyle = s.glow;
          this.ctx.globalAlpha = alpha;
          this.ctx.lineWidth = 3;
          this.ctx.shadowColor = s.glow;
          this.ctx.shadowBlur = 10;
          this.ctx.beginPath();
          this.ctx.moveTo(pA.x, pA.y);
          this.ctx.lineTo(pB.x, pB.y);
          this.ctx.stroke();
        }
        this.ctx.restore();

        this.ctx.save();
        this.ctx.shadowColor = s.glow;
        this.ctx.shadowBlur = 22;
        this.ctx.fillStyle = s.color;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius + 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius * 0.45, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        let hitString = false;
        this.threads.forEach(t => {
          t.nodes.forEach(n => {
            if (Math.hypot(n.x - s.x, n.y - s.y) < 30) {
              t.pluck(11);
              hitString = true;
            }
          });
        });
        if (hitString) {
          window.LoomAudio.playPluck(null, 0.65);
        }
      });
    }
  }

  // Anchor Pins Renderer (Tactile Glass Pearl anchors with dynamic hover & drag cues)
  drawPins(time = 0) {
    if (!this.showPins) return;
    this.ctx.save();

    for (const char of this.characters) {
      for (const pin of char.pins) {
        const isDragged = pin.isDragging;
        const distToMouse = Math.hypot(pin.x - this.mouseCurr.x, pin.y - this.mouseCurr.y);
        const isHovered = distToMouse < 28 && !isDragged;

        // Visual Cue 1: Ghost Socket & Elastic Dashed Tension Tether during Drag
        if (isDragged) {
          this.ctx.save();
          // Ghost socket at original anchor
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          this.ctx.lineWidth = 1;
          this.ctx.setLineDash([2, 3]);
          this.ctx.beginPath();
          this.ctx.arc(pin.origX, pin.origY, 5.5, 0, Math.PI * 2);
          this.ctx.stroke();

          // Elastic tether vector
          this.ctx.strokeStyle = 'rgba(26, 188, 254, 0.65)';
          this.ctx.lineWidth = 1.2;
          this.ctx.shadowColor = '#00F0FF';
          this.ctx.shadowBlur = 8;
          this.ctx.beginPath();
          this.ctx.moveTo(pin.origX, pin.origY);
          this.ctx.lineTo(pin.x, pin.y);
          this.ctx.stroke();
          this.ctx.restore();
        }

        // Visual Cue 2: Grab Reticle Pulsing Ring on Hover
        if (isHovered) {
          this.ctx.save();
          const pulseR = 8.5 + Math.sin(time * 0.01) * 1.5;
          this.ctx.strokeStyle = '#FFFFFF';
          this.ctx.shadowColor = '#1ABCFE';
          this.ctx.shadowBlur = 12;
          this.ctx.lineWidth = 1.2;
          this.ctx.setLineDash([3, 3]);
          this.ctx.beginPath();
          this.ctx.arc(pin.x, pin.y, pulseR, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
        }

        // Pin Glass Pearl Node
        this.ctx.save();
        this.ctx.shadowColor = isHovered ? '#1ABCFE' : 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = isDragged ? 14 : (isHovered ? 12 : 4);
        this.ctx.shadowOffsetY = isDragged ? 4 : (isHovered ? 0 : 1.5);

        const rad = isDragged ? 6.5 : (isHovered ? 5.4 : 4.2);
        const grad = this.ctx.createRadialGradient(
          pin.x - rad * 0.35, pin.y - rad * 0.35, rad * 0.1,
          pin.x, pin.y, rad
        );
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.45, isHovered ? '#BAE6FD' : '#E0E7FF');
        grad.addColorStop(1, isHovered ? '#0284C7' : '#818CF8');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(pin.x, pin.y, rad, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = isHovered ? 1.2 : 0.8;
        this.ctx.stroke();

        // Top specular glint
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(pin.x - rad * 0.35, pin.y - rad * 0.35, rad * 0.28, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TypeLoomStudio();
});
