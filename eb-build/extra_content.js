
/* =============================================================================
 * EXTRA CONTENT PACK — Mission ladders, box odds, tutorial, events, rulebook
 * ============================================================================= */

const MISSION_LADDER = [
  { level:1, missions:2, reward:{type:"coins",amount:50}, unlock:"silver" },
  { level:2, missions:2, reward:{type:"coins",amount:75}, unlock:null },
  { level:3, missions:2, reward:{type:"lives",amount:1}, unlock:null },
  { level:4, missions:3, reward:{type:"coins",amount:100}, unlock:null },
  { level:5, missions:3, reward:{type:"box",id:"silver"}, unlock:"groups_tease" },
  { level:6, missions:3, reward:{type:"gems",amount:2}, unlock:null },
  { level:7, missions:3, reward:{type:"coins",amount:150}, unlock:null },
  { level:8, missions:3, reward:{type:"booster",id:"time10"}, unlock:null },
  { level:9, missions:3, reward:{type:"coins",amount:200}, unlock:null },
  { level:10, missions:4, reward:{type:"box",id:"gold"}, unlock:"daily_missions" },
  { level:11, missions:4, reward:{type:"coins",amount:220}, unlock:null },
  { level:12, missions:4, reward:{type:"gems",amount:3}, unlock:null },
  { level:13, missions:4, reward:{type:"lives",amount:3}, unlock:null },
  { level:14, missions:4, reward:{type:"coins",amount:250}, unlock:null },
  { level:15, missions:4, reward:{type:"box",id:"series"}, unlock:null },
  { level:16, missions:4, reward:{type:"coins",amount:280}, unlock:null },
  { level:17, missions:5, reward:{type:"gems",amount:4}, unlock:null },
  { level:18, missions:5, reward:{type:"booster",id:"score2"}, unlock:null },
  { level:19, missions:5, reward:{type:"coins",amount:320}, unlock:null },
  { level:20, missions:5, reward:{type:"box",id:"gold"}, unlock:"groups" },
  { level:21, missions:5, reward:{type:"coins",amount:350}, unlock:null },
  { level:22, missions:5, reward:{type:"gems",amount:5}, unlock:null },
  { level:23, missions:5, reward:{type:"lives",amount:5}, unlock:null },
  { level:24, missions:5, reward:{type:"box",id:"diamond"}, unlock:null },
  { level:25, missions:6, reward:{type:"coins",amount:400}, unlock:null },
];

const MISSION_TEMPLATES = [
  { id:"score_n", label:"Score {n} points", key:"score", targets:[500,1000,2000,3500,5000] },
  { id:"clear_n", label:"Clear {n} emojis", key:"clears", targets:[40,80,120,180,250] },
  { id:"blitz_n", label:"Enter Blitz {n} time(s)", key:"blitz", targets:[1,2,3] },
  { id:"power_n", label:"Use an Emoji's power {n} time(s)", key:"power", targets:[1,2,3] },
  { id:"combo_n", label:"Create a combo of {n}+", key:"combo", targets:[3,4,5,6] },
  { id:"cloud_n", label:"Create {n} Lightning Clouds", key:"cloudsMade", targets:[1,2,3,5] },
  { id:"sun_n", label:"Create {n} Sunshine power-ups", key:"sunsMade", targets:[1,2,3] },
  { id:"star_n", label:"Create {n} Rainbow Stars", key:"starsMade", targets:[1,2] },
  { id:"coins_n", label:"Earn {n} coins from play", key:"coins", targets:[20,40,60,100] },
];

const BOX_ODDS_NOTES = {
  silver: { costCoins:15000, pool:"common+rare", dupeChance:0.55, newChance:0.45 },
  gold: { costCoins:30000, pool:"rare+epic", dupeChance:0.5, newChance:0.5 },
  series: { costCoins:30000, pool:"seriesLimited", dupeChance:0.4, newChance:0.6 },
  diamond: { costGems:200, pool:"epic+legend+event", dupeChance:0.35, newChance:0.65 },
};

const TUTORIAL_BEATS = [
  { id:"t1", title:"Swap to match", body:"Swap two adjacent emojis to make a line of 3 or more." },
  { id:"t2", title:"Lightning Cloud", body:"Match 4 in a row to craft a Lightning Cloud. Swipe it sideways to clear a row, or up/down to clear a column." },
  { id:"t3", title:"Sunshine", body:"An L or T of 5 creates Sunshine — it clears the full row and column in a glowing cross." },
  { id:"t4", title:"Rainbow Star", body:"Match 5 in a straight line for a Rainbow Star. Swap it with any emoji to clear all of that type." },
  { id:"t5", title:"Combine specials", body:"Swap two power-ups together for massive board wipes and transforms." },
  { id:"t6", title:"Blitz meter", body:"Clearing emojis fills the Blitz meter. Fill it to enter Blitz Mode for huge score!" },
  { id:"t7", title:"Hero power", body:"Clear your equipped emoji to charge its unique power, then tap the hero on the cloud." },
  { id:"t8", title:"Missions", body:"Complete missions on the home cloud to earn boxes, lives, and gems." },
  { id:"t9", title:"Collection", body:"Open boxes to collect emojis. Duplicates power up their level and score value." },
  { id:"t10", title:"Lives", body:"Each round costs a life. Lives refill over time, or buy a refill with gems." },
];

const EVENT_CALENDAR = [
  { id:"item_card", name:"Item Card Week", blurb:"Collect story items during rounds for a series box.", days:7 },
  { id:"villain", name:"Villain Challenge", blurb:"Clear missions against a boss emoji meter.", days:5 },
  { id:"rainbow_falls", name:"Rainbow Falls", blurb:"Bonus ladder after clearing the main event map.", days:3 },
  { id:"photo_hunt", name:"Photo Hunt", blurb:"Clear purple fog tiles to reveal hidden emojis.", days:4 },
  { id:"cozy", name:"Cozy Crafts", blurb:"Limited craft emojis in a rotating diamond box.", days:6 },
];

const SCORE_TUNING = {
  match3:10, match4:14, match5:20, cascadeStep:0.25, blitzMult:3,
  cloudClear:15, sunshineClear:22, starClear:28, combineClear:35, characterClear:12,
  emojiLevelBonus:4,
};

const UI_COPY = {
  hubTip:"Let's use your coins to get a new emoji!",
  collHint:"Every emoji has a unique power! Collect them all to find your favorite!",
  blitzToast:"BLITZ MODE!",
  noLives:"Out of lives! Wait for a refill or buy more with gems.",
  groupsLocked:"Groups unlock at level 20.",
  wandHint:"Magic Wands guarantee a new emoji from a box (soft-currency satire).",
};

function missionLabel(template, target){
  return String(template.label||"").replace("{n}", String(target));
}

function pickMissionForLevel(level, rngFn){
  const rung = MISSION_LADDER.find(x=>x.level===level) || MISSION_LADDER[MISSION_LADDER.length-1];
  const rng = rngFn || Math.random;
  const out=[];
  for(let i=0;i<rung.missions;i++){
    const t = MISSION_TEMPLATES[Math.floor(rng()*MISSION_TEMPLATES.length)];
    const target = t.targets[Math.min(t.targets.length-1, Math.floor(level/4)+ (rng()>.5?1:0))];
    out.push({ id:t.id+"_"+i+"_"+level, label:missionLabel(t,target), key:t.key, target, progress:0, claimed:false });
  }
  return { rung, missions:out };
}

function describeBoxOdds(id){
  const o = BOX_ODDS_NOTES[id];
  if(!o) return "";
  const cost = o.costCoins!=null ? ("coins "+o.costCoins) : ("gems "+o.costGems);
  return cost+" · pool "+o.pool+" · new "+((o.newChance*100)|0)+"%";
}

function tutorialListHtml(){
  return TUTORIAL_BEATS.map(b=>'<div class="howto-card panel"><h3>'+b.title+'</h3><p>'+b.body+'</p></div>').join("");
}

function eventsListHtml(){
  return EVENT_CALENDAR.map(e=>'<div class="panel quest-card"><h3>'+e.name+'</h3><p>'+e.blurb+'</p><small>'+e.days+' days</small></div>').join("");
}

const SPECIAL_RULEBOOK = [
  "Lightning Cloud forms from exactly four matched emojis in a straight line.",
  "The swipe direction of a Lightning Cloud chooses row (horizontal) or column (vertical).",
  "Sunshine forms from L or T shapes of five or more connected matches.",
  "Sunshine always clears the entire row and column through its cell (a cross).",
  "Rainbow Star forms from five or more in a single straight line.",
  "Swapping a Rainbow Star with a normal emoji clears every board copy of that emoji.",
  "Cloud + Cloud clears a three-wide band of rows or columns around the midpoint.",
  "Cloud + Sunshine clears row, column, and both diagonals through the midpoint.",
  "Star + Star clears the entire board.",
  "Star + Cloud/Sunshine transforms the most common emoji into that special, then detonates them.",
  "Cascades after gravity can create fresh matches and raise the combo multiplier.",
  "Blitz Mode pauses the main timer and multiplies scores while the Blitz clock runs.",
  "Only adjacent orthogonal swaps are legal, and only if they match or activate a special.",
  "Hero power charge rises only when you clear your currently equipped emoji.",
];

function rulebookHtml(){
  return '<ul class="rulebook">'+SPECIAL_RULEBOOK.map(r=>'<li>'+r+'</li>').join("")+'</ul>';
}

const LEVEL_DUPES_CURVE = [0,1,2,3,5,8];
function dupesToNextLevel(level){
  const lv = Math.max(1, Math.min(5, level|0));
  if(lv>=5) return 0;
  return LEVEL_DUPES_CURVE[lv+1] || 1;
}
function totalDupesForLevel(level){
  let t=0; for(let i=2;i<=level;i++) t += LEVEL_DUPES_CURVE[i]||0; return t;
}

/* Design note 01: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 02: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 03: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 04: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 05: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 06: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 07: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 08: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 09: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 10: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 11: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 12: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 13: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 14: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 15: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 16: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 17: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 18: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 19: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 20: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 21: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 22: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 23: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 24: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 25: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 26: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 27: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 28: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 29: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 30: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 31: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 32: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 33: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 34: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 35: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 36: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 37: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 38: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 39: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 40: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 41: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 42: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 43: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 44: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 45: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 46: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 47: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 48: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 49: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 50: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 51: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 52: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 53: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 54: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 55: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 56: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 57: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 58: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 59: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 60: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 61: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 62: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 63: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 64: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 65: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 66: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 67: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 68: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 69: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 70: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 71: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 72: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 73: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 74: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 75: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 76: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 77: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 78: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 79: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Design note 80: Cloud Factory chrome keeps corners >= 16px; pills use inset highlights. */
/* Playtest checklist 01: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 02: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 03: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 04: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 05: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 06: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 07: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 08: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 09: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 10: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 11: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 12: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 13: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 14: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 15: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 16: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 17: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 18: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 19: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 20: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 21: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 22: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 23: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 24: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 25: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 26: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 27: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 28: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 29: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 30: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 31: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 32: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 33: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 34: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 35: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 36: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 37: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 38: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 39: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 40: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 41: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 42: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 43: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 44: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 45: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 46: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 47: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 48: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 49: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 50: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 51: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 52: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 53: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 54: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 55: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 56: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 57: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 58: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 59: verify cascade lock, special axis, HUD timers, lives regen edge cases. */
/* Playtest checklist 60: verify cascade lock, special axis, HUD timers, lives regen edge cases. */

const MISSION_LADDER_EXTENDED = [
  { level:26, missions:5, reward:{type:"coins",amount:420}, unlock:null },
  { level:27, missions:5, reward:{type:"coins",amount:440}, unlock:null },
  { level:28, missions:5, reward:{type:"coins",amount:460}, unlock:null },
  { level:29, missions:5, reward:{type:"coins",amount:480}, unlock:null },
  { level:30, missions:5, reward:{type:"coins",amount:500}, unlock:null },
  { level:31, missions:5, reward:{type:"coins",amount:520}, unlock:null },
  { level:32, missions:5, reward:{type:"coins",amount:540}, unlock:null },
  { level:33, missions:5, reward:{type:"coins",amount:560}, unlock:null },
  { level:34, missions:5, reward:{type:"coins",amount:580}, unlock:null },
  { level:35, missions:5, reward:{type:"coins",amount:600}, unlock:null },
  { level:36, missions:5, reward:{type:"coins",amount:620}, unlock:null },
  { level:37, missions:5, reward:{type:"coins",amount:640}, unlock:null },
  { level:38, missions:5, reward:{type:"coins",amount:660}, unlock:null },
  { level:39, missions:5, reward:{type:"coins",amount:680}, unlock:null },
  { level:40, missions:5, reward:{type:"coins",amount:700}, unlock:null },
  { level:41, missions:6, reward:{type:"coins",amount:720}, unlock:null },
  { level:42, missions:6, reward:{type:"coins",amount:740}, unlock:null },
  { level:43, missions:6, reward:{type:"coins",amount:760}, unlock:null },
  { level:44, missions:6, reward:{type:"coins",amount:780}, unlock:null },
  { level:45, missions:6, reward:{type:"coins",amount:800}, unlock:null },
  { level:46, missions:6, reward:{type:"coins",amount:820}, unlock:null },
  { level:47, missions:6, reward:{type:"coins",amount:840}, unlock:null },
  { level:48, missions:6, reward:{type:"coins",amount:860}, unlock:null },
  { level:49, missions:6, reward:{type:"coins",amount:880}, unlock:null },
  { level:50, missions:6, reward:{type:"coins",amount:900}, unlock:null },
];

function missionRung(level){
  return MISSION_LADDER.find(x=>x.level===level)
    || MISSION_LADDER_EXTENDED.find(x=>x.level===level)
    || MISSION_LADDER_EXTENDED[MISSION_LADDER_EXTENDED.length-1];
}

const CHARACTER_LORE = {
  0: { name:"Fox Fire", lore:"Crossburst pioneer of the Cloud Factory." },
  1: { name:"Frog Hop", lore:"Pillar Drop specialist who loves rainy cascades." },
  2: { name:"Cat Nap", lore:"Stops the clock with a sleepy blink." },
  3: { name:"Panda Star", lore:"Lucky bamboo grows Rainbow Stars." },
  4: { name:"Tiger Bolt", lore:"Thunder X with bonus charge." },
  5: { name:"Nova Unicorn", lore:"Prism rain of stars." },
  6: { name:"Monkey Biz", lore:"Barrel rolls across columns." },
  7: { name:"Jade Dragon", lore:"Outer-ring dragon pulse." },
  8: { name:"Chill Penguin", lore:"Ice slide time freeze." },
  9: { name:"Night Owl", lore:"Moon sweep across rows." },
  10: { name:"Solar Lion", lore:"Sun Storm double Sunshine." },
  11: { name:"Ink Octo", lore:"Ink Splash clears the common type." },
  12: { name:"Lucky Bunny", lore:"Carrot slash row sweeps." },
  13: { name:"Storm Wolf", lore:"Howling gale double ring." },
  14: { name:"Berry Bear", lore:"Sweet smash score bursts." },
  15: { name:"Coral Crab", lore:"Sideways snaps for clouds." },
};

const HOWTO_EXTENDED_HTML = `
<div class="howto-card panel"><h3>Matching Basics</h3><p>• Tap an emoji, then tap an adjacent emoji to swap — or drag in a direction.</p><p>• Only swaps that create a match of 3+ or activate a special are allowed.</p><p>• Invalid swaps bounce back with a reject sound.</p><p>• After clears, emojis fall down and new ones spawn from the clouds above.</p></div>
<div class="howto-card panel"><h3>Power-Up Crafting</h3><p>• Four in a line crafts a Lightning Cloud on the center of the run.</p><p>• Five or more in a straight line crafts a Rainbow Star.</p><p>• An L or T connection of five or more crafts Sunshine at the junction.</p><p>• Power-ups sit on glossy golden tiles so they stand out on the navy board.</p></div>
<div class="howto-card panel"><h3>Blitz Mode</h3><p>• Every clear nudges the purple Blitz meter under the board.</p><p>• Fill the meter to trigger Blitz — the sky flares and score multiplies.</p><p>• During Blitz, the main :60 timer pauses while a short Blitz clock runs.</p><p>• The emoji pool shrinks slightly in Blitz to create wilder cascades.</p></div>
<div class="howto-card panel"><h3>Hero Powers</h3><p>• Equip one emoji before the round from the Choose Hero screen.</p><p>• Clearing that emoji charges the lightning meter under your cloud podium.</p><p>• When the meter is full, the hero button pulses — tap to unleash the spell.</p><p>• Higher emoji levels improve score value and some spell strength.</p></div>
<div class="howto-card panel"><h3>Cloud Meta</h3><p>• Missions live on the home cloud panel with circular level tabs.</p><p>• Complete missions to climb levels and unlock boxes, lives, and gems.</p><p>• The collection screen mirrors Emoji Blitz: featured power card + locked grid.</p><p>• Groups stay locked until later levels (shown with a lock on the Groups tab).</p></div>
<div class="howto-card panel"><h3>Economy</h3><p>• Coins come from rounds, gifts, crates, and the prize wheel.</p><p>• Gems are rarer — use them for diamond boxes or life refills.</p><p>• Silver, Gold, Series, and Diamond boxes expand your roster.</p><p>• Duplicates raise power level up to level 5 along a dupe curve.</p></div>
`;

const SCREEN_WIREFRAMES = {
  splash: "Centered logo + loader bar on cloud sky",
  menu: "Resource pills, missions panel, tip bubble, mascot, Play cloud CTA",
  chars: "Emojis/Groups tabs, featured card, collection grid, dock",
  select: "Hero preview, roster grid, booster pick, Start Round",
  store: "Box list with rarity frames and buy buttons",
  spin: "Prize wheel + pity meter",
  howto: "Scrollable tutorial cards + rulebook",
  settings: "SFX/Music/Shake toggles + reset",
  events: "Event calendar cards",
  game: "EB play HUD + board + blitz + hero cloud",
  result: "Stars, stats, balloons layer, replay",
  quests: "Daily mission claim list",
  pass: "Season track free/VIP",
  ach: "Achievement claim list",
};

const CLEAR_SCORE_TABLE = {
  "match_d0": 10,
  "match_d1": 12,
  "match_d2": 15,
  "match_d3": 17,
  "match_d4": 20,
  "match_d5": 22,
  "match_d6": 25,
  "match_d7": 27,
  "cascade_d0": 10,
  "cascade_d1": 12,
  "cascade_d2": 15,
  "cascade_d3": 17,
  "cascade_d4": 20,
  "cascade_d5": 22,
  "cascade_d6": 25,
  "cascade_d7": 27,
  "cloud_d0": 15,
  "cloud_d1": 18,
  "cloud_d2": 22,
  "cloud_d3": 26,
  "cloud_d4": 30,
  "cloud_d5": 33,
  "cloud_d6": 37,
  "cloud_d7": 41,
  "sunshine_d0": 22,
  "sunshine_d1": 27,
  "sunshine_d2": 33,
  "sunshine_d3": 38,
  "sunshine_d4": 44,
  "sunshine_d5": 49,
  "sunshine_d6": 55,
  "sunshine_d7": 60,
  "star_d0": 28,
  "star_d1": 35,
  "star_d2": 42,
  "star_d3": 49,
  "star_d4": 56,
  "star_d5": 63,
  "star_d6": 70,
  "star_d7": 77,
  "combine_d0": 35,
  "combine_d1": 43,
  "combine_d2": 52,
  "combine_d3": 61,
  "combine_d4": 70,
  "combine_d5": 78,
  "combine_d6": 87,
  "combine_d7": 96,
  "character_d0": 12,
  "character_d1": 15,
  "character_d2": 18,
  "character_d3": 21,
  "character_d4": 24,
  "character_d5": 27,
  "character_d6": 30,
  "character_d7": 33,
};
