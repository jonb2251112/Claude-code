/* =============================================================================
   core.js — RNG, card decoding, energy types, value model, art resolution
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------- RNG */
  /* mulberry32: deterministic where we want reproducible cosmetics (a card's
     holo pattern, its market value), Math.random where we want real luck. */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* Weighted choice over an array of weights; returns an index. */
  function weightedIndex(weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var r = Math.random() * total;
    for (i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  /* ----------------------------------------------------------- energy types */
  var ENERGY = {
    G: { name: 'Grass',     color: '#63bb5b', dark: '#2f7a33' },
    R: { name: 'Fire',      color: '#ff7043', dark: '#c2410c' },
    W: { name: 'Water',     color: '#4fa8e8', dark: '#1f6fb2' },
    L: { name: 'Lightning', color: '#f7d038', dark: '#c9a227' },
    P: { name: 'Psychic',   color: '#b168d6', dark: '#7b3fa0' },
    F: { name: 'Fighting',  color: '#d4713a', dark: '#8f4620' },
    D: { name: 'Darkness',  color: '#4e6b7d', dark: '#263945' },
    M: { name: 'Metal',     color: '#9aa6b2', dark: '#5c6773' },
    Y: { name: 'Fairy',     color: '#f08cc0', dark: '#b8558f' },
    N: { name: 'Dragon',    color: '#c9a227', dark: '#8a6d12' },
    C: { name: 'Colorless', color: '#d8d3c8', dark: '#9c968a' }
  };

  function energy(ch) { return ENERGY[ch] || ENERGY.C; }

  /* ------------------------------------------------------------- card model */
  var FIELDS = ['id', 'name', 'types', 'hp', 'tier', 'rarity', 'number', 'artist',
                'flavor', 'attacks', 'weakness', 'retreat', 'dex', 'supertype', 'subtypes',
                'rules', 'ability'];

  var index = {};        // id -> card
  var bySet = {};        // setId -> { tier -> [cards] }
  var allBySet = {};     // setId -> [cards]

  function decode(arr, setId) {
    var c = {};
    for (var i = 0; i < FIELDS.length; i++) c[FIELDS[i]] = arr[i];
    c.set = setId;
    c.seed = hashStr(c.id);
    c.value = computeValue(c);
    return c;
  }

  /* Market value: tier base scaled by a stable per-card roll, with a premium for
     the set's headline chase card. Purely cosmetic economy, but it gives the
     collection a number that goes up. */
  function computeValue(c) {
    var tiers = global.GameSets.tiers;
    var base = tiers[c.tier].value;
    var r = mulberry32(c.seed)();
    var mult = 0.55 + Math.pow(r, 1.6) * 1.75;
    var set = global.GameSets.get(c.set);
    if (set && set.chase && c.name.toLowerCase().indexOf(set.chase.toLowerCase()) === 0) mult *= 3.2;
    if (c.tier >= 4 && /ex$|VMAX$|VSTAR$|GX$/.test(c.name)) mult *= 1.15;
    var v = base * mult;
    return v < 100 ? Math.max(1, Math.round(v)) : Math.round(v / 5) * 5;
  }

  function buildIndex() {
    var db = global.CARD_DB;
    db.sets.forEach(function (sid) {
      var list = db.cards[sid].map(function (a) { return decode(a, sid); });
      allBySet[sid] = list;
      var buckets = {};
      list.forEach(function (c) {
        index[c.id] = c;
        (buckets[c.tier] || (buckets[c.tier] = [])).push(c);
      });
      bySet[sid] = buckets;
    });
  }

  /* ------------------------------------------------------------ art sources */
  /* Preference order: the real printed card scan from a public TCG CDN, then a
     second CDN, then the bundled official artwork rendered into a drawn frame.
     The game looks complete even with no network at all. */
  function cardImageSources(c) {
    var num = encodeURIComponent(c.number);
    return [
      'https://images.pokemontcg.io/' + c.set + '/' + num + '_hires.png',
      'https://images.pokemontcg.io/' + c.set + '/' + num + '.png',
      'https://images.scrydex.com/pokemon/' + c.id + '-large/large'
    ];
  }

  function localArt(c) {
    return c.dex ? 'art/' + c.dex + '.webp' : null;
  }

  function setLogoSources(set) {
    return [
      'https://images.pokemontcg.io/' + set.id + '/logo.png',
      'https://images.scrydex.com/pokemon/' + set.id + '-logo/logo'
    ];
  }

  /* --------------------------------------------------------------- helpers */
  function tierOf(c) { return global.GameSets.tiers[c.tier]; }

  function cardsIn(setId, tier) {
    return (bySet[setId] && bySet[setId][tier]) || [];
  }

  /* Nearest non-empty tier at or below `tier`, so pack generation never fails
     on a set that happens to lack a bucket. */
  function cardsAtOrBelow(setId, tier) {
    for (var t = tier; t >= 0; t--) {
      var list = cardsIn(setId, t);
      if (list.length) return list;
    }
    for (var u = tier + 1; u <= 6; u++) {
      var up = cardsIn(setId, u);
      if (up.length) return up;
    }
    return allBySet[setId] || [];
  }

  function formatNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  global.Core = {
    mulberry32: mulberry32,
    hashStr: hashStr,
    pick: pick,
    weightedIndex: weightedIndex,
    energy: energy,
    ENERGY: ENERGY,
    buildIndex: buildIndex,
    card: function (id) { return index[id]; },
    allCards: function (sid) { return allBySet[sid] || []; },
    cardsIn: cardsIn,
    cardsAtOrBelow: cardsAtOrBelow,
    tierOf: tierOf,
    cardImageSources: cardImageSources,
    setLogoSources: setLogoSources,
    localArt: localArt,
    formatNum: formatNum
  };
})(window);
