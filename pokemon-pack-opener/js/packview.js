/* =============================================================================
   packview.js — booster wrapper art
   -----------------------------------------------------------------------------
   Each wrapper is drawn from the set's palette + mascot so it reads like the
   real booster: foil body, crimped top, Poke Ball motif, big set wordmark, card
   count strip. If a set-logo CDN is reachable the real logo swaps in over the
   drawn wordmark.
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

  /* A stable zigzag used for the torn edge, seeded per set so a given pack
     always tears the same way. */
  function tearPath(seed, steps) {
    var rnd = Core.mulberry32(seed);
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var x = (i / steps) * 100;
      var y = 13.5 + rnd() * 2.6 + (i % 2 ? 1.7 : -1.7);
      pts.push([x, y]);
    }
    return pts;
  }

  function clipFromPts(pts, below) {
    var top = pts.map(function (p) { return p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%'; });
    if (below) {
      // region under the tear line
      return 'polygon(' + top.join(',') + ', 100% 100%, 0% 100%)';
    }
    return 'polygon(0% 0%, 100% 0%, ' + top.slice().reverse().join(',') + ')';
  }

  /* --------------------------------------------------------- wrapper art */
  function buildArt(set, opts) {
    opts = opts || {};
    var p = set.palette;
    var art = el('div', 'wrap__art');
    art.style.setProperty('--pa', p.a);
    art.style.setProperty('--pb', p.b);
    art.style.setProperty('--pc', p.c);
    art.style.setProperty('--pac', p.accent);
    art.style.setProperty('--pink', p.ink);

    art.appendChild(el('div', 'wrap__foil'));
    art.appendChild(el('div', 'wrap__sheen'));

    // Faint Poke Ball watermark, like the real wrappers.
    var mark = el('div', 'wrap__ballmark');
    mark.appendChild(el('span', 'wrap__ballmarkBand'));
    art.appendChild(mark);

    // Mascot render.
    if (set.mascot) {
      var m = el('img', 'wrap__mascot');
      m.src = 'art/' + set.mascot + '.webp';
      m.alt = '';
      m.setAttribute('aria-hidden', 'true');
      m.addEventListener('error', function () { m.style.display = 'none'; });
      art.appendChild(m);
    }

    // Drawn brand block; the real logo image replaces it when it loads.
    var brand = el('div', 'wrap__brand');
    brand.appendChild(el('div', 'wrap__brandTop', 'Pokémon'));
    brand.appendChild(el('div', 'wrap__brandSub', 'TRADING CARD GAME'));
    art.appendChild(brand);

    var logo = el('div', 'wrap__logo');
    var name = el('div', 'wrap__name', set.name);
    name.dataset.text = set.name;
    if (set.name.length > 12) name.classList.add('is-long');
    logo.appendChild(name);
    logo.appendChild(el('div', 'wrap__series', set.series));
    art.appendChild(logo);

    if (opts.realLogo !== false) attachLogo(logo, set);

    var strip = el('div', 'wrap__strip');
    strip.appendChild(el('span', null, set.slots.length + ' CARDS'));
    strip.appendChild(el('span', 'wrap__code', set.code));
    art.appendChild(strip);

    art.appendChild(el('div', 'wrap__crimp wrap__crimp--top'));
    art.appendChild(el('div', 'wrap__crimp wrap__crimp--bottom'));

    return art;
  }

  function attachLogo(container, set) {
    var sources = Core.setLogoSources(set);
    var i = 0;
    var img = new Image();
    img.decoding = 'async';
    function next() { if (i < sources.length) img.src = sources[i++]; }
    img.addEventListener('load', function () {
      if (!img.naturalWidth) return next();
      var real = el('img', 'wrap__logoimg');
      real.src = img.src;
      real.alt = set.name;
      container.appendChild(real);
      requestAnimationFrame(function () { container.classList.add('has-logo'); });
    });
    img.addEventListener('error', next);
    next();
  }

  /* ---------------------------------------------------- shop / list pack */
  function create(set, opts) {
    opts = opts || {};
    var root = el('div', 'pack');
    root.dataset.set = set.id;
    root.style.setProperty('--pa', set.palette.a);
    root.style.setProperty('--pb', set.palette.b);
    root.style.setProperty('--pac', set.palette.accent);
    root.dataset.style = set.style;

    var body = el('div', 'pack__body');
    body.appendChild(buildArt(set, opts));
    root.appendChild(body);
    root.appendChild(el('div', 'pack__shadow'));
    return root;
  }

  /* -------------------------------------------------- tearable open pack */
  /* Builds the pack split into a lid and base along a jagged tear line, plus a
     stack of card backs peeking out once the lid lifts. */
  function createOpenable(set) {
    var seed = Core.hashStr(set.id);
    var pts = tearPath(seed, 18);

    var root = el('div', 'openpack');
    root.dataset.style = set.style;
    root.style.setProperty('--pa', set.palette.a);
    root.style.setProperty('--pb', set.palette.b);
    root.style.setProperty('--pac', set.palette.accent);

    // Cards peeking out from inside the wrapper.
    var stack = el('div', 'openpack__stack');
    for (var i = 0; i < 4; i++) {
      var c = el('div', 'openpack__card');
      c.style.setProperty('--i', i);
      stack.appendChild(c);
    }
    root.appendChild(stack);

    var base = el('div', 'openpack__base');
    base.style.clipPath = clipFromPts(pts, true);
    base.appendChild(buildArt(set));
    root.appendChild(base);

    var lid = el('div', 'openpack__lid');
    lid.style.clipPath = clipFromPts(pts, false);
    lid.appendChild(buildArt(set, { realLogo: false }));
    root.appendChild(lid);

    // Grab hint that rides along the tear line.
    var grip = el('div', 'openpack__grip');
    grip.appendChild(el('span', 'openpack__gripIcon', '✋'));
    grip.appendChild(el('span', 'openpack__gripText', 'DRAG TO RIP'));
    root.appendChild(grip);

    var glow = el('div', 'openpack__glow');
    root.appendChild(glow);

    return { root: root, lid: lid, base: base, stack: stack, grip: grip, glow: glow };
  }

  global.PackView = {
    create: create,
    createOpenable: createOpenable,
    buildArt: buildArt
  };
})(window);
