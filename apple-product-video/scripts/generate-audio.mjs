#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER SOUND DESIGN — synthesised from scratch
 * ─────────────────────────────────────────────────────────────────────────────
 * Writes four 16-bit mono WAVs into public/audio/. No samples, no downloads,
 * no binaries in the repo. Runs automatically on `npm install`, or on demand:
 *
 *     npm run audio
 *
 * These are structurally correct placeholders — right length, right envelope,
 * right frequency content to sit under the picture — not finished sound design.
 * Replace the files with real stems when you have them; the mix in
 * src/components/AudioBed.tsx will still be correct.
 */

import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const RATE = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'audio');

/* ── Deterministic noise ───────────────────────────────────────────────────
 * Same generator as src/lib/anim.ts, so regenerating the audio always produces
 * a byte-identical file. */
let seed = 1;
const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

/** One-pole low-pass. `cutoff` is normalised 0–1; call per sample. */
const makeLowpass = () => {
  let z = 0;
  return (x, cutoff) => {
    const a = Math.min(0.999, Math.max(0.0005, cutoff));
    z += a * (x - z);
    return z;
  };
};

const writeWav = (name, samples) => {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // format = PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);

  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }

  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`  ✓ ${name}  ${(n / RATE).toFixed(1)}s  ${(buffer.length / 1024).toFixed(0)} KB`);
};

/* ── 1 · AMBIENT BED ───────────────────────────────────────────────────────
 * A 42-second pad. Built from a low A (55 Hz) plus a stack of just-intonation
 * partials, each with its own very slow amplitude LFO so the chord never
 * settles into a fixed timbre. A touch of filtered noise gives it air.
 *
 * The important detail is what is NOT here: no rhythm, no transients, nothing
 * above ~2 kHz. A bed under a product film should be felt and not noticed. */
const ambientBed = () => {
  const dur = 42;
  const n = RATE * dur;
  const out = new Float32Array(n);
  const lp = makeLowpass();

  // Root, fifth, octave, tenth, twelfth — an open, unresolved voicing.
  const partials = [
    {f: 55.0, a: 0.5, lfo: 0.031},
    {f: 82.4, a: 0.3, lfo: 0.019},
    {f: 110.0, a: 0.26, lfo: 0.043},
    {f: 164.8, a: 0.14, lfo: 0.027},
    {f: 220.0, a: 0.1, lfo: 0.037},
    {f: 329.6, a: 0.05, lfo: 0.023},
  ];

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;

    for (const p of partials) {
      // Slow amplitude drift, plus ±0.6 Hz of detune so partials beat gently
      // against each other — that beating is the whole character of the pad.
      const swell = 0.55 + 0.45 * Math.sin(2 * Math.PI * p.lfo * t + p.f);
      const detune = 1 + 0.0009 * Math.sin(2 * Math.PI * 0.013 * t + p.f * 0.1);
      v += Math.sin(2 * Math.PI * p.f * detune * t) * p.a * swell;
    }

    // Air: heavily filtered noise, opening slowly across the film.
    const air = lp(random() * 2 - 1, 0.0016 + 0.0012 * (t / dur));
    v += air * 0.5;

    // 3s fade in, 5s fade out.
    const env = Math.min(1, t / 3) * Math.min(1, (dur - t) / 5);
    out[i] = v * 0.11 * env;
  }
  return out;
};

/* ── 2 · RISER ─────────────────────────────────────────────────────────────
 * 3.2s. A noise band sweeping upward through a resonant-ish filter, plus a
 * sine that rises a twelfth. Resolves with a fast drop rather than a cymbal —
 * a crash would be far too aggressive for this film. */
const riser = () => {
  const dur = 3.2;
  const n = Math.floor(RATE * dur);
  const out = new Float32Array(n);
  const lp1 = makeLowpass();
  const lp2 = makeLowpass();

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const p = t / dur;

    // Filter opens exponentially — linear sweeps sound mechanical.
    const cutoff = 0.0006 + Math.pow(p, 2.4) * 0.07;
    const noise = lp2(lp1(random() * 2 - 1, cutoff), cutoff) * 6;

    // Sine glide, 220 Hz → 660 Hz.
    const f = 220 * Math.pow(3, p);
    const tone = Math.sin(2 * Math.PI * f * t) * 0.16 * Math.pow(p, 1.6);

    // Swells to 92% then drops fast, so it has already released on the cut.
    const env = p < 0.92 ? Math.pow(p / 0.92, 1.8) : Math.pow(1 - (p - 0.92) / 0.08, 2.2);
    out[i] = (noise + tone) * 0.34 * env;
  }
  return out;
};

/* ── 3 · WHOOSH ────────────────────────────────────────────────────────────
 * 1.1s. Filtered noise whose cutoff sweeps up and then back down, with a
 * short pitch-down tail. The doppler-ish shape is what makes it read as
 * movement rather than as a hiss. */
const whoosh = () => {
  const dur = 1.1;
  const n = Math.floor(RATE * dur);
  const out = new Float32Array(n);
  const lp1 = makeLowpass();
  const lp2 = makeLowpass();

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const p = t / dur;

    // Cutoff peaks at p = 0.32 — early, so the energy is front-loaded.
    const bell = Math.exp(-Math.pow((p - 0.32) / 0.26, 2));
    const cutoff = 0.001 + bell * 0.11;
    const noise = lp2(lp1(random() * 2 - 1, cutoff), cutoff) * 7;

    // Sub tail, dropping 90 → 45 Hz. Gives the transition weight.
    const sub = Math.sin(2 * Math.PI * (90 - 45 * p) * t) * 0.25 * Math.exp(-p * 5);

    const env = Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.05)), 1.4);
    out[i] = (noise * 0.9 + sub) * 0.4 * env;
  }
  return out;
};

/* ── 4 · CHIME ─────────────────────────────────────────────────────────────
 * 5s. Additive bell using the classic inharmonic partial ratios (1, 2.00,
 * 2.76, 5.40, 8.93) with independently decaying envelopes — high partials die
 * first, which is what makes a struck bell sound struck. A slow tremolo on the
 * fundamental gives the long tail some life. */
const chime = () => {
  const dur = 5;
  const n = Math.floor(RATE * dur);
  const out = new Float32Array(n);
  const root = 523.25; // C5

  const partials = [
    {ratio: 0.5, amp: 0.35, decay: 1.1},
    {ratio: 1.0, amp: 1.0, decay: 1.4},
    {ratio: 2.0, amp: 0.35, decay: 2.4},
    {ratio: 2.76, amp: 0.22, decay: 3.4},
    {ratio: 5.4, amp: 0.09, decay: 5.5},
    {ratio: 8.93, amp: 0.04, decay: 8.0},
  ];

  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    for (const p of partials) {
      v += Math.sin(2 * Math.PI * root * p.ratio * t) * p.amp * Math.exp(-t * p.decay);
    }
    // 4ms attack — enough to remove the click, short enough to still be a strike.
    const attack = Math.min(1, t / 0.004);
    const tremolo = 1 + 0.06 * Math.sin(2 * Math.PI * 4.5 * t);
    out[i] = v * 0.22 * attack * tremolo;
  }
  return out;
};

mkdirSync(OUT_DIR, {recursive: true});
console.log('Synthesising placeholder sound design →', OUT_DIR);
seed = 1;
writeWav('ambient-bed.wav', ambientBed());
seed = 2;
writeWav('riser.wav', riser());
seed = 3;
writeWav('whoosh.wav', whoosh());
seed = 4;
writeWav('chime.wav', chime());
console.log('Done. Replace these with real stems in public/audio/ when you have them.');
