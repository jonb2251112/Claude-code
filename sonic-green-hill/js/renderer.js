import { TILE, T, tileAt } from "./level.js";

const COLORS = {
  skyTop: "#5eb0ff",
  skyBot: "#2a8cff",
  water: "#2080e0",
  waterHi: "#a8e8ff",
  treeDark: "#186018",
  treeMid: "#28a028",
  grass: "#38d020",
  grassDark: "#28a018",
  dirtA: "#c06028",
  dirtB: "#e09040",
  dirtDeep: "#904018",
  cliff: "#a05028",
  cloud: "#ffffff",
  palmTrunk: "#a06830",
  palmLeaf: "#30c028",
  flowerPetal: "#c040d0",
  flowerCenter: "#ffe040",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = canvas.width;
    this.h = canvas.height;
    this.time = 0;
  }

  clear() {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(1, COLORS.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawBackground(camX, time) {
    const { ctx, w, h } = this;
    this.time = time;

    // Distant clouds (parallax)
    const cloudOff = (camX * 0.15) % 400;
    ctx.fillStyle = COLORS.cloud;
    for (let i = -1; i < 5; i++) {
      const cx = i * 280 - cloudOff + 40;
      this._cloud(cx, 28 + (i % 3) * 10, 1);
      this._cloud(cx + 140, 55, 0.7);
    }

    // Water band
    const waterY = h * 0.52;
    const waterPar = camX * 0.25;
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, waterY, w, h * 0.22);

    // Water sparkles
    ctx.fillStyle = COLORS.waterHi;
    for (let i = 0; i < 24; i++) {
      const sx = ((i * 73 - waterPar * 0.5 + time * 20) % (w + 40)) - 20;
      const sy = waterY + 8 + (i % 5) * 12;
      const pulse = 0.5 + 0.5 * Math.sin(time * 6 + i);
      if (pulse > 0.55) {
        ctx.fillRect(sx, sy, 6, 2);
        ctx.fillRect(sx + 2, sy - 2, 2, 6);
      }
    }

    // Tree line
    const treePar = camX * 0.35;
    for (let i = -1; i < 12; i++) {
      const tx = i * 90 - (treePar % 90);
      this._bush(tx, waterY - 8, COLORS.treeDark);
      this._bush(tx + 40, waterY - 18, COLORS.treeMid);
    }

    // Cliff / waterfall mid-layer
    const cliffPar = camX * 0.4;
    this._cliff(120 - cliffPar * 0.3, waterY - 110, time);
  }

  _cloud(x, y, s) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(x, y, 28 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 18 * s, y - 4 * s, 20 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 16 * s, y + 2 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _bush(x, y, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28, y + 4, 30, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 24, y + 6, 26, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _cliff(x, y, time) {
    const { ctx } = this;
    ctx.fillStyle = COLORS.cliff;
    ctx.fillRect(x, y, 70, 140);
    // waterfall
    const flow = (time * 80) % 16;
    ctx.fillStyle = "#60c8ff";
    ctx.fillRect(x + 22, y, 26, 140);
    ctx.fillStyle = "#e8ffff";
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(x + 26, y + ((i * 16 + flow) % 140), 6, 8);
      ctx.fillRect(x + 36, y + ((i * 16 + flow + 8) % 140), 6, 8);
    }
  }

  drawDecorations(level, camX, camY, time) {
    for (const d of level.decorations) {
      const sx = d.x - camX;
      const sy = d.y - camY;
      if (sx < -80 || sx > this.w + 80) continue;
      if (d.type === "palm") this._palm(sx, sy);
      else if (d.type === "flower") this._flower(sx, sy, time);
      else if (d.type === "waterfall") this._cliff(sx - 20, sy - 40, time);
    }
  }

  _palm(x, groundY) {
    const { ctx } = this;
    // segmented trunk
    ctx.fillStyle = COLORS.palmTrunk;
    for (let i = 0; i < 7; i++) {
      const tw = 10 - i * 0.3;
      ctx.fillRect(x - tw / 2, groundY - 14 - i * 16, tw, 16);
      ctx.fillStyle = "#804820";
      ctx.fillRect(x - tw / 2, groundY - 14 - i * 16 + 12, tw, 3);
      ctx.fillStyle = COLORS.palmTrunk;
    }
    const top = groundY - 14 - 7 * 16;
    ctx.fillStyle = COLORS.palmLeaf;
    for (let a = -2; a <= 2; a++) {
      ctx.beginPath();
      ctx.ellipse(x + a * 18, top + Math.abs(a) * 4, 22, 8, a * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _flower(x, groundY, time) {
    const { ctx } = this;
    const bob = Math.sin(time * 3 + x * 0.01) * 2;
    ctx.strokeStyle = "#28a018";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x + 4, groundY - 20, x, groundY - 36 + bob);
    ctx.stroke();
    // leaves
    ctx.fillStyle = "#38d020";
    ctx.beginPath();
    ctx.ellipse(x - 10, groundY - 18, 10, 5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + 12, groundY - 22, 10, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // petals
    ctx.fillStyle = COLORS.flowerPetal;
    const cy = groundY - 36 + bob;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + time;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 10, cy + Math.sin(a) * 10, 8, 6, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.flowerCenter;
    ctx.beginPath();
    ctx.arc(x, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTiles(level, camX, camY) {
    const { ctx, w, h } = this;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(level.W - 1, Math.ceil((camX + w) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const y1 = Math.min(level.H - 1, Math.ceil((camY + h) / TILE) + 1);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(level, tx, ty);
        if (t === T.EMPTY) continue;
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        this._drawTile(sx, sy, t, tx, ty);
      }
    }
  }

  _drawTile(sx, sy, t, tx, ty) {
    const { ctx } = this;
    if (t === T.PLATFORM) {
      ctx.fillStyle = COLORS.grass;
      ctx.fillRect(sx, sy, TILE, 8);
      ctx.fillStyle = COLORS.dirtA;
      ctx.fillRect(sx, sy + 8, TILE, 6);
      return;
    }

    if (t === T.SLOPE_L) {
      // / slope
      ctx.fillStyle = COLORS.grass;
      ctx.beginPath();
      ctx.moveTo(sx, sy + TILE);
      ctx.lineTo(sx + TILE, sy);
      ctx.lineTo(sx + TILE, sy + 8);
      ctx.lineTo(sx, sy + TILE + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = (tx + ty) % 2 ? COLORS.dirtA : COLORS.dirtB;
      ctx.beginPath();
      ctx.moveTo(sx, sy + TILE + 8);
      ctx.lineTo(sx + TILE, sy + 8);
      ctx.lineTo(sx + TILE, sy + TILE);
      ctx.lineTo(sx, sy + TILE);
      ctx.closePath();
      ctx.fill();
      // fill below dirt for continuity handled by solid tiles
      return;
    }

    if (t === T.SLOPE_R) {
      ctx.fillStyle = COLORS.grass;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + TILE, sy + TILE);
      ctx.lineTo(sx + TILE, sy + TILE + 8);
      ctx.lineTo(sx, sy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = (tx + ty) % 2 ? COLORS.dirtA : COLORS.dirtB;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 8);
      ctx.lineTo(sx + TILE, sy + TILE + 8);
      ctx.lineTo(sx + TILE, sy + TILE);
      ctx.lineTo(sx, sy + TILE);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (t === T.SPRING) {
      this._spring(sx, sy);
      return;
    }

    const checker = (tx + ty) % 2 === 0;
    ctx.fillStyle = checker ? COLORS.dirtA : COLORS.dirtB;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = COLORS.dirtDeep;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
  }

  drawTilesWithGrass(level, camX, camY) {
    const { ctx, w, h } = this;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(level.W - 1, Math.ceil((camX + w) / TILE) + 1);
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const y1 = Math.min(level.H - 1, Math.ceil((camY + h) / TILE) + 1);

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(level, tx, ty);
        if (t === T.EMPTY) continue;
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;

        if (t === T.PLATFORM) {
          ctx.fillStyle = COLORS.grass;
          ctx.fillRect(sx, sy, TILE, 8);
          // grass blades
          ctx.fillStyle = COLORS.grassDark;
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(sx + 4 + i * 5, sy - 3, 2, 5);
          }
          ctx.fillStyle = COLORS.dirtA;
          ctx.fillRect(sx, sy + 8, TILE, 6);
          continue;
        }

        if (t === T.SLOPE_L || t === T.SLOPE_R) {
          this._drawTile(sx, sy, t, tx, ty);
          continue;
        }

        if (t === T.SPRING) {
          // draw solid under spring first
          const checker = (tx + ty) % 2 === 0;
          ctx.fillStyle = checker ? COLORS.dirtA : COLORS.dirtB;
          ctx.fillRect(sx, sy, TILE, TILE);
          this._spring(sx + 4, sy);
          continue;
        }

        const checker = (tx + ty) % 2 === 0;
        ctx.fillStyle = checker ? COLORS.dirtA : COLORS.dirtB;
        ctx.fillRect(sx, sy, TILE, TILE);

        const above = tileAt(level, tx, ty - 1);
        if (above === T.EMPTY || above === T.PLATFORM) {
          // grass top
          ctx.fillStyle = COLORS.grass;
          ctx.fillRect(sx, sy, TILE, 8);
          ctx.fillStyle = COLORS.grassDark;
          for (let i = 0; i < 8; i++) {
            const bx = sx + i * 4 + 1;
            ctx.fillRect(bx, sy - 4, 2, 6);
            if (i % 2 === 0) ctx.fillRect(bx + 1, sy - 6, 1, 3);
          }
        }
      }
    }
  }

  _spring(sx, sy) {
    const { ctx } = this;
    ctx.fillStyle = "#e02020";
    ctx.fillRect(sx + 6, sy + 18, 20, 10);
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(sx + 8, sy + 8, 16, 12);
    ctx.fillStyle = "#e02020";
    ctx.fillRect(sx + 8, sy + 10, 16, 3);
    ctx.fillRect(sx + 8, sy + 16, 16, 3);
    ctx.fillStyle = "#ffe040";
    ctx.fillRect(sx + 4, sy + 4, 24, 6);
  }

  drawRing(x, y, anim) {
    const { ctx } = this;
    const spin = 0.55 + 0.45 * Math.abs(Math.cos(anim));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(spin, 1);
    ctx.strokeStyle = "#ffe040";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#fff8a0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawEnemy(e, camX, camY) {
    if (!e.alive) return;
    const { ctx } = this;
    const x = e.x - camX;
    const y = e.y - camY;
    const dir = e.vx >= 0 ? 1 : -1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // Motobug body
    ctx.fillStyle = "#e02030";
    ctx.beginPath();
    ctx.ellipse(0, -10, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202020";
    ctx.beginPath();
    ctx.arc(-8, -4, 7, 0, Math.PI * 2);
    ctx.arc(8, -4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe040";
    ctx.fillRect(6, -16, 8, 4);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(8, -12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#202020";
    ctx.beginPath();
    ctx.arc(9, -12, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCheckpoint(cp, camX, camY, time) {
    const { ctx } = this;
    const x = cp.x - camX;
    const y = cp.y - camY;
    ctx.fillStyle = "#ffe040";
    ctx.fillRect(x - 2, y - 64, 4, 64);
    ctx.fillStyle = cp.active ? "#40e080" : "#e02030";
    ctx.beginPath();
    ctx.arc(x, y - 72, 12, 0, Math.PI * 2);
    ctx.fill();
    if (cp.active) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      const a = time * 4;
      ctx.beginPath();
      ctx.arc(x, y - 72, 16 + Math.sin(a) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawGoal(goal, camX, camY) {
    const { ctx } = this;
    const x = goal.x - camX;
    const y = goal.y - camY;
    ctx.fillStyle = "#404040";
    ctx.fillRect(x - 3, y - 80, 6, 80);
    ctx.save();
    ctx.translate(x, y - 56);
    ctx.rotate(goal.angle);
    ctx.fillStyle = "#2080e0";
    ctx.fillRect(-22, -22, 44, 44);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GOAL", 0, 0);
    ctx.restore();
  }

  drawSonic(sonic, camX, camY) {
    if (sonic.invuln > 0 && Math.floor(sonic.invuln / 3) % 2 === 0 && !sonic.dead) return;
    const { ctx } = this;
    const x = sonic.x - camX;
    const y = sonic.y - camY;
    const rolling = sonic.state === "roll" || sonic.state === "jump" || sonic.state === "spindash" || sonic.dead;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sonic.facing, 1);

    if (rolling) {
      const rot = sonic.anim * (sonic.state === "spindash" ? 1.5 : 1);
      ctx.rotate(rot);
      // Spin ball
      ctx.fillStyle = "#1860d0";
      ctx.beginPath();
      ctx.arc(0, -10, 14, 0, Math.PI * 2);
      ctx.fill();
      // spikes
      ctx.fillStyle = "#1048a8";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 8, -10 + Math.sin(a) * 8);
        ctx.lineTo(Math.cos(a) * 18, -10 + Math.sin(a) * 18);
        ctx.lineTo(Math.cos(a + 0.3) * 8, -10 + Math.sin(a + 0.3) * 8);
        ctx.fill();
      }
      ctx.fillStyle = "#f0b090";
      ctx.beginPath();
      ctx.arc(2, -8, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const runLeg = Math.sin(sonic.anim) * (sonic.state === "run" ? 8 : sonic.state === "walk" ? 5 : 0);
      // shoes
      ctx.fillStyle = "#e02030";
      ctx.fillRect(-10, -6 + runLeg * 0.3, 10, 6);
      ctx.fillRect(2, -6 - runLeg * 0.3, 10, 6);
      ctx.fillStyle = "#fff";
      ctx.fillRect(-8, -4 + runLeg * 0.3, 6, 2);
      ctx.fillRect(4, -4 - runLeg * 0.3, 6, 2);
      // body
      ctx.fillStyle = "#1860d0";
      ctx.beginPath();
      ctx.ellipse(0, -18, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // belly
      ctx.fillStyle = "#f0b090";
      ctx.beginPath();
      ctx.ellipse(2, -14, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // head quills
      ctx.fillStyle = "#1860d0";
      ctx.beginPath();
      ctx.moveTo(-4, -28);
      ctx.lineTo(-18, -40);
      ctx.lineTo(-2, -32);
      ctx.lineTo(-8, -48);
      ctx.lineTo(4, -34);
      ctx.lineTo(2, -50);
      ctx.lineTo(10, -30);
      ctx.closePath();
      ctx.fill();
      // muzzle
      ctx.fillStyle = "#f0b090";
      ctx.beginPath();
      ctx.ellipse(8, -20, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(6, -24, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#202020";
      ctx.beginPath();
      ctx.arc(8, -23, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // gloves
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-10, -12, 4, 0, Math.PI * 2);
      ctx.arc(12, -14 - runLeg * 0.2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spindash dust
    if (sonic.state === "spindash") {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-20 - i * 6, -4 - Math.random() * 8, 4, 4);
      }
    }

    ctx.restore();
  }

  drawHUD(sonic, timeMs) {
    const { ctx } = this;
    const sec = Math.floor(timeMs / 1000);
    const mm = Math.floor(sec / 60);
    const ss = String(sec % 60).padStart(2, "0");

    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const label = (text, x, y, color = "#ffe040") => {
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    const value = (text, x, y) => {
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x, y);
    };

    label("SCORE", 16, 14);
    value(String(sonic.score).padStart(6, "0"), 16, 34);
    label("TIME", 16, 58);
    value(`${mm}:${ss}`, 16, 78);
    label("RINGS", 16, 102);
    value(String(sonic.rings).padStart(3, "0"), 16, 122);
    if (sonic.rings === 0 && Math.floor(timeMs / 200) % 2 === 0) {
      label("RINGS", 16, 102, "#ff3040");
    }

    // Lives
    ctx.fillStyle = "#1860d0";
    ctx.beginPath();
    ctx.arc(this.w - 70, 28, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0b090";
    ctx.beginPath();
    ctx.arc(this.w - 66, 28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText(`×${sonic.lives}`, this.w - 52, 22);
  }

  drawScatteredRings(scattered, camX, camY) {
    for (const r of scattered) {
      this.drawRing(r.x - camX, r.y - camY, r.anim);
    }
  }
}
