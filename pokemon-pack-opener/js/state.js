/* =============================================================================
   state.js — save file, economy, levelling, quests, achievements, streaks
   -----------------------------------------------------------------------------
   One localStorage blob. Every mutation goes through here so the HUD can be
   driven off a single change event.
   ========================================================================== */
(function (global) {
  'use strict';

  var KEY = 'pkmn-pack-opener-save-v1';
  var listeners = [];
  var S = null;

  var FREE_PACK_MS = 10 * 60 * 1000;   // a free pack brews every 10 minutes
  var FREE_PACK_MAX = 3;

  function defaults() {
    return {
      v: 1,
      coins: 600,
      xp: 0,
      level: 1,
      packsOpened: 0,
      cardsPulled: 0,
      collection: {},           // cardId -> count owned
      firstSeen: {},            // cardId -> timestamp (for "NEW" badges)
      pity: { sinceT4: 0, sinceT5: 0, sincePity: 0, sinceGod: 0 },
      streak: { count: 0, lastClaim: 0 },
      freePacks: 1,
      freePackAt: Date.now(),
      quests: { day: 0, list: [] },
      achievements: {},
      stats: { byTier: [0, 0, 0, 0, 0, 0, 0], bySet: {}, bestPull: null, sold: 0, earned: 0, spent: 0 },
      settings: { sfx: 0.85, music: 0.3, muted: false, reduceMotion: false, fastReveal: false },
      seenIntro: false,
      createdAt: Date.now()
    };
  }

  /* ------------------------------------------------------------ persistence */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        S = Object.assign(defaults(), parsed);
        // Merge nested objects that gained fields between versions.
        S.pity = Object.assign(defaults().pity, parsed.pity || {});
        S.stats = Object.assign(defaults().stats, parsed.stats || {});
        S.settings = Object.assign(defaults().settings, parsed.settings || {});
        S.streak = Object.assign(defaults().streak, parsed.streak || {});
        if (!Array.isArray(S.stats.byTier) || S.stats.byTier.length !== 7) {
          S.stats.byTier = [0, 0, 0, 0, 0, 0, 0];
        }
      } else {
        S = defaults();
      }
    } catch (e) {
      S = defaults();
    }
    accrueFreePacks();
    refreshQuests();
    return S;
  }

  var saveTimer = null;
  function save(immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    var write = function () {
      saveTimer = null;
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    };
    if (immediate) write(); else saveTimer = setTimeout(write, 250);
  }

  function emit(what, detail) {
    listeners.forEach(function (fn) {
      try { fn(what, detail); } catch (e) { console.error(e); }
    });
  }

  /* ---------------------------------------------------------------- levels */
  function xpForLevel(n) { return Math.round(120 * Math.pow(n, 1.42)); }

  function levelProgress() {
    var need = xpForLevel(S.level);
    return { have: S.xp, need: need, pct: Math.max(0, Math.min(1, S.xp / need)) };
  }

  function addXp(amount) {
    S.xp += amount;
    var levelled = [];
    while (S.xp >= xpForLevel(S.level)) {
      S.xp -= xpForLevel(S.level);
      S.level++;
      var reward = 150 + S.level * 60;
      S.coins += reward;
      S.stats.earned += reward;
      var unlocked = global.GameSets.list.filter(function (s) { return s.unlock === S.level; });
      levelled.push({ level: S.level, reward: reward, unlocked: unlocked });
    }
    if (levelled.length) emit('levelup', levelled);
    return levelled;
  }

  /* ---------------------------------------------------------------- economy */
  function addCoins(n, reason) {
    S.coins = Math.max(0, S.coins + n);
    if (n > 0) S.stats.earned += n; else S.stats.spent += -n;
    emit('coins', { delta: n, reason: reason });
    save();
  }

  function canAfford(n) { return S.coins >= n; }

  /* ------------------------------------------------------------- collection */
  function ownedCount(id) { return S.collection[id] || 0; }

  function addCard(card) {
    var had = S.collection[card.id] || 0;
    S.collection[card.id] = had + 1;
    if (!had) S.firstSeen[card.id] = Date.now();
    S.cardsPulled++;
    S.stats.byTier[card.tier]++;
    S.stats.bySet[card.set] = (S.stats.bySet[card.set] || 0) + 1;
    if (!S.stats.bestPull || card.value > S.stats.bestPull.value) {
      S.stats.bestPull = { id: card.id, value: card.value };
    }
    return had === 0;   // true = new to the collection
  }

  function setCompletion(setId) {
    var all = global.Core.allCards(setId);
    var owned = 0;
    for (var i = 0; i < all.length; i++) if (S.collection[all[i].id]) owned++;
    return { owned: owned, total: all.length, pct: all.length ? owned / all.length : 0 };
  }

  function collectionValue() {
    var total = 0;
    for (var id in S.collection) {
      var c = global.Core.card(id);
      if (c) total += c.value * S.collection[id];
    }
    return total;
  }

  function uniqueOwned() { return Object.keys(S.collection).length; }

  function duplicatesOf(id) { return Math.max(0, (S.collection[id] || 0) - 1); }

  /* Selling a duplicate returns half market value; you can never sell your last
     copy, so a completed binder stays completed. */
  function sellDuplicate(id, qty) {
    var c = global.Core.card(id);
    if (!c) return 0;
    var dupes = duplicatesOf(id);
    qty = Math.max(0, Math.min(qty == null ? dupes : qty, dupes));
    if (!qty) return 0;
    var payout = Math.round(c.value * 0.5) * qty;
    S.collection[id] -= qty;
    S.stats.sold += qty;
    addCoins(payout, 'sell');
    progressQuest('sell', qty);
    save();
    return payout;
  }

  function sellAllDuplicates(maxTier) {
    var total = 0, count = 0;
    Object.keys(S.collection).forEach(function (id) {
      var c = global.Core.card(id);
      if (!c) return;
      if (maxTier != null && c.tier > maxTier) return;
      var d = duplicatesOf(id);
      if (d > 0) { total += sellDuplicate(id, d); count += d; }
    });
    return { coins: total, count: count };
  }

  /* ------------------------------------------------------------ free packs */
  function accrueFreePacks() {
    var now = Date.now();
    if (S.freePacks >= FREE_PACK_MAX) { S.freePackAt = now; return; }
    var elapsed = now - (S.freePackAt || now);
    if (elapsed <= 0) return;
    var gained = Math.floor(elapsed / FREE_PACK_MS);
    if (gained > 0) {
      S.freePacks = Math.min(FREE_PACK_MAX, S.freePacks + gained);
      S.freePackAt = S.freePacks >= FREE_PACK_MAX ? now : S.freePackAt + gained * FREE_PACK_MS;
    }
  }

  function freePackTimer() {
    accrueFreePacks();
    if (S.freePacks >= FREE_PACK_MAX) return 0;
    return Math.max(0, FREE_PACK_MS - (Date.now() - S.freePackAt));
  }

  function useFreePack() {
    accrueFreePacks();
    if (S.freePacks <= 0) return false;
    if (S.freePacks >= FREE_PACK_MAX) S.freePackAt = Date.now();
    S.freePacks--;
    save();
    return true;
  }

  /* ---------------------------------------------------------- daily streak */
  function dayNumber(ts) { return Math.floor((ts - new Date(ts).getTimezoneOffset() * 60000) / 86400000); }

  function streakStatus() {
    var today = dayNumber(Date.now());
    var last = S.streak.lastClaim ? dayNumber(S.streak.lastClaim) : -999;
    return { claimable: today > last, today: today, last: last, count: S.streak.count };
  }

  function claimDaily() {
    var st = streakStatus();
    if (!st.claimable) return null;
    S.streak.count = (st.today === st.last + 1) ? S.streak.count + 1 : 1;
    S.streak.lastClaim = Date.now();
    var day = Math.min(S.streak.count, 7);
    var coins = 200 + day * 150;
    var packs = day >= 7 ? 2 : (day >= 4 ? 1 : 0);
    addCoins(coins, 'daily');
    S.freePacks = Math.min(FREE_PACK_MAX + packs, S.freePacks + packs);
    save(true);
    return { day: S.streak.count, coins: coins, packs: packs };
  }

  /* ---------------------------------------------------------------- quests */
  var QUEST_POOL = [
    { id: 'open3',    kind: 'open',  goal: 3,  reward: 220,  text: 'Open 3 booster packs' },
    { id: 'open6',    kind: 'open',  goal: 6,  reward: 460,  text: 'Open 6 booster packs' },
    { id: 'new5',     kind: 'new',   goal: 5,  reward: 300,  text: 'Add 5 new cards to the binder' },
    { id: 'new12',    kind: 'new',   goal: 12, reward: 620,  text: 'Add 12 new cards to the binder' },
    { id: 'tier3',    kind: 'tier3', goal: 2,  reward: 340,  text: 'Pull 2 Double Rares or better' },
    { id: 'tier4',    kind: 'tier4', goal: 1,  reward: 700,  text: 'Pull an Illustration Rare or better' },
    { id: 'tier5',    kind: 'tier5', goal: 1,  reward: 1500, text: 'Pull a Special Illustration Rare or better' },
    { id: 'sell10',   kind: 'sell',  goal: 10, reward: 260,  text: 'Sell 10 duplicate cards' },
    { id: 'sets2',    kind: 'sets',  goal: 2,  reward: 380,  text: 'Open packs from 2 different sets' }
  ];

  function refreshQuests() {
    var today = dayNumber(Date.now());
    if (S.quests.day === today && S.quests.list.length) return;
    var pool = QUEST_POOL.slice();
    var rng = global.Core ? global.Core.mulberry32(today * 2654435761) : Math.random;
    var chosen = [];
    while (chosen.length < 3 && pool.length) {
      var i = Math.floor((typeof rng === 'function' ? rng() : Math.random()) * pool.length);
      chosen.push(pool.splice(i, 1)[0]);
    }
    S.quests = {
      day: today,
      list: chosen.map(function (q) {
        return { id: q.id, kind: q.kind, goal: q.goal, reward: q.reward, text: q.text, progress: 0, claimed: false };
      }),
      setsSeen: []
    };
    save();
  }

  function progressQuest(kind, amount, extra) {
    var changed = false;
    (S.quests.list || []).forEach(function (q) {
      if (q.claimed || q.progress >= q.goal) return;
      var hit = false;
      if (q.kind === kind) hit = true;
      if (kind === 'tier' && /^tier(\d)$/.test(q.kind)) {
        hit = extra >= parseInt(q.kind.slice(4), 10);
        amount = hit ? 1 : 0;
      }
      if (kind === 'setopen' && q.kind === 'sets') {
        S.quests.setsSeen = S.quests.setsSeen || [];
        if (S.quests.setsSeen.indexOf(extra) === -1) {
          S.quests.setsSeen.push(extra);
          q.progress = S.quests.setsSeen.length;
          changed = true;
        }
        return;
      }
      if (hit && amount > 0) { q.progress = Math.min(q.goal, q.progress + amount); changed = true; }
    });
    if (changed) { emit('quests'); save(); }
  }

  function claimQuest(id) {
    var q = (S.quests.list || []).filter(function (x) { return x.id === id; })[0];
    if (!q || q.claimed || q.progress < q.goal) return null;
    q.claimed = true;
    addCoins(q.reward, 'quest');
    save(true);
    emit('quests');
    return q;
  }

  /* ---------------------------------------------------------- achievements */
  var ACHIEVEMENTS = [
    { id: 'first',    name: 'First Rip',        desc: 'Open your first pack',                   test: function (s) { return s.packsOpened >= 1; },  reward: 150 },
    { id: 'ten',      name: 'Getting Started',  desc: 'Open 10 packs',                          test: function (s) { return s.packsOpened >= 10; }, reward: 300 },
    { id: 'fifty',    name: 'Pack Addict',      desc: 'Open 50 packs',                          test: function (s) { return s.packsOpened >= 50; }, reward: 900 },
    { id: 'hundred',  name: 'Case Cracker',     desc: 'Open 100 packs',                         test: function (s) { return s.packsOpened >= 100; }, reward: 2200 },
    { id: 'ultra',    name: 'Chase Hunter',     desc: 'Pull an Illustration Rare',              test: function (s) { return s.stats.byTier[4] >= 1; }, reward: 400 },
    { id: 'special',  name: 'Alt Art Enjoyer',  desc: 'Pull a Special Illustration Rare',       test: function (s) { return s.stats.byTier[5] >= 1; }, reward: 900 },
    { id: 'gold',     name: 'Solid Gold',       desc: 'Pull a Hyper Rare',                      test: function (s) { return s.stats.byTier[6] >= 1; }, reward: 1600 },
    { id: 'coll100',  name: 'Binder Filler',    desc: 'Own 100 unique cards',                   test: function () { return uniqueOwned() >= 100; }, reward: 500 },
    { id: 'coll500',  name: 'Serious Collector',desc: 'Own 500 unique cards',                   test: function () { return uniqueOwned() >= 500; }, reward: 2500 },
    { id: 'rich',     name: 'Portfolio',        desc: 'Reach 100,000 in collection value',      test: function () { return collectionValue() >= 100000; }, reward: 3000 },
    { id: 'streak7',  name: 'Seven Days',       desc: 'Reach a 7 day login streak',             test: function (s) { return s.streak.count >= 7; }, reward: 2000 },
    { id: 'master',   name: 'Master Set',       desc: 'Complete any set 100%',                  test: function () {
        return global.GameSets.list.some(function (st) { return setCompletion(st.id).pct >= 1; }); }, reward: 10000 }
  ];

  function checkAchievements() {
    var newly = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (S.achievements[a.id]) return;
      var ok = false;
      try { ok = a.test(S); } catch (e) {}
      if (ok) {
        S.achievements[a.id] = Date.now();
        addCoins(a.reward, 'achievement');
        newly.push(a);
      }
    });
    if (newly.length) { save(); emit('achievement', newly); }
    return newly;
  }

  /* ------------------------------------------------------------------- api */
  global.State = {
    load: load,
    save: save,
    get data() { return S; },
    on: function (fn) { listeners.push(fn); },
    emit: emit,

    xpForLevel: xpForLevel,
    levelProgress: levelProgress,
    addXp: addXp,

    addCoins: addCoins,
    canAfford: canAfford,

    ownedCount: ownedCount,
    addCard: addCard,
    setCompletion: setCompletion,
    collectionValue: collectionValue,
    uniqueOwned: uniqueOwned,
    duplicatesOf: duplicatesOf,
    sellDuplicate: sellDuplicate,
    sellAllDuplicates: sellAllDuplicates,

    freePackTimer: freePackTimer,
    useFreePack: useFreePack,
    accrueFreePacks: accrueFreePacks,
    FREE_PACK_MAX: FREE_PACK_MAX,

    streakStatus: streakStatus,
    claimDaily: claimDaily,

    refreshQuests: refreshQuests,
    progressQuest: progressQuest,
    claimQuest: claimQuest,

    achievements: ACHIEVEMENTS,
    checkAchievements: checkAchievements,

    isUnlocked: function (set) { return S.level >= set.unlock; },
    reset: function () { S = defaults(); save(true); emit('reset'); }
  };
})(window);
