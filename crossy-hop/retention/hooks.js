/* ============================================================================
 * RETENTION / hooks.js — runtime helpers consumed by CROSSY HOP
 * Soft currency only. Organized addiction without real-money IAP.
 * ========================================================================== */
import { TIP_BANK, TIP_COUNT } from './tips.js';
import { DEATH_FLAVOR_BANK, DEATH_FLAVOR_COUNT } from './death-flavor.js';
import { MISSION_TEMPLATES, MISSION_COUNT } from './missions.js';
import { LOOT_CURVES } from './loot-curves.js';
import { SEASON_CATALOG, SEASON_COUNT } from './seasons.js';
import { ACHIEVEMENT_TREE, ACHIEVEMENT_COUNT } from './achievements.js';
import { COMBO_CALLOUTS, NEAR_MISS_LINES, CLAIM_LINES } from './callouts.js';
import { DIFFICULTY_CURVE } from './balance.js';
import { FOMO_LABELS, STAR_DRIP, LOGIN_POUCH, HEAT_THRESHOLDS } from './catalog-pad.js';

function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pick(arr, rng = Math.random){
  if(!arr || !arr.length) return null;
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function pickTip(seed){
  const rng = seed == null ? Math.random : mulberry32(seed|0);
  return pick(TIP_BANK, rng);
}

export function pickDeathFlavor(cause, seed){
  const bank = DEATH_FLAVOR_BANK[cause] || DEATH_FLAVOR_BANK.car || [];
  const rng = seed == null ? Math.random : mulberry32((seed|0) ^ (cause||'').length * 997);
  return pick(bank, rng);
}

export function rollDailyMissions(dayKey, count = 3){
  let h = 2166136261;
  const s = String(dayKey || 'day');
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rng = mulberry32(h >>> 0);
  const out = [];
  const used = new Set();
  while(out.length < count && out.length < MISSION_TEMPLATES.length){
    const m = pick(MISSION_TEMPLATES, rng);
    if(!m || used.has(m.id)) continue;
    used.add(m.id);
    out.push({ ...m, progress:0, done:false });
  }
  return out;
}

export function lootRoll(curveName, pity = 0, seed){
  const curve = LOOT_CURVES[curveName] || LOOT_CURVES.spin;
  const rng = seed == null ? Math.random : mulberry32(seed|0);
  const boosted = curve.map((row, i) => ({ ...row, weight: row.weight + (pity > row.pity ? 3 : 0) + (i % 5 === 0 ? 1 : 0) }));
  let total = 0;
  for(const r of boosted) total += r.weight;
  let roll = rng() * total;
  for(const r of boosted){
    roll -= r.weight;
    if(roll <= 0) return r;
  }
  return boosted[0];
}

export function currentSeason(now = Date.now()){
  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const week = Math.min(4, 1 + Math.floor((d.getUTCDate() - 1) / 7));
  const id = `S${year}${String(month).padStart(2,'0')}W${week}`;
  return SEASON_CATALOG.find(s => s.id === id) || SEASON_CATALOG[0];
}

export function pickComboCallout(streak){
  const eligible = COMBO_CALLOUTS.filter(c => (streak|0) >= c.min);
  return pick(eligible.length ? eligible : COMBO_CALLOUTS);
}

export function pickNearMissLine(seed){
  const rng = seed == null ? Math.random : mulberry32(seed|0);
  return pick(NEAR_MISS_LINES, rng);
}

export function pickClaimLine(seed){
  const rng = seed == null ? Math.random : mulberry32(seed|0);
  return pick(CLAIM_LINES, rng);
}

export function difficultyAt(score){
  const s = Math.max(0, Math.min(DIFFICULTY_CURVE.length - 1, score|0));
  return DIFFICULTY_CURVE[s];
}

export function achievementProgress(stats = {}){
  // Lightweight scanner — unlocks are granted by the host game.
  const owned = [];
  for(const a of ACHIEVEMENT_TREE){
    const v =
      a.cat === 'hop' ? (stats.totalHops|0) :
      a.cat === 'coin' ? (stats.coinsEarned|0) :
      a.cat === 'fever' ? (stats.feverEnters|0) :
      a.cat === 'spin' ? (stats.spinsTotal|0) :
      a.cat === 'journey' ? (stats.journeyStep|0) :
      a.cat === 'pet' ? ((stats.pets||[]).length) :
      a.cat === 'collect' ? ((stats.owned||[]).length) :
      a.cat === 'survival' ? (stats.best|0) :
      a.cat === 'style' ? (stats.perfects|0) :
      (stats.claimsTotal|0);
    if(v >= a.goal) owned.push(a.id);
  }
  return owned;
}

export const RETENTION_META = {
  tips: TIP_COUNT,
  deathFlavors: DEATH_FLAVOR_COUNT,
  missions: MISSION_COUNT,
  seasons: SEASON_COUNT,
  achievements: ACHIEVEMENT_COUNT,
  difficultyRows: DIFFICULTY_CURVE.length,
  version: '1.0.0',
  note: 'Soft-currency retention library — organized, free-to-play, no IAP.',
};

export const HOP_RETENTION = {
  TIP_BANK, DEATH_FLAVOR_BANK, MISSION_TEMPLATES, LOOT_CURVES, SEASON_CATALOG,
  ACHIEVEMENT_TREE, COMBO_CALLOUTS, NEAR_MISS_LINES, CLAIM_LINES, DIFFICULTY_CURVE, FOMO_LABELS, STAR_DRIP, LOGIN_POUCH, HEAT_THRESHOLDS,
  pickTip, pickDeathFlavor, rollDailyMissions, lootRoll, currentSeason,
  pickComboCallout, pickNearMissLine, pickClaimLine, difficultyAt, achievementProgress,
  RETENTION_META,
};

if(typeof window !== 'undefined') window.HOP_RETENTION = HOP_RETENTION;
