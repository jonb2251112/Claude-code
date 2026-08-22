/* =============================================================================
   packs.js — pack generation: slot rolling, duplicate avoidance, pity, god packs
   ========================================================================== */
(function (global) {
  'use strict';

  var Core = global.Core;

  function rollTier(weights) {
    return Core.weightedIndex(weights);
  }

  /* Pick a card of a given tier from a set, avoiding anything already in this
     pack (real packs don't duplicate within a pack). */
  function pickCard(setId, tier, used) {
    var pool = Core.cardsAtOrBelow(setId, tier);
    if (!pool.length) return null;
    for (var attempt = 0; attempt < 12; attempt++) {
      var c = pool[(Math.random() * pool.length) | 0];
      if (!used[c.id]) { used[c.id] = 1; return c; }
    }
    var free = pool.filter(function (c) { return !used[c.id]; });
    var chosen = free.length ? free[(Math.random() * free.length) | 0] : pool[(Math.random() * pool.length) | 0];
    used[chosen.id] = 1;
    return chosen;
  }

  /* Base Set's rare slot should be holo about a third of the time, matching the
     1999 print run rather than a flat pick across the tier. */
  function pickRareWithHoloBias(setId, used, holoChance) {
    var pool = Core.cardsIn(setId, 2);
    if (!pool.length) return pickCard(setId, 2, used);
    var wantHolo = Math.random() < holoChance;
    var filtered = pool.filter(function (c) {
      var isHolo = /Holo/.test(c.rarity);
      return isHolo === wantHolo && !used[c.id];
    });
    if (!filtered.length) return pickCard(setId, 2, used);
    var c = filtered[(Math.random() * filtered.length) | 0];
    used[c.id] = 1;
    return c;
  }

  /* --------------------------------------------------------------- generate */
  function generate(set) {
    var S = global.State.data;
    var pity = S.pity;
    var used = {};
    var out = [];

    pity.sinceGod++;
    var godChance = 1 / global.GameSets.pity.godPack;
    var isGod = pity.sinceGod >= global.GameSets.pity.godPack || Math.random() < godChance;
    // God packs only exist for sets that actually print high tiers.
    if (isGod && !Core.cardsIn(set.id, 4).length && !Core.cardsIn(set.id, 5).length) isGod = false;
    if (isGod) pity.sinceGod = 0;

    // Pity overrides for the hit slot.
    var forceTier = 0;
    if (pity.sinceT5 >= global.GameSets.pity.tier5 && Core.cardsIn(set.id, 5).length) forceTier = 5;
    else if (pity.sinceT4 >= global.GameSets.pity.tier4 && Core.cardsIn(set.id, 4).length) forceTier = 4;

    set.slots.forEach(function (slot, i) {
      var tier = 0, reverse = false;

      if (isGod) {
        // Every slot becomes a hit; weight towards the middle of the top tiers.
        tier = rollTier([0, 0, 0, 0.28, 0.44, 0.2, 0.08]);
      } else if (slot === 'common') {
        tier = 0;
      } else if (slot === 'uncommon') {
        tier = 1;
      } else if (slot === 'reverse') {
        reverse = true;
        tier = rollTier([0.58, 0.32, 0.10, 0, 0, 0, 0]);
      } else if (slot === 'rare') {
        tier = rollTier(set.odds.rare);
      } else if (slot === 'hit') {
        tier = forceTier ? forceTier : rollTier(set.odds.hit);
        if (forceTier) forceTier = 0;
      }

      var card;
      if (slot === 'rare' && set.style === 'vintage' && tier === 2) {
        card = pickRareWithHoloBias(set.id, used, 1 / 3);
      } else {
        card = pickCard(set.id, tier, used);
      }
      if (!card) return;

      out.push({ card: card, slot: slot, reverse: reverse, index: i });
    });

    // Vintage packs have no dedicated hit slot, so the rare can still surprise.
    if (!isGod && set.slots.indexOf('hit') === -1 && Math.random() < 0.06) {
      var bonusTier = Core.cardsIn(set.id, 4).length ? 4 : 3;
      var bonus = pickCard(set.id, bonusTier, used);
      if (bonus) {
        var last = out[out.length - 1];
        if (last) out[out.length - 1] = { card: bonus, slot: 'hit', reverse: false, index: last.index };
      }
    }

    // Sort so the pack reveals in ascending excitement — the hit lands last.
    out.sort(function (a, b) {
      if (a.card.tier !== b.card.tier) return a.card.tier - b.card.tier;
      return a.index - b.index;
    });

    var best = out.reduce(function (m, e) {
      return (!m || e.card.tier > m.card.tier ||
             (e.card.tier === m.card.tier && e.card.value > m.card.value)) ? e : m;
    }, null);

    // Flag which cards are new now, while the collection is still untouched,
    // so the reveal can show NEW badges before the pack is committed.
    out.forEach(function (e) { e.isNew = !global.State.ownedCount(e.card.id); });

    // Update pity counters against what actually came out.
    var maxTier = best ? best.card.tier : 0;
    pity.sinceT4 = maxTier >= 4 ? 0 : pity.sinceT4 + 1;
    pity.sinceT5 = maxTier >= 5 ? 0 : pity.sinceT5 + 1;

    return { set: set, entries: out, god: isGod, best: best };
  }

  /* Commits a generated pack to the save file and returns a summary. */
  function commit(pack) {
    var S = global.State.data;
    var newCount = 0, value = 0, xp = 0;
    var tiers = global.GameSets.tiers;

    pack.entries.forEach(function (e) {
      var isNew = global.State.addCard(e.card);
      e.isNew = isNew;
      if (isNew) newCount++;
      value += e.card.value;
      xp += tiers[e.card.tier].xp + (isNew ? 3 : 0);
      global.State.progressQuest('tier', 1, e.card.tier);
    });

    S.packsOpened++;
    if (pack.god) xp = Math.round(xp * 1.5);

    global.State.progressQuest('open', 1);
    global.State.progressQuest('new', newCount);
    global.State.progressQuest('setopen', 1, pack.set.id);

    var levels = global.State.addXp(xp);
    var achievements = global.State.checkAchievements();
    global.State.save();

    return {
      newCount: newCount,
      value: value,
      xp: xp,
      levels: levels,
      achievements: achievements
    };
  }

  global.Packs = { generate: generate, commit: commit };
})(window);
