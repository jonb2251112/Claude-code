import { TILE } from "./level.js";

export function createRings(level) {
  const rings = [];
  const addArc = (cx, cy, n, r = 40) => {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * i) / (n - 1 || 1);
      rings.push({
        x: cx + Math.cos(a) * r,
        y: cy - Math.sin(a) * r * 0.55,
        got: false,
        anim: Math.random() * Math.PI * 2,
      });
    }
  };
  const line = (x0, y, n, gap = 28) => {
    for (let i = 0; i < n; i++) {
      rings.push({ x: x0 + i * gap, y, got: false, anim: i * 0.4 });
    }
  };

  line(5 * TILE, 12.5 * TILE, 5);
  line(32 * TILE, 10.5 * TILE, 6);
  addArc(50 * TILE, 8 * TILE, 5, 48);
  line(57 * TILE, 6.5 * TILE, 4);
  line(63 * TILE, 4.5 * TILE, 4);
  line(74 * TILE, 12.5 * TILE, 8);
  line(93 * TILE, 8.5 * TILE, 7);
  line(112 * TILE, 12.5 * TILE, 6);
  line(119 * TILE, 9.5 * TILE, 3);
  line(125 * TILE, 7.5 * TILE, 3);
  line(131 * TILE, 5.5 * TILE, 4);
  line(138 * TILE, 6.5 * TILE, 6);
  line(158 * TILE, 12.5 * TILE, 10);
  line(175 * TILE, 12.5 * TILE, 8);
  line(195 * TILE, 12.5 * TILE, 6);

  return rings;
}

export function createEnemies() {
  return [
    { x: 22 * TILE, y: 14 * TILE, vx: -0.8, minX: 16 * TILE, maxX: 27 * TILE, alive: true, anim: 0 },
    { x: 45 * TILE, y: 14 * TILE, vx: 0.9, minX: 43 * TILE, maxX: 54 * TILE, alive: true, anim: 0 },
    { x: 68 * TILE, y: 12 * TILE, vx: -0.85, minX: 61 * TILE, maxX: 71 * TILE, alive: true, anim: 0 },
    { x: 82 * TILE, y: 14 * TILE, vx: 0.75, minX: 74 * TILE, maxX: 87 * TILE, alive: true, anim: 0 },
    { x: 100 * TILE, y: 10 * TILE, vx: -0.9, minX: 93 * TILE, maxX: 104 * TILE, alive: true, anim: 0 },
    { x: 125 * TILE, y: 14 * TILE, vx: 0.85, minX: 112 * TILE, maxX: 129 * TILE, alive: true, anim: 0 },
    { x: 145 * TILE, y: 8 * TILE, vx: -0.8, minX: 137 * TILE, maxX: 147 * TILE, alive: true, anim: 0 },
    { x: 170 * TILE, y: 14 * TILE, vx: 1.0, minX: 156 * TILE, maxX: 190 * TILE, alive: true, anim: 0 },
    { x: 200 * TILE, y: 14 * TILE, vx: -0.9, minX: 192 * TILE, maxX: 208 * TILE, alive: true, anim: 0 },
  ];
}

export function createCheckpoint() {
  return { x: 110 * TILE, y: 14 * TILE, active: false };
}

export function createGoal(level) {
  return { x: level.goalX, y: 14 * TILE, spun: false, angle: 0 };
}

export function updateEnemies(enemies, dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    e.anim += dt * 10;
    e.x += e.vx * dt * 60;
    if (e.x < e.minX) {
      e.x = e.minX;
      e.vx = Math.abs(e.vx);
    }
    if (e.x > e.maxX) {
      e.x = e.maxX;
      e.vx = -Math.abs(e.vx);
    }
  }
}

export function updateRings(rings, dt) {
  for (const r of rings) {
    if (!r.got) r.anim += dt * 8;
  }
}
