/**
 * Type Loom — Verlet Thread & String Physics Engine
 */

class VerletNode {
  constructor(x, y, isPinned = false) {
    this.x = this.oldX = x;
    this.y = this.oldY = y;
    this.isPinned = isPinned;
    this.origX = x;
    this.origY = y;
  }

  update(gravity, friction) {
    if (this.isPinned) return;

    const vx = (this.x - this.oldX) * friction;
    const vy = (this.y - this.oldY) * friction + gravity;

    this.oldX = this.x;
    this.oldY = this.y;

    this.x += vx;
    this.y += vy;
  }
}

class LoomThread {
  constructor(p1, p2, options = {}) {
    this.p1 = p1;
    this.p2 = p2;
    this.color = options.color || '#e6533c';
    this.thickness = options.thickness || 1.8;
    this.segments = options.segments || 6;
    this.tension = options.tension !== undefined ? options.tension : 0.85; // 0 (slack) to 1 (tight)
    this.charId = options.charId || null;
    this.isBridge = options.isBridge || false; // Connects between two letters

    // Build Verlet chain between p1 and p2
    this.nodes = [];
    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const isPinned = (i === 0 || i === this.segments);
      this.nodes.push(new VerletNode(x, y, isPinned));
    }

    const totalDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    // Resting segment length maintains taut typographic stroke geometry while allowing physical pluck elasticity
    this.segLength = (totalDist / this.segments) * 0.99;

    // Dynamic states
    this.isCut = false;
    this.isUnraveling = false;
    this.unravelProgress = 0;
    this.vibration = 0;
    this.vibrationFreq = 20 + Math.random() * 15;
    this.vibrationDecay = 0.94;
    this.creationTime = performance.now();
    this.growth = 0; // 0 to 1 for intro needle animation
  }

  update(gravity, friction, iterations = 3) {
    // Dynamic endpoint tracking when dragging pins
    if (this.nodes.length >= 2) {
      if (this.p1) {
        this.nodes[0].x = this.p1.x;
        this.nodes[0].y = this.p1.y;
      }
      if (this.p2) {
        this.nodes[this.nodes.length - 1].x = this.p2.x;
        this.nodes[this.nodes.length - 1].y = this.p2.y;
      }
    }

    // Needle growth animation on creation
    if (this.growth < 1) {
      this.growth = Math.min(1, this.growth + 0.12);
    }

    // Unraveling decay
    if (this.isUnraveling) {
      this.unravelProgress += 0.08;
      for (let i = 0; i < this.nodes.length; i++) {
        const target = this.nodes[0];
        this.nodes[i].x += (target.x - this.nodes[i].x) * 0.15;
        this.nodes[i].y += (target.y - this.nodes[i].y) * 0.15;
      }
      return;
    }

    // Update node positions
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].update(gravity, friction);
    }

    // Relax distance constraints
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < this.nodes.length - 1; i++) {
        if (this.isCut && i === Math.floor(this.nodes.length / 2) - 1) {
          continue;
        }

        const n1 = this.nodes[i];
        const n2 = this.nodes[i + 1];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (dist - this.segLength) / dist * 0.5;

        if (!n1.isPinned) {
          n1.x += dx * diff;
          n1.y += dy * diff;
        }
        if (!n2.isPinned) {
          n2.x -= dx * diff;
          n2.y -= dy * diff;
        }
      }
    }

    // Decay vibration
    if (this.vibration > 0.01) {
      this.vibration *= this.vibrationDecay;
    } else {
      this.vibration = 0;
    }
  }

  // Snip / cut string in two
  cut() {
    if (this.isCut) return;
    this.isCut = true;
    const mid = Math.floor(this.nodes.length / 2);
    if (this.nodes[mid]) this.nodes[mid].isPinned = false;
    if (this.nodes[mid - 1]) this.nodes[mid - 1].isPinned = false;
    this.pluck(18);
  }

  // Pluck / twang string
  pluck(intensity = 12) {
    this.vibration = intensity;
    const mid = Math.floor(this.nodes.length / 2);
    if (!this.nodes[mid].isPinned) {
      this.nodes[mid].y += (Math.random() - 0.5) * intensity;
      this.nodes[mid].x += (Math.random() - 0.5) * intensity * 0.5;
    }
  }

  // Check cursor intersection for interactive plucking
  checkPluck(x1, y1, x2, y2) {
    if (this.isUnraveling) return false;
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const n1 = this.nodes[i];
      const n2 = this.nodes[i + 1];
      if (linesIntersect(x1, y1, x2, y2, n1.x, n1.y, n2.x, n2.y)) {
        const speed = Math.hypot(x2 - x1, y2 - y1);
        this.pluck(Math.min(speed * 0.8, 24));
        return true;
      }
    }
    return false;
  }

  draw(ctx, time, theme) {
    if (this.nodes.length < 2 || this.unravelProgress >= 1) return;

    const visibleCount = Math.max(2, Math.floor(this.nodes.length * this.growth));
    const vibOffset = this.vibration * Math.sin(time * 0.05 * this.vibrationFreq);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Layer 1: Ambient Drop Shadow for tactile 3D depth
    if (theme.hasDropShadow !== false) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = this.thickness + 1.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 3.5;

      ctx.beginPath();
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
      for (let i = 1; i < visibleCount - 1; i++) {
        const curr = this.nodes[i];
        const next = this.nodes[i + 1];
        const mx = (curr.x + next.x) * 0.5;
        const my = (curr.y + next.y) * 0.5 + (i === Math.floor(this.nodes.length / 2) ? vibOffset : 0);
        ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
      }
      ctx.lineTo(this.nodes[visibleCount - 1].x, this.nodes[visibleCount - 1].y);
      ctx.stroke();
      ctx.restore();
    }

    // Layer 2: Main Vibrant Silk Thread
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.thickness;

    if (theme.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
    }

    if (!this.isCut) {
      ctx.beginPath();
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);

      for (let i = 1; i < visibleCount - 1; i++) {
        const curr = this.nodes[i];
        const next = this.nodes[i + 1];
        const mx = (curr.x + next.x) * 0.5;
        const my = (curr.y + next.y) * 0.5 + (i === Math.floor(this.nodes.length / 2) ? vibOffset : 0);
        ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
      }
      ctx.lineTo(this.nodes[visibleCount - 1].x, this.nodes[visibleCount - 1].y);
      ctx.stroke();

      // Layer 3: Tactile Core Specular Sheen (gives cylindrical string realism)
      if (this.thickness >= 2.0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = Math.max(0.75, this.thickness * 0.3);
        ctx.stroke();
      }
    } else {
      // Draw severed dangling pieces
      const mid = Math.floor(this.nodes.length / 2);

      ctx.beginPath();
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
      for (let i = 1; i < mid; i++) {
        ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.nodes[mid].x, this.nodes[mid].y);
      for (let i = mid + 1; i < this.nodes.length; i++) {
        ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

// 2D Line Intersection Helper
function linesIntersect(a, b, c, d, p, q, r, s) {
  const det = (c - a) * (s - q) - (r - p) * (d - b);
  if (det === 0) return false;
  const lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
  const gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
  return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
}

window.VerletNode = VerletNode;
window.LoomThread = LoomThread;
