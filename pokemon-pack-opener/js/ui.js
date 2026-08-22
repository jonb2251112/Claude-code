/* =============================================================================
   ui.js — HUD, shop, quests, stats, modals, navigation
   ========================================================================== */
(function (global) {
  'use strict';

  var Core = global.Core, Sfx = global.Sfx, Fx = global.Fx;
  var current = 'shop';
  var freeTimerHandle = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function $(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------------- nav */
  function go(screen) {
    if (screen === current && screen !== 'shop') return;
    current = screen;
    ['shop', 'binder', 'quests', 'stats'].forEach(function (s) {
      var node = $('screen-' + s);
      if (node) node.classList.toggle('is-active', s === screen);
      var tab = document.querySelector('[data-nav="' + s + '"]');
      if (tab) tab.classList.toggle('is-on', s === screen);
    });
    if (screen === 'binder') global.Binder.render($('screen-binder'));
    if (screen === 'quests') renderQuests();
    if (screen === 'stats') renderStats();
    if (screen === 'shop') renderShop();
    document.querySelector('.app__main').scrollTop = 0;
  }

  /* ------------------------------------------------------------------- HUD */
  function renderHud() {
    var S = global.State.data;
    var prog = global.State.levelProgress();

    $('hud-level').textContent = S.level;
    $('hud-xpfill').style.width = (prog.pct * 100).toFixed(1) + '%';
    $('hud-xptext').textContent = Core.formatNum(prog.have) + ' / ' + Core.formatNum(prog.need) + ' XP';

    var coinEl = $('hud-coins');
    var prev = parseInt(coinEl.dataset.value || '0', 10);
    animateNumber(coinEl, prev, S.coins);
    coinEl.dataset.value = S.coins;

    $('hud-free').textContent = S.freePacks;
    $('hud-freewrap').classList.toggle('is-ready', S.freePacks > 0);

    var st = global.State.streakStatus();
    var sbtn = $('hud-daily');
    sbtn.classList.toggle('is-ready', st.claimable);
    sbtn.querySelector('.hud__streaknum').textContent = S.streak.count;

    var qBadge = $('nav-quest-badge');
    var claimable = (S.quests.list || []).filter(function (q) { return !q.claimed && q.progress >= q.goal; }).length;
    qBadge.textContent = claimable;
    qBadge.classList.toggle('is-on', claimable > 0);
  }

  function animateNumber(node, from, to) {
    if (from === to) { node.textContent = Core.formatNum(to); return; }
    var t0 = performance.now(), dur = 520;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      node.textContent = Core.formatNum(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function startFreeTimer() {
    clearInterval(freeTimerHandle);
    freeTimerHandle = setInterval(function () {
      var S = global.State.data;
      var before = S.freePacks;
      var ms = global.State.freePackTimer();
      var label = $('hud-freetimer');
      if (S.freePacks >= global.State.FREE_PACK_MAX) label.textContent = 'FULL';
      else {
        var s = Math.ceil(ms / 1000);
        label.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      }
      if (S.freePacks !== before) {
        renderHud();
        if (current === 'shop') renderShop();
        Fx.toast('A free pack is ready.', { icon: '🎁', kind: 'gold' });
        Sfx.newCard();
      }
    }, 1000);
  }

  /* ------------------------------------------------------------------ shop */
  function renderShop() {
    var wrap = $('shop-grid');
    if (!wrap) return;
    wrap.innerHTML = '';
    var S = global.State.data;

    global.GameSets.list.forEach(function (set, i) {
      var unlocked = global.State.isUnlocked(set);
      var comp = global.State.setCompletion(set.id);

      var card = el('div', 'shopitem' + (unlocked ? '' : ' is-locked'));
      card.style.setProperty('--d', (i * 45) + 'ms');
      card.style.setProperty('--pa', set.palette.a);
      card.style.setProperty('--pb', set.palette.b);
      card.style.setProperty('--pac', set.palette.accent);

      var packWrap = el('div', 'shopitem__pack');
      packWrap.appendChild(global.PackView.create(set));
      card.appendChild(packWrap);

      var info = el('div', 'shopitem__info');
      var titleRow = el('div', 'shopitem__titlerow');
      titleRow.appendChild(el('h3', 'shopitem__name', set.name));
      titleRow.appendChild(el('span', 'shopitem__year', String(set.year)));
      info.appendChild(titleRow);
      info.appendChild(el('p', 'shopitem__blurb', set.blurb));

      var meta = el('div', 'shopitem__meta');
      meta.appendChild(tag(set.slots.length + ' cards'));
      meta.appendChild(tag('Chase: ' + set.chase));
      info.appendChild(meta);

      var prog = el('div', 'shopitem__prog');
      var pbar = el('div', 'shopitem__bar');
      var pfill = el('div', 'shopitem__fill');
      pfill.style.width = (comp.pct * 100).toFixed(1) + '%';
      pbar.appendChild(pfill);
      prog.appendChild(pbar);
      prog.appendChild(el('span', 'shopitem__progtext',
        comp.owned + '/' + comp.total + ' collected' + (comp.pct >= 1 ? ' 👑' : '')));
      info.appendChild(prog);

      var actions = el('div', 'shopitem__actions');
      if (!unlocked) {
        var lock = el('div', 'shopitem__lock');
        lock.appendChild(el('span', 'shopitem__lockicon', '🔒'));
        lock.appendChild(el('span', null, 'Unlocks at level ' + set.unlock));
        actions.appendChild(lock);
      } else {
        var buy = el('button', 'btn btn--primary btn--buy');
        buy.type = 'button';
        buy.appendChild(el('span', null, 'Open pack'));
        var cost = el('span', 'btn__cost');
        cost.appendChild(el('span', 'coin-ico'));
        cost.appendChild(el('span', null, Core.formatNum(set.price)));
        buy.appendChild(cost);
        if (!global.State.canAfford(set.price)) buy.classList.add('is-poor');
        buy.addEventListener('click', function () { buyAndOpen(set); });
        actions.appendChild(buy);

        if (S.freePacks > 0) {
          var free = el('button', 'btn btn--free', 'Use free pack');
          free.type = 'button';
          free.addEventListener('click', function () { openFree(set); });
          actions.appendChild(free);
        }

        var odds = el('button', 'linkbtn', 'Pull rates');
        odds.type = 'button';
        odds.addEventListener('click', function () { showOdds(set); });
        actions.appendChild(odds);
      }
      info.appendChild(actions);
      card.appendChild(info);
      wrap.appendChild(card);
    });
  }

  function tag(text) { return el('span', 'tag', text); }

  function buyAndOpen(set) {
    if (!global.State.isUnlocked(set)) { Sfx.error(); return; }
    if (!global.State.canAfford(set.price)) {
      Sfx.error();
      Fx.toast('Not enough coins — sell some duplicates in the binder.', { icon: '🪙', kind: 'warn' });
      return;
    }
    global.State.addCoins(-set.price, 'pack');
    launchOpen(set);
  }

  function openFree(set) {
    if (!global.State.useFreePack()) { Sfx.error(); return; }
    Fx.toast('Free pack used.', { icon: '🎁' });
    launchOpen(set);
  }

  function launchOpen(set) {
    Sfx.click();
    renderHud();
    document.body.classList.add('is-opening');
    $('open-overlay').classList.add('is-on');
    global.Opener.start(set, {
      onExit: function () {
        document.body.classList.remove('is-opening');
        $('open-overlay').classList.remove('is-on');
        renderHud();
        renderShop();
      }
    });
  }

  function showOdds(set) {
    var tiers = global.GameSets.tiers;
    var body = el('div', 'odds');
    body.appendChild(el('p', 'odds__lead',
      'Each ' + set.name + ' pack contains ' + set.slots.length + ' cards. The final slot is ' +
      'where the chase lives — these are that slot\u2019s odds.'));

    var table = el('div', 'odds__table');
    var hitOdds = set.odds.hit;
    var hasHit = set.slots.indexOf('hit') !== -1;
    var source = hasHit ? hitOdds : set.odds.rare;
    for (var t = 2; t <= 6; t++) {
      if (!source[t]) continue;
      var row = el('div', 'odds__row');
      var sw = el('span', 'odds__sw');
      sw.style.background = tiers[t].color;
      row.appendChild(sw);
      row.appendChild(el('span', 'odds__name', tiers[t].name));
      var pct = source[t] * 100;
      row.appendChild(el('span', 'odds__pct', pct >= 1 ? pct.toFixed(1) + '%' : pct.toFixed(2) + '%'));
      row.appendChild(el('span', 'odds__one', '~1 in ' + Math.round(1 / source[t])));
      table.appendChild(row);
    }
    body.appendChild(table);

    var pity = el('div', 'odds__pity');
    pity.appendChild(el('strong', null, 'Safety nets'));
    var ul = el('ul');
    [['Illustration Rare or better', 'guaranteed within ' + global.GameSets.pity.tier4 + ' packs'],
     ['Special Illustration Rare or better', 'guaranteed within ' + global.GameSets.pity.tier5 + ' packs'],
     ['God Pack (every slot a hit)', 'rolled at 1 in ' + global.GameSets.pity.godPack +
      ', and guaranteed if you ever go ' + global.GameSets.pity.godPack + ' without one']].forEach(function (r) {
      var li = el('li');
      li.appendChild(el('strong', null, r[0] + ': '));
      li.appendChild(el('span', null, r[1]));
      ul.appendChild(li);
    });
    pity.appendChild(ul);
    body.appendChild(pity);

    body.appendChild(el('p', 'odds__note',
      'These are game rates, not the real print run — hits land several times more ' +
      'often here than they do in a real booster box. Card data, sets and rarities ' +
      'are the genuine printed ones.'));

    modal({ title: set.name + ' pull rates', node: body });
  }

  /* ---------------------------------------------------------------- quests */
  function renderQuests() {
    var wrap = $('screen-quests');
    wrap.innerHTML = '';
    global.State.refreshQuests();
    var S = global.State.data;

    var head = el('div', 'screen__head');
    head.appendChild(el('h2', 'screen__title', 'Daily Quests'));
    head.appendChild(el('p', 'screen__sub', 'Resets every day. Streak bonuses stack.'));
    wrap.appendChild(head);

    var list = el('div', 'quests');
    (S.quests.list || []).forEach(function (q) {
      var done = q.progress >= q.goal;
      var row = el('div', 'quest' + (q.claimed ? ' is-claimed' : (done ? ' is-done' : '')));
      var left = el('div', 'quest__left');
      left.appendChild(el('span', 'quest__text', q.text));
      var bar = el('div', 'quest__bar');
      var fill = el('div', 'quest__fill');
      fill.style.width = Math.min(100, (q.progress / q.goal) * 100) + '%';
      bar.appendChild(fill);
      left.appendChild(bar);
      left.appendChild(el('span', 'quest__prog', q.progress + ' / ' + q.goal));
      row.appendChild(left);

      var right = el('div', 'quest__right');
      var reward = el('div', 'quest__reward');
      reward.appendChild(el('span', 'coin-ico'));
      reward.appendChild(el('span', null, Core.formatNum(q.reward)));
      right.appendChild(reward);

      if (q.claimed) {
        right.appendChild(el('span', 'quest__claimed', 'Claimed'));
      } else {
        var btn = el('button', 'btn btn--sm' + (done ? ' btn--primary' : ''), done ? 'Claim' : 'In progress');
        btn.type = 'button';
        btn.disabled = !done;
        btn.addEventListener('click', function () {
          var claimed = global.State.claimQuest(q.id);
          if (claimed) {
            Sfx.coinBurst(6);
            Fx.toast('+' + Core.formatNum(claimed.reward) + ' coins', { icon: '🪙', kind: 'gold' });
            Fx.confetti({ count: 40 });
            renderQuests();
            renderHud();
          }
        });
        right.appendChild(btn);
      }
      row.appendChild(right);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    // Achievements
    var ah = el('div', 'screen__head');
    ah.appendChild(el('h2', 'screen__title', 'Achievements'));
    var got = Object.keys(S.achievements).length;
    ah.appendChild(el('p', 'screen__sub', got + ' of ' + global.State.achievements.length + ' unlocked'));
    wrap.appendChild(ah);

    var ag = el('div', 'achievements');
    global.State.achievements.forEach(function (a) {
      var got2 = !!S.achievements[a.id];
      var item = el('div', 'ach' + (got2 ? ' is-on' : ''));
      item.appendChild(el('span', 'ach__icon', got2 ? '🏆' : '🔒'));
      var b = el('div', 'ach__body');
      b.appendChild(el('strong', null, a.name));
      b.appendChild(el('span', null, a.desc));
      item.appendChild(b);
      var r = el('span', 'ach__reward');
      r.appendChild(el('span', 'coin-ico'));
      r.appendChild(el('span', null, Core.formatNum(a.reward)));
      item.appendChild(r);
      ag.appendChild(item);
    });
    wrap.appendChild(ag);
  }

  /* ----------------------------------------------------------------- stats */
  function renderStats() {
    var wrap = $('screen-stats');
    wrap.innerHTML = '';
    var S = global.State.data;
    var tiers = global.GameSets.tiers;

    var head = el('div', 'screen__head');
    head.appendChild(el('h2', 'screen__title', 'Collection'));
    head.appendChild(el('p', 'screen__sub', 'Everything you have ripped so far.'));
    wrap.appendChild(head);

    var grid = el('div', 'statgrid');
    [
      ['Packs opened', Core.formatNum(S.packsOpened)],
      ['Cards pulled', Core.formatNum(S.cardsPulled)],
      ['Unique cards', Core.formatNum(global.State.uniqueOwned())],
      ['Collection value', Core.formatNum(global.State.collectionValue())],
      ['Coins earned', Core.formatNum(S.stats.earned)],
      ['Coins spent', Core.formatNum(S.stats.spent)],
      ['Cards sold', Core.formatNum(S.stats.sold)],
      ['Best streak', S.streak.count + ' days']
    ].forEach(function (p) {
      var b = el('div', 'statbox');
      b.appendChild(el('span', 'statbox__val', p[1]));
      b.appendChild(el('span', 'statbox__label', p[0]));
      grid.appendChild(b);
    });
    wrap.appendChild(grid);

    var h2 = el('div', 'screen__head');
    h2.appendChild(el('h3', 'screen__title screen__title--sm', 'Pulls by rarity'));
    wrap.appendChild(h2);

    var max = Math.max.apply(null, S.stats.byTier.concat([1]));
    var chart = el('div', 'tierchart');
    tiers.forEach(function (t, i) {
      var row = el('div', 'tierrow');
      row.appendChild(el('span', 'tierrow__name', t.name));
      var bar = el('div', 'tierrow__bar');
      var fill = el('div', 'tierrow__fill');
      fill.style.width = ((S.stats.byTier[i] / max) * 100).toFixed(1) + '%';
      fill.style.background = 'linear-gradient(90deg,' + t.color + ',' + t.glow + ')';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', 'tierrow__n', Core.formatNum(S.stats.byTier[i])));
      chart.appendChild(row);
    });
    wrap.appendChild(chart);

    if (S.stats.bestPull) {
      var best = Core.card(S.stats.bestPull.id);
      if (best) {
        var bh = el('div', 'screen__head');
        bh.appendChild(el('h3', 'screen__title screen__title--sm', 'Best pull'));
        wrap.appendChild(bh);
        var bw = el('div', 'beststage');
        var bc = global.CardView.create(best, { faceUp: true });
        global.CardView.enableTilt(bc, { max: 18 });
        bc.addEventListener('click', function () { showCardDetail(best); });
        bw.appendChild(bc);
        var bi = el('div', 'beststage__info');
        bi.appendChild(el('h4', null, best.name));
        bi.appendChild(el('p', null, best.rarity + ' · ' + (global.GameSets.get(best.set) || {}).name));
        bi.appendChild(el('p', 'beststage__val', Core.formatNum(best.value) + ' value'));
        bw.appendChild(bi);
        wrap.appendChild(bw);
      }
    }

    var danger = el('div', 'danger');
    var reset = el('button', 'btn btn--sm btn--warn', 'Reset save');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      confirmModal({
        title: 'Reset everything?',
        body: 'This permanently deletes your collection, coins, level and quest progress. There is no undo.',
        confirmText: 'Delete my save',
        danger: true,
        onConfirm: function () {
          global.State.reset();
          Fx.toast('Save reset.', { icon: '🗑️' });
          renderHud();
          go('shop');
        }
      });
    });
    danger.appendChild(reset);
    wrap.appendChild(danger);
  }

  /* ---------------------------------------------------------- card detail */
  function showCardDetail(card) {
    var set = global.GameSets.get(card.set);
    var owned = global.State.ownedCount(card.id);
    var dupes = global.State.duplicatesOf(card.id);
    var tier = global.GameSets.tiers[card.tier];

    var body = el('div', 'detail');
    var stageEl = el('div', 'detail__stage');
    var big = global.CardView.create(card, { faceUp: true });
    global.CardView.enableTilt(big, { max: 20 });
    stageEl.appendChild(big);
    body.appendChild(stageEl);

    var info = el('div', 'detail__info');
    info.appendChild(el('h3', 'detail__name', card.name));
    var sub = el('p', 'detail__sub');
    sub.appendChild(el('span', 'detail__rarity', card.rarity));
    sub.appendChild(el('span', null, ' · ' + set.name + ' · #' + card.number));
    sub.style.setProperty('--c', tier.color);
    info.appendChild(sub);

    if (card.flavor) info.appendChild(el('p', 'detail__flavor', card.flavor));

    var rows = el('div', 'detail__rows');
    rows.appendChild(detailRow('Market value', Core.formatNum(card.value)));
    rows.appendChild(detailRow('Copies owned', String(owned)));
    rows.appendChild(detailRow('Illustrator', card.artist || 'Unknown'));
    rows.appendChild(detailRow('Released', String(set.year)));
    info.appendChild(rows);

    if (dupes > 0) {
      var sell = el('button', 'btn btn--warn', 'Sell ' + dupes + ' duplicate' + (dupes > 1 ? 's' : '') +
        ' for ' + Core.formatNum(Math.round(card.value * 0.5) * dupes));
      sell.type = 'button';
      sell.addEventListener('click', function () {
        var got = global.State.sellDuplicate(card.id);
        Sfx.coinBurst(5);
        Fx.toast('+' + Core.formatNum(got) + ' coins', { icon: '🪙', kind: 'gold' });
        renderHud();
        closeModal();
        if (current === 'binder') global.Binder.render($('screen-binder'));
      });
      info.appendChild(sell);
    }
    body.appendChild(info);

    modal({ title: null, node: body, wide: true });
  }

  function detailRow(label, value) {
    var r = el('div', 'detail__row');
    r.appendChild(el('span', null, label));
    r.appendChild(el('strong', null, value));
    return r;
  }

  /* ---------------------------------------------------------------- modals */
  function modal(opts) {
    var host = $('modal-host');
    host.innerHTML = '';
    var back = el('div', 'modal__backdrop');
    var box = el('div', 'modal' + (opts.wide ? ' modal--wide' : ''));
    if (opts.title) {
      var h = el('div', 'modal__head');
      h.appendChild(el('h3', 'modal__title', opts.title));
      box.appendChild(h);
    }
    var content = el('div', 'modal__body');
    if (opts.node) content.appendChild(opts.node);
    box.appendChild(content);

    if (opts.actions) box.appendChild(opts.actions);
    else {
      var close = el('button', 'modal__close', '✕');
      close.type = 'button';
      close.setAttribute('aria-label', 'Close');
      close.addEventListener('click', closeModal);
      box.appendChild(close);
    }

    back.appendChild(box);
    host.appendChild(back);
    host.classList.add('is-on');
    back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
    requestAnimationFrame(function () { box.classList.add('in'); });
    return box;
  }

  function closeModal() {
    var host = $('modal-host');
    host.classList.remove('is-on');
    Sfx.back();
    setTimeout(function () { host.innerHTML = ''; }, 240);
  }

  function confirmModal(opts) {
    var body = el('div', 'confirm');
    body.appendChild(el('p', null, opts.body));
    var actions = el('div', 'modal__actions');
    var no = el('button', 'btn btn--ghost', 'Cancel');
    no.type = 'button';
    no.addEventListener('click', closeModal);
    var yes = el('button', 'btn ' + (opts.danger ? 'btn--warn' : 'btn--primary'), opts.confirmText || 'Confirm');
    yes.type = 'button';
    yes.addEventListener('click', function () {
      closeModal();
      setTimeout(function () { opts.onConfirm && opts.onConfirm(); }, 120);
    });
    actions.appendChild(no);
    actions.appendChild(yes);
    modal({ title: opts.title, node: body, actions: actions });
  }

  /* ------------------------------------------------------------- level up */
  function levelUpBanner(info) {
    var b = el('div', 'levelup');
    b.appendChild(el('div', 'levelup__eyebrow', 'LEVEL UP'));
    b.appendChild(el('div', 'levelup__num', String(info.level)));
    var rw = el('div', 'levelup__reward');
    rw.appendChild(el('span', 'coin-ico'));
    rw.appendChild(el('span', null, '+' + Core.formatNum(info.reward)));
    b.appendChild(rw);
    (info.unlocked || []).forEach(function (s) {
      b.appendChild(el('div', 'levelup__unlock', 'Unlocked: ' + s.name));
    });
    document.body.appendChild(b);
    Sfx.levelUp();
    Fx.confetti({ count: 90, colors: ['#ffd166', '#fff', '#7de2ff'] });
    requestAnimationFrame(function () { b.classList.add('in'); });
    setTimeout(function () {
      b.classList.remove('in');
      setTimeout(function () { b.remove(); }, 500);
    }, 2600);
    renderHud();
  }

  /* ----------------------------------------------------------- daily bonus */
  function showDaily() {
    var st = global.State.streakStatus();
    if (!st.claimable) {
      var info = el('div', 'daily');
      info.appendChild(el('p', null, 'Already claimed today. Come back tomorrow to keep your ' +
        global.State.data.streak.count + ' day streak alive.'));
      info.appendChild(buildStreakTrack());
      modal({ title: 'Daily bonus', node: info });
      return;
    }
    var body = el('div', 'daily');
    body.appendChild(el('p', null, 'Claim today’s bonus. Miss a day and the streak resets.'));
    body.appendChild(buildStreakTrack());
    var actions = el('div', 'modal__actions');
    var claim = el('button', 'btn btn--primary btn--lg', 'Claim bonus');
    claim.type = 'button';
    claim.addEventListener('click', function () {
      var res = global.State.claimDaily();
      closeModal();
      if (res) {
        Sfx.levelUp();
        Fx.confetti({ count: 110, colors: ['#ffd166', '#fff'] });
        Fx.toast('Day ' + res.day + ' · +' + Core.formatNum(res.coins) + ' coins' +
          (res.packs ? ' and ' + res.packs + ' free pack' + (res.packs > 1 ? 's' : '') : ''),
          { icon: '🎁', kind: 'gold', duration: 4000 });
        renderHud();
        renderShop();
      }
    });
    actions.appendChild(claim);
    modal({ title: 'Daily bonus', node: body, actions: actions });
  }

  function buildStreakTrack() {
    var track = el('div', 'streak');
    var count = global.State.data.streak.count;
    var st = global.State.streakStatus();
    for (var d = 1; d <= 7; d++) {
      var done = d <= count && !st.claimable ? true : d <= count;
      var day = el('div', 'streak__day' + (done ? ' is-done' : '') + (d === Math.min(count + (st.claimable ? 1 : 0), 7) && st.claimable ? ' is-next' : ''));
      day.appendChild(el('span', 'streak__n', 'Day ' + d));
      day.appendChild(el('span', 'streak__r', Core.formatNum(200 + d * 150)));
      if (d >= 4) day.appendChild(el('span', 'streak__p', d >= 7 ? '+2 packs' : '+1 pack'));
      track.appendChild(day);
    }
    return track;
  }

  /* -------------------------------------------------------------- settings */
  function showSettings() {
    var S = global.State.data.settings;
    var body = el('div', 'settings');

    body.appendChild(slider('Sound effects', S.sfx, function (v) {
      S.sfx = v; Sfx.setVolume('sfx', v); global.State.save();
    }));
    body.appendChild(slider('Music', S.music, function (v) {
      S.music = v; Sfx.setVolume('music', v); global.State.save();
    }));

    body.appendChild(toggle('Mute everything', S.muted, function (v) {
      S.muted = v; Sfx.setMuted(v); global.State.save();
    }));
    body.appendChild(toggle('Background music', Sfx.musicPlaying(), function (v) {
      if (v) Sfx.startMusic(); else Sfx.stopMusic();
    }));
    body.appendChild(toggle('Reduce motion', S.reduceMotion, function (v) {
      S.reduceMotion = v;
      Fx.setReduceMotion(v);
      document.body.classList.toggle('reduce-motion', v);
      global.State.save();
    }));

    var note = el('p', 'settings__note',
      'Card art loads from public Pokémon TCG image CDNs when they are reachable. ' +
      'If they are blocked, every card still renders in full from bundled official artwork.');
    body.appendChild(note);

    modal({ title: 'Settings', node: body });
  }

  function slider(label, value, onChange) {
    var row = el('div', 'settings__row');
    row.appendChild(el('label', null, label));
    var input = document.createElement('input');
    input.type = 'range'; input.min = 0; input.max = 1; input.step = 0.05;
    input.value = value;
    input.addEventListener('input', function () { onChange(parseFloat(input.value)); });
    input.addEventListener('change', function () { Sfx.click(); });
    row.appendChild(input);
    return row;
  }

  function toggle(label, value, onChange) {
    var row = el('div', 'settings__row');
    row.appendChild(el('label', null, label));
    var btn = el('button', 'switch' + (value ? ' is-on' : ''));
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(!!value));
    btn.appendChild(el('span', 'switch__knob'));
    btn.addEventListener('click', function () {
      var on = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', String(on));
      Sfx.click();
      onChange(on);
    });
    row.appendChild(btn);
    return row;
  }

  /* ------------------------------------------------------------------ bind */
  function bind() {
    document.querySelectorAll('[data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { Sfx.click(); go(b.dataset.nav); });
    });
    $('hud-daily').addEventListener('click', function () { Sfx.click(); showDaily(); });
    $('hud-settings').addEventListener('click', function () { Sfx.click(); showSettings(); });
    $('hud-freewrap').addEventListener('click', function () {
      Sfx.click();
      if (global.State.data.freePacks > 0) {
        Fx.toast('Pick a set below and hit "Use free pack".', { icon: '🎁' });
        go('shop');
      } else {
        Fx.toast('Next free pack in ' + $('hud-freetimer').textContent, { icon: '⏳' });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('modal-host').classList.contains('is-on')) closeModal();
        else if (global.Opener.isActive()) global.Opener.exit();
      }
    });

    global.State.on(function (what) {
      if (what === 'coins' || what === 'hud' || what === 'levelup' || what === 'quests') renderHud();
    });
  }

  global.UI = {
    bind: bind,
    go: go,
    renderHud: renderHud,
    renderShop: renderShop,
    startFreeTimer: startFreeTimer,
    buyAndOpen: buyAndOpen,
    showCardDetail: showCardDetail,
    showDaily: showDaily,
    showSettings: showSettings,
    levelUpBanner: levelUpBanner,
    confirm: confirmModal,
    modal: modal,
    closeModal: closeModal
  };
})(window);
