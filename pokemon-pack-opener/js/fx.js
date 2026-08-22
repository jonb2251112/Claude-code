/* =============================================================================
   fx.js — canvas particle system, screen shake, flashes, toasts
   -----------------------------------------------------------------------------
   One full-screen canvas above the UI, one rAF loop. Particles are plain objects
   with a `kind` so the draw switch stays cheap.
   ========================================================================== */
(function (global) {
  'use strict';

  var canvas, ctx, particles = [], running = false, dpr = 1;
  var reduceMotion = false;

  function init() {
    canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    global.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(global.innerWidth * dpr);
    canvas.height = Math.floor(global.innerHeight * dpr);
    canvas.style.width = global.innerWidth + 'px';
    canvas.style.height = global.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setReduceMotion(v) { reduceMotion = v; }

  function ensureLoop() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  var last = 0;
  function frame(t) {
    var dt = Math.min(48, t - last) / 16.6667;
    last = t;
    ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      step(p, dt);
      draw(p);
    }

    if (particles.length) requestAnimationFrame(frame);
    else { running = false; ctx.clearRect(0, 0, global.innerWidth, global.innerHeight); }
  }

  function step(p, dt) {
    if (p.kind === 'ring' || p.kind === 'ray' || p.kind === 'flash') return;
    p.vy += (p.gravity || 0) * dt;
    p.vx *= Math.pow(p.drag || 0.99, dt);
    p.vy *= Math.pow(p.drag || 0.99, dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.kind === 'confetti' || p.kind === 'shred') {
      p.flutter += 0.18 * dt;
      p.x += Math.sin(p.flutter) * (p.flutterAmp || 0.6) * dt;
      p.squash = Math.cos(p.flutter * 1.4);
    }
  }

  function draw(p) {
    var alpha = Math.min(1, p.life / (p.fade || 18));
    ctx.save();
    ctx.globalAlpha = alpha * (p.alpha == null ? 1 : p.alpha);

    switch (p.kind) {
      case 'spark':
        ctx.globalCompositeOperation = 'lighter';
        var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'star':
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        starPath(ctx, p.size);
        ctx.fill();
        break;

      case 'confetti':
      case 'shred':
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.max(0.12, Math.abs(p.squash == null ? 1 : p.squash)));
        ctx.fillStyle = p.color;
        if (p.shine) {
          var g2 = ctx.createLinearGradient(-p.w / 2, 0, p.w / 2, 0);
          g2.addColorStop(0, p.color);
          g2.addColorStop(0.5, p.shine);
          g2.addColorStop(1, p.color);
          ctx.fillStyle = g2;
        }
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        break;

      case 'ring':
        var prog = 1 - p.life / p.maxLife;
        var r = p.from + (p.to - p.from) * easeOut(prog);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * (1 - prog);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'ray':
        var rp = 1 - p.life / p.maxLife;
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot + rp * p.spin);
        var len = p.len * easeOut(Math.min(1, rp * 2));
        var g3 = ctx.createLinearGradient(0, 0, len, 0);
        g3.addColorStop(0, p.color);
        g3.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.moveTo(0, -p.width / 2);
        ctx.lineTo(len, -p.width * 2);
        ctx.lineTo(len, p.width * 2);
        ctx.lineTo(0, p.width / 2);
        ctx.closePath();
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  function starPath(c, s) {
    c.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var r = i % 2 ? s * 0.36 : s;
      c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function add(p) {
    if (reduceMotion && particles.length > 40) return;
    particles.push(p);
    ensureLoop();
  }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ------------------------------------------------------------- emitters */

  /* Radial spark burst — the workhorse for rarity reveals. */
  function burst(x, y, opts) {
    opts = opts || {};
    var n = Math.round((opts.count || 40) * (reduceMotion ? 0.35 : 1));
    var colors = opts.colors || ['#ffd166', '#fff'];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = rnd(opts.speedMin || 2, opts.speedMax || 9);
      add({
        kind: Math.random() < (opts.starRatio || 0.25) ? 'star' : 'spark',
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: Math.random() * 6.28, vr: rnd(-0.3, 0.3),
        size: rnd(opts.sizeMin || 2, opts.sizeMax || 6),
        color: colors[(Math.random() * colors.length) | 0],
        gravity: opts.gravity == null ? 0.12 : opts.gravity,
        drag: 0.94,
        life: rnd(28, 62), fade: 26
      });
    }
  }

  /* Foil shreds thrown off the wrapper when it tears. */
  function shreds(x, y, opts) {
    opts = opts || {};
    var n = Math.round((opts.count || 26) * (reduceMotion ? 0.4 : 1));
    var colors = opts.colors || ['#c0c0c0', '#e8e8e8'];
    for (var i = 0; i < n; i++) {
      var dir = opts.dir == null ? rnd(-Math.PI, 0) : opts.dir + rnd(-0.8, 0.8);
      var sp = rnd(3, 11);
      add({
        kind: 'shred',
        x: x + rnd(-opts.spread || -30, opts.spread || 30),
        y: y + rnd(-14, 14),
        vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp - 2,
        rot: Math.random() * 6.28, vr: rnd(-0.35, 0.35),
        w: rnd(5, 17), h: rnd(3, 9),
        color: colors[(Math.random() * colors.length) | 0],
        shine: opts.shine || 'rgba(255,255,255,0.95)',
        gravity: 0.34, drag: 0.985,
        flutter: Math.random() * 6.28, flutterAmp: rnd(0.3, 1.2),
        life: rnd(60, 120), fade: 30
      });
    }
  }

  /* Celebration confetti from the top of the screen. */
  function confetti(opts) {
    opts = opts || {};
    var n = Math.round((opts.count || 90) * (reduceMotion ? 0.3 : 1));
    var colors = opts.colors || ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#fff'];
    var W = global.innerWidth;
    for (var i = 0; i < n; i++) {
      add({
        kind: 'confetti',
        x: rnd(0, W), y: rnd(-160, -10),
        vx: rnd(-1.6, 1.6), vy: rnd(2.2, 6.5),
        rot: Math.random() * 6.28, vr: rnd(-0.28, 0.28),
        w: rnd(6, 13), h: rnd(9, 18),
        color: colors[(Math.random() * colors.length) | 0],
        shine: 'rgba(255,255,255,0.85)',
        gravity: 0.045, drag: 0.998,
        flutter: Math.random() * 6.28, flutterAmp: rnd(0.5, 1.6),
        life: rnd(150, 260), fade: 40
      });
    }
  }

  function ring(x, y, opts) {
    opts = opts || {};
    var life = opts.life || 36;
    add({
      kind: 'ring', x: x, y: y,
      from: opts.from || 10, to: opts.to || 340,
      width: opts.width || 8,
      color: opts.color || 'rgba(255,220,120,0.85)',
      life: life, maxLife: life, fade: life
    });
  }

  /* God-rays behind a big pull. */
  function rays(x, y, opts) {
    opts = opts || {};
    if (reduceMotion) return;
    var n = opts.count || 12;
    var life = opts.life || 70;
    for (var i = 0; i < n; i++) {
      add({
        kind: 'ray', x: x, y: y,
        rot: (i / n) * Math.PI * 2,
        spin: opts.spin == null ? 0.9 : opts.spin,
        len: opts.len || 420,
        width: opts.width || 16,
        color: opts.color || 'rgba(255,214,102,0.5)',
        alpha: 0.85,
        life: life, maxLife: life, fade: life * 0.7
      });
    }
  }

  /* ------------------------------------------------------- screen effects */
  var shakeTimer = null;
  function shake(intensity, duration) {
    if (reduceMotion) return;
    var root = document.getElementById('app');
    if (!root) return;
    root.style.setProperty('--shake', (intensity || 6) + 'px');
    root.classList.add('shaking');
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(function () { root.classList.remove('shaking'); }, duration || 420);
  }

  function flash(color, ms) {
    var el = document.getElementById('fx-flash');
    if (!el) return;
    el.style.background = color || 'rgba(255,255,255,0.85)';
    el.classList.remove('on');
    void el.offsetWidth;
    el.style.setProperty('--flash-ms', (ms || 480) + 'ms');
    el.classList.add('on');
  }

  /* Vignette glow used to tease an incoming rarity before the card flips. */
  function aura(color, on) {
    var el = document.getElementById('fx-aura');
    if (!el) return;
    if (on) {
      el.style.setProperty('--aura-color', color);
      el.classList.add('on');
    } else {
      el.classList.remove('on');
    }
  }

  /* --------------------------------------------------------------- toasts */
  function toast(msg, opts) {
    opts = opts || {};
    var wrap = document.getElementById('toasts');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'toast' + (opts.kind ? ' toast--' + opts.kind : '');
    if (opts.icon) {
      var ic = document.createElement('span');
      ic.className = 'toast__icon';
      ic.textContent = opts.icon;
      el.appendChild(ic);
    }
    var body = document.createElement('div');
    body.className = 'toast__body';
    if (opts.title) {
      var t = document.createElement('strong');
      t.textContent = opts.title;
      body.appendChild(t);
    }
    var m = document.createElement('span');
    m.textContent = msg;
    body.appendChild(m);
    el.appendChild(body);
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 400);
    }, opts.duration || 2800);
  }

  /* Floating "+120" style number at a screen position. */
  function floatText(x, y, text, cls) {
    var wrap = document.getElementById('floaters');
    if (!wrap) return;
    var el = document.createElement('div');
    el.className = 'floater ' + (cls || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, 1400);
  }

  function clear() {
    particles.length = 0;
    if (ctx) ctx.clearRect(0, 0, global.innerWidth, global.innerHeight);
  }

  global.Fx = {
    init: init, setReduceMotion: setReduceMotion,
    burst: burst, shreds: shreds, confetti: confetti, ring: ring, rays: rays,
    shake: shake, flash: flash, aura: aura,
    toast: toast, floatText: floatText, clear: clear
  };
})(window);
