/* =============================================================================
   cardview.js — card DOM construction, holo shaders, 3D tilt
   -----------------------------------------------------------------------------
   Every card renders a complete, readable TCG face from the real card data
   immediately. If a public card-image CDN is reachable the actual printed scan
   fades in over the top. Either way the card is never blank and never waits.
   ========================================================================== */
(function (global) {
  'use strict';

  var Core = global.Core;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------ energy cost pips */
  function energyPip(ch, small) {
    var e = Core.energy(ch);
    var p = el('span', 'pip' + (small ? ' pip--sm' : ''));
    p.style.background = 'radial-gradient(circle at 34% 30%, ' + lighten(e.color, 28) + ', ' + e.color + ' 58%, ' + e.dark + ')';
    p.title = e.name;
    p.setAttribute('aria-label', e.name);
    return p;
  }

  function lighten(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, (n >> 16) + amt);
    var g = Math.min(255, ((n >> 8) & 255) + amt);
    var b = Math.min(255, (n & 255) + amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* --------------------------------------------------------- procedural face */
  function buildFace(card) {
    var tiers = global.GameSets.tiers;
    var tier = tiers[card.tier];
    var primary = Core.energy((card.types || 'C')[0] || 'C');
    var face = el('div', 'face');
    face.style.setProperty('--type', primary.color);
    face.style.setProperty('--type-dark', primary.dark);

    var frame = el('div', 'face__frame');

    /* --- header: name + HP + type ------------------------------------- */
    var head = el('div', 'face__head');
    var nameWrap = el('div', 'face__namewrap');
    if (card.subtypes && /Stage 1|Stage 2|Basic|VMAX|VSTAR|MEGA/i.test(card.subtypes)) {
      nameWrap.appendChild(el('span', 'face__stage', card.subtypes.toUpperCase()));
    }
    nameWrap.appendChild(el('h3', 'face__name', card.name));
    head.appendChild(nameWrap);

    if (card.hp) {
      var hp = el('div', 'face__hp');
      hp.appendChild(el('span', 'face__hplabel', 'HP'));
      hp.appendChild(el('span', 'face__hpval', card.hp));
      head.appendChild(hp);
    }
    if (card.types) {
      var tw = el('div', 'face__types');
      for (var i = 0; i < card.types.length; i++) tw.appendChild(energyPip(card.types[i]));
      head.appendChild(tw);
    }
    frame.appendChild(head);

    /* --- artwork window ------------------------------------------------ */
    var art = el('div', 'face__art');
    art.style.background =
      'radial-gradient(120% 90% at 50% 18%, ' + lighten(primary.color, 62) + ' 0%, ' +
      lighten(primary.color, 18) + ' 42%, ' + primary.dark + ' 100%)';

    var src = Core.localArt(card);
    if (src && card.supertype === 1) {
      var img = el('img', 'face__artimg');
      img.src = src;
      img.alt = card.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () { img.style.display = 'none'; });
      art.appendChild(img);
    } else {
      // Trainer / Energy cards have no species render, so they get a drawn
      // emblem and their card class set large, the way the real frames do.
      var mark = el('div', 'face__mark');
      var ball = el('div', 'face__emblem');
      ball.appendChild(el('span', 'face__emblemBand'));
      ball.appendChild(el('span', 'face__emblemBtn'));
      mark.appendChild(ball);
      var kind = (card.subtypes || '').split(' ')[0] ||
                 (card.supertype === 3 ? 'Energy' : 'Trainer');
      mark.appendChild(el('span', 'face__emblemText', kind.toUpperCase()));
      art.appendChild(mark);
    }
    art.appendChild(el('div', 'face__artgloss'));
    frame.appendChild(art);

    /* --- flavour strip between art and attacks -------------------------- */
    var strip = el('div', 'face__strip');
    strip.appendChild(el('span', null, card.subtypes || (card.supertype === 2 ? 'Trainer' : 'Energy')));
    strip.appendChild(el('span', 'face__no', 'No. ' + (card.dex || card.number)));
    frame.appendChild(strip);

    /* --- attacks -------------------------------------------------------- */
    var body = el('div', 'face__body');

    // Abilities print above the attacks on a real card.
    if (card.ability && card.ability[0]) {
      var ab = el('div', 'ability');
      var abHead = el('div', 'ability__head');
      abHead.appendChild(el('span', 'ability__tag', (card.ability[2] || 'Ability')));
      abHead.appendChild(el('span', 'ability__name', card.ability[0]));
      ab.appendChild(abHead);
      if (card.ability[1]) ab.appendChild(el('span', 'ability__text', card.ability[1]));
      body.appendChild(ab);
    }

    (card.attacks || []).forEach(function (a) {
      var row = el('div', 'atk');
      var cost = el('div', 'atk__cost');
      for (var j = 0; j < (a[1] || '').length; j++) cost.appendChild(energyPip(a[1][j], true));
      row.appendChild(cost);
      var mid = el('div', 'atk__mid');
      mid.appendChild(el('span', 'atk__name', a[0]));
      if (a[3]) mid.appendChild(el('span', 'atk__text', a[3]));
      row.appendChild(mid);
      if (a[2]) row.appendChild(el('span', 'atk__dmg', a[2]));
      body.appendChild(row);
    });

    // Trainer / Energy cards carry their effect text instead of attacks.
    if (!(card.attacks || []).length) {
      if (card.rules) body.appendChild(el('p', 'face__rules', card.rules));
      else if (card.flavor) body.appendChild(el('p', 'face__rules', card.flavor));
    }
    frame.appendChild(body);

    /* --- weakness / retreat -------------------------------------------- */
    if (card.supertype === 1) {
      var stats = el('div', 'face__stats');
      var wk = el('div', 'face__stat');
      wk.appendChild(el('span', 'face__statlabel', 'weakness'));
      var wkv = el('span', 'face__statval');
      if (card.weakness) {
        wkv.appendChild(energyPip(card.weakness[0], true));
        wkv.appendChild(el('span', null, card.weakness.slice(1)));
      } else { wkv.appendChild(el('span', null, '—')); }
      wk.appendChild(wkv);
      stats.appendChild(wk);

      var rt = el('div', 'face__stat');
      rt.appendChild(el('span', 'face__statlabel', 'retreat'));
      var rtv = el('span', 'face__statval');
      if (card.retreat > 0) {
        for (var k = 0; k < card.retreat; k++) rtv.appendChild(energyPip('C', true));
      } else { rtv.appendChild(el('span', null, '—')); }
      rt.appendChild(rtv);
      stats.appendChild(rt);
      frame.appendChild(stats);
    }

    /* --- flavour + footer ----------------------------------------------- */
    if (card.flavor && (card.attacks || []).length) {
      frame.appendChild(el('p', 'face__flavor', card.flavor));
    }
    var foot = el('div', 'face__foot');
    foot.appendChild(el('span', 'face__artist', card.artist ? 'Illus. ' + card.artist : ''));
    var right = el('span', 'face__foottag');
    right.appendChild(el('span', 'face__rarity', tier.name));
    right.appendChild(el('span', null, card.number + '/' + (global.GameSets.get(card.set) || {}).printed));
    foot.appendChild(right);
    frame.appendChild(foot);

    face.appendChild(frame);
    return face;
  }

  /* --------------------------------------------------- real scan overlay */
  /* Tries each CDN in turn; silently gives up and leaves the drawn face. */
  function attachRealScan(cardEl, card) {
    var sources = Core.cardImageSources(card);
    var i = 0;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    function next() {
      if (i >= sources.length) return;
      img.src = sources[i++];
    }
    img.addEventListener('load', function () {
      if (!img.naturalWidth) return next();
      var layer = el('img', 'card__scan');
      layer.src = img.src;
      layer.alt = card.name;
      var front = cardEl.querySelector('.card__front');
      if (front) {
        front.appendChild(layer);
        requestAnimationFrame(function () { layer.classList.add('in'); });
        cardEl.classList.add('has-scan');
      }
    });
    img.addEventListener('error', next);
    next();
  }

  /* ------------------------------------------------------------ card back */
  function buildBack() {
    var back = el('div', 'card__back');
    var inner = el('div', 'back__inner');
    inner.appendChild(el('div', 'back__swirl'));
    var ball = el('div', 'back__ball');
    ball.appendChild(el('span', 'back__ballTop'));
    ball.appendChild(el('span', 'back__ballBand'));
    ball.appendChild(el('span', 'back__ballBtn'));
    inner.appendChild(ball);
    inner.appendChild(el('div', 'back__word', 'Pokémon'));
    inner.appendChild(el('div', 'back__sub', 'TRADING CARD GAME'));
    back.appendChild(inner);
    return back;
  }

  /* ------------------------------------------------------------- assemble */
  /* opts: { reverse, faceUp, scan (default true), compact } */
  function create(card, opts) {
    opts = opts || {};
    var tiers = global.GameSets.tiers;
    var tier = tiers[card.tier];

    var root = el('div', 'card');
    root.dataset.tier = card.tier;
    root.dataset.id = card.id;
    if (opts.compact) root.classList.add('card--compact');
    if (opts.reverse) root.classList.add('is-reverse');
    root.style.setProperty('--tier-color', tier.color);
    root.style.setProperty('--tier-glow', tier.glow);
    // Stable per-card offset so two copies of a card shimmer identically.
    root.style.setProperty('--seed', (card.seed % 360) + 'deg');

    var inner = el('div', 'card__inner');
    var front = el('div', 'card__front');
    front.appendChild(buildFace(card));

    var foilKind = tier.foil || (opts.reverse ? 'reverse' : null);
    if (foilKind) {
      var foil = el('div', 'card__foil');
      foil.dataset.foil = foilKind;
      front.appendChild(foil);
      root.classList.add('is-foil');
    }
    front.appendChild(el('div', 'card__glare'));
    front.appendChild(el('div', 'card__edge'));

    inner.appendChild(front);
    inner.appendChild(buildBack());
    root.appendChild(inner);

    if (opts.faceUp !== false) root.classList.add('is-up');
    if (opts.scan !== false) attachRealScan(root, card);

    return root;
  }

  /* ------------------------------------------------------------- 3D tilt */
  /* Pointer-driven tilt + a light position the foil shaders read. */
  function enableTilt(cardEl, opts) {
    opts = opts || {};
    var max = opts.max || 15;
    var raf = null, target = { rx: 0, ry: 0, mx: 50, my: 50 }, cur = { rx: 0, ry: 0, mx: 50, my: 50 };
    var active = false;

    function loop() {
      var k = 0.18;
      cur.rx += (target.rx - cur.rx) * k;
      cur.ry += (target.ry - cur.ry) * k;
      cur.mx += (target.mx - cur.mx) * k;
      cur.my += (target.my - cur.my) * k;
      cardEl.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
      cardEl.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
      cardEl.style.setProperty('--mx', cur.mx.toFixed(1) + '%');
      cardEl.style.setProperty('--my', cur.my.toFixed(1) + '%');
      if (active || Math.abs(cur.rx - target.rx) > 0.05 || Math.abs(cur.ry - target.ry) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    }

    function start() { if (!raf) raf = requestAnimationFrame(loop); }

    function move(e) {
      var r = cardEl.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      target.ry = (px - 0.5) * max * 2;
      target.rx = -(py - 0.5) * max * 2;
      target.mx = px * 100;
      target.my = py * 100;
      active = true;
      start();
    }

    function leave() {
      target.rx = 0; target.ry = 0; target.mx = 50; target.my = 50;
      active = false;
      start();
    }

    cardEl.addEventListener('pointermove', move);
    cardEl.addEventListener('pointerenter', function () { cardEl.classList.add('is-hovered'); });
    cardEl.addEventListener('pointerleave', function () { cardEl.classList.remove('is-hovered'); leave(); });

    // Device tilt on phones so foils move without a pointer.
    cardEl._tiltCleanup = function () {
      cardEl.removeEventListener('pointermove', move);
    };
    return cardEl;
  }

  global.CardView = {
    create: create,
    enableTilt: enableTilt,
    buildFace: buildFace,
    energyPip: energyPip
  };
})(window);
