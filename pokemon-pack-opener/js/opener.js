/* =============================================================================
   opener.js — the pack opening sequence
   -----------------------------------------------------------------------------
   States: intro -> ripping -> opened -> revealing -> summary
   The rip is a real drag: distance drives the tear, speed drives the audio.
   ========================================================================== */
(function (global) {
  'use strict';

  var Core = global.Core, Sfx = global.Sfx, Fx = global.Fx;

  var RIP_DISTANCE = 330;      // px of drag needed for a full tear
  var VELOCITY_SCALE = 2.6;    // px/ms that counts as a "fast" pull

  var S = {
    active: false,
    set: null,
    pack: null,
    parts: null,
    entries: [],
    idx: 0,
    revealed: 0,
    progress: 0,
    dragging: false,
    lastPt: null,
    lastT: 0,
    summary: null,
    onExit: null,
    autoRipping: false
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function stage() { return document.getElementById('open-stage'); }

  /* ------------------------------------------------------------------ start */
  function start(set, opts) {
    opts = opts || {};
    S.active = true;
    S.set = set;
    S.progress = 0;
    S.idx = 0;
    S.revealed = 0;
    S.dragging = false;
    S.onExit = opts.onExit || null;

    S.pack = global.Packs.generate(set);
    S.entries = S.pack.entries;

    var root = stage();
    root.innerHTML = '';
    root.className = 'open__stage state-intro';
    root.dataset.set = set.id;

    var mount = el('div', 'open__packmount');
    S.parts = global.PackView.createOpenable(set);
    mount.appendChild(S.parts.root);
    root.appendChild(mount);

    var hint = el('div', 'open__hint');
    hint.appendChild(el('span', 'open__hintKey', 'DRAG ACROSS THE TOP'));
    hint.appendChild(el('span', 'open__hintSub', 'or press the button to tear it open'));
    root.appendChild(hint);

    var actions = el('div', 'open__actions');
    var fast = el('button', 'btn btn--ghost', 'Rip it for me');
    fast.type = 'button';
    fast.addEventListener('click', function (e) { e.stopPropagation(); autoRip(); });
    actions.appendChild(fast);
    root.appendChild(actions);

    bindRip();

    Sfx.resume().then(function () {
      Sfx.crinkle(0.55);
      setTimeout(function () { Sfx.crinkle(0.35); }, 320);
    });

    requestAnimationFrame(function () { root.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------- rip drag */
  function bindRip() {
    var target = S.parts.root;
    target.addEventListener('pointerdown', onDown);
    target.style.touchAction = 'none';
  }

  function onDown(e) {
    if (S.progress >= 1 || S.autoRipping) return;
    S.dragging = true;
    S.lastPt = { x: e.clientX, y: e.clientY };
    S.lastT = performance.now();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    Sfx.resume().then(function () { Sfx.ripStart(); });
    stage().classList.add('is-ripping');
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    e.preventDefault();
  }

  function onMove(e) {
    if (!S.dragging) return;
    var now = performance.now();
    var dx = e.clientX - S.lastPt.x;
    var dy = e.clientY - S.lastPt.y;
    // Horizontal drag tears; vertical contributes less, like a real wrapper.
    var dist = Math.sqrt(dx * dx + dy * dy * 0.35);
    var dt = Math.max(1, now - S.lastT);

    S.lastPt = { x: e.clientX, y: e.clientY };
    S.lastT = now;

    S.progress = Math.min(1, S.progress + dist / RIP_DISTANCE);
    var vel = Math.min(1, (dist / dt) / VELOCITY_SCALE);
    Sfx.ripUpdate(vel);
    applyTear(vel);

    if (S.progress >= 1) complete();
  }

  function onUp() {
    if (!S.dragging) return;
    S.dragging = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    if (S.progress < 1) {
      Sfx.ripStop(false);
      stage().classList.remove('is-ripping');
    }
  }

  function applyTear(vel) {
    var p = S.progress;
    var parts = S.parts;
    parts.root.style.setProperty('--rip', p.toFixed(3));
    parts.lid.style.transform =
      'translate3d(' + (p * 42).toFixed(1) + 'px,' + (-p * 78).toFixed(1) + 'px,0) ' +
      'rotate(' + (-p * 13).toFixed(2) + 'deg)';
    parts.glow.style.opacity = (p * 0.9).toFixed(2);

    // Shreds fly off the tear line while you're actually moving.
    if (vel > 0.22 && Math.random() < vel * 0.8) {
      var r = parts.root.getBoundingClientRect();
      Fx.shreds(r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height * 0.17, {
        count: 2, spread: 18,
        colors: [S.set.palette.a, S.set.palette.c, '#ffffff'],
        dir: -1.3
      });
    }
  }

  /* Button path: animates the same tear so it looks identical, just automated. */
  function autoRip() {
    if (S.autoRipping || S.progress >= 1) return;
    S.autoRipping = true;
    stage().classList.add('is-ripping');
    Sfx.resume().then(function () { Sfx.ripStart(); });
    var t0 = performance.now();
    var from = S.progress;
    var dur = 620;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      // ease-in then a fast finish, like a real pull
      var eased = k < 0.35 ? k * 0.8 : 0.28 + Math.pow((k - 0.35) / 0.65, 0.7) * 0.72;
      S.progress = Math.min(1, from + (1 - from) * eased);
      var vel = k < 0.35 ? 0.35 : 0.85;
      Sfx.ripUpdate(vel);
      applyTear(vel);
      if (S.progress < 1) requestAnimationFrame(step);
      else complete();
    })(performance.now());
  }

  /* ---------------------------------------------------------- tear finish */
  var completed = false;
  function complete() {
    if (completed) return;
    completed = true;
    S.dragging = false;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);

    Sfx.ripStop(true);
    var root = stage();
    root.classList.remove('is-ripping');
    root.classList.add('is-open');

    var r = S.parts.root.getBoundingClientRect();
    Fx.shreds(r.left + r.width / 2, r.top + r.height * 0.16, {
      count: 34, spread: r.width * 0.45,
      colors: [S.set.palette.a, S.set.palette.c, S.set.palette.accent, '#ffffff'],
      dir: -1.4
    });
    Fx.shake(5, 320);

    S.parts.lid.classList.add('is-gone');

    if (S.pack.god) {
      setTimeout(godPackIntro, 420);
    } else {
      setTimeout(beginReveal, 640);
    }
  }

  function godPackIntro() {
    var root = stage();
    root.classList.add('is-god');
    Sfx.godPack();
    Fx.flash('rgba(255,240,200,0.95)', 900);
    Fx.rays(global.innerWidth / 2, global.innerHeight / 2, { count: 16, len: 700, color: 'rgba(255,214,102,0.55)' });
    Fx.confetti({ count: 140, colors: ['#ffd166', '#ffe45e', '#fff', '#ffb703'] });
    Fx.shake(12, 900);

    var banner = el('div', 'godbanner');
    banner.appendChild(el('div', 'godbanner__title', 'GOD PACK'));
    banner.appendChild(el('div', 'godbanner__sub', 'every slot is a hit'));
    root.appendChild(banner);
    setTimeout(function () {
      banner.classList.add('out');
      setTimeout(function () { banner.remove(); }, 500);
      beginReveal();
    }, 2000);
  }

  /* -------------------------------------------------------------- reveal */
  function beginReveal() {
    var root = stage();
    root.className = 'open__stage state-reveal is-in is-open' + (S.pack.god ? ' is-god' : '');

    var mount = root.querySelector('.open__packmount');
    if (mount) mount.classList.add('is-away');
    ['.open__hint', '.open__actions'].forEach(function (sel) {
      var n = root.querySelector(sel);
      if (n) n.remove();
    });

    var deck = el('div', 'reveal');
    var counter = el('div', 'reveal__counter');
    counter.id = 'reveal-counter';
    deck.appendChild(counter);

    var slot = el('div', 'reveal__slot');
    slot.id = 'reveal-slot';
    deck.appendChild(slot);

    var rail = el('div', 'reveal__rail');
    rail.id = 'reveal-rail';
    deck.appendChild(rail);

    var bar = el('div', 'reveal__actions');
    var skip = el('button', 'btn btn--ghost', 'Reveal all');
    skip.type = 'button';
    skip.addEventListener('click', function (e) { e.stopPropagation(); revealAll(); });
    bar.appendChild(skip);
    deck.appendChild(bar);

    root.appendChild(deck);
    Sfx.cardSlide();
    nextCard();
  }

  function updateCounter() {
    var c = document.getElementById('reveal-counter');
    if (c) c.textContent = Math.min(S.idx + 1, S.entries.length) + ' / ' + S.entries.length;
  }

  var currentEl = null, currentFlipped = false;

  function nextCard() {
    if (S.idx >= S.entries.length) return finish();
    updateCounter();

    var entry = S.entries[S.idx];
    var slot = document.getElementById('reveal-slot');
    var cardEl = global.CardView.create(entry.card, { faceUp: false, reverse: entry.reverse });
    cardEl.classList.add('reveal__card');
    global.CardView.enableTilt(cardEl, { max: 13 });

    // Tease: anything above a Double Rare leaks a little light through the back.
    if (entry.card.tier >= 4) cardEl.classList.add('is-teasing');

    slot.appendChild(cardEl);
    currentEl = cardEl;
    currentFlipped = false;

    requestAnimationFrame(function () { cardEl.classList.add('is-dealt'); });
    Sfx.cardSlide(0.05);

    cardEl.addEventListener('click', onCardTap);
  }

  function onCardTap(e) {
    e.stopPropagation();
    if (!currentFlipped) flipCurrent();
    else dismissCurrent();
  }

  function flipCurrent() {
    if (!currentEl || currentFlipped) return;
    currentFlipped = true;
    var entry = S.entries[S.idx];
    var card = entry.card;
    var tier = global.GameSets.tiers[card.tier];
    // Hold our own reference: "Reveal all" can clear currentEl before the
    // celebration timeout below fires.
    var cardEl = currentEl;

    cardEl.classList.add('is-up');
    Sfx.cardFlip();

    setTimeout(function () {
      if (!cardEl.isConnected) return;
      var r = cardEl.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;

      Sfx.rarity(card.tier);

      if (card.tier >= 2) {
        Fx.burst(cx, cy, {
          count: 14 + card.tier * 14,
          colors: [tier.color, tier.glow, '#ffffff'],
          speedMax: 4 + card.tier * 1.6,
          sizeMax: 3 + card.tier
        });
      }
      if (card.tier >= 3) {
        Fx.ring(cx, cy, { to: 200 + card.tier * 60, color: hexA(tier.glow, 0.8), width: 6 + card.tier });
        Fx.aura(tier.glow, true);
        setTimeout(function () { Fx.aura(tier.glow, false); }, 1400);
      }
      if (card.tier >= 4) {
        Fx.rays(cx, cy, { count: 10 + card.tier, len: 320 + card.tier * 60, color: hexA(tier.glow, 0.42) });
        Fx.shake(3 + card.tier, 380);
        Fx.flash(hexA(tier.color, 0.28), 420);
      }
      if (card.tier >= 5) {
        Fx.confetti({ count: 70 + card.tier * 16, colors: [tier.color, tier.glow, '#ffffff', '#ffd166'] });
      }

      var label = el('div', 'reveal__rarity');
      label.textContent = card.rarity;
      label.style.setProperty('--c', tier.color);
      if (cardEl.parentNode) cardEl.parentNode.appendChild(label);
      requestAnimationFrame(function () { label.classList.add('in'); });
      cardEl._label = label;

      if (entry.isNew) {
        var badge = el('div', 'reveal__new', 'NEW');
        cardEl.appendChild(badge);
        Sfx.newCard();
      }
    }, 220);
  }

  function dismissCurrent() {
    if (!currentEl) return;
    var entry = S.entries[S.idx];
    var card = currentEl;
    if (card._label) {
      card._label.classList.remove('in');
      setTimeout(function () { card._label && card._label.remove(); }, 260);
    }
    card.removeEventListener('click', onCardTap);
    card.classList.add('is-filed');

    var rail = document.getElementById('reveal-rail');
    setTimeout(function () {
      card.remove();
      var mini = global.CardView.create(entry.card, { faceUp: true, reverse: entry.reverse, compact: true, scan: false });
      mini.classList.add('reveal__mini');
      if (entry.isNew) mini.classList.add('is-new');
      rail.appendChild(mini);
      requestAnimationFrame(function () { mini.classList.add('in'); });
    }, 260);

    Sfx.cardPlace();
    currentEl = null;
    S.idx++;
    S.revealed++;
    setTimeout(nextCard, 200);
  }

  function revealAll() {
    // Flip whatever is on screen, then file the rest into the rail quickly.
    if (currentEl && !currentFlipped) flipCurrent();
    var rail = document.getElementById('reveal-rail');
    var start = S.idx + (currentEl ? 1 : 0);

    if (currentEl) {
      var held = currentEl, heldEntry = S.entries[S.idx];
      setTimeout(function () {
        if (held._label) held._label.remove();
        held.remove();
        var mini = global.CardView.create(heldEntry.card, { faceUp: true, reverse: heldEntry.reverse, compact: true, scan: false });
        mini.classList.add('reveal__mini', 'in');
        if (heldEntry.isNew) mini.classList.add('is-new');
        rail.appendChild(mini);
      }, 700);
      currentEl = null;
    }

    var rest = S.entries.slice(start);
    rest.forEach(function (entry, i) {
      setTimeout(function () {
        var mini = global.CardView.create(entry.card, { faceUp: true, reverse: entry.reverse, compact: true, scan: false });
        mini.classList.add('reveal__mini');
        if (entry.isNew) mini.classList.add('is-new');
        rail.appendChild(mini);
        requestAnimationFrame(function () { mini.classList.add('in'); });
        Sfx.cardPlace();
        if (entry.card.tier >= 4) {
          var r = mini.getBoundingClientRect();
          Sfx.rarity(entry.card.tier);
          Fx.burst(r.left + r.width / 2, r.top + r.height / 2, {
            count: 30, colors: [global.GameSets.tiers[entry.card.tier].color, '#fff']
          });
        }
      }, 800 + i * 130);
    });

    S.idx = S.entries.length;
    setTimeout(finish, 900 + rest.length * 130);
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* -------------------------------------------------------------- summary */
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    S.summary = global.Packs.commit(S.pack);
    global.State.emit('hud');
    showSummary();
  }

  function showSummary() {
    var root = stage();
    var sum = S.summary;
    // Tear down the reveal so it can't show through behind the summary.
    var deck = root.querySelector('.reveal');
    if (deck) deck.remove();
    var mount = root.querySelector('.open__packmount');
    if (mount) mount.remove();
    root.scrollTop = 0;
    var overlay = el('div', 'summary');

    var head = el('div', 'summary__head');
    head.appendChild(el('div', 'summary__eyebrow', S.set.name));
    head.appendChild(el('h2', 'summary__title', S.pack.god ? 'GOD PACK OPENED' : 'Pack Opened'));
    overlay.appendChild(head);

    var statRow = el('div', 'summary__stats');
    statRow.appendChild(stat('New cards', sum.newCount));
    statRow.appendChild(stat('Pack value', Core.formatNum(sum.value)));
    statRow.appendChild(stat('XP earned', '+' + sum.xp));
    overlay.appendChild(statRow);

    var grid = el('div', 'summary__grid');
    S.entries.slice().sort(function (a, b) { return b.card.tier - a.card.tier || b.card.value - a.card.value; })
      .forEach(function (entry, i) {
        var c = global.CardView.create(entry.card, { faceUp: true, reverse: entry.reverse, compact: true });
        global.CardView.enableTilt(c, { max: 16 });
        c.classList.add('summary__card');
        c.style.setProperty('--d', (i * 55) + 'ms');
        if (entry.isNew) c.classList.add('is-new');
        c.addEventListener('click', function () { global.UI.showCardDetail(entry.card); });
        grid.appendChild(c);
      });
    overlay.appendChild(grid);

    var actions = el('div', 'summary__actions');
    var again = el('button', 'btn btn--primary btn--lg', '');
    again.type = 'button';
    again.appendChild(el('span', null, 'Open another'));
    var cost = el('span', 'btn__cost');
    cost.appendChild(el('span', 'coin-ico'));
    cost.appendChild(el('span', null, Core.formatNum(S.set.price)));
    again.appendChild(cost);
    again.addEventListener('click', function () {
      Sfx.click();
      global.UI.buyAndOpen(S.set);
    });

    var back = el('button', 'btn btn--ghost btn--lg', 'Back to shop');
    back.type = 'button';
    back.addEventListener('click', function () { Sfx.back(); exit(); });

    var binder = el('button', 'btn btn--ghost btn--lg', 'Open binder');
    binder.type = 'button';
    binder.addEventListener('click', function () { Sfx.click(); exit(); global.UI.go('binder'); });

    actions.appendChild(again);
    actions.appendChild(binder);
    actions.appendChild(back);
    overlay.appendChild(actions);

    root.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('in'); });

    if (sum.newCount > 0) Sfx.coinBurst(Math.min(sum.newCount, 8));
    if (S.pack.best && S.pack.best.card.tier >= 4) {
      Fx.confetti({ count: 60, colors: [global.GameSets.tiers[S.pack.best.card.tier].color, '#fff'] });
    }

    (sum.levels || []).forEach(function (l, i) {
      setTimeout(function () { global.UI.levelUpBanner(l); }, 500 + i * 1600);
    });
    (sum.achievements || []).forEach(function (a, i) {
      setTimeout(function () {
        Fx.toast(a.desc, { title: a.name, icon: '🏆', kind: 'gold', duration: 3600 });
        Sfx.levelUp();
      }, 900 + i * 900);
    });
  }

  function stat(label, value) {
    var s = el('div', 'summary__stat');
    s.appendChild(el('span', 'summary__statval', String(value)));
    s.appendChild(el('span', 'summary__statlabel', label));
    return s;
  }

  /* ----------------------------------------------------------------- exit */
  function exit() {
    S.active = false;
    completed = false;
    finished = false;
    currentEl = null;
    Fx.clear();
    Fx.aura(null, false);
    var root = stage();
    root.classList.remove('is-in');
    setTimeout(function () { root.innerHTML = ''; }, 260);
    if (S.onExit) S.onExit();
  }

  function reset() { completed = false; finished = false; }

  global.Opener = {
    start: function (set, opts) { reset(); start(set, opts); },
    exit: exit,
    isActive: function () { return S.active; }
  };
})(window);
