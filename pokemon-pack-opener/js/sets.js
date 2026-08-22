/* =============================================================================
   sets.js — booster set metadata
   -----------------------------------------------------------------------------
   Names, release years and card totals are the real printed values. The palette
   / mascot / style fields drive the procedurally drawn wrapper art so each pack
   reads like the real booster it is modelled on.

   slots  : the pack's card structure, opened left to right (last = the hit slot)
   odds   : tier weights for the "rare" and "hit" slots; index = card tier
   ========================================================================== */
(function (global) {
  'use strict';

  // Tier names, colours and economics. Index = tier.
  var TIERS = [
    { key: 'common',   name: 'Common',            color: '#b6c2d1', glow: '#8fa3bb', value: 6,    xp: 1,   foil: null },
    { key: 'uncommon', name: 'Uncommon',          color: '#63d29a', glow: '#2fbf7a', value: 14,   xp: 2,   foil: null },
    { key: 'rare',     name: 'Rare',              color: '#5cb2ff', glow: '#2f8fff', value: 45,   xp: 6,   foil: 'holo' },
    { key: 'ultra',    name: 'Double Rare',       color: '#c77dff', glow: '#9d4edd', value: 180,  xp: 18,  foil: 'holo' },
    { key: 'illus',    name: 'Illustration Rare', color: '#ffd166', glow: '#ffb703', value: 620,  xp: 46,  foil: 'texture' },
    { key: 'special',  name: 'Special Illustration Rare', color: '#ff7ec7', glow: '#ff2e93', value: 2100, xp: 130, foil: 'rainbow' },
    { key: 'hyper',    name: 'Hyper Rare',        color: '#ffe45e', glow: '#ffcc00', value: 5400, xp: 300, foil: 'gold' }
  ];

  function slots(common, uncommon, reverse, rare, hit) {
    var a = [];
    for (var i = 0; i < common; i++) a.push('common');
    for (var j = 0; j < uncommon; j++) a.push('uncommon');
    if (reverse) a.push('reverse');
    if (rare) a.push('rare');
    if (hit) a.push('hit');
    return a;
  }

  // Default modern-era hit odds (index = tier).
  var MODERN_HIT = [0, 0, 0.44, 0.27, 0.192, 0.066, 0.032];
  var MODERN_RARE = [0, 0, 0.79, 0.21, 0, 0, 0];

  var SETS = [
    {
      id: 'sv3pt5', name: '151', series: 'Scarlet & Violet', year: 2023, printed: 165,
      code: 'MEW', price: 160, unlock: 1, mascot: 151, chase: 'Mew ex',
      style: 'modern',
      palette: { a: '#f2453d', b: '#8c1410', c: '#ffd9a0', accent: '#ffd166', ink: '#fff6e8' },
      blurb: 'Kanto, remastered. Every original 151 with modern chase art.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: MODERN_RARE, hit: [0, 0, 0.42, 0.27, 0.20, 0.075, 0.035] }
    },
    {
      id: 'sv8', name: 'Surging Sparks', series: 'Scarlet & Violet', year: 2024, printed: 191,
      code: 'SSP', price: 150, unlock: 1, mascot: 25, chase: 'Pikachu ex',
      style: 'modern',
      palette: { a: '#ffd52e', b: '#5b2a86', c: '#fff3b0', accent: '#7de2ff', ink: '#2a1b3d' },
      blurb: 'Voltage everywhere. The set that made Pikachu ex a household name.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: MODERN_RARE, hit: MODERN_HIT }
    },
    {
      id: 'swsh7', name: 'Evolving Skies', series: 'Sword & Shield', year: 2021, printed: 203,
      code: 'EVS', price: 185, unlock: 2, mascot: 384, chase: 'Umbreon VMAX',
      style: 'modern',
      palette: { a: '#2aa7dd', b: '#0b3f68', c: '#bdf0ff', accent: '#7bd389', ink: '#f2fbff' },
      blurb: 'Dragons and Eeveelutions. Widely considered the best modern set.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: MODERN_RARE, hit: [0, 0, 0.40, 0.26, 0.215, 0.086, 0.039] }
    },
    {
      id: 'sv10', name: 'Destined Rivals', series: 'Scarlet & Violet', year: 2025, printed: 182,
      code: 'DRI', price: 170, unlock: 3, mascot: 150, chase: "Team Rocket's Mewtwo ex",
      style: 'modern',
      palette: { a: '#c1121f', b: '#12080a', c: '#ff8fa3', accent: '#e0e0e0', ink: '#fff0f2' },
      blurb: 'Team Rocket returns. Villain-themed alt arts and a brutal hit ratio.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: MODERN_RARE, hit: MODERN_HIT }
    },
    {
      id: 'xy1', name: 'XY', series: 'XY', year: 2014, printed: 146,
      code: 'XY', price: 130, unlock: 5, mascot: 716, chase: 'Xerneas EX',
      style: 'classic',
      palette: { a: '#1a5eb8', b: '#0a2547', c: '#9fd8ff', accent: '#c0c9d6', ink: '#eaf4ff' },
      blurb: 'Kalos begins. Mega Evolution and the first full-art EX era.',
      slots: slots(5, 3, true, true, false),
      odds: { rare: [0, 0, 0.86, 0.14, 0, 0, 0], hit: [0, 0, 0.6, 0.28, 0.12, 0, 0] }
    },
    {
      id: 'sm1', name: 'Sun & Moon', series: 'Sun & Moon', year: 2017, printed: 149,
      code: 'SUM', price: 140, unlock: 5, mascot: 791, chase: 'Solgaleo GX',
      style: 'classic',
      palette: { a: '#f4801f', b: '#57258a', c: '#ffd6a5', accent: '#ffe066', ink: '#fff4e6' },
      blurb: 'Alola arrives and GX attacks change the game forever.',
      slots: slots(5, 3, true, true, false),
      odds: { rare: [0, 0, 0.82, 0.18, 0, 0, 0], hit: [0, 0, 0.52, 0.26, 0.14, 0.06, 0.02] }
    },
    {
      id: 'sv4pt5', name: 'Paldean Fates', series: 'Scarlet & Violet', year: 2024, printed: 91,
      code: 'PAF', price: 195, unlock: 7, mascot: 1000, chase: 'Shiny Charizard ex',
      style: 'shiny',
      palette: { a: '#16b8a8', b: '#07393c', c: '#c8fff4', accent: '#ffd166', ink: '#eafffb' },
      blurb: 'A shiny-stuffed special set. Nearly every slot can sparkle.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: [0, 0, 0.72, 0.28, 0, 0, 0], hit: [0, 0, 0.20, 0.16, 0.47, 0.115, 0.055] }
    },
    {
      id: 'swsh12pt5', name: 'Crown Zenith', series: 'Sword & Shield', year: 2023, printed: 159,
      code: 'CRZ', price: 180, unlock: 9, mascot: 487, chase: 'Giratina VSTAR',
      style: 'gold',
      palette: { a: '#d4af37', b: '#16213e', c: '#ffe9a8', accent: '#8ecae6', ink: '#fff8e1' },
      blurb: 'The crown on the Sword & Shield era. Galarian Gallery alt arts.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: [0, 0, 0.74, 0.26, 0, 0, 0], hit: [0, 0, 0.38, 0.28, 0.22, 0.09, 0.03] }
    },
    {
      id: 'sv8pt5', name: 'Prismatic Evolutions', series: 'Scarlet & Violet', year: 2025, printed: 131,
      code: 'PRE', price: 240, unlock: 12, mascot: 133, chase: 'Umbreon ex',
      style: 'prism',
      palette: { a: '#8ecae6', b: '#3a0ca3', c: '#ffc8dd', accent: '#caffbf', ink: '#ffffff' },
      blurb: 'The Eeveelution set. Absurd chase prices, absurd pull rates.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: [0, 0, 0.62, 0.38, 0, 0, 0], hit: [0, 0, 0.26, 0.30, 0.22, 0.165, 0.055] }
    },
    {
      id: 'me1', name: 'Mega Evolution', series: 'Mega Evolution', year: 2025, printed: 132,
      code: 'MEG', price: 205, unlock: 15, mascot: 448, chase: 'Mega Lucario ex',
      style: 'mega',
      palette: { a: '#7b2fd4', b: '#1b0b3b', c: '#e0aaff', accent: '#00f5d4', ink: '#f5ecff' },
      blurb: 'Mega Evolution returns with a brand new era of chase cards.',
      slots: slots(4, 3, true, true, true),
      odds: { rare: MODERN_RARE, hit: [0, 0, 0.40, 0.27, 0.205, 0.083, 0.042] }
    },
    {
      id: 'base1', name: 'Base Set', series: 'Original', year: 1999, printed: 102,
      code: 'BS', price: 400, unlock: 18, mascot: 6, chase: 'Charizard',
      style: 'vintage',
      palette: { a: '#1b8a6b', b: '#0a3b2e', c: '#9fe6c8', accent: '#ffcb05', ink: '#fffbe6' },
      blurb: 'The one that started it all. 1999 wrapper, 1999 odds, no reprints.',
      slots: slots(7, 3, false, true, false),
      odds: { rare: [0, 0, 1, 0, 0, 0, 0], hit: [0, 0, 1, 0, 0, 0, 0] }
    }
  ];

  // Pity: guarantee escalating rarity if a player goes dry.
  var PITY = { tier4: 14, tier5: 42, godPack: 256 };

  var byId = {};
  SETS.forEach(function (s) { byId[s.id] = s; });

  global.GameSets = {
    list: SETS,
    byId: byId,
    tiers: TIERS,
    pity: PITY,
    get: function (id) { return byId[id]; }
  };
})(window);
