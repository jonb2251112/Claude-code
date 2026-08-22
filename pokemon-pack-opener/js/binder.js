/* =============================================================================
   binder.js — the collection view: real 9-pocket binder pages per set
   ========================================================================== */
(function (global) {
  'use strict';

  var Core = global.Core;
  var PAGE = 9;

  var view = { setId: null, page: 0, filter: 'all' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function sortedCards(setId) {
    return Core.allCards(setId).slice().sort(function (a, b) {
      var an = parseInt(a.number, 10), bn = parseInt(b.number, 10);
      if (isNaN(an) && isNaN(bn)) return a.number.localeCompare(b.number);
      if (isNaN(an)) return 1;
      if (isNaN(bn)) return -1;
      return an - bn || a.number.localeCompare(b.number);
    });
  }

  function filtered(setId) {
    var list = sortedCards(setId);
    if (view.filter === 'owned') return list.filter(function (c) { return global.State.ownedCount(c.id) > 0; });
    if (view.filter === 'missing') return list.filter(function (c) { return !global.State.ownedCount(c.id); });
    if (view.filter === 'dupes') return list.filter(function (c) { return global.State.duplicatesOf(c.id) > 0; });
    if (view.filter === 'hits') return list.filter(function (c) { return c.tier >= 4 && global.State.ownedCount(c.id) > 0; });
    return list;
  }

  /* ------------------------------------------------------------------ render */
  function render(container) {
    container.innerHTML = '';
    var unlocked = global.GameSets.list.filter(function (s) { return global.State.isUnlocked(s); });
    if (!view.setId || !global.GameSets.get(view.setId)) view.setId = unlocked[0] ? unlocked[0].id : global.GameSets.list[0].id;

    container.appendChild(buildHeader());
    container.appendChild(buildTabs(unlocked));

    var body = el('div', 'binder__body');
    body.id = 'binder-body';
    container.appendChild(body);
    renderPage();
  }

  function buildHeader() {
    var head = el('div', 'binder__head');
    var left = el('div', 'binder__headLeft');
    left.appendChild(el('h2', 'screen__title', 'Binder'));
    var totalUnique = global.State.uniqueOwned();
    var totalCards = global.GameSets.list.reduce(function (n, s) { return n + Core.allCards(s.id).length; }, 0);
    left.appendChild(el('p', 'screen__sub',
      totalUnique + ' of ' + totalCards + ' unique cards · ' +
      Core.formatNum(global.State.collectionValue()) + ' collection value'));
    head.appendChild(left);

    var tools = el('div', 'binder__tools');
    ['all', 'owned', 'missing', 'dupes', 'hits'].forEach(function (f) {
      var b = el('button', 'chip' + (view.filter === f ? ' is-on' : ''), f[0].toUpperCase() + f.slice(1));
      b.type = 'button';
      b.addEventListener('click', function () {
        view.filter = f; view.page = 0;
        global.Sfx.click();
        render(document.getElementById('screen-binder'));
      });
      tools.appendChild(b);
    });

    var sell = el('button', 'btn btn--sm btn--warn', 'Sell duplicates');
    sell.type = 'button';
    sell.addEventListener('click', confirmSell);
    tools.appendChild(sell);
    head.appendChild(tools);
    return head;
  }

  function confirmSell() {
    var dupes = 0, worth = 0;
    Object.keys(global.State.data.collection).forEach(function (id) {
      var d = global.State.duplicatesOf(id);
      if (!d) return;
      var c = Core.card(id);
      if (!c || c.tier > 2) return;         // never bulk-sell the good stuff
      dupes += d;
      worth += Math.round(c.value * 0.5) * d;
    });
    if (!dupes) {
      global.Sfx.error();
      global.Fx.toast('No spare commons, uncommons or rares to sell.', { icon: '📦' });
      return;
    }
    global.UI.confirm({
      title: 'Sell duplicates?',
      body: 'Sell ' + dupes + ' spare cards (Common → Rare only) for ' +
            Core.formatNum(worth) + ' coins. Your last copy of every card is kept, and ' +
            'anything Double Rare or better is never sold.',
      confirmText: 'Sell for ' + Core.formatNum(worth),
      onConfirm: function () {
        var res = global.State.sellAllDuplicates(2);
        global.Sfx.coinBurst(8);
        global.Fx.toast('Sold ' + res.count + ' duplicates for ' + Core.formatNum(res.coins) + ' coins.',
          { icon: '🪙', kind: 'gold' });
        global.State.emit('hud');
        render(document.getElementById('screen-binder'));
      }
    });
  }

  function buildTabs(unlocked) {
    var tabs = el('div', 'binder__tabs');
    unlocked.forEach(function (s) {
      var comp = global.State.setCompletion(s.id);
      var t = el('button', 'settab' + (view.setId === s.id ? ' is-on' : ''));
      t.type = 'button';
      t.style.setProperty('--pa', s.palette.a);
      t.style.setProperty('--pb', s.palette.b);
      t.appendChild(el('span', 'settab__name', s.name));
      t.appendChild(el('span', 'settab__count', comp.owned + '/' + comp.total));
      var bar = el('span', 'settab__bar');
      var fill = el('span', 'settab__fill');
      fill.style.width = (comp.pct * 100).toFixed(1) + '%';
      bar.appendChild(fill);
      t.appendChild(bar);
      if (comp.pct >= 1) t.appendChild(el('span', 'settab__crown', '👑'));
      t.addEventListener('click', function () {
        view.setId = s.id; view.page = 0;
        global.Sfx.click();
        render(document.getElementById('screen-binder'));
      });
      tabs.appendChild(t);
    });

    var locked = global.GameSets.list.filter(function (s) { return !global.State.isUnlocked(s); });
    locked.forEach(function (s) {
      var t = el('button', 'settab is-locked');
      t.type = 'button';
      t.disabled = true;
      t.appendChild(el('span', 'settab__name', s.name));
      t.appendChild(el('span', 'settab__count', 'Level ' + s.unlock));
      tabs.appendChild(t);
    });
    return tabs;
  }

  function renderPage() {
    var body = document.getElementById('binder-body');
    if (!body) return;
    body.innerHTML = '';

    var list = filtered(view.setId);
    var pages = Math.max(1, Math.ceil(list.length / PAGE));
    view.page = Math.max(0, Math.min(view.page, pages - 1));

    var sheet = el('div', 'binder__sheet');
    var slice = list.slice(view.page * PAGE, view.page * PAGE + PAGE);

    if (!slice.length) {
      sheet.appendChild(el('p', 'binder__empty', 'Nothing here yet — go rip some packs.'));
    }

    slice.forEach(function (c, i) {
      var owned = global.State.ownedCount(c.id);
      var pocket = el('div', 'pocket');
      pocket.style.setProperty('--d', (i * 35) + 'ms');
      if (owned) {
        var cardEl = global.CardView.create(c, { faceUp: true, compact: true });
        global.CardView.enableTilt(cardEl, { max: 14 });
        pocket.appendChild(cardEl);
        if (owned > 1) pocket.appendChild(el('span', 'pocket__count', '×' + owned));
        pocket.addEventListener('click', function () { global.UI.showCardDetail(c); });
      } else {
        pocket.classList.add('is-empty');
        var ghost = el('div', 'pocket__ghost');
        ghost.appendChild(el('span', 'pocket__no', '#' + c.number));
        ghost.appendChild(el('span', 'pocket__name', c.name));
        ghost.appendChild(el('span', 'pocket__rarity', c.rarity));
        pocket.appendChild(ghost);
      }
      sheet.appendChild(pocket);
    });

    // Pad the final sheet so the 3x3 grid keeps its shape.
    for (var p = slice.length; p < PAGE; p++) {
      sheet.appendChild(el('div', 'pocket is-blank'));
    }

    body.appendChild(sheet);

    var nav = el('div', 'binder__nav');
    var prev = el('button', 'btn btn--sm', '‹ Prev');
    prev.type = 'button';
    prev.disabled = view.page === 0;
    prev.addEventListener('click', function () { view.page--; global.Sfx.back(); renderPage(); });

    var next = el('button', 'btn btn--sm', 'Next ›');
    next.type = 'button';
    next.disabled = view.page >= pages - 1;
    next.addEventListener('click', function () { view.page++; global.Sfx.click(); renderPage(); });

    nav.appendChild(prev);
    nav.appendChild(el('span', 'binder__pageno', 'Page ' + (view.page + 1) + ' / ' + pages));
    nav.appendChild(next);
    body.appendChild(nav);
  }

  global.Binder = {
    render: render,
    focusSet: function (id) { view.setId = id; view.page = 0; }
  };
})(window);
