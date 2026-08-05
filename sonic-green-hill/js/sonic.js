import { TILE, T, tileAt, groundYInTile, isSolidTile, isOneWay } from "./level.js";

/** Classic-inspired Sonic physics */
const ACCEL = 0.046875;
const DECEL = 0.5;
const FRICTION = 0.046875;
const TOP = 6;
const JUMP = 6.5;
const GRAVITY = 0.21875;
const AIR_ACCEL = 0.09375;
const ROLL_FRICTION = 0.0234375;
const ROLL_DECEL = 0.125;
const SPINDASH_MAX = 8;
const HURT_KNOCK = 2.5;

export class Sonic {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 28;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.facing = 1;
    this.rolling = false;
    this.spindash = 0;
    this.charging = false;
    this.jumpHeld = false;
    this.anim = 0;
    this.state = "idle"; // idle, walk, run, jump, roll, spindash, hurt, dead
    this.invuln = 0;
    this.rings = 0;
    this.lives = 3;
    this.score = 0;
    this.dead = false;
    this.springing = false;
  }

  bounds() {
    const h = this.rolling || this.state === "roll" || this.state === "jump" ? 20 : this.h;
    const w = this.rolling ? 20 : this.w;
    return {
      l: this.x - w / 2,
      r: this.x + w / 2,
      t: this.y - h,
      b: this.y,
      w,
      h,
    };
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.rolling = false;
    this.spindash = 0;
    this.charging = false;
    this.state = "idle";
    this.invuln = 120;
    this.dead = false;
    this.springing = false;
  }

  hurt(audio) {
    if (this.invuln > 0 || this.dead) return false;
    if (this.rings > 0) {
      const lost = this.rings;
      this.rings = 0;
      this.vx = -this.facing * HURT_KNOCK;
      this.vy = -4;
      this.grounded = false;
      this.rolling = false;
      this.state = "hurt";
      this.invuln = 120;
      audio?.hurt();
      return { scatter: lost };
    }
    this.die(audio);
    return { scatter: 0 };
  }

  die(audio) {
    this.dead = true;
    this.state = "dead";
    this.vy = -7;
    this.vx = 0;
    this.lives = Math.max(0, this.lives - 1);
    audio?.hurt();
  }

  update(input, level, dt) {
    if (this.dead) {
      this.vy += GRAVITY * 1.2 * dt * 60;
      this.y += this.vy * dt * 60;
      this.anim += dt * 12;
      return;
    }

    if (this.invuln > 0) this.invuln--;

    const left = input.down("left");
    const right = input.down("right");
    const down = input.down("down");
    const jump = input.down("jump") || input.down("up");
    const spin = input.down("spin");

    // Spindash charge
    if (this.grounded && down && spin && Math.abs(this.vx) < 0.5) {
      this.charging = true;
      this.spindash = Math.min(SPINDASH_MAX, this.spindash + 0.35 * dt * 60);
      this.state = "spindash";
      this.vx = 0;
    } else if (this.charging && !down) {
      this.vx = this.facing * (8 + this.spindash);
      this.rolling = true;
      this.charging = false;
      this.spindash = 0;
      this.state = "roll";
    } else if (!down) {
      this.charging = false;
      this.spindash = Math.max(0, this.spindash - 0.2);
    }

    if (!this.charging) {
      if (this.grounded) {
        if (this.rolling) {
          if (left) {
            if (this.vx > 0) this.vx -= ROLL_DECEL * dt * 60;
            this.facing = -1;
          }
          if (right) {
            if (this.vx < 0) this.vx += ROLL_DECEL * dt * 60;
            this.facing = 1;
          }
          if (this.vx > 0) this.vx = Math.max(0, this.vx - ROLL_FRICTION * dt * 60);
          if (this.vx < 0) this.vx = Math.min(0, this.vx + ROLL_FRICTION * dt * 60);
          if (Math.abs(this.vx) < 0.5 && !down) this.rolling = false;
          if (!down && Math.abs(this.vx) < 1.5) this.rolling = false;
        } else {
          if (left) {
            if (this.vx > 0) this.vx -= DECEL * dt * 60;
            else this.vx -= ACCEL * dt * 60;
            this.facing = -1;
          } else if (right) {
            if (this.vx < 0) this.vx += DECEL * dt * 60;
            else this.vx += ACCEL * dt * 60;
            this.facing = 1;
          } else {
            if (this.vx > 0) this.vx = Math.max(0, this.vx - FRICTION * dt * 60);
            if (this.vx < 0) this.vx = Math.min(0, this.vx + FRICTION * dt * 60);
          }
          this.vx = Math.max(-TOP, Math.min(TOP, this.vx));

          // Duck into roll at speed
          if (down && Math.abs(this.vx) > 1.2) {
            this.rolling = true;
            this.state = "roll";
          }
        }

        // Jump
        if (jump && !this.jumpHeld) {
          this.vy = -JUMP;
          this.grounded = false;
          this.rolling = true;
          this.state = "jump";
          this.jumpHeld = true;
          this.springing = false;
        }
      } else {
        // Air control
        if (left) {
          this.vx -= AIR_ACCEL * dt * 60;
          this.facing = -1;
        }
        if (right) {
          this.vx += AIR_ACCEL * dt * 60;
          this.facing = 1;
        }
        this.vx = Math.max(-TOP * 1.15, Math.min(TOP * 1.15, this.vx));

        // Variable jump
        if (!jump && this.vy < -2 && !this.springing) {
          this.vy = -2;
        }

        this.vy += GRAVITY * dt * 60;
        this.vy = Math.min(16, this.vy);
      }
    }

    if (!jump) this.jumpHeld = false;

    // Integrate + collide
    this._moveX(level, this.vx * dt * 60);
    this._moveY(level, this.vy * dt * 60);

    // Animation state
    this.anim += dt * (Math.abs(this.vx) * 1.5 + 8);
    if (this.charging) this.state = "spindash";
    else if (!this.grounded) this.state = "jump";
    else if (this.rolling) this.state = "roll";
    else if (Math.abs(this.vx) > 4.5) this.state = "run";
    else if (Math.abs(this.vx) > 0.3) this.state = "walk";
    else this.state = "idle";
  }

  _moveX(level, dx) {
    this.x += dx;
    const b = this.bounds();
    const top = Math.floor(b.t / TILE);
    const bot = Math.floor((b.b - 1) / TILE);
    if (dx > 0) {
      const tx = Math.floor(b.r / TILE);
      for (let ty = top; ty <= bot; ty++) {
        const t = tileAt(level, tx, ty);
        if (isSolidTile(t) && t !== T.SLOPE_L && t !== T.SLOPE_R) {
          this.x = tx * TILE - (b.r - this.x);
          this.vx = 0;
          this.rolling = false;
          break;
        }
      }
    } else if (dx < 0) {
      const tx = Math.floor(b.l / TILE);
      for (let ty = top; ty <= bot; ty++) {
        const t = tileAt(level, tx, ty);
        if (isSolidTile(t) && t !== T.SLOPE_L && t !== T.SLOPE_R) {
          this.x = (tx + 1) * TILE + (this.x - b.l);
          this.vx = 0;
          this.rolling = false;
          break;
        }
      }
    }
  }

  _moveY(level, dy) {
    this.y += dy;
    const b = this.bounds();
    const left = Math.floor(b.l / TILE);
    const right = Math.floor((b.r - 1) / TILE);

    if (dy >= 0) {
      let landed = false;
      let bestY = Infinity;
      let spring = false;

      for (let tx = left; tx <= right; tx++) {
        const ty = Math.floor(b.b / TILE);
        const t = tileAt(level, tx, ty);
        if (isSolidTile(t) || (isOneWay(t) && this.vy >= 0 && b.b - dy <= ty * TILE + 2)) {
          const localX = this.x - tx * TILE;
          let gy = ty * TILE + groundYInTile(t, localX);
          if (t === T.SOLID || t === T.SPRING || t === T.PLATFORM) gy = ty * TILE;
          if (t === T.SLOPE_L || t === T.SLOPE_R) {
            gy = ty * TILE + groundYInTile(t, localX);
          }
          if (b.b >= gy && b.b - dy <= gy + 10 && gy < bestY) {
            bestY = gy;
            landed = true;
            spring = t === T.SPRING;
          }
        }
        // also check tile above for slopes that stick up
        const t2 = tileAt(level, tx, ty - 1);
        if (t2 === T.SLOPE_L || t2 === T.SLOPE_R) {
          const localX = this.x - tx * TILE;
          const gy = (ty - 1) * TILE + groundYInTile(t2, localX);
          if (b.b >= gy && b.b - dy <= gy + 12 && gy < bestY) {
            bestY = gy;
            landed = true;
          }
        }
      }

      if (landed) {
        this.y = bestY;
        this.vy = 0;
        this.grounded = true;
        if (spring) {
          this.vy = -10;
          this.grounded = false;
          this.rolling = true;
          this.springing = true;
          this.state = "jump";
        }
      } else {
        this.grounded = false;
      }
    } else {
      this.grounded = false;
      const ty = Math.floor(b.t / TILE);
      for (let tx = left; tx <= right; tx++) {
        const t = tileAt(level, tx, ty);
        if (isSolidTile(t) && t !== T.SLOPE_L && t !== T.SLOPE_R && t !== T.SPRING) {
          this.y = (ty + 1) * TILE + (this.y - b.t);
          this.vy = 0;
          break;
        }
      }
    }
  }

  bounceEnemy() {
    this.vy = -JUMP * 0.85;
    this.grounded = false;
    this.rolling = true;
    this.state = "jump";
  }
}
