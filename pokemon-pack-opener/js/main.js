/* =============================================================================
   main.js — bootstrap
   ========================================================================== */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function boot() {
    global.Core.buildIndex();
    var S = global.State.load();

    global.Fx.init();
    global.Fx.setReduceMotion(S.settings.reduceMotion);
    document.body.classList.toggle('reduce-motion', S.settings.reduceMotion);

    global.UI.bind();
    global.UI.renderHud();
    global.UI.renderShop();
    global.UI.startFreeTimer();

    // Audio can only start after a real user gesture; warm it up on the first one.
    var unlocked = false;
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      global.Sfx.init().then(function () {
        global.Sfx.setVolume('sfx', S.settings.sfx);
        global.Sfx.setVolume('music', S.settings.music);
        global.Sfx.setMuted(S.settings.muted);
        global.Sfx.resume();
      });
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    var loader = $('boot');
    loader.classList.add('is-done');
    setTimeout(function () { loader.remove(); }, 700);

    if (!S.seenIntro) {
      S.seenIntro = true;
      global.State.save(true);
      setTimeout(showIntro, 500);
    } else if (global.State.streakStatus().claimable) {
      setTimeout(function () { global.UI.showDaily(); }, 700);
    }

    // Free-pack accrual keeps running while the tab is hidden.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        global.State.accrueFreePacks();
        global.UI.renderHud();
      }
    });
  }

  function showIntro() {
    var wrap = document.createElement('div');
    wrap.className = 'intro';
    var h = document.createElement('h3');
    h.textContent = 'Rip some packs';
    wrap.appendChild(h);

    var steps = [
      ['🫱', 'Drag across the top of a pack to tear it open. Pull faster and it tears louder.'],
      ['✨', 'Tap each card to flip it. The last slot is where the chase cards live.'],
      ['📒', 'Every card is a real Pokémon card. Fill the binder set by set.'],
      ['🎁', 'A free pack brews every 10 minutes, and daily streaks stack up fast.']
    ];
    var list = document.createElement('div');
    list.className = 'intro__steps';
    steps.forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'intro__step';
      var i = document.createElement('span');
      i.className = 'intro__icon';
      i.textContent = s[0];
      var t = document.createElement('span');
      t.textContent = s[1];
      row.appendChild(i); row.appendChild(t);
      list.appendChild(row);
    });
    wrap.appendChild(list);

    var actions = document.createElement('div');
    actions.className = 'modal__actions';
    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn btn--primary btn--lg';
    go.textContent = 'Let’s go';
    go.addEventListener('click', function () {
      global.UI.closeModal();
      global.Sfx.resume().then(function () { global.Sfx.startMusic(); });
    });
    actions.appendChild(go);

    global.UI.modal({ title: 'Welcome, collector', node: wrap, actions: actions });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
