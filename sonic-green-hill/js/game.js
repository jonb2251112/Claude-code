import { Input } from "./input.js";
import { AudioBus } from "./audio.js";
import { buildLevel, TILE } from "./level.js";
import { Sonic } from "./sonic.js";
import { Renderer } from "./renderer.js";
import {
  createRings,
  createEnemies,
  createCheckpoint,
  createGoal,
  updateEnemies,
  updateRings,
} from "./entities.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.audio = new AudioBus();
    this.renderer = new Renderer(canvas);
    this.state = "title"; // title, playing, paused, clear, gameover
    this.level = null;
    this.sonic = null;
    this.rings = [];
    this.enemies = [];
    this.checkpoint = null;
    this.goal = null;
    this.scattered = [];
    this.camX = 0;
    this.camY = 0;
    this.timeMs = 0;
    this.spawn = { x: 0, y: 0 };
    this._last = 0;
    this._raf = 0;
    this._jumpLatched = false;
    this._spinLatched = false;
  }

  start() {
    this._resetAct();
    this.state = "playing";
    this.audio.ensure();
    this._last = performance.now();
    cancelAnimationFrame(this._raf);
    this._loop(this._last);
  }

  _resetAct(keepStats = false) {
    this.level = buildLevel();
    const rings = keepStats && this.sonic ? this.sonic.rings : 0;
    const score = keepStats && this.sonic ? this.sonic.score : 0;
    const lives = keepStats && this.sonic ? this.sonic.lives : 3;
    this.spawn = { ...this.level.spawn };
    if (this.checkpoint?.active) {
      this.spawn = { x: this.checkpoint.x, y: this.checkpoint.y - TILE * 2 };
    } else {
      this.checkpoint = createCheckpoint();
    }
    this.sonic = new Sonic(this.spawn.x, this.spawn.y);
    this.sonic.rings = keepStats ? rings : 0;
    this.sonic.score = keepStats ? score : 0;
    this.sonic.lives = lives;
    this.rings = createRings(this.level);
    this.enemies = createEnemies();
    this.goal = createGoal(this.level);
    this.scattered = [];
    this.timeMs = keepStats ? this.timeMs : 0;
    this.camX = Math.max(0, this.sonic.x - this.canvas.width * 0.35);
    this.camY = 0;
  }

  fullRestart() {
    this.checkpoint = createCheckpoint();
    this._resetAct(false);
    this.state = "playing";
    this.audio.ensure();
  }

  togglePause() {
    if (this.state === "playing") this.state = "paused";
    else if (this.state === "paused") this.state = "playing";
  }

  _loop = (now) => {
    const dt = Math.min(0.033, (now - this._last) / 1000);
    this._last = now;
    this.update(dt);
    this.draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  update(dt) {
    if (this.input.consume("pause") && (this.state === "playing" || this.state === "paused")) {
      this.togglePause();
      this._syncUI();
    }

    if (this.state !== "playing") return;

    this.timeMs += dt * 1000;

    // Jump SFX latch
    const jumpPressed = this.input.down("jump") || this.input.down("up");
    if (jumpPressed && !this._jumpLatched && this.sonic.grounded && !this.sonic.charging) {
      this.audio.jump();
    }
    this._jumpLatched = jumpPressed;

    const spinPressed = this.input.down("spin");
    if (spinPressed && !this._spinLatched && this.sonic.grounded && this.input.down("down")) {
      this.audio.spindash();
    }
    this._spinLatched = spinPressed;

    const wasSpring = this.sonic.springing;
    this.sonic.update(this.input, this.level, dt);
    if (this.sonic.springing && !wasSpring && this.sonic.vy < -8) {
      this.audio.spring();
    }

    updateEnemies(this.enemies, dt);
    updateRings(this.rings, dt);
    this._updateScattered(dt);
    this._collectRings();
    this._enemyCollisions();
    this._checkpoint();
    this._goal();
    this._camera(dt);
    this._deathCheck();
  }

  _updateScattered(dt) {
    for (const r of this.scattered) {
      r.vy += 0.25 * dt * 60;
      r.x += r.vx * dt * 60;
      r.y += r.vy * dt * 60;
      r.life -= dt;
      r.anim += dt * 10;
      // bounce on ground-ish
      if (r.y > 14 * TILE - 8 && r.vy > 0) {
        r.y = 14 * TILE - 8;
        r.vy *= -0.55;
        r.vx *= 0.85;
      }
    }
    this.scattered = this.scattered.filter((r) => r.life > 0);

    // recollect scattered
    const b = this.sonic.bounds();
    for (const r of this.scattered) {
      if (Math.hypot(r.x - this.sonic.x, r.y - (this.sonic.y - 14)) < 18) {
        r.life = 0;
        this.sonic.rings++;
        this.sonic.score += 10;
        this.audio.ring();
      }
    }
    this.scattered = this.scattered.filter((r) => r.life > 0);
  }

  _collectRings() {
    const sx = this.sonic.x;
    const sy = this.sonic.y - 14;
    for (const r of this.rings) {
      if (r.got) continue;
      if (Math.hypot(r.x - sx, r.y - sy) < 20) {
        r.got = true;
        this.sonic.rings++;
        this.sonic.score += 100;
        this.audio.ring();
      }
    }
  }

  _enemyCollisions() {
    if (this.sonic.dead) return;
    const b = this.sonic.bounds();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ex = e.x;
      const ey = e.y;
      const hit =
        b.r > ex - 14 && b.l < ex + 14 && b.b > ey - 22 && b.t < ey;

      if (!hit) continue;

      const stomping =
        this.sonic.vy > 0 &&
        b.b - this.sonic.vy * 0.5 <= ey - 10 &&
        (this.sonic.state === "jump" || this.sonic.state === "roll" || this.sonic.rolling);

      if (stomping || this.sonic.rolling || this.sonic.state === "roll") {
        e.alive = false;
        this.sonic.bounceEnemy();
        this.sonic.score += 100;
        this.audio.stomp();
      } else {
        const result = this.sonic.hurt(this.audio);
        if (result?.scatter) {
          this._scatterRings(Math.min(result.scatter, 20));
        }
      }
    }
  }

  _scatterRings(n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.scattered.push({
        x: this.sonic.x,
        y: this.sonic.y - 16,
        vx: Math.cos(a) * (2 + Math.random() * 2.5),
        vy: Math.sin(a) * (2 + Math.random() * 2) - 3,
        life: 3.5,
        anim: Math.random() * 5,
      });
    }
  }

  _checkpoint() {
    const cp = this.checkpoint;
    if (cp.active) return;
    const b = this.sonic.bounds();
    if (b.r > cp.x - 8 && b.l < cp.x + 8 && b.b > cp.y - 80 && b.t < cp.y) {
      cp.active = true;
      this.spawn = { x: cp.x, y: cp.y - TILE * 2 };
      this.audio.checkpoint();
      this.sonic.score += 500;
    }
  }

  _goal() {
    const g = this.goal;
    const b = this.sonic.bounds();
    if (!g.spun && b.r > g.x - 10 && b.l < g.x + 10 && b.b > g.y - 80) {
      g.spun = true;
      this.audio.clear();
      // bonus
      const ringBonus = this.sonic.rings * 100;
      const timeBonus = Math.max(0, 100000 - Math.floor(this.timeMs / 10));
      this.sonic.score += ringBonus + Math.floor(timeBonus / 50);
      this.state = "clear";
      this._syncUI();
    }
    if (g.spun) g.angle += 0.35;
  }

  _camera(dt) {
    const targetX = this.sonic.x - this.canvas.width * 0.38;
    const maxX = this.level.W * TILE - this.canvas.width;
    this.camX += (Math.max(0, Math.min(maxX, targetX)) - this.camX) * Math.min(1, 8 * dt);

    const targetY = this.sonic.y - this.canvas.height * 0.62;
    const maxY = this.level.H * TILE - this.canvas.height;
    this.camY += (Math.max(0, Math.min(maxY, targetY)) - this.camY) * Math.min(1, 6 * dt);
  }

  _deathCheck() {
    if (this.sonic.dead) {
      if (this.sonic.y > this.camY + this.canvas.height + 80) {
        if (this.sonic.lives <= 0) {
          this.state = "gameover";
          this._syncUI();
        } else {
          this._resetAct(true);
        }
      }
      return;
    }
    if (this.sonic.y > this.level.H * TILE + 40) {
      this.sonic.die(this.audio);
    }
  }

  draw() {
    const r = this.renderer;
    const t = performance.now() / 1000;
    r.clear();
    r.drawBackground(this.camX, t);

    if (!this.level) return;

    r.drawDecorations(this.level, this.camX, this.camY, t);
    r.drawTilesWithGrass(this.level, this.camX, this.camY);

    for (const ring of this.rings) {
      if (!ring.got) r.drawRing(ring.x - this.camX, ring.y - this.camY, ring.anim);
    }
    r.drawScatteredRings(this.scattered, this.camX, this.camY);

    r.drawCheckpoint(this.checkpoint, this.camX, this.camY, t);
    r.drawGoal(this.goal, this.camX, this.camY);

    for (const e of this.enemies) r.drawEnemy(e, this.camX, this.camY);

    if (this.sonic) r.drawSonic(this.sonic, this.camX, this.camY);

    if (this.state === "playing" || this.state === "paused" || this.state === "clear") {
      r.drawHUD(this.sonic, this.timeMs);
    }
  }

  _syncUI() {
    const title = document.getElementById("title-card");
    const pause = document.getElementById("pause-overlay");
    const result = document.getElementById("result-overlay");
    const controls = document.getElementById("controls");
    const btnPause = document.getElementById("btn-pause");

    title?.classList.toggle("hidden", this.state !== "title");
    pause?.classList.toggle("hidden", this.state !== "paused");
    result?.classList.toggle("hidden", this.state !== "clear" && this.state !== "gameover");
    controls?.classList.toggle("visible", this.state === "playing");
    btnPause?.classList.toggle("visible", this.state === "playing" || this.state === "paused");

    if (this.state === "clear" || this.state === "gameover") {
      const sec = Math.floor(this.timeMs / 1000);
      document.getElementById("result-title").textContent =
        this.state === "gameover" ? "GAME OVER" : "ACT CLEAR!";
      document.getElementById("result-time").textContent =
        `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      document.getElementById("result-rings").textContent = String(this.sonic?.rings ?? 0);
      document.getElementById("result-score").textContent = String(this.sonic?.score ?? 0);
    }
  }

  showTitle() {
    this.state = "title";
    this.level = buildLevel();
    this.checkpoint = createCheckpoint();
    this.sonic = new Sonic(this.level.spawn.x, this.level.spawn.y);
    this.rings = createRings(this.level);
    this.enemies = createEnemies();
    this.goal = createGoal(this.level);
    this.scattered = [];
    this.camX = 0;
    this.camY = 40;
    this.timeMs = 0;
    this._syncUI();
    this._last = performance.now();
    cancelAnimationFrame(this._raf);
    const idle = (now) => {
      const dt = Math.min(0.033, (now - this._last) / 1000);
      this._last = now;
      if (this.state === "title") {
        this.camX = (Math.sin(now / 3000) * 0.5 + 0.5) * 200;
        updateRings(this.rings, dt);
        updateEnemies(this.enemies, dt);
        this.draw();
        this._raf = requestAnimationFrame(idle);
      }
    };
    this._raf = requestAnimationFrame(idle);
  }
}
