/* =============================================================================
   audio.js — procedural foley engine
   -----------------------------------------------------------------------------
   Everything you hear is synthesised in the browser; no samples ship with the
   game. The pack rip is the centrepiece: real foil tearing is a dense stochastic
   burst of micro-fractures, so we granulate noise rather than play a tone.

   Signal flow:
     grains/oscillators -> [dry]  -> busGain -> compressor -> master -> out
                        -> [wet]  -> convolver (generated IR) ->
   ========================================================================== */
(function (global) {
  'use strict';

  var Audio = {};
  var ctx = null;
  var master, comp, dryBus, wetBus, convolver, musicBus, sfxBus;
  var noiseBuf = null;
  var textures = {};          // pre-rendered crackle textures
  var ready = false;
  var settings = { sfx: 0.85, music: 0.32, muted: false };

  /* ---------------------------------------------------------------- helpers */
  function now() { return ctx ? ctx.currentTime : 0; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function env(node, t0, peak, attack, decay, curve) {
    var g = node.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + attack);
    if (curve === 'linear') g.linearRampToValueAtTime(0.0001, t0 + attack + decay);
    else g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    return t0 + attack + decay;
  }

  function makeNoiseBuffer(seconds, c) {
    c = c || ctx;
    var len = Math.floor(c.sampleRate * seconds);
    var buf = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  /* Impulse response for the reverb bus: decaying stereo noise with a couple of
     early reflections so pulls sound like they happen in a room, not a vacuum. */
  function makeImpulse(seconds, decay) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
      // early reflections
      [0.011, 0.019, 0.031, 0.047].forEach(function (ms, k) {
        var idx = Math.floor(ms * ctx.sampleRate);
        if (idx < len) d[idx] += (0.5 - k * 0.1) * (ch ? -1 : 1);
      });
    }
    return buf;
  }

  /* A soft-clip curve; keeps big low-end hits punchy instead of muddy. */
  function makeShaper(amount) {
    var n = 1024, curve = new Float32Array(n), k = amount;
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 2 - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  /* Mean square level of a rendered buffer. Used to prove the offline render
     actually produced audio — some engines hand back a silent buffer. */
  function bufferRms(buf) {
    if (!buf) return 0;
    var d = buf.getChannelData(0);
    var step = Math.max(1, Math.floor(d.length / 20000));
    var sum = 0, n = 0;
    for (var i = 0; i < d.length; i += step) { sum += d[i] * d[i]; n++; }
    return n ? Math.sqrt(sum / n) : 0;
  }

  /* ------------------------------------------------- crackle texture render */
  /* Renders a few seconds of granular "tearing film" offline. Each grain is a
     tiny slice of noise through a resonant bandpass with a near-instant attack
     and a 3–14 ms decay — i.e. one micro-fracture in the wrapper. */
  function renderCrackle(seconds, density, loCut, hiCut) {
    var sr = 44100;
    var OAC = global.OfflineAudioContext || global.webkitOfflineAudioContext;
    var oc = new OAC(2, Math.floor(sr * seconds), sr);
    var src = makeNoiseBuffer(1.5, oc);

    var out = oc.createGain();
    out.gain.value = 1;
    out.connect(oc.destination);

    var count = Math.floor(seconds * density);
    for (var i = 0; i < count; i++) {
      var t = Math.random() * seconds;
      var dur = rnd(0.0022, 0.014);

      var s = oc.createBufferSource();
      s.buffer = src;
      s.playbackRate.value = rnd(0.85, 1.3);

      var bp = oc.createBiquadFilter();
      bp.type = 'bandpass';
      // Skew towards the low end so it reads as plastic, not hiss.
      bp.frequency.value = loCut * Math.pow(hiCut / loCut, Math.pow(Math.random(), 1.7));
      bp.Q.value = rnd(0.9, 7);

      var g = oc.createGain();
      var pan = oc.createStereoPanner ? oc.createStereoPanner() : null;
      if (pan) pan.pan.value = rnd(-0.75, 0.75);

      var amp = rnd(0.05, 0.42) * (1 - 0.55 * Math.random() * Math.random());
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.0006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      s.connect(bp); bp.connect(g);
      if (pan) { g.connect(pan); pan.connect(out); } else { g.connect(out); }
      s.start(t, Math.random(), dur + 0.01);
    }

    // Low "body" of the wrapper bulk flexing underneath the fractures.
    var body = oc.createBufferSource();
    body.buffer = src; body.loop = true;
    var lp = oc.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7;
    var bg = oc.createGain(); bg.gain.value = 0.055;
    body.connect(lp); lp.connect(bg); bg.connect(out);
    body.start(0);

    return oc.startRendering();
  }

  /* ------------------------------------------------------------------ setup */
  Audio.init = function () {
    if (ctx) return Promise.resolve();
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return Promise.resolve();
    ctx = new AC();

    master = ctx.createGain(); master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22;
    comp.ratio.value = 3.4; comp.attack.value = 0.004; comp.release.value = 0.22;

    convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(1.7, 2.6);
    wetBus = ctx.createGain(); wetBus.gain.value = 0.5;
    dryBus = ctx.createGain(); dryBus.gain.value = 1;
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx;
    musicBus = ctx.createGain(); musicBus.gain.value = 0;

    dryBus.connect(sfxBus);
    wetBus.connect(convolver); convolver.connect(sfxBus);
    sfxBus.connect(comp);
    musicBus.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    noiseBuf = makeNoiseBuffer(2.2);

    var jobs = [
      renderCrackle(2.2, 900, 900, 9000).then(function (b) { textures.dense = b; }),
      renderCrackle(2.0, 260, 700, 6500).then(function (b) { textures.light = b; }),
      renderCrackle(1.4, 120, 500, 4200).then(function (b) { textures.crinkle = b; })
    ];
    return Promise.all(jobs).then(function () {
      // Only trust the textures if they actually contain signal.
      ready = bufferRms(textures.dense) > 1e-4 &&
              bufferRms(textures.light) > 1e-4 &&
              bufferRms(textures.crinkle) > 1e-4;
    }).catch(function () { ready = false; });
  };

  Audio.resume = function () {
    if (!ctx) return Audio.init().then(function () { return ctx && ctx.resume && ctx.resume(); });
    if (ctx.state === 'suspended') return ctx.resume();
    return Promise.resolve();
  };

  Audio.setVolume = function (kind, v) {
    settings[kind] = v;
    if (!ctx) return;
    if (kind === 'sfx' && sfxBus) sfxBus.gain.setTargetAtTime(v, now(), 0.05);
    if (kind === 'music' && musicBus) musicBus.gain.setTargetAtTime(music.playing ? v : 0, now(), 0.2);
  };

  Audio.setMuted = function (m) {
    settings.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
  };

  Audio.isReady = function () { return !!ctx && ready; };

  /* ------------------------------------------------------------ primitives */
  function noiseSource(loop) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    if (loop) s.loop = true;
    return s;
  }

  function send(node, wet) {
    node.connect(dryBus);
    if (wet > 0) {
      var w = ctx.createGain(); w.gain.value = wet;
      node.connect(w); w.connect(wetBus);
    }
  }

  /* One short filtered noise hit — the building block for clicks and slides. */
  function hit(o) {
    var t0 = now() + (o.delay || 0);
    var s = noiseSource(false);
    s.playbackRate.value = o.rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + o.attack + o.decay);
    f.Q.value = o.q == null ? 1 : o.q;
    var g = ctx.createGain();
    s.connect(f); f.connect(g);
    send(g, o.wet || 0);
    env(g, t0, o.gain, o.attack, o.decay, o.curve);
    s.start(t0, Math.random() * 1.5);
    s.stop(t0 + o.attack + o.decay + 0.05);
    return t0;
  }

  function tone(o) {
    var t0 = now() + (o.delay || 0);
    var osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqTo) osc.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + (o.glide || o.decay));
    if (o.detune) osc.detune.value = o.detune;
    var g = ctx.createGain();
    osc.connect(g);
    if (o.filter) {
      var f = ctx.createBiquadFilter();
      f.type = o.filter; f.frequency.value = o.filterFreq || 2000; f.Q.value = o.filterQ || 1;
      g.disconnect(); osc.connect(g); g.connect(f); send(f, o.wet || 0);
    } else {
      send(g, o.wet || 0);
    }
    env(g, t0, o.gain, o.attack || 0.004, o.decay, o.curve);
    osc.start(t0);
    osc.stop(t0 + (o.attack || 0.004) + o.decay + 0.06);
    return osc;
  }

  /* Struck-metal bell: inharmonic partials, higher partials die first. */
  function bell(freq, gain, decay, wet, delay) {
    var ratios = [1, 2.02, 2.99, 4.21, 5.44, 6.83, 8.9];
    var amps = [1, 0.55, 0.42, 0.26, 0.17, 0.11, 0.06];
    for (var i = 0; i < ratios.length; i++) {
      tone({
        freq: freq * ratios[i],
        gain: gain * amps[i],
        attack: 0.002,
        decay: decay * Math.pow(0.72, i),
        wet: wet == null ? 0.4 : wet,
        delay: (delay || 0) + i * 0.0012,
        type: 'sine'
      });
    }
  }

  /* Detuned saw stack through a slow filter — the "epic swell" for big pulls. */
  function pad(freqs, gain, attack, hold, decay, wet) {
    var t0 = now();
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(360, t0);
    f.frequency.linearRampToValueAtTime(4200, t0 + attack + hold * 0.6);
    f.Q.value = 1.2;
    g.connect(f); send(f, wet == null ? 0.65 : wet);

    freqs.forEach(function (fr) {
      [-7, 0, 7].forEach(function (dt) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = fr;
        o.detune.value = dt;
        var og = ctx.createGain();
        og.gain.value = 0.16 / freqs.length;
        o.connect(og); og.connect(g);
        o.start(t0);
        o.stop(t0 + attack + hold + decay + 0.1);
      });
    });
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.setValueAtTime(gain, t0 + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + decay);
  }

  /* Sub-bass impact with soft clipping. */
  function boom(gain, freq, decay) {
    var t0 = now();
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq || 78, t0);
    o.frequency.exponentialRampToValueAtTime((freq || 78) * 0.42, t0 + decay);
    var sh = ctx.createWaveShaper();
    sh.curve = makeShaper(2.4);
    var g = ctx.createGain();
    o.connect(sh); sh.connect(g);
    send(g, 0.18);
    env(g, t0, gain, 0.006, decay);
    o.start(t0); o.stop(t0 + decay + 0.08);
  }

  /* ========================================================== THE PACK RIP */
  /* A live, velocity-driven tear. `ripStart` spins up looping crackle layers;
     `ripUpdate(v)` maps drag speed onto grain density (via gain) and brightness
     (via filter cutoff), which is what makes it feel physical.               */
  var rip = null;

  Audio.ripStart = function () {
    if (!ctx || rip) return;
    var t0 = now();

    var g = ctx.createGain(); g.gain.value = 0.0001;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.55;
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240;

    g.connect(bp); bp.connect(hp);
    send(hp, 0.12);

    // Friction bed: live noise through a resonant peak. Always present, so the
    // tear is never silent even if the offline textures failed to render.
    var fric = noiseSource(true);
    var fricF = ctx.createBiquadFilter();
    fricF.type = 'peaking'; fricF.frequency.value = 2600; fricF.Q.value = 2.4; fricF.gain.value = 8;
    var fricG = ctx.createGain(); fricG.gain.value = ready ? 0.32 : 0.95;
    fric.connect(fricF); fricF.connect(fricG); fricG.connect(g);
    fric.start(t0, Math.random());

    var dense = null, light = null, lightG = null;
    if (ready) {
      dense = ctx.createBufferSource();
      dense.buffer = textures.dense; dense.loop = true;
      dense.playbackRate.value = 1;
      var denseG = ctx.createGain(); denseG.gain.value = 1;
      dense.connect(denseG); denseG.connect(g);

      light = ctx.createBufferSource();
      light.buffer = textures.light; light.loop = true;
      light.playbackRate.value = 0.92;
      lightG = ctx.createGain(); lightG.gain.value = 0.7;
      light.connect(lightG); lightG.connect(g);

      dense.start(t0, Math.random());
      light.start(t0, Math.random());
    }

    // Initial puncture — the moment the foil gives way.
    hit({ freq: 3200, freqTo: 900, q: 1.1, gain: 0.5, attack: 0.001, decay: 0.09, wet: 0.1 });
    hit({ freq: 700, q: 0.7, gain: 0.3, attack: 0.001, decay: 0.05, type: 'lowpass' });

    rip = { g: g, bp: bp, fric: fric, dense: dense, light: light, lightG: lightG, last: 0, level: 0 };
  };

  /* v: 0..1 normalised drag speed. */
  Audio.ripUpdate = function (v) {
    if (!rip) return;
    v = Math.max(0, Math.min(1, v));
    var t = now();
    // Fast attack, slower release: tearing keeps ringing a moment after you stop.
    var target = 0.0001 + Math.pow(v, 0.75) * 0.62;
    rip.g.gain.setTargetAtTime(target, t, v > rip.level ? 0.012 : 0.07);
    rip.level = v;
    rip.bp.frequency.setTargetAtTime(1400 + v * 4200, t, 0.04);
    if (rip.dense) rip.dense.playbackRate.setTargetAtTime(0.9 + v * 0.55, t, 0.06);
    if (rip.lightG) rip.lightG.gain.setTargetAtTime(0.75 - v * 0.4, t, 0.08);

    // Sporadic louder fractures on quick pulls.
    if (v > 0.34 && t - rip.last > rnd(0.03, 0.11)) {
      rip.last = t;
      hit({
        freq: rnd(1500, 6200), q: rnd(2, 8),
        gain: rnd(0.06, 0.2) * v, attack: 0.0008, decay: rnd(0.012, 0.05)
      });
    }
  };

  Audio.ripStop = function (complete) {
    if (!rip) return;
    var r = rip; rip = null;
    var t = now();
    r.g.gain.cancelScheduledValues(t);
    r.g.gain.setValueAtTime(Math.max(0.0002, r.g.gain.value), t);

    if (complete) {
      // Final tear-off: a bright surge that collapses, then the wrapper flaps.
      r.g.gain.linearRampToValueAtTime(0.75, t + 0.05);
      r.bp.frequency.cancelScheduledValues(t);
      r.bp.frequency.setValueAtTime(r.bp.frequency.value, t);
      r.bp.frequency.exponentialRampToValueAtTime(700, t + 0.34);
      r.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      hit({ freq: 5200, freqTo: 640, q: 0.8, gain: 0.34, attack: 0.004, decay: 0.3, delay: 0.02, wet: 0.15 });
      hit({ freq: 380, q: 0.6, gain: 0.24, attack: 0.01, decay: 0.16, delay: 0.16, type: 'lowpass' });
      setTimeout(function () { Audio.crinkle(0.5); }, 250);
    } else {
      r.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    }
    setTimeout(function () {
      try {
        r.fric.stop();
        if (r.dense) r.dense.stop();
        if (r.light) r.light.stop();
      } catch (e) {}
    }, 700);
  };

  /* Handling the wrapper: sparse crackle, no tearing. */
  Audio.crinkle = function (amount) {
    if (!ctx) return;
    amount = amount == null ? 0.6 : amount;
    var t0 = now();
    var s = ctx.createBufferSource();
    s.buffer = ready ? textures.crinkle : noiseBuf;
    s.playbackRate.value = rnd(0.85, 1.2);
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = rnd(1400, 2600); f.Q.value = 0.6;
    var g = ctx.createGain();
    s.connect(f); f.connect(g);
    send(g, 0.08);
    var dur = rnd(0.18, 0.34);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.34 * amount, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.start(t0, Math.random() * 0.9);
    s.stop(t0 + dur + 0.05);
  };

  /* ------------------------------------------------------- card handling */
  Audio.cardSlide = function (delay) {
    hit({ freq: 1750, freqTo: 3400, q: 0.8, gain: 0.2, attack: 0.03, decay: 0.16,
          delay: delay || 0, rate: 1.1, wet: 0.1, curve: 'linear' });
    hit({ freq: 520, q: 0.5, gain: 0.1, attack: 0.02, decay: 0.13,
          delay: (delay || 0) + 0.01, type: 'lowpass' });
  };

  Audio.cardFlip = function (delay) {
    hit({ freq: 2600, freqTo: 1200, q: 1.6, gain: 0.32, attack: 0.001, decay: 0.055, delay: delay || 0 });
    tone({ freq: 190, freqTo: 120, gain: 0.1, attack: 0.002, decay: 0.07, delay: (delay || 0) + 0.005 });
  };

  Audio.cardPlace = function (delay) {
    hit({ freq: 900, q: 0.6, gain: 0.2, attack: 0.002, decay: 0.07, delay: delay || 0, type: 'lowpass' });
    tone({ freq: 120, freqTo: 78, gain: 0.13, attack: 0.002, decay: 0.1, delay: delay || 0 });
  };

  Audio.riser = function (dur, gain) {
    if (!ctx) return;
    var t0 = now();
    var s = noiseSource(true);
    var f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 3.5;
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(7200, t0 + dur);
    var g = ctx.createGain();
    s.connect(f); f.connect(g);
    send(g, 0.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain || 0.22, t0 + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.12);
    s.start(t0); s.stop(t0 + dur + 0.2);

    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(880, t0 + dur);
    var og = ctx.createGain();
    var of_ = ctx.createBiquadFilter();
    of_.type = 'lowpass'; of_.frequency.value = 2600;
    o.connect(of_); of_.connect(og);
    send(og, 0.3);
    og.gain.setValueAtTime(0.0001, t0);
    og.gain.linearRampToValueAtTime((gain || 0.22) * 0.5, t0 + dur * 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.1);
    o.start(t0); o.stop(t0 + dur + 0.2);
  };

  /* --------------------------------------------------------- rarity cues */
  /* Escalates from a polite chime to a full orchestral-ish hit. */
  Audio.rarity = function (tier) {
    if (!ctx || settings.muted) return;
    switch (tier) {
      case 0:
        hit({ freq: 2200, q: 2, gain: 0.09, attack: 0.001, decay: 0.05 });
        break;
      case 1:
        bell(880, 0.09, 0.42, 0.3);
        break;
      case 2:
        bell(1046, 0.13, 0.75, 0.42);
        bell(1568, 0.06, 0.55, 0.42, 0.055);
        break;
      case 3:
        boom(0.3, 92, 0.4);
        bell(784, 0.16, 1.1, 0.5);
        bell(1175, 0.11, 0.95, 0.5, 0.07);
        pad([392, 587, 784], 0.1, 0.05, 0.28, 0.7, 0.6);
        break;
      case 4:
        boom(0.42, 76, 0.6);
        bell(1046, 0.17, 1.5, 0.6);
        bell(1568, 0.13, 1.3, 0.6, 0.08);
        bell(2093, 0.08, 1.1, 0.6, 0.16);
        pad([523, 659, 784, 1046], 0.13, 0.08, 0.5, 1.1, 0.68);
        break;
      case 5:
        boom(0.5, 62, 0.9);
        Audio.riser(0.5, 0.16);
        setTimeout(function () {
          bell(1318, 0.19, 2.1, 0.7);
          bell(1975, 0.13, 1.8, 0.7, 0.09);
          pad([659, 830, 987, 1318], 0.16, 0.1, 0.8, 1.6, 0.72);
        }, 340);
        break;
      case 6:
        boom(0.62, 52, 1.3);
        Audio.riser(0.75, 0.2);
        setTimeout(function () {
          boom(0.5, 88, 0.7);
          bell(1568, 0.22, 2.8, 0.75);
          bell(2349, 0.15, 2.3, 0.75, 0.1);
          bell(3136, 0.09, 1.9, 0.75, 0.2);
          pad([784, 987, 1174, 1568], 0.19, 0.12, 1.1, 2.2, 0.78);
        }, 600);
        break;
    }
  };

  Audio.godPack = function () {
    if (!ctx) return;
    Audio.riser(1.35, 0.26);
    setTimeout(function () {
      boom(0.7, 46, 1.8);
      boom(0.45, 104, 0.8);
      bell(1046, 0.2, 3.2, 0.8);
      bell(1568, 0.16, 2.8, 0.8, 0.08);
      bell(2093, 0.12, 2.4, 0.8, 0.16);
      pad([523, 659, 784, 1046, 1318], 0.2, 0.14, 1.6, 2.6, 0.8);
    }, 1200);
  };

  /* -------------------------------------------------------------- UI cues */
  Audio.click = function () { hit({ freq: 2400, q: 3, gain: 0.09, attack: 0.001, decay: 0.028 }); };
  Audio.hover = function () { hit({ freq: 4200, q: 4, gain: 0.028, attack: 0.001, decay: 0.018 }); };
  Audio.back = function () { hit({ freq: 1100, freqTo: 620, q: 2, gain: 0.08, attack: 0.001, decay: 0.05 }); };
  Audio.error = function () { tone({ freq: 220, freqTo: 150, gain: 0.14, attack: 0.003, decay: 0.2, type: 'square', filter: 'lowpass', filterFreq: 900 }); };

  Audio.coin = function (i) {
    i = i || 0;
    bell(1760 + i * 90, 0.075, 0.3, 0.28, i * 0.045);
  };

  Audio.coinBurst = function (n) {
    n = Math.min(n || 6, 14);
    for (var i = 0; i < n; i++) Audio.coin(i);
  };

  Audio.levelUp = function () {
    [523, 659, 784, 1046].forEach(function (f, i) {
      bell(f, 0.15, 1.0, 0.5, i * 0.085);
    });
    boom(0.3, 90, 0.5);
    pad([523, 659, 784], 0.12, 0.06, 0.4, 0.9, 0.6);
  };

  Audio.newCard = function () { bell(2093, 0.1, 0.5, 0.4); };
  Audio.whoosh = function (gain) {
    hit({ freq: 500, freqTo: 3000, q: 1.2, gain: gain || 0.13, attack: 0.06, decay: 0.18, curve: 'linear', wet: 0.2 });
  };

  /* ------------------------------------------------------ ambient music */
  /* A slow generative pad; deliberately sparse so the foley stays in front. */
  var music = { playing: false, timer: null, nodes: [] };
  var CHORDS = [
    [220.00, 277.18, 329.63, 415.30],
    [196.00, 246.94, 293.66, 392.00],
    [174.61, 220.00, 261.63, 349.23],
    [164.81, 207.65, 246.94, 329.63]
  ];

  function musicVoice(freq, dur) {
    var t0 = now();
    var o = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    o.type = 'triangle'; o2.type = 'sine';
    o.frequency.value = freq; o2.frequency.value = freq * 2.003;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    var g = ctx.createGain();
    o.connect(f); o2.connect(f); f.connect(g);
    var w = ctx.createGain(); w.gain.value = 0.7;
    g.connect(musicBus); g.connect(w); w.connect(convolver);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.045, t0 + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o2.start(t0);
    o.stop(t0 + dur + 0.1); o2.stop(t0 + dur + 0.1);
  }

  Audio.startMusic = function () {
    if (!ctx || music.playing) return;
    music.playing = true;
    musicBus.gain.setTargetAtTime(settings.music, now(), 1.5);
    var i = 0;
    function step() {
      if (!music.playing) return;
      var chord = CHORDS[i % CHORDS.length];
      chord.forEach(function (f, k) {
        setTimeout(function () { if (music.playing) musicVoice(f, 6.5); }, k * 140);
      });
      i++;
      music.timer = setTimeout(step, 6800);
    }
    step();
  };

  Audio.stopMusic = function () {
    music.playing = false;
    clearTimeout(music.timer);
    if (musicBus) musicBus.gain.setTargetAtTime(0, now(), 0.6);
  };

  Audio.musicPlaying = function () { return music.playing; };

  global.Sfx = Audio;
})(window);
