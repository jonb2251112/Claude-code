import { EMOJI_COLORS } from '../game/types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  emoji?: string;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrame: number | null = null;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width * devicePixelRatio;
      this.canvas.height = rect.height * devicePixelRatio;
      this.ctx.scale(devicePixelRatio, devicePixelRatio);
    }
  }

  burst(x: number, y: number, color: string, count = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 5,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
    this.start();
  }

  emojiBurst(x: number, y: number, emoji: string, count = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.5,
        size: 20 + Math.random() * 10,
        color: '#fff',
        emoji,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }
    this.start();
  }

  scorePopup(x: number, y: number, text: string): void {
    this.particles.push({
      x, y,
      vx: 0,
      vy: -2,
      life: 1,
      maxLife: 1.2,
      size: 24,
      color: '#fdcb6e',
      emoji: text,
      rotation: 0,
      rotationSpeed: 0,
    });
    this.start();
  }

  blitzTrail(): void {
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -3 - Math.random() * 4,
        life: 1,
        maxLife: 1 + Math.random(),
        size: 4 + Math.random() * 6,
        color: ['#fdcb6e', '#e17055', '#74b9ff', '#a29bfe'][Math.floor(Math.random() * 4)],
        rotation: 0,
        rotationSpeed: 0,
      });
    }
    this.start();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  private tick = (): void => {
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    this.ctx.clearRect(0, 0, w, h);

    this.particles = this.particles.filter(p => {
      p.life -= 0.016 / p.maxLife;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rotation += p.rotationSpeed;

      if (p.life <= 0) return false;

      const alpha = p.life;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.emoji && p.emoji.length <= 3) {
        this.ctx.font = `${p.size}px Fredoka, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.emoji, 0, 0);
      } else if (p.emoji) {
        this.ctx.font = `bold ${p.size}px Fredoka, sans-serif`;
        this.ctx.fillStyle = p.color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.emoji, 0, 0);
      } else {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
      return true;
    });

    if (this.particles.length > 0) {
      this.animFrame = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.animFrame = null;
    }
  };

  clear(): void {
    this.particles = [];
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.running = false;
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    this.ctx.clearRect(0, 0, w, h);
  }
}

export function getEmojiColor(type: string): string {
  return EMOJI_COLORS[type as keyof typeof EMOJI_COLORS] ?? '#fff';
}
