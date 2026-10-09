/**
 * Type Loom — Exact Type Garden UI & Poster Mode Controller
 */

class TypeLoomApp {
  constructor() {
    this.canvas = document.getElementById('loom-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.typeInput = document.getElementById('type-input');
    this.toastEl = document.getElementById('toast');

    // UI elements
    this.paletteGroupEl = document.getElementById('palette-swatches');
    this.posterPaletteGridEl = document.getElementById('poster-palette-grid');
    this.motionGridEl = document.getElementById('motion-grid');
    this.viewToggle = document.getElementById('view-toggle');

    // Themes & Palettes
    this.themeKeys = Object.keys(LOOM_THEMES);
    this.currentThemeKey = 'figma'; // Default to Figma Brand Colors!
    this.theme = LOOM_THEMES[this.currentThemeKey];

    // Mode: 'type' | 'poster'
    this.currentView = 'type';

    // Motion Presets: 'breathe' | 'grow-wither' | 'typed' | 'gust' | 'reach' | 'scatter' | 'visitor'
    this.currentMotion = 'breathe';
    this.motionTime = 0;

    // Visitor entity for 'visitor' motion
    this.visitor = { x: 200, y: 200, targetX: 300, targetY: 300, angle: 0, speed: 3 };

    // State
    this.characters = []; // { id, char, x, y, width, height, pins: [] }
    this.threads = [];    // LoomThread instances
    this.lastPin = null;  // For bridging between consecutive letters

    // Layout settings
    this.fontSize = 86;
    this.lineHeight = 130;
    this.letterSpacing = 18;
    this.startX = 80;
    this.startY = 220;
    this.cursorX = this.startX;
    this.cursorY = this.startY;

    // Mouse Tracking
    this.mousePrev = { x: 0, y: 0 };
    this.mouseCurr = { x: 0, y: 0 };
    this.isMouseDown = false;

    // Needle Flying Shuttles (Visual FX)
    this.shuttles = [];

    // Physics parameters
    this.tension = 0.85;
    this.gravity = 0.22;
    this.weaveDensity = 3;
    this.pinStyle = 'brass';

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Auto-focus hidden input on any click (unless clicking on interactive UI)
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.top-left-header') && 
          !e.target.closest('.top-right-header') && 
          !e.target.closest('.bottom-right-dock') &&
          !e.target.closest('.poster-drawer')) {
        this.focusInput();
      }
    });

    this.renderTypeViewSwatches();
    this.renderPosterPaletteCards();
    this.setupViewToggle();
    this.setupMotionControls();
    this.setupKeyEvents();
    this.setupMouseEvents();
    this.setupActionButtons();

    // Apply default theme
    this.applyTheme(this.currentThemeKey);

    // Initial demo word
    this.seedDefaultText();

    // Start 60fps loop
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  seedDefaultText() {
    const text = "FIGMA";
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        this.addCharacter(text[i]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 120);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const container = document.getElementById('canvas-viewport');
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);

    if (this.width < 600) {
      this.fontSize = 52;
      this.lineHeight = 84;
      this.startX = 24;
      this.startY = 180;
    } else {
      this.fontSize = 86;
      this.lineHeight = 130;
      this.startX = 80;
      this.startY = 220;
    }
  }

  focusInput() {
    this.typeInput.focus();
  }

  // --- View Toggle (Type vs Poster) ---
  setupViewToggle() {
    const btns = this.viewToggle.querySelectorAll('.view-btn');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        this.setView(view);
      });
    });
  }

  setView(view) {
    this.currentView = view;
    if (view === 'poster') {
      document.body.classList.remove('mode-type');
      document.body.classList.add('mode-poster');
    } else {
      document.body.classList.remove('mode-poster');
      document.body.classList.add('mode-type');
    }
    setTimeout(() => this.resize(), 420);
  }

  // --- Render Swatches for Type View ---
  renderTypeViewSwatches() {
    this.paletteGroupEl.innerHTML = '';
    this.themeKeys.forEach((key) => {
      const themeObj = LOOM_THEMES[key];
      const btn = document.createElement('button');
      btn.className = `swatch-dot-btn ${key === this.currentThemeKey ? 'active' : ''}`;
      btn.title = themeObj.name;
      btn.style.backgroundColor = themeObj.dot1 || themeObj.pinFill;
      btn.addEventListener('click', () => {
        this.applyTheme(key);
      });
      this.paletteGroupEl.appendChild(btn);
    });
  }

  // --- Render Rich Palette Cards for Poster Drawer ---
  renderPosterPaletteCards() {
    this.posterPaletteGridEl.innerHTML = '';
    this.themeKeys.forEach((key) => {
      const t = LOOM_THEMES[key];
      const card = document.createElement('div');
      card.className = `palette-card ${key === this.currentThemeKey ? 'active' : ''}`;
      card.setAttribute('data-theme', key);

      // Card pill with 2 color dots + "Aa"
      const dotsHTML = t.id === 'figma' 
        ? `<div class="palette-dot" style="background:${t.dot1}"></div>
           <div class="palette-dot" style="background:${t.dot2}"></div>
           <div class="palette-dot" style="background:${t.dot3}"></div>
           <div class="palette-dot" style="background:${t.dot4}"></div>`
        : `<div class="palette-dot" style="background:${t.dot1}"></div>
           <div class="palette-dot" style="background:${t.dot2}"></div>`;

      card.innerHTML = `
        <div class="palette-card-pill" style="background:${t.cardBg}; color:${t.textColor};">
          <div class="palette-dots-container">
            ${dotsHTML}
          </div>
          <span class="palette-aa">Aa</span>
        </div>
        <div class="palette-title">${t.name}</div>
      `;

      card.addEventListener('click', () => {
        this.applyTheme(key);
      });

      this.posterPaletteGridEl.appendChild(card);
    });
  }

  applyTheme(themeKey) {
    this.currentThemeKey = themeKey;
    this.theme = LOOM_THEMES[themeKey];

    document.body.style.backgroundColor = this.theme.bg;
    document.documentElement.style.setProperty('--bg-color', this.theme.bg);

    // Update Type view active swatch dot
    const dots = this.paletteGroupEl.querySelectorAll('.swatch-dot-btn');
    dots.forEach((d, idx) => {
      if (this.themeKeys[idx] === themeKey) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });

    // Update Poster view active cards
    const cards = this.posterPaletteGridEl.querySelectorAll('.palette-card');
    cards.forEach((c) => {
      if (c.getAttribute('data-theme') === themeKey) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
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

  // --- Motion Controls ---
  setupMotionControls() {
    const cards = this.motionGridEl.querySelectorAll('.motion-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentMotion = card.getAttribute('data-motion');
        this.motionTime = 0;
      });
    });
  }

  // --- Key Events ---
  setupKeyEvents() {
    this.typeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        this.unravelLastCharacter();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.clearCanvas(); // Type Garden clears on Enter!
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

  // --- Mouse / Pluck Events ---
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

  // --- Action Buttons ---
  setupActionButtons() {
    // Copy Code / Link Toast
    document.getElementById('btn-copy-link').addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      this.showToast('Copied to clipboard!');
    });

    document.getElementById('btn-coffee').addEventListener('click', () => {
      window.open('https://buymeacoffee.com', '_blank');
    });

    // Exports
    document.getElementById('btn-export-png-mini').addEventListener('click', () => this.exportPNG());
    document.getElementById('btn-export-svg-mini').addEventListener('click', () => this.exportSVG());
    document.getElementById('btn-export-poster-png').addEventListener('click', () => this.exportPosterPNG());
    document.getElementById('btn-export-poster-svg').addEventListener('click', () => this.exportSVG());

    // Sound toggle in poster view
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      const isMuted = window.LoomAudio.toggleMute();
      document.getElementById('poster-sound-icon').textContent = isMuted ? '🔇 Sound Off' : '🔊 Sound On';
    });
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2000);
  }

  // --- Weaving Core ---

  addCharacter(char) {
    const topo = window.getGlyphTopology(char);
    const charWidth = this.fontSize * 0.75;
    const charHeight = this.fontSize;

    // Line wrap
    if (this.cursorX + charWidth + this.startX > this.width - 40) {
      this.cursorX = this.startX;
      this.cursorY += this.lineHeight;
      this.lastPin = null;
    }

    const charId = `char_${Date.now()}_${Math.random()}`;
    const x = this.cursorX;
    const y = this.cursorY;

    // Physical pins
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

    // Primary strokes
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

    // Cross-weaving lattice
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

    // Bridge from previous letter
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

  // --- Exports ---

  exportPNG() {
    const link = document.createElement('a');
    link.download = `type-loom-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  exportPosterPNG() {
    // Generate high-resolution poster with framing & title
    const offCanvas = document.createElement('canvas');
    const scale = 2;
    offCanvas.width = 1600 * scale;
    offCanvas.height = 2000 * scale;
    const offCtx = offCanvas.getContext('2d');
    offCtx.scale(scale, scale);

    // Background
    offCtx.fillStyle = this.theme.bg;
    offCtx.fillRect(0, 0, 1600, 2000);

    // Draw main canvas scaled to poster center
    offCtx.save();
    offCtx.translate(200, 400);
    offCtx.drawImage(this.canvas, 0, 0, this.width, this.height, 0, 0, 1200, (1200 / this.width) * this.height);
    offCtx.restore();

    // Poster Title & Subtitle Header
    offCtx.fillStyle = this.theme.textColor;
    offCtx.font = "600 52px 'Newsreader', Georgia, serif";
    offCtx.fillText("TYPE LOOM", 200, 240);

    offCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
    offCtx.font = "400 20px 'JetBrains Mono', monospace";
    offCtx.fillText("GENERATIVE TACTILE THREAD ART", 200, 280);

    // Poster Footer
    offCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
    offCtx.font = "400 16px 'JetBrains Mono', monospace";
    offCtx.fillText("1600 × 2000 PX · FIGMA COLOR SYSTEM", 200, 1860);
    offCtx.fillText("A PROJECT BY ADHITHYA", 1160, 1860);

    const link = document.createElement('a');
    link.download = `type-loom-poster-${Date.now()}.png`;
    link.href = offCanvas.toDataURL('image/png');
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
    this.characters.forEach(c => {
      c.pins.forEach(p => {
        svgPins += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${this.theme.pinFill}" stroke="${this.theme.pinStroke}" stroke-width="1" />\n`;
      });
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}">
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

  // --- Animation & Motion Simulation Loop ---

  renderLoop(time) {
    this.motionTime += 0.016;

    // 1. Background
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Motion Presets Execution
    this.applyMotionEffects(time);

    // 3. Physics Simulation
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

    // 5. Draw Shuttles
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

    // 6. Draw Pins
    this.drawPins();

    // 7. Draw Blinking Loom Cursor
    this.drawCursor(time);

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  applyMotionEffects(time) {
    if (this.currentMotion === 'breathe') {
      // 3s Slow Sway
      const sway = Math.sin(time * 0.002) * 1.5;
      this.threads.forEach(t => {
        t.nodes.forEach((n, idx) => {
          if (!n.isPinned) {
            n.y += Math.sin(time * 0.002 + idx * 0.5) * 0.35;
            n.x += sway * 0.15;
          }
        });
      });
    } else if (this.currentMotion === 'gust') {
      // 4s Periodic Wind Gust
      const gustCycle = (time * 0.001) % 4;
      if (gustCycle < 1.5) {
        const gustForce = Math.sin((gustCycle / 1.5) * Math.PI) * 2.8;
        this.threads.forEach(t => {
          t.nodes.forEach(n => {
            if (!n.isPinned) n.x += gustForce * (0.8 + Math.random() * 0.4);
          });
        });
      }
    } else if (this.currentMotion === 'reach') {
      // 6s Stems follow light
      const lightX = this.width * 0.5 + Math.cos(time * 0.0015) * (this.width * 0.35);
      const lightY = this.height * 0.4 + Math.sin(time * 0.0025) * 120;

      // Draw wandering light orb
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.shadowColor = this.theme.bridgeColor;
      this.ctx.shadowBlur = 24;
      this.ctx.beginPath();
      this.ctx.arc(lightX, lightY, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          if (!n.isPinned) {
            const dx = lightX - n.x;
            const dy = lightY - n.y;
            n.x += dx * 0.002;
            n.y += dy * 0.002;
          }
        });
      });
    } else if (this.currentMotion === 'scatter') {
      // Random harmonic twang plucks
      if (Math.random() < 0.04 && this.threads.length > 0) {
        const randomThread = this.threads[Math.floor(Math.random() * this.threads.length)];
        randomThread.pluck(14);
      }
    } else if (this.currentMotion === 'visitor') {
      // 7s Butterfly/Needle visitor drops by
      this.visitor.angle += 0.03;
      this.visitor.x = this.width * 0.5 + Math.sin(this.visitor.angle) * (this.width * 0.35);
      this.visitor.y = this.height * 0.45 + Math.cos(this.visitor.angle * 1.5) * 140;

      // Draw butterfly entity
      this.ctx.save();
      this.ctx.fillStyle = '#ff7262';
      this.ctx.shadowColor = '#f24e1e';
      this.ctx.shadowBlur = 16;
      this.ctx.beginPath();
      this.ctx.arc(this.visitor.x, this.visitor.y, 4.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Flapping wings
      const wingFlap = Math.sin(time * 0.02) * 8;
      this.ctx.strokeStyle = '#a259ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.visitor.x - 8, this.visitor.y - wingFlap);
      this.ctx.lineTo(this.visitor.x, this.visitor.y);
      this.ctx.lineTo(this.visitor.x + 8, this.visitor.y - wingFlap);
      this.ctx.stroke();
      this.ctx.restore();

      // Pluck threads near visitor
      this.threads.forEach(t => {
        t.nodes.forEach(n => {
          if (Math.hypot(n.x - this.visitor.x, n.y - this.visitor.y) < 28) {
            t.pluck(8);
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

  drawCursor(time) {
    const blink = Math.sin(time * 0.006) * 0.5 + 0.5;
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${blink * 0.7})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.cursorX, this.cursorY);
    this.ctx.lineTo(this.cursorX, this.cursorY + this.fontSize);
    this.ctx.stroke();
    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new TypeLoomApp();
});
