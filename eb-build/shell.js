/* =============================================================================
 * EMOJI RUSH — Outer Shell (script fragment, loads before engine.js)
 * ============================================================================= */
/* ===================== 1. CONSTANTS & DATA ===================== */
const SAVE_KEY = "emojiRush_v3";
const ROWS = 7, COLS = 7, ROUND = 60, BLITZ_SEC = 5, POOL_N = 5, BLITZ_POOL = 4;
const FILL = 1, DECAY = 2, MULT = 3, CHARGE = 8;
const ANIM = { swap: 80, reject: 110, clear: 90, spawn: 120, special: 140, transform: 110 };
const SEASON_MS = 7 * 24 * 60 * 60 * 1000;
const VIP_COST = 800;
const SPIN_COST = 40;
const REVIVE_COST = 50;
const REVIVE_SCORE_MIN = 400;
const HOUR_MS = 60 * 60 * 1000;
const XP_PER_LEVEL = (lv) => 80 + lv * 40;
const PASS_XP_PER_TIER = 100;
const PASS_TIERS = 30;
const PITY_MAX = 8;
const MAX_CHAR_LEVEL = 5;
const LEVEL_DUPES_NEEDED = [0, 1, 2, 3, 4, 5];
const LIFE_REFILL_GEMS = 30;
const LIFE_REFILL_AMOUNT = 5;
const MAX_LIVES = 5;

const CHARACTERS = [
  { id:0, glyph:"🦊", name:"Fox Fire", rarity:"common", cost:0, spell:"pattern_x",
    desc:"Crossburst — clears both diagonals in an X.", blurb:"Starter speedster." },
  { id:1, glyph:"🐸", name:"Frog Hop", rarity:"common", cost:150, spell:"column_crush",
    desc:"Pillar Drop — crushes two random columns.", blurb:"Jumps into chaos." },
  { id:2, glyph:"🐱", name:"Cat Nap", rarity:"rare", cost:300, spell:"time_pause",
    desc:"Frozen Moment — freezes the clock for 3s.", blurb:"Master of chill." },
  { id:3, glyph:"🐼", name:"Panda Star", rarity:"rare", cost:450, spell:"guaranteed_stars",
    desc:"Star Shower — spawns two Rainbow Stars.", blurb:"Lucky bamboo vibes." },
  { id:4, glyph:"🐯", name:"Tiger Bolt", rarity:"epic", cost:700, spell:"pattern_x",
    desc:"Thunder X — diagonal wipe with bonus charge.", blurb:"Strikes twice.", chargeBonus:4 },
  { id:5, glyph:"🦄", name:"Nova Unicorn", rarity:"epic", cost:900, spell:"guaranteed_stars",
    desc:"Prism Rain — three Rainbow Stars.", blurb:"Mythic sparkle.", starCount:3 },
  { id:6, glyph:"🐵", name:"Monkey Biz", rarity:"rare", cost:350, spell:"column_crush",
    desc:"Barrel Roll — three random columns.", blurb:"Banana tactics.", crushCount:3 },
  { id:7, glyph:"🐲", name:"Jade Dragon", rarity:"legend", cost:1500, spell:"board_pulse",
    desc:"Dragon Pulse — clears the outer ring of the board.", blurb:"Ancient power." },
  { id:8, glyph:"🐧", name:"Chill Penguin", rarity:"common", cost:200, spell:"time_pause",
    desc:"Ice Slide — freezes time for 4s.", blurb:"Cool under pressure.", pauseSec:4 },
  { id:9, glyph:"🦉", name:"Night Owl", rarity:"epic", cost:800, spell:"row_sweep",
    desc:"Moon Sweep — clears three random rows.", blurb:"Sees every match." },
  { id:10, glyph:"🦁", name:"Solar Lion", rarity:"legend", cost:1800, spell:"sun_storm",
    desc:"Sun Storm — places and fires two Sunshine tiles.", blurb:"King of the board." },
  { id:11, glyph:"🐙", name:"Ink Octo", rarity:"rare", cost:500, spell:"color_bomb",
    desc:"Ink Splash — clears the most common emoji type.", blurb:"Eight ways to win." },
  { id:12, glyph:"🐰", name:"Lucky Bunny", rarity:"epic", cost:850, spell:"row_sweep",
    desc:"Carrot Slash — clears four random rows.", blurb:"Hop into riches.", crushCount:4 },
  { id:13, glyph:"🐺", name:"Storm Wolf", rarity:"legend", cost:2000, spell:"board_pulse",
    desc:"Howling Gale — clears the outer two rings.", blurb:"Alpha of the storm.", doubleRing:true },
  { id:14, glyph:"🐻", name:"Honey Bear", rarity:"common", cost:250, spell:"color_bomb",
    desc:"Honey Swarm — clears the most common emoji type.", blurb:"Sweet but fierce." },
  { id:15, glyph:"🦋", name:"Flutter Bug", rarity:"rare", cost:400, spell:"guaranteed_stars",
    desc:"Butterfly Dust — spawns two Rainbow Stars.", blurb:"Delicate wings, deadly combos.", starCount:2 },
];


const CHAR_LORE = {
  0: "Fox Fire raced across cloud factory rooftops.",
  1: "Frog Hop landed in the coin fountain.",
  2: "Cat Nap slept through a blitz and still scored.",
  3: "Panda Star rolls lucky bamboo dice.",
  4: "Tiger Bolt stripes crackle on combos.",
  5: "Nova Unicorn leaves glitter trails.",
  6: "Monkey Biz juggles Lightning Clouds.",
  7: "Jade Dragon pulses through the grid.",
  8: "Chill Penguin slides on frozen timers.",
  9: "Night Owl blinks at Rainbow Stars.",
  10: "Solar Lion roars sunshine into being.",
  11: "Ink Octo signs matches with purple ink.",
  12: "Lucky Bunny ears twitch on valid swaps.",
  13: "Storm Wolf howls along outer rings.",
  14: "Honey Bear shares sweet combos.",
  15: "Flutter Bug scatters stardust on clears.",
};

const SPECIAL_GLYPH = { LightningCloud:"🌩️", Sunshine:"☀️", RainbowStar:"🌈" };

/* Disney Emoji Blitz–style glossy SVG faces (original, not licensed assets) */
const FACE_PAL = {
  0:{bg:["#ff9a3c","#ff6a1a"], ear:"#e85d12", eye:"#16324f", blush:"#ff8a7a"},
  1:{bg:["#7dff7a","#2fbf4a"], ear:"#1f9a38", eye:"#16324f", blush:"#ff9ab0"},
  2:{bg:["#ffb347","#f08a24"], ear:"#e07818", eye:"#16324f", blush:"#ff8aa8"},
  3:{bg:["#f5f5f5","#d9d9d9"], ear:"#222", eye:"#16324f", blush:"#ff9ab8", accent:"#222"},
  4:{bg:["#ffb020","#f08c00"], ear:"#16324f", eye:"#16324f", blush:"#ff8a70", stripe:"#16324f"},
  5:{bg:["#fff0ff","#f7c6ff"], ear:"#e8a0ff", eye:"#5b2d8e", blush:"#ff9ad0", horn:"#c084fc"},
  6:{bg:["#d4a574","#b07840"], ear:"#8a5a2b", eye:"#16324f", blush:"#ff8a9a", muzzle:"#f3d2b0"},
  7:{bg:["#5fe08a","#1f9a4a"], ear:"#0f6b30", eye:"#16324f", blush:"#ff8a8a", crest:"#ef4d4d"},
  8:{bg:["#2b2f3a","#11151c"], ear:"#11151c", eye:"#16324f", blush:"#ff8a9a", belly:"#f5f7fa", beak:"#ffb020"},
  9:{bg:["#8b5a2b","#5c3a18"], ear:"#3d2610", eye:"#ffd166", blush:"#ff8a70", beak:"#ffb020"},
  10:{bg:["#ffb347","#e08900"], ear:"#c96e00", eye:"#16324f", blush:"#ff8a70", mane:"#ef4d4d"},
  11:{bg:["#ff7ab8","#e04f92"], ear:"#c93d78", eye:"#16324f", blush:"#ffd0e6"},
  12:{bg:["#fff4f0","#ffd0c4"], ear:"#ffb0a0", eye:"#16324f", blush:"#ff9ab8"},
  13:{bg:["#9aa4b2","#6b7585"], ear:"#4a5564", eye:"#c9f0ff", blush:"#ff8a9a"},
  14:{bg:["#c68642","#8b5a2b"], ear:"#6b4423", eye:"#16324f", blush:"#ff9a70", snout:"#f3d2b0"},
  15:{bg:["#b8f0ff","#7ad0ff"], ear:"#5b8def", eye:"#16324f", blush:"#ff9ad8", wing:"#e85aad"},
};
const SPECIAL_PAL = {
  LightningCloud:{bg:["#9ad8ff","#4aa7e8"], icon:"⚡"},
  Sunshine:{bg:["#ffe07a","#ff9a1a"], icon:"☀"},
  RainbowStar:{bg:["#ff9ad8","#7ad0ff"], icon:"★"},
};

let _deUid = 0;
function deSvg(inner, view=64){
  return `<svg class="de-face" viewBox="0 0 ${view} ${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}
function deShine(){
  return `<ellipse cx="24" cy="18" rx="14" ry="8" fill="rgba(255,255,255,.55)"/>
  <ellipse cx="20" cy="16" rx="6" ry="3.2" fill="rgba(255,255,255,.85)"/>`;
}
function deEyes(x1=22,x2=42,y=30,r=4.2,hl=true,color="#16324f"){
  let s = `<circle cx="${x1}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${color}"/>`;
  if(hl) s += `<circle cx="${x1-1.2}" cy="${y-1.4}" r="1.4" fill="#fff"/><circle cx="${x2-1.2}" cy="${y-1.4}" r="1.4" fill="#fff"/>`;
  return s;
}
function deBlush(color="#ff8aa8"){
  return `<ellipse cx="16" cy="38" rx="5" ry="3" fill="${color}" opacity=".55"/><ellipse cx="48" cy="38" rx="5" ry="3" fill="${color}" opacity=".55"/>`;
}
function deBubble(c1,c2){
  const id = "de" + (++_deUid);
  return `<defs><radialGradient id="${id}g" cx="32%" cy="28%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>
  <filter id="${id}f"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-opacity=".25"/></filter></defs>
  <circle cx="32" cy="32" r="30" fill="url(#${id}g)" filter="url(#${id}f)"/>
  <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(22,50,79,.18)" stroke-width="2.4"/>
  <circle cx="32" cy="32" r="28.5" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>`;
}


const FACE_PATHS = {
  0: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  1: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  2: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  3: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  4: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  5: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  6: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  7: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  8: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  9: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  10: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  11: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  12: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  13: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  14: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
  15: `<circle cx="10" cy="10" r="0.8" fill="rgba(255,255,255,0.10)"/><circle cx="14" cy="18" r="0.8" fill="rgba(255,255,255,0.12)"/><circle cx="18" cy="26" r="0.8" fill="rgba(255,255,255,0.14)"/><circle cx="22" cy="10" r="0.8" fill="rgba(255,255,255,0.16)"/><circle cx="26" cy="18" r="0.8" fill="rgba(255,255,255,0.18)"/><circle cx="30" cy="26" r="0.8" fill="rgba(255,255,255,0.20)"/><circle cx="34" cy="10" r="0.8" fill="rgba(255,255,255,0.22)"/><circle cx="38" cy="18" r="0.8" fill="rgba(255,255,255,0.24)"/><circle cx="42" cy="26" r="0.8" fill="rgba(255,255,255,0.26)"/><circle cx="46" cy="10" r="0.8" fill="rgba(255,255,255,0.28)"/><circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.30)"/><circle cx="54" cy="26" r="0.8" fill="rgba(255,255,255,0.32)"/>`,
};

const FACE_DETAIL = {
  0: `<path d="M18 24 Q22 20 26 24" stroke="#c24e10" stroke-width="1.2" fill="none" opacity=".6"/>
      <path d="M38 24 Q42 20 46 24" stroke="#c24e10" stroke-width="1.2" fill="none" opacity=".6"/>`,
  1: `<ellipse cx="32" cy="46" rx="6" ry="3" fill="#2fbf4a" opacity=".35"/>`,
  2: `<path d="M20 26 L10 24 M44 26 L54 24" stroke="#16324f" stroke-width="1.3" stroke-linecap="round"/>`,
  3: `<circle cx="32" cy="34" r="3" fill="#222" opacity=".15"/>`,
  4: `<path d="M20 18 L24 26 M44 18 L40 26" stroke="#16324f" stroke-width="2.5" stroke-linecap="round"/>`,
  5: `<circle cx="28" cy="24" r="2" fill="#fff" opacity=".45"/>`,
  6: `<ellipse cx="32" cy="44" rx="10" ry="6" fill="#f3d2b0" opacity=".5"/>`,
  7: `<path d="M24 14 L28 20 M40 14 L36 20" stroke="#ef4d4d" stroke-width="2" stroke-linecap="round"/>`,
  8: `<ellipse cx="32" cy="50" rx="12" ry="6" fill="#11151c" opacity=".25"/>`,
  9: `<path d="M16 34 Q20 38 24 34 M40 34 Q44 38 48 34" stroke="#5c3a18" stroke-width="1.5" fill="none"/>`,
  10: `<circle cx="32" cy="32" r="26" fill="none" stroke="#ef4d4d" stroke-width="1" opacity=".2"/>`,
  11: `<circle cx="20" cy="34" r="2" fill="#16324f"/><circle cx="44" cy="34" r="2" fill="#16324f"/>`,
  12: `<ellipse cx="20" cy="6" rx="4" ry="10" fill="#ff9ab8" opacity=".4"/>`,
  13: `<path d="M12 36 L8 42 M52 36 L56 42" stroke="#6b7585" stroke-width="2" stroke-linecap="round"/>`,
  14: `<ellipse cx="32" cy="44" rx="8" ry="4" fill="#ffd166" opacity=".35"/>`,
  15: `<path d="M10 32 Q6 24 12 18 M54 32 Q58 24 52 18" stroke="#7ad0ff" stroke-width="1.5" fill="none" opacity=".6"/>`,
};
const FACE_EXT = {};
function buildFaceExtensions() {
  FACE_EXT[0] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[1] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[2] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[3] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[4] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[5] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[6] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[7] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[8] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[9] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[10] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[11] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[12] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[13] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[14] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
  FACE_EXT[15] = (p,a,b) => `<g opacity=".85"><ellipse cx="32" cy="54" rx="18" ry="6" fill="rgba(22,50,79,.08)"/><circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,.35)"/></g>`;
}
buildFaceExtensions();
const FACE_ACCESSORY = {
  0: `<path d="M4 50 Q0 40 8 36 Q12 44 4 50" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  1: `<path d="M20 38 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  2: `<path d="M8 36 H18 M46 36 H56" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  3: `<path d="M26 28 a6 5 0 1 0 12 0" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  4: `<path d="M24 16 L26 24 M40 16 L38 24" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  5: `<path d="M48 16 l2 4 l4 2 l-4 2 l-2 4 l-2-4 l-4-2 l4-2 z" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  6: `<path d="M24 46 Q32 52 40 46" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  7: `<path d="M28 48 l4-3 l4 3 l-2 5 z" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  8: `<path d="M10 42 Q6 48 12 52" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  9: `<path d="M18 8 Q22 14 18 18" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  10: `<path d="M30 38 h4 v3 h-4 z" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  11: `<path d="M16 50 a1.5 1.5 0 1 0 3 0" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  12: `<path d="M30 48 h2 v2 h-2 z" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  13: `<path d="M28 44 l2 4 l-2 2 z" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  14: `<path d="M30 36 a3 2 0 1 0 6 0" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
  15: `<path d="M28 20 Q26 10 30 8" fill="rgba(255,255,255,.25)" stroke="rgba(22,50,79,.2)" stroke-width="0.8"/>`,
};

function appendFaceDetail(id, face) {
  let out = face;
  if (FACE_DETAIL[id]) out += FACE_DETAIL[id];
  if (FACE_EXT[id]) { const p = FACE_PAL[id]||FACE_PAL[0]; out += FACE_EXT[id](p,p.bg[0],p.bg[1]); }
  if (FACE_ACCESSORY[id]) out += FACE_ACCESSORY[id];
  if (FACE_PATHS[id]) out += FACE_PATHS[id];
  return out;
}

/* ===================== DETAILED FACE RENDERERS ===================== */
function renderFace0(p, a, b) {
  /* Detailed glossy sticker: Fox Fire */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace1(p, a, b) {
  /* Detailed glossy sticker: Frog Hop */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace2(p, a, b) {
  /* Detailed glossy sticker: Cat Nap */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace3(p, a, b) {
  /* Detailed glossy sticker: Panda Star */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace4(p, a, b) {
  /* Detailed glossy sticker: Tiger Bolt */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace5(p, a, b) {
  /* Detailed glossy sticker: Nova Unicorn */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace6(p, a, b) {
  /* Detailed glossy sticker: Monkey Biz */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace7(p, a, b) {
  /* Detailed glossy sticker: Jade Dragon */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace8(p, a, b) {
  /* Detailed glossy sticker: Chill Penguin */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace9(p, a, b) {
  /* Detailed glossy sticker: Night Owl */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace10(p, a, b) {
  /* Detailed glossy sticker: Solar Lion */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace11(p, a, b) {
  /* Detailed glossy sticker: Ink Octo */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace12(p, a, b) {
  /* Detailed glossy sticker: Lucky Bunny */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace13(p, a, b) {
  /* Detailed glossy sticker: Storm Wolf */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace14(p, a, b) {
  /* Detailed glossy sticker: Honey Bear */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}

function renderFace15(p, a, b) {
  /* Detailed glossy sticker: Flutter Bug */
  let s = deBubble(a, b) + deShine();
  s += `<circle cx="6.0" cy="6.0" r="0.50" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.1" cy="7.7" r="0.65" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="8.2" cy="9.4" r="0.80" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="9.3" cy="11.1" r="0.95" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="10.4" cy="12.8" r="1.10" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="11.5" cy="14.5" r="1.25" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="12.6" cy="16.2" r="1.40" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="13.7" cy="17.9" r="0.50" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="14.8" cy="19.6" r="0.65" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="15.9" cy="21.3" r="0.80" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="17.0" cy="23.0" r="0.95" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="18.1" cy="24.7" r="1.10" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="19.2" cy="26.4" r="1.25" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="20.3" cy="28.1" r="1.40" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="21.4" cy="29.8" r="0.50" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="22.5" cy="31.5" r="0.65" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="23.6" cy="33.2" r="0.80" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="24.7" cy="34.9" r="0.95" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="25.8" cy="36.6" r="1.10" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="26.9" cy="38.3" r="1.25" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="28.0" cy="40.0" r="1.40" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="29.1" cy="41.7" r="0.50" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="30.2" cy="43.4" r="0.65" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="31.3" cy="45.1" r="0.80" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="32.4" cy="46.8" r="0.95" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="33.5" cy="48.5" r="1.10" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="34.6" cy="50.2" r="1.25" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="35.7" cy="51.9" r="1.40" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="36.8" cy="53.6" r="0.50" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="37.9" cy="55.3" r="0.65" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="39.0" cy="57.0" r="0.80" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="40.1" cy="6.7" r="0.95" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="41.2" cy="8.4" r="1.10" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="42.3" cy="10.1" r="1.25" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="43.4" cy="11.8" r="1.40" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="44.5" cy="13.5" r="0.50" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="45.6" cy="15.2" r="0.65" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="46.7" cy="16.9" r="0.80" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="47.8" cy="18.6" r="0.95" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="48.9" cy="20.3" r="1.10" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="50.0" cy="22.0" r="1.25" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="51.1" cy="23.7" r="1.40" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="52.2" cy="25.4" r="0.50" fill="rgba(255,255,255,0.230)"/>`;
  s += `<circle cx="53.3" cy="27.1" r="0.65" fill="rgba(255,255,255,0.255)"/>`;
  s += `<circle cx="54.4" cy="28.8" r="0.80" fill="rgba(255,255,255,0.280)"/>`;
  s += `<circle cx="55.5" cy="30.5" r="0.95" fill="rgba(255,255,255,0.305)"/>`;
  s += `<circle cx="56.6" cy="32.2" r="1.10" fill="rgba(255,255,255,0.330)"/>`;
  s += `<circle cx="57.7" cy="33.9" r="1.25" fill="rgba(255,255,255,0.355)"/>`;
  s += `<circle cx="6.8" cy="35.6" r="1.40" fill="rgba(255,255,255,0.080)"/>`;
  s += `<circle cx="7.9" cy="37.3" r="0.50" fill="rgba(255,255,255,0.105)"/>`;
  s += `<circle cx="9.0" cy="39.0" r="0.65" fill="rgba(255,255,255,0.130)"/>`;
  s += `<circle cx="10.1" cy="40.7" r="0.80" fill="rgba(255,255,255,0.155)"/>`;
  s += `<circle cx="11.2" cy="42.4" r="0.95" fill="rgba(255,255,255,0.180)"/>`;
  s += `<circle cx="12.3" cy="44.1" r="1.10" fill="rgba(255,255,255,0.205)"/>`;
  s += `<circle cx="13.4" cy="45.8" r="1.25" fill="rgba(255,255,255,0.230)"/>`;

  s += `<rect x="4.0" y="4.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="6.8" y="7.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="9.6" y="10.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="12.4" y="13.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="15.2" y="16.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="18.0" y="19.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="20.8" y="22.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="23.6" y="25.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="26.4" y="28.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="29.2" y="31.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="32.0" y="35.0" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="34.8" y="38.1" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="37.6" y="41.2" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="40.4" y="44.3" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="43.2" y="47.4" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="46.0" y="50.5" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="48.8" y="53.6" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="51.6" y="56.7" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="54.4" y="59.8" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;
  s += `<rect x="57.2" y="6.9" width="1.2" height="1.2" rx="0.3" fill="rgba(255,255,255,0.12)"/>`;  s += deEyes(22, 42, 30, 4.6);
  s += `<ellipse cx="32" cy="42" rx="14" ry="10" fill="rgba(255,255,255,.12)"/>`;
  s += deBlush(p.blush);
  return s;
}


function disneyFaceFromRenderer(id) {
  const p = FACE_PAL[id] || FACE_PAL[0];
  const [a, b] = p.bg;
  const fns = [
    renderFace0, renderFace1, renderFace2, renderFace3, renderFace4, renderFace5, renderFace6,
    renderFace7, renderFace8, renderFace9, renderFace10, renderFace11, renderFace12, renderFace13,
    renderFace14, renderFace15,
  ];
  const fn = fns[id];
  if (!fn) return deSvg(deBubble(a, b) + deShine());
  return deSvg(appendFaceDetail(id, fn(p, a, b)));
}


function disneyFace(id){
  if (typeof id === "number" && id >= 0 && id <= 15) return disneyFaceFromRenderer(id);
  const p = FACE_PAL[id] || FACE_PAL[0];
  const [a,b] = p.bg;
  let face = deBubble(a,b) + deShine();
  // per-character features
  if(id===0){ // fox — ears poke out like Emoji Blitz stickers
    face += `<path d="M6 30 L16 2 L30 22 Z" fill="${p.ear}" stroke="#c24e10" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M58 30 L48 2 L34 22 Z" fill="${p.ear}" stroke="#c24e10" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M12 28 L18 8 L27 22 Z" fill="#ffc08a"/><path d="M52 28 L46 8 L37 22 Z" fill="#ffc08a"/>
    <ellipse cx="32" cy="41" rx="15" ry="12" fill="#ffe6c8"/>
    ${deEyes(22,42,30,5)}<ellipse cx="32" cy="37" rx="2.4" ry="1.8" fill="#16324f"/>
    <path d="M24 45 Q32 54 40 45" fill="#16324f"/><path d="M26 45 Q32 51 38 45" fill="#ff8a6a"/>
    ${deBlush(p.blush)}`;
  } else if(id===1){ // frog
    face += `<circle cx="18" cy="20" r="8" fill="${a}"/><circle cx="46" cy="20" r="8" fill="${a}"/>
    <circle cx="18" cy="20" r="4.5" fill="#fff"/><circle cx="46" cy="20" r="4.5" fill="#fff"/>
    <circle cx="18" cy="20" r="2.4" fill="#16324f"/><circle cx="46" cy="20" r="2.4" fill="#16324f"/>
    <ellipse cx="32" cy="40" rx="16" ry="10" fill="#b6ff9a"/>
    <path d="M20 42 Q32 52 44 42" fill="#16324f"/><path d="M22 42 Q32 48 42 42" fill="#7dff7a"/>
    ${deBlush(p.blush)}` + deShine();
  } else if(id===2){ // cat
    face += `<path d="M8 28 L16 0 L30 20 Z" fill="${p.ear}" stroke="#c96e00" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M56 28 L48 0 L34 20 Z" fill="${p.ear}" stroke="#c96e00" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M14 26 L18 8 L27 20 Z" fill="#ffd7a8"/><path d="M50 26 L46 8 L37 20 Z" fill="#ffd7a8"/>
    ${deEyes(22,42,30,5)}
    <path d="M22 30 L8 27 M22 34 L8 36 M42 30 L56 27 M42 34 L56 36" stroke="#16324f" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="32" cy="38" rx="2.2" ry="1.7" fill="#ff7aa2"/>
    <path d="M26 44 Q32 52 38 44" fill="#16324f"/><path d="M28 44 Q32 49 36 44" fill="#ffb070"/>
    ${deBlush(p.blush)}`;
  } else if(id===3){ // panda
    face += `<ellipse cx="16" cy="20" rx="10" ry="12" fill="#222"/><ellipse cx="48" cy="20" rx="10" ry="12" fill="#222"/>
    <ellipse cx="22" cy="30" rx="8" ry="7" fill="#222"/><ellipse cx="42" cy="30" rx="8" ry="7" fill="#222"/>
    ${deEyes(22,42,30,3.6,true,"#fff")}<circle cx="22" cy="30" r="2" fill="#16324f"/><circle cx="42" cy="30" r="2" fill="#16324f"/>
    <ellipse cx="32" cy="40" rx="5" ry="4" fill="#222"/>
    <path d="M26 46 Q32 50 38 46" stroke="#222" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===4){ // tiger
    face += `<path d="M12 28 L18 8 L28 24 Z" fill="${p.ear}"/><path d="M52 28 L46 8 L36 24 Z" fill="${p.ear}"/>
    <path d="M24 12 L26 22 M32 10 L32 20 M40 12 L38 22" stroke="#16324f" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="32" cy="40" rx="13" ry="10" fill="#ffe6c0"/>
    ${deEyes(23,41,30)}<ellipse cx="32" cy="37" rx="2.2" ry="1.5" fill="#16324f"/>
    <path d="M26 44 Q32 49 38 44" stroke="#16324f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===5){ // unicorn
    face += `<path d="M32 4 L36 22 L28 22 Z" fill="#c084fc" stroke="#a855f7" stroke-width="1"/>
    <path d="M32 4 L34.5 18 L29.5 18 Z" fill="#e9d5ff"/>
    <path d="M12 30 L18 10 L28 24 Z" fill="${p.ear}"/><path d="M52 30 L46 10 L36 24 Z" fill="${p.ear}"/>
    <path d="M48 18 Q58 28 52 40" stroke="#e8a0ff" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${deEyes(23,41,31,4.4,true,"#5b2d8e")}
    <ellipse cx="32" cy="38" rx="2" ry="1.5" fill="#ff7ab8"/>
    <path d="M27 44 Q32 48 37 44" stroke="#5b2d8e" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===6){ // monkey
    face += `<circle cx="14" cy="24" r="9" fill="${p.ear}"/><circle cx="50" cy="24" r="9" fill="${p.ear}"/>
    <circle cx="14" cy="24" r="5" fill="${p.muzzle}"/><circle cx="50" cy="24" r="5" fill="${p.muzzle}"/>
    <ellipse cx="32" cy="40" rx="16" ry="13" fill="${p.muzzle}"/>
    ${deEyes(23,41,30)}
    <ellipse cx="26" cy="40" rx="3" ry="2.2" fill="#16324f"/><ellipse cx="38" cy="40" rx="3" ry="2.2" fill="#16324f"/>
    <path d="M26 48 Q32 52 38 48" stroke="#16324f" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===7){ // dragon
    face += `<path d="M20 10 L24 22 L16 20 Z" fill="${p.crest}"/><path d="M32 6 L36 20 L28 20 Z" fill="${p.crest}"/><path d="M44 10 L48 22 L40 20 Z" fill="${p.crest}"/>
    <path d="M8 34 L18 18 L24 30 Z" fill="${p.ear}"/><path d="M56 34 L46 18 L40 30 Z" fill="${p.ear}"/>
    ${deEyes(23,41,30,4.6)}
    <ellipse cx="32" cy="40" rx="8" ry="5" fill="#16324f"/>
    <path d="M26 40 L22 48 L28 44 Z" fill="#ff6b4a"/><path d="M38 40 L42 48 L36 44 Z" fill="#ff6b4a"/>
    ${deBlush(p.blush)}`;
  } else if(id===8){ // penguin
    face += `<ellipse cx="32" cy="38" rx="18" ry="20" fill="${p.belly}"/>
    <circle cx="20" cy="12" r="5" fill="${a}"/><circle cx="44" cy="12" r="5" fill="${a}"/>
    ${deEyes(23,41,28,4)}
    <path d="M28 36 L32 42 L36 36 Z" fill="${p.beak}"/>
    ${deBlush(p.blush)}`;
  } else if(id===9){ // owl
    face += `<path d="M14 22 L20 6 L30 18 Z" fill="${p.ear}"/><path d="M50 22 L44 6 L34 18 Z" fill="${p.ear}"/>
    <circle cx="22" cy="30" r="10" fill="#fff3d6"/><circle cx="42" cy="30" r="10" fill="#fff3d6"/>
    <circle cx="22" cy="30" r="5" fill="${p.eye}"/><circle cx="42" cy="30" r="5" fill="${p.eye}"/>
    <circle cx="22" cy="30" r="2" fill="#16324f"/><circle cx="42" cy="30" r="2" fill="#16324f"/>
    <path d="M30 38 L32 44 L34 38 Z" fill="${p.beak}"/>
    ${deBlush(p.blush)}`;
  } else if(id===10){ // lion
    face = `<defs><radialGradient id="lg${_deUid+1}" cx="32%" cy="28%"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></radialGradient></defs>
    <circle cx="32" cy="32" r="31" fill="${p.mane}"/>
    <circle cx="12" cy="18" r="8" fill="${p.mane}"/><circle cx="52" cy="18" r="8" fill="${p.mane}"/>
    <circle cx="8" cy="36" r="8" fill="${p.mane}"/><circle cx="56" cy="36" r="8" fill="${p.mane}"/>
    <circle cx="18" cy="52" r="8" fill="${p.mane}"/><circle cx="46" cy="52" r="8" fill="${p.mane}"/>
    <circle cx="32" cy="8" r="7" fill="${p.mane}"/>
    ${deBubble(a,b)}${deShine()}
    ${deEyes(23,41,30)}
    <ellipse cx="32" cy="38" rx="4" ry="3" fill="#c96e00"/>
    <path d="M26 44 Q32 50 38 44" stroke="#16324f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===11){ // octo
    face += `${deEyes(23,41,28,5)}
    <path d="M14 44 Q18 58 24 46 M24 46 Q28 60 32 46 M32 46 Q36 60 40 46 M40 46 Q46 58 50 44" stroke="${b}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M26 40 Q32 46 38 40" stroke="#16324f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===12){ // bunny
    face += `<ellipse cx="20" cy="8" rx="8" ry="20" fill="${p.ear}" stroke="#e89a8a" stroke-width="1"/><ellipse cx="44" cy="8" rx="8" ry="20" fill="${p.ear}" stroke="#e89a8a" stroke-width="1"/>
    <ellipse cx="20" cy="8" rx="3.5" ry="12" fill="#ff9ab8"/><ellipse cx="44" cy="8" rx="3.5" ry="12" fill="#ff9ab8"/>
    ${deEyes(22,42,34,5)}
    <ellipse cx="32" cy="41" rx="2.4" ry="1.8" fill="#ff7aa2"/>
    <path d="M26 47 Q32 54 38 47" fill="#16324f"/><path d="M28 47 Q32 51 36 47" fill="#ff9ab8"/>
    ${deBlush(p.blush)}`;
  } else if(id===13){ // storm wolf
    face += `<path d="M10 30 L18 8 L28 24 Z" fill="${p.ear}"/><path d="M54 30 L46 8 L36 24 Z" fill="${p.ear}"/>
    <ellipse cx="32" cy="40" rx="14" ry="11" fill="#d9dee6"/>
    ${deEyes(23,41,30,4.4,true,p.eye)}
    <ellipse cx="32" cy="37" rx="2.4" ry="1.7" fill="#16324f"/>
    <path d="M24 44 Q32 52 40 44" stroke="#16324f" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M8 22 L14 18 M56 22 L50 18" stroke="#c9f0ff" stroke-width="2" stroke-linecap="round"/>
    ${deBlush(p.blush)}`;
  } else if(id===14){ // honey bear
    face += `<circle cx="18" cy="14" r="7" fill="${p.ear}"/><circle cx="46" cy="14" r="7" fill="${p.ear}"/>
    <circle cx="18" cy="14" r="4" fill="${p.snout}"/><circle cx="46" cy="14" r="4" fill="${p.snout}"/>
    <ellipse cx="32" cy="40" rx="17" ry="14" fill="${p.snout}"/>
    ${deEyes(22,42,30,5)}
    <ellipse cx="32" cy="38" rx="5" ry="4" fill="#8b5a2b"/>
    <path d="M26 46 Q32 54 38 46" fill="#8b5a2b"/><path d="M28 46 Q32 50 36 46" fill="#ffd166"/>
    <ellipse cx="24" cy="48" rx="4" ry="2.5" fill="#ffb020" opacity=".8"/>
    <ellipse cx="40" cy="48" rx="4" ry="2.5" fill="#ffb020" opacity=".8"/>
    ${deBlush(p.blush)}`;
  } else { // flutter bug 15
    face += `<ellipse cx="14" cy="28" rx="10" ry="16" fill="${p.wing}" opacity=".55" transform="rotate(-18 14 28)"/>
    <ellipse cx="50" cy="28" rx="10" ry="16" fill="${p.wing}" opacity=".55" transform="rotate(18 50 28)"/>
    <path d="M14 20 Q8 8 18 6 Q22 14 14 20" fill="${p.wing}" opacity=".7"/>
    <path d="M50 20 Q56 8 46 6 Q42 14 50 20" fill="${p.wing}" opacity=".7"/>
    <ellipse cx="32" cy="36" rx="8" ry="10" fill="${a}"/>
    <path d="M28 30 Q32 22 36 30" stroke="#16324f" stroke-width="2" fill="none"/>
    ${deEyes(26,38,32,3.8)}
    <path d="M30 40 L32 48 L34 40 Z" fill="${p.wing}"/>
  <circle cx="20" cy="18" r="2" fill="#fff" opacity=".6"/><circle cx="44" cy="22" r="1.5" fill="#fff" opacity=".5"/>
    ${deBlush(p.blush)}`;
  }
  return deSvg(appendFaceDetail(id, face));
}

function disneySpecial(kind){
  const p = SPECIAL_PAL[kind] || SPECIAL_PAL.RainbowStar;
  const [a,b] = p.bg;
  let inner = deBubble(a,b) + deShine();
  if(kind==="LightningCloud"){
    inner += `<ellipse cx="32" cy="34" rx="20" ry="12" fill="rgba(255,255,255,.55)"/>
    <path d="M30 18 L22 36 L30 36 L26 50 L44 28 L34 28 L40 18 Z" fill="#fff36a" stroke="#fff" stroke-width="1.5"/>`;
  } else if(kind==="Sunshine"){
    inner += `<g stroke="#fff3b0" stroke-width="3" stroke-linecap="round">
      <path d="M32 6 V12 M32 52 V58 M6 32 H12 M52 32 H58 M12 12 L16 16 M48 48 L52 52 M52 12 L48 16 M12 52 L16 48"/></g>
    <circle cx="32" cy="32" r="14" fill="#fff3b0"/><circle cx="32" cy="32" r="10" fill="#ffd166"/>
    ${deEyes(26,38,30,2.8,true,"#c96e00")}
    <path d="M26 38 Q32 43 38 38" stroke="#c96e00" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else {
    inner += `<path d="M32 12 L36 26 L52 26 L40 36 L44 52 L32 42 L20 52 L24 36 L12 26 L28 26 Z" fill="#fff" stroke="#ffe07a" stroke-width="1.5"/>
    <path d="M32 18 L34.5 27 L44 27 L36.5 33 L39 43 L32 37 L25 43 L27.5 33 L20 27 L29.5 27 Z" fill="#ffe07a"/>`;
  }
  return deSvg(inner);
}

function faceHTML(idOrKind){
  if(typeof idOrKind === "string") return disneySpecial(idOrKind);
  return disneyFace(idOrKind|0);
}
const TILE_PATTERNS = {
  0: `<pattern id="tp0" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  1: `<pattern id="tp1" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  2: `<pattern id="tp2" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  3: `<pattern id="tp3" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  4: `<pattern id="tp4" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  5: `<pattern id="tp5" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  6: `<pattern id="tp6" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  7: `<pattern id="tp7" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  8: `<pattern id="tp8" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  9: `<pattern id="tp9" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  10: `<pattern id="tp10" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  11: `<pattern id="tp11" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  12: `<pattern id="tp12" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  13: `<pattern id="tp13" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  14: `<pattern id="tp14" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
  15: `<pattern id="tp15" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="rgba(255,255,255,0)"/><circle cx="2" cy="2" r="0.9" fill="rgba(255,255,255,.14)"/><circle cx="6" cy="6" r="0.8" fill="rgba(22,50,79,.05)"/></pattern>`,
};

function tileVisual(tile){
  if(!tile) return "";
  if(tile.kind && tile.kind !== "Normal") return faceHTML(tile.kind);
  return faceHTML(tile.emojiType ?? 0);
}


const BOOSTERS = [
  { id:"sun", name:"Sun Start", ico:"☀️", desc:"Begin with Blitz meter at 50%", cost:70, currency:"coins", engineKey:"blitz50" },
  { id:"time", name:"+5 Seconds", ico:"⏱️", desc:"Extra time on the clock", cost:60, currency:"coins", engineKey:"time10" },
  { id:"coin", name:"Coin Rain", ico:"🪙", desc:"1.5× coin drops this round", cost:90, currency:"coins", engineKey:"magnet" },
];

const GEM_PACKS = [
  { id:"g2c1", name:"Gem Trade S", ico:"💎", desc:"25 gems → 200 coins", gems:25, coins:200 },
  { id:"g2c2", name:"Gem Trade L", ico:"💎", desc:"60 gems → 550 coins", gems:60, coins:550 },
];

const SPIN_PRIZES = [
  { label:"🪙 25", type:"coins", amount:25 },
  { label:"🪙 50", type:"coins", amount:50 },
  { label:"💎 2", type:"gems", amount:2 },
  { label:"⭐ 40", type:"xp", amount:40 },
  { label:"🪙 100", type:"coins", amount:100, rare:true },
  { label:"⚡ Booster", type:"booster", amount:1, rare:true },
  { label:"💎 5", type:"gems", amount:5, rare:true },
  { label:"🪙 15", type:"coins", amount:15 },
];

function makePassRewards(){
  const list = [];
  for(let i=1;i<=PASS_TIERS;i++){
    const free = i%5===0
      ? (i===10 ? {type:"char",id:8,label:"🐧 Chill Penguin"}
        : i===20 ? {type:"title",id:"CASCADE KING",label:"Title: Cascade King"}
        : i===30 ? {type:"gems",amount:15,label:"💎 15"}
        : {type:"booster",id:"score2",label:"Score ×2"})
      : (i%3===0 ? {type:"gems",amount:2,label:"💎 2"} : {type:"coins",amount:20+i*3,label:`🪙 ${20+i*3}`});
    const vip = i%6===0
      ? (i===12 ? {type:"char",id:2,label:"🐱 Cat Nap"}
        : i===18 ? {type:"char",id:12,label:"🐰 Lucky Bunny"}
        : i===24 ? {type:"title",id:"BLITZ LORD",label:"Title: Blitz Lord"}
        : i===30 ? {type:"title",id:"SEASON STAR",label:"Title: Season Star"}
        : {type:"gems",amount:8,label:"💎 8"})
      : (i%2===0 ? {type:"booster",id:BOOSTERS[i%BOOSTERS.length].id,label:BOOSTERS[i%BOOSTERS.length].name}
        : {type:"coins",amount:40+i*5,label:`🪙 ${40+i*5}`});
    list.push({ tier:i, xp:i*PASS_XP_PER_TIER, free, vip });
  }
  return list;
}
const PASS_REWARDS = makePassRewards();
const PASS_TIER_LABELS = [
  "Tier 1: cloud factory reward track slot 1",
  "Tier 2: cloud factory reward track slot 2",
  "Tier 3: cloud factory reward track slot 3",
  "Tier 4: cloud factory reward track slot 4",
  "Tier 5: cloud factory reward track slot 5",
  "Tier 6: cloud factory reward track slot 6",
  "Tier 7: cloud factory reward track slot 7",
  "Tier 8: cloud factory reward track slot 8",
  "Tier 9: cloud factory reward track slot 9",
  "Tier 10: cloud factory reward track slot 10",
  "Tier 11: cloud factory reward track slot 11",
  "Tier 12: cloud factory reward track slot 12",
  "Tier 13: cloud factory reward track slot 13",
  "Tier 14: cloud factory reward track slot 14",
  "Tier 15: cloud factory reward track slot 15",
  "Tier 16: cloud factory reward track slot 16",
  "Tier 17: cloud factory reward track slot 17",
  "Tier 18: cloud factory reward track slot 18",
  "Tier 19: cloud factory reward track slot 19",
  "Tier 20: cloud factory reward track slot 20",
  "Tier 21: cloud factory reward track slot 21",
  "Tier 22: cloud factory reward track slot 22",
  "Tier 23: cloud factory reward track slot 23",
  "Tier 24: cloud factory reward track slot 24",
  "Tier 25: cloud factory reward track slot 25",
  "Tier 26: cloud factory reward track slot 26",
  "Tier 27: cloud factory reward track slot 27",
  "Tier 28: cloud factory reward track slot 28",
  "Tier 29: cloud factory reward track slot 29",
  "Tier 30: cloud factory reward track slot 30",
];

const ACHIEVEMENTS = [
  { id:"first_game", name:"First Rush", desc:"Play 1 round", ico:"🎮", check:s=>s.games>=1, reward:30 },
  { id:"games_10", name:"Habit Formed", desc:"Play 10 rounds", ico:"📅", check:s=>s.games>=10, reward:80 },
  { id:"games_50", name:"Marathon", desc:"Play 50 rounds", ico:"🏃", check:s=>s.games>=50, reward:200 },
  { id:"clears_500", name:"Tile Tornado", desc:"Clear 500 tiles", ico:"🌪️", check:s=>s.clears>=500, reward:100 },
  { id:"clears_2k", name:"Cascade Factory", desc:"Clear 2000 tiles", ico:"🏭", check:s=>s.clears>=2000, reward:250 },
  { id:"blitz_5", name:"Blitz Rookie", desc:"Trigger 5 Blitzes", ico:"⚡", check:s=>s.blitzes>=5, reward:60 },
  { id:"blitz_25", name:"Blitz Addict", desc:"Trigger 25 Blitzes", ico:"🔥", check:s=>s.blitzes>=25, reward:180 },
  { id:"score_2k", name:"High Roller", desc:"Score 2000 in a round", ico:"🏆", check:s=>s.best>=2000, reward:120 },
  { id:"score_5k", name:"Emoji God", desc:"Score 5000 in a round", ico:"👑", check:s=>s.best>=5000, reward:300 },
  { id:"combo_5", name:"Chain Reaction", desc:"Hit a 5+ cascade combo", ico:"🔗", check:s=>(s.stats&&s.stats.bestCombo>=5), reward:90 },
  { id:"unlock_5", name:"Squad Goals", desc:"Unlock 5 characters", ico:"👥", check:s=>s.unlocked.length>=5, reward:100 },
  { id:"unlock_all", name:"Full Roster", desc:"Unlock every character", ico:"🌟", check:s=>s.unlocked.length>=CHARACTERS.length, reward:500 },
  { id:"login_3", name:"Comeback Kid", desc:"3-day login streak", ico:"🎁", check:s=>s.login.streak>=3, reward:70 },
  { id:"login_7", name:"Week Warrior", desc:"7-day login streak", ico:"📆", check:s=>s.login.streak>=7, reward:200 },
  { id:"spins_10", name:"Wheel Wizard", desc:"Spin 10 times", ico:"🎡", check:s=>(s.stats&&s.stats.spins>=10), reward:80 },
  { id:"pass_10", name:"Journey Bound", desc:"Reach pass tier 10", ico:"🎟️", check:s=>Math.floor(s.pass.xp/PASS_XP_PER_TIER)>=10, reward:150 },
  { id:"power_10", name:"Spell Caster", desc:"Use hero power 10 times", ico:"✨", check:s=>(s.stats&&s.stats.powers>=10), reward:90 },
];

const QUEST_FLAVOR = {
  q0: "Daily mission hint #1: chain cascades for bonus pass XP.",
  q1: "Daily mission hint #2: chain cascades for bonus pass XP.",
  q2: "Daily mission hint #3: chain cascades for bonus pass XP.",
  q3: "Daily mission hint #4: chain cascades for bonus pass XP.",
  q4: "Daily mission hint #5: chain cascades for bonus pass XP.",
  q5: "Daily mission hint #6: chain cascades for bonus pass XP.",
  q6: "Daily mission hint #7: chain cascades for bonus pass XP.",
  q7: "Daily mission hint #8: chain cascades for bonus pass XP.",
  q8: "Daily mission hint #9: chain cascades for bonus pass XP.",
  q9: "Daily mission hint #10: chain cascades for bonus pass XP.",
  q10: "Daily mission hint #11: chain cascades for bonus pass XP.",
  q11: "Daily mission hint #12: chain cascades for bonus pass XP.",
  q12: "Daily mission hint #13: chain cascades for bonus pass XP.",
  q13: "Daily mission hint #14: chain cascades for bonus pass XP.",
  q14: "Daily mission hint #15: chain cascades for bonus pass XP.",
  q15: "Daily mission hint #16: chain cascades for bonus pass XP.",
  q16: "Daily mission hint #17: chain cascades for bonus pass XP.",
  q17: "Daily mission hint #18: chain cascades for bonus pass XP.",
  q18: "Daily mission hint #19: chain cascades for bonus pass XP.",
  q19: "Daily mission hint #20: chain cascades for bonus pass XP.",
  q20: "Daily mission hint #21: chain cascades for bonus pass XP.",
  q21: "Daily mission hint #22: chain cascades for bonus pass XP.",
  q22: "Daily mission hint #23: chain cascades for bonus pass XP.",
  q23: "Daily mission hint #24: chain cascades for bonus pass XP.",
  q24: "Daily mission hint #25: chain cascades for bonus pass XP.",
  q25: "Daily mission hint #26: chain cascades for bonus pass XP.",
  q26: "Daily mission hint #27: chain cascades for bonus pass XP.",
  q27: "Daily mission hint #28: chain cascades for bonus pass XP.",
  q28: "Daily mission hint #29: chain cascades for bonus pass XP.",
  q29: "Daily mission hint #30: chain cascades for bonus pass XP.",
  q30: "Daily mission hint #31: chain cascades for bonus pass XP.",
  q31: "Daily mission hint #32: chain cascades for bonus pass XP.",
  q32: "Daily mission hint #33: chain cascades for bonus pass XP.",
  q33: "Daily mission hint #34: chain cascades for bonus pass XP.",
  q34: "Daily mission hint #35: chain cascades for bonus pass XP.",
  q35: "Daily mission hint #36: chain cascades for bonus pass XP.",
  q36: "Daily mission hint #37: chain cascades for bonus pass XP.",
  q37: "Daily mission hint #38: chain cascades for bonus pass XP.",
  q38: "Daily mission hint #39: chain cascades for bonus pass XP.",
  q39: "Daily mission hint #40: chain cascades for bonus pass XP.",
  q40: "Daily mission hint #41: chain cascades for bonus pass XP.",
  q41: "Daily mission hint #42: chain cascades for bonus pass XP.",
  q42: "Daily mission hint #43: chain cascades for bonus pass XP.",
  q43: "Daily mission hint #44: chain cascades for bonus pass XP.",
  q44: "Daily mission hint #45: chain cascades for bonus pass XP.",
  q45: "Daily mission hint #46: chain cascades for bonus pass XP.",
  q46: "Daily mission hint #47: chain cascades for bonus pass XP.",
  q47: "Daily mission hint #48: chain cascades for bonus pass XP.",
  q48: "Daily mission hint #49: chain cascades for bonus pass XP.",
  q49: "Daily mission hint #50: chain cascades for bonus pass XP.",
};

const QUEST_POOL = [
  { id:"score", label:"Score {n} points", target:[800,1200,1800], reward:{coins:40,xp:30}, key:"score" },
  { id:"clears", label:"Clear {n} tiles", target:[80,120,180], reward:{coins:35,xp:25}, key:"clears" },
  { id:"blitz", label:"Trigger Blitz {n} times", target:[1,2,3], reward:{coins:50,xp:35}, key:"blitz" },
  { id:"power", label:"Use hero power {n} times", target:[1,2,3], reward:{coins:45,xp:30}, key:"power" },
  { id:"combo", label:"Make a combo of {n}+", target:[3,4,5], reward:{coins:40,xp:30}, key:"combo" },
  { id:"coins", label:"Earn {n} coins from play", target:[30,50,80], reward:{coins:25,xp:40}, key:"coins" },
];


const SPELL_DOCS = {
  pattern_x: "Hero power executed by engine SPELL_HANDLERS.",
  column_crush: "Hero power executed by engine SPELL_HANDLERS.",
  time_pause: "Hero power executed by engine SPELL_HANDLERS.",
  guaranteed_stars: "Hero power executed by engine SPELL_HANDLERS.",
  row_sweep: "Hero power executed by engine SPELL_HANDLERS.",
  board_pulse: "Hero power executed by engine SPELL_HANDLERS.",
  sun_storm: "Hero power executed by engine SPELL_HANDLERS.",
  color_bomb: "Hero power executed by engine SPELL_HANDLERS.",
};

const STORE_SKUS = [
  { id:"sku_0", box:"silver", bundle:1, cost:150, note:"Weekend shelf slot 0" },
  { id:"sku_1", box:"silver", bundle:2, cost:155, note:"Weekend shelf slot 1" },
  { id:"sku_2", box:"silver", bundle:3, cost:160, note:"Weekend shelf slot 2" },
  { id:"sku_3", box:"silver", bundle:1, cost:165, note:"Weekend shelf slot 3" },
  { id:"sku_4", box:"silver", bundle:2, cost:170, note:"Weekend shelf slot 4" },
  { id:"sku_5", box:"silver", bundle:3, cost:175, note:"Weekend shelf slot 5" },
  { id:"sku_6", box:"silver", bundle:1, cost:180, note:"Weekend shelf slot 6" },
  { id:"sku_7", box:"silver", bundle:2, cost:185, note:"Weekend shelf slot 7" },
  { id:"sku_8", box:"silver", bundle:3, cost:190, note:"Weekend shelf slot 8" },
  { id:"sku_9", box:"silver", bundle:1, cost:195, note:"Weekend shelf slot 9" },
  { id:"sku_10", box:"silver", bundle:2, cost:200, note:"Weekend shelf slot 10" },
  { id:"sku_11", box:"silver", bundle:3, cost:205, note:"Weekend shelf slot 11" },
  { id:"sku_12", box:"silver", bundle:1, cost:210, note:"Weekend shelf slot 12" },
  { id:"sku_13", box:"silver", bundle:2, cost:215, note:"Weekend shelf slot 13" },
  { id:"sku_14", box:"silver", bundle:3, cost:220, note:"Weekend shelf slot 14" },
  { id:"sku_15", box:"silver", bundle:1, cost:225, note:"Weekend shelf slot 15" },
  { id:"sku_16", box:"silver", bundle:2, cost:230, note:"Weekend shelf slot 16" },
  { id:"sku_17", box:"silver", bundle:3, cost:235, note:"Weekend shelf slot 17" },
  { id:"sku_18", box:"silver", bundle:1, cost:240, note:"Weekend shelf slot 18" },
  { id:"sku_19", box:"silver", bundle:2, cost:245, note:"Weekend shelf slot 19" },
  { id:"sku_20", box:"silver", bundle:3, cost:250, note:"Weekend shelf slot 20" },
  { id:"sku_21", box:"silver", bundle:1, cost:255, note:"Weekend shelf slot 21" },
  { id:"sku_22", box:"silver", bundle:2, cost:260, note:"Weekend shelf slot 22" },
  { id:"sku_23", box:"silver", bundle:3, cost:265, note:"Weekend shelf slot 23" },
  { id:"sku_24", box:"silver", bundle:1, cost:270, note:"Weekend shelf slot 24" },
  { id:"sku_25", box:"silver", bundle:2, cost:275, note:"Weekend shelf slot 25" },
  { id:"sku_26", box:"silver", bundle:3, cost:280, note:"Weekend shelf slot 26" },
  { id:"sku_27", box:"silver", bundle:1, cost:285, note:"Weekend shelf slot 27" },
  { id:"sku_28", box:"silver", bundle:2, cost:290, note:"Weekend shelf slot 28" },
  { id:"sku_29", box:"silver", bundle:3, cost:295, note:"Weekend shelf slot 29" },
  { id:"sku_30", box:"silver", bundle:1, cost:300, note:"Weekend shelf slot 30" },
  { id:"sku_31", box:"silver", bundle:2, cost:305, note:"Weekend shelf slot 31" },
  { id:"sku_32", box:"silver", bundle:3, cost:310, note:"Weekend shelf slot 32" },
  { id:"sku_33", box:"silver", bundle:1, cost:315, note:"Weekend shelf slot 33" },
  { id:"sku_34", box:"silver", bundle:2, cost:320, note:"Weekend shelf slot 34" },
  { id:"sku_35", box:"silver", bundle:3, cost:325, note:"Weekend shelf slot 35" },
  { id:"sku_36", box:"silver", bundle:1, cost:330, note:"Weekend shelf slot 36" },
  { id:"sku_37", box:"silver", bundle:2, cost:335, note:"Weekend shelf slot 37" },
  { id:"sku_38", box:"silver", bundle:3, cost:340, note:"Weekend shelf slot 38" },
  { id:"sku_39", box:"silver", bundle:1, cost:345, note:"Weekend shelf slot 39" },
  { id:"sku_40", box:"silver", bundle:2, cost:350, note:"Weekend shelf slot 40" },
  { id:"sku_41", box:"silver", bundle:3, cost:355, note:"Weekend shelf slot 41" },
  { id:"sku_42", box:"silver", bundle:1, cost:360, note:"Weekend shelf slot 42" },
  { id:"sku_43", box:"silver", bundle:2, cost:365, note:"Weekend shelf slot 43" },
  { id:"sku_44", box:"silver", bundle:3, cost:370, note:"Weekend shelf slot 44" },
  { id:"sku_45", box:"silver", bundle:1, cost:375, note:"Weekend shelf slot 45" },
  { id:"sku_46", box:"silver", bundle:2, cost:380, note:"Weekend shelf slot 46" },
  { id:"sku_47", box:"silver", bundle:3, cost:385, note:"Weekend shelf slot 47" },
  { id:"sku_48", box:"silver", bundle:1, cost:390, note:"Weekend shelf slot 48" },
  { id:"sku_49", box:"silver", bundle:2, cost:395, note:"Weekend shelf slot 49" },
  { id:"sku_50", box:"silver", bundle:3, cost:400, note:"Weekend shelf slot 50" },
  { id:"sku_51", box:"silver", bundle:1, cost:405, note:"Weekend shelf slot 51" },
  { id:"sku_52", box:"silver", bundle:2, cost:410, note:"Weekend shelf slot 52" },
  { id:"sku_53", box:"silver", bundle:3, cost:415, note:"Weekend shelf slot 53" },
  { id:"sku_54", box:"silver", bundle:1, cost:420, note:"Weekend shelf slot 54" },
  { id:"sku_55", box:"silver", bundle:2, cost:425, note:"Weekend shelf slot 55" },
  { id:"sku_56", box:"silver", bundle:3, cost:430, note:"Weekend shelf slot 56" },
  { id:"sku_57", box:"silver", bundle:1, cost:435, note:"Weekend shelf slot 57" },
  { id:"sku_58", box:"silver", bundle:2, cost:440, note:"Weekend shelf slot 58" },
  { id:"sku_59", box:"silver", bundle:3, cost:445, note:"Weekend shelf slot 59" },
  { id:"sku_60", box:"silver", bundle:1, cost:450, note:"Weekend shelf slot 60" },
  { id:"sku_61", box:"silver", bundle:2, cost:455, note:"Weekend shelf slot 61" },
  { id:"sku_62", box:"silver", bundle:3, cost:460, note:"Weekend shelf slot 62" },
  { id:"sku_63", box:"silver", bundle:1, cost:465, note:"Weekend shelf slot 63" },
  { id:"sku_64", box:"silver", bundle:2, cost:470, note:"Weekend shelf slot 64" },
  { id:"sku_65", box:"silver", bundle:3, cost:475, note:"Weekend shelf slot 65" },
  { id:"sku_66", box:"silver", bundle:1, cost:480, note:"Weekend shelf slot 66" },
  { id:"sku_67", box:"silver", bundle:2, cost:485, note:"Weekend shelf slot 67" },
  { id:"sku_68", box:"silver", bundle:3, cost:490, note:"Weekend shelf slot 68" },
  { id:"sku_69", box:"silver", bundle:1, cost:495, note:"Weekend shelf slot 69" },
  { id:"sku_70", box:"silver", bundle:2, cost:500, note:"Weekend shelf slot 70" },
  { id:"sku_71", box:"silver", bundle:3, cost:505, note:"Weekend shelf slot 71" },
  { id:"sku_72", box:"silver", bundle:1, cost:510, note:"Weekend shelf slot 72" },
  { id:"sku_73", box:"silver", bundle:2, cost:515, note:"Weekend shelf slot 73" },
  { id:"sku_74", box:"silver", bundle:3, cost:520, note:"Weekend shelf slot 74" },
  { id:"sku_75", box:"silver", bundle:1, cost:525, note:"Weekend shelf slot 75" },
  { id:"sku_76", box:"silver", bundle:2, cost:530, note:"Weekend shelf slot 76" },
  { id:"sku_77", box:"silver", bundle:3, cost:535, note:"Weekend shelf slot 77" },
  { id:"sku_78", box:"silver", bundle:1, cost:540, note:"Weekend shelf slot 78" },
  { id:"sku_79", box:"silver", bundle:2, cost:545, note:"Weekend shelf slot 79" },
  { id:"sku_80", box:"silver", bundle:3, cost:550, note:"Weekend shelf slot 80" },
  { id:"sku_81", box:"silver", bundle:1, cost:555, note:"Weekend shelf slot 81" },
  { id:"sku_82", box:"silver", bundle:2, cost:560, note:"Weekend shelf slot 82" },
  { id:"sku_83", box:"silver", bundle:3, cost:565, note:"Weekend shelf slot 83" },
  { id:"sku_84", box:"silver", bundle:1, cost:570, note:"Weekend shelf slot 84" },
  { id:"sku_85", box:"silver", bundle:2, cost:575, note:"Weekend shelf slot 85" },
  { id:"sku_86", box:"silver", bundle:3, cost:580, note:"Weekend shelf slot 86" },
  { id:"sku_87", box:"silver", bundle:1, cost:585, note:"Weekend shelf slot 87" },
  { id:"sku_88", box:"silver", bundle:2, cost:590, note:"Weekend shelf slot 88" },
  { id:"sku_89", box:"silver", bundle:3, cost:595, note:"Weekend shelf slot 89" },
  { id:"sku_90", box:"silver", bundle:1, cost:600, note:"Weekend shelf slot 90" },
  { id:"sku_91", box:"silver", bundle:2, cost:605, note:"Weekend shelf slot 91" },
  { id:"sku_92", box:"silver", bundle:3, cost:610, note:"Weekend shelf slot 92" },
  { id:"sku_93", box:"silver", bundle:1, cost:615, note:"Weekend shelf slot 93" },
  { id:"sku_94", box:"silver", bundle:2, cost:620, note:"Weekend shelf slot 94" },
  { id:"sku_95", box:"silver", bundle:3, cost:625, note:"Weekend shelf slot 95" },
  { id:"sku_96", box:"silver", bundle:1, cost:630, note:"Weekend shelf slot 96" },
  { id:"sku_97", box:"silver", bundle:2, cost:635, note:"Weekend shelf slot 97" },
  { id:"sku_98", box:"silver", bundle:3, cost:640, note:"Weekend shelf slot 98" },
  { id:"sku_99", box:"silver", bundle:1, cost:645, note:"Weekend shelf slot 99" },
  { id:"sku_100", box:"silver", bundle:2, cost:650, note:"Weekend shelf slot 100" },
  { id:"sku_101", box:"silver", bundle:3, cost:655, note:"Weekend shelf slot 101" },
  { id:"sku_102", box:"silver", bundle:1, cost:660, note:"Weekend shelf slot 102" },
  { id:"sku_103", box:"silver", bundle:2, cost:665, note:"Weekend shelf slot 103" },
  { id:"sku_104", box:"silver", bundle:3, cost:670, note:"Weekend shelf slot 104" },
  { id:"sku_105", box:"silver", bundle:1, cost:675, note:"Weekend shelf slot 105" },
  { id:"sku_106", box:"silver", bundle:2, cost:680, note:"Weekend shelf slot 106" },
  { id:"sku_107", box:"silver", bundle:3, cost:685, note:"Weekend shelf slot 107" },
  { id:"sku_108", box:"silver", bundle:1, cost:690, note:"Weekend shelf slot 108" },
  { id:"sku_109", box:"silver", bundle:2, cost:695, note:"Weekend shelf slot 109" },
  { id:"sku_110", box:"silver", bundle:3, cost:700, note:"Weekend shelf slot 110" },
  { id:"sku_111", box:"silver", bundle:1, cost:705, note:"Weekend shelf slot 111" },
  { id:"sku_112", box:"silver", bundle:2, cost:710, note:"Weekend shelf slot 112" },
  { id:"sku_113", box:"silver", bundle:3, cost:715, note:"Weekend shelf slot 113" },
  { id:"sku_114", box:"silver", bundle:1, cost:720, note:"Weekend shelf slot 114" },
  { id:"sku_115", box:"silver", bundle:2, cost:725, note:"Weekend shelf slot 115" },
  { id:"sku_116", box:"silver", bundle:3, cost:730, note:"Weekend shelf slot 116" },
  { id:"sku_117", box:"silver", bundle:1, cost:735, note:"Weekend shelf slot 117" },
  { id:"sku_118", box:"silver", bundle:2, cost:740, note:"Weekend shelf slot 118" },
  { id:"sku_119", box:"silver", bundle:3, cost:745, note:"Weekend shelf slot 119" },
];

const BOXES = {
  silver: {
    id: "silver", name: "Silver Box", tag: "Silver",
    cost: 150, currency: "coins",
    desc: "1 common or rare emoji · small coin bundle",
    bonusCoins: [10, 30],
    pool: [
      { rarity: "common", weight: 72 },
      { rarity: "rare", weight: 28 },
    ],
  },
  gold: {
    id: "gold", name: "Gold Box", tag: "Gold",
    cost: 400, currency: "coins",
    desc: "Guaranteed rare+ · bonus power charge",
    bonusCoins: [25, 60],
    pool: [
      { rarity: "rare", weight: 70 },
      { rarity: "epic", weight: 28 },
      { rarity: "legend", weight: 2 },
    ],
  },
  diamond: {
    id: "diamond", name: "Diamond Box", tag: "Diamond",
    cost: 25, currency: "gems",
    desc: "Epic or legendary emoji · large gem payout",
    bonusGems: [1, 3],
    pool: [
      { rarity: "epic", weight: 75 },
      { rarity: "legend", weight: 25 },
    ],
  },
  series: {
    id: "series", name: "Series Box", tag: "Series",
    cost: 600, currency: "coins",
    desc: "Limited seasonal emoji from the current event set",
    bonusCoins: [40, 80],
    pool: [
      { rarity: "rare", weight: 40 },
      { rarity: "epic", weight: 45 },
      { rarity: "legend", weight: 15 },
    ],
    seriesIds: [14, 15, 5, 12],
  },
};

const TITLES = ["ROOKIE","BLASTER","CASCADE KING","BLITZ LORD","EMOJI LEGEND","SEASON STAR"];

/* ===================== 2. SAVE SYSTEM ===================== */
function dayKey(d=new Date()){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function seededRand(seed){
  let t = seed>>>0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t>>>15), 1|t);
    r ^= r + Math.imul(r ^ (r>>>7), 61|r);
    return ((r^(r>>>14))>>>0)/4294967296;
  };
}
function hashDay(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h,16777619); }
  return h>>>0;
}
function defaultSave(){
  const now = Date.now();
  return {
    coins:200, gems:5, xp:0, level:1, best:0, games:0, clears:0, blitzes:0,
    lives:5, livesAt:0, lifeRegenAt:0,
    unlocked:[0], selected:0, levels:{}, dupes:{},
    boosters:{ sun:0, time:0, coin:0, score2:0, time10:0, blitz50:0, magnet:0 },
    equippedBooster:null,
    pass:{ season:1, xp:0, vip:false, claimedFree:[], claimedVip:[], endsAt: now + SEASON_MS },
    quests:{ day:"", list:[] },
    login:{ last:"", streak:0, claimedDay:"" },
    spin:{ lastFree:"", pity:0 },
    achievements:{},
    hourlyCrateAt:0,
    sfx:true, music:true, shake:true,
    titles:["ROOKIE"], equippedTitle:"ROOKIE",
    stats:{ bestCombo:0, spins:0, powers:0, logins:0 }
  };
}
function migrateSave(raw){
  const d = defaultSave();
  const s = { ...d, ...raw };
  s.pass = { ...d.pass, ...(raw.pass||{}) };
  s.pass.claimedFree = Array.isArray(s.pass.claimedFree)?s.pass.claimedFree:[];
  s.pass.claimedVip = Array.isArray(s.pass.claimedVip)?s.pass.claimedVip:[];
  s.quests = { ...d.quests, ...(raw.quests||{}) };
  s.login = { ...d.login, ...(raw.login||{}) };
  if(!s.login.claimedDay) s.login.claimedDay = "";
  s.spin = { ...d.spin, ...(raw.spin||{}) };
  s.boosters = { ...d.boosters, ...(raw.boosters||{}) };
  s.achievements = { ...(raw.achievements||{}) };
  s.stats = { ...d.stats, ...(raw.stats||{}) };
  s.titles = Array.isArray(raw.titles)?raw.titles:d.titles;
  s.unlocked = Array.isArray(raw.unlocked)?raw.unlocked:[0];
  s.levels = { ...(raw.levels||{}) };
  s.dupes = { ...(raw.dupes||{}) };
  if(s.lives == null) s.lives = MAX_LIVES;
  if(s.livesAt != null && !s.lifeRegenAt) s.lifeRegenAt = s.livesAt;
  if(s.lifeRegenAt == null) s.lifeRegenAt = 0;
  if(raw.coins!=null && raw.gems==null && !raw.pass){ /* v1 migrate soft bump */ s.gems = 5; }
  return s;
}
function loadSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw){
      // soft migrate from v1
      const v2 = localStorage.getItem("emojiRush_v2");
      if (v2) return migrateSave(JSON.parse(v2));
      const v1 = localStorage.getItem("emojiRush_v1");
      if(v1){
        const old = JSON.parse(v1);
        const m = migrateSave(old);
        m.coins = old.coins||m.coins;
        m.best = old.best||0;
        m.games = old.games||0;
        m.clears = old.clears||0;
        m.blitzes = old.blitzes||0;
        m.unlocked = old.unlocked||[0];
        m.selected = old.selected||0;
        m.sfx = old.sfx!==false; m.music = old.music!==false; m.shake = old.shake!==false;
        return m;
      }
      return defaultSave();
    }
    return migrateSave(JSON.parse(raw));
  }catch{ return defaultSave(); }
}
function writeSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
let save = loadSave();

/* ===================== 3. AUDIO ===================== */
let audioCtx = null, musicNodes = null, musicOn = false;
function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq, dur, type="square", gain=0.04, slide=0){
  if(!save.sfx || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq+slide), t0+dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t0); o.stop(t0+dur+0.02);
}
function sfx(name){
  if(!save.sfx) return;
  ensureAudio();
  if(name==="tap") beep(520,.05,"triangle",.03);
  if(name==="swap") beep(380,.06,"square",.03);
  if(name==="reject") beep(180,.12,"sawtooth",.04,-80);
  if(name==="clear") beep(660,.08,"triangle",.045,200);
  if(name==="special") beep(880,.14,"square",.05,400);
  if(name==="blitz"){ beep(220,.2,"sawtooth",.05,300); setTimeout(()=>beep(440,.2,"square",.05,200),80); }
  if(name==="power") beep(300,.18,"triangle",.05,500);
  if(name==="coin") beep(990,.1,"square",.035);
  if(name==="claim"){ beep(520,.08,"triangle",.04); setTimeout(()=>beep(780,.12,"triangle",.045),70); }
  if(name==="unlock"){ beep(523,.1,"triangle",.05); setTimeout(()=>beep(659,.12,"triangle",.05),90); setTimeout(()=>beep(784,.18,"triangle",.05),180); }
  if(name==="star") beep(740,.16,"sine",.04,200);
  if(name==="level"){ beep(392,.1,"square",.04); setTimeout(()=>beep(523,.12,"square",.045),90); setTimeout(()=>beep(784,.2,"triangle",.05),180); }
  if(name==="spin") beep(300,.08,"sawtooth",.03,100);
}
function startMusic(){
  if(!save.music) return;
  ensureAudio();
  stopMusic();
  musicOn = true;
  const master = audioCtx.createGain();
  master.gain.value = 0.025;
  master.connect(audioCtx.destination);
  const tempo = 0.42;
  const notes = [262,330,392,330,294,370,440,370];
  let step = 0;
  const tick = () => {
    if(!musicOn || !save.music) return;
    const f = notes[step % notes.length];
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.9, audioCtx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+tempo*0.85);
    o.connect(g); g.connect(master);
    o.start(); o.stop(audioCtx.currentTime+tempo);
    step++;
    musicNodes = setTimeout(tick, tempo*1000);
  };
  tick();
}
function stopMusic(){
  musicOn = false;
  if(musicNodes){ clearTimeout(musicNodes); musicNodes = null; }
}

/* ===================== 4. UI HELPERS ===================== */
const $ = (id) => document.getElementById(id);
const SCREENS = ["splash","menu","chars","select","pass","quests","spin","store","ach","howto","settings","events","game","result"];
function showScreen(name){
  SCREENS.forEach(s => {
    const el = $(`screen-${s}`);
    if(el) el.classList.toggle("active", s===name);
  });
  if(name!=="game") document.body.classList.remove("blitz");
}
function toast(msg){
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.classList.remove("show"), 2000);
}
function openScreen(name){
  if(name==="menu") refreshMenu();
  if(name==="chars"){ renderCharGrid(); }
  if(name==="select") renderSelectGrid();
  if(name==="pass"){ ensureSeason(); renderPass(); }
  if(name==="quests"){ ensureQuests(); renderQuests(); }
  if(name==="spin") renderSpin();
  if(name==="store") renderShop();
  if(name==="ach") renderAchievements();
  if(name==="events") renderEvents();
  if(name==="settings") bindToggles();
  showScreen(name);
}

/* ===================== 5. ECONOMY / XP / LEVEL ===================== */
function grantCoins(n, silent){
  save.coins += n;
  writeSave();
  if(!silent){ sfx("coin"); refreshMenu(); punchChip("menuCoins"); }
}
function grantGems(n){
  save.gems += n;
  writeSave(); refreshMenu(); punchChip("menuGems");
}
function grantXP(n){
  save.xp += n;
  let leveled = 0;
  while(save.xp >= XP_PER_LEVEL(save.level)){
    save.xp -= XP_PER_LEVEL(save.level);
    save.level++;
    leveled++;
    const bonus = 40 + save.level * 10;
    save.coins += bonus;
    if(leveled===1) toast(`Level ${save.level}! +🪙 ${bonus}`);
  }
  if(leveled) sfx("level");
  writeSave();
  return leveled;
}
function grantPassXP(n){
  ensureSeason();
  save.pass.xp += n;
  writeSave();
}
function applyReward(rew){
  if(!rew) return;
  if(rew.type==="coins") grantCoins(rew.amount, true);
  else if(rew.type==="gems"){ save.gems += rew.amount; }
  else if(rew.type==="xp") grantXP(rew.amount);
  else if(rew.type==="booster"){
    const id = rew.id || BOOSTERS[Math.floor(Math.random()*BOOSTERS.length)].id;
    save.boosters[id] = (save.boosters[id]||0) + (rew.amount||1);
  }
  else if(rew.type==="char"){
    if(!save.unlocked.includes(rew.id)){
      save.unlocked.push(rew.id);
      toast("Unlocked " + (CHARACTERS.find(c=>c.id===rew.id)?.name||"hero") + "!");
      sfx("unlock");
    }
  }
  else if(rew.type==="title"){
    if(!save.titles.includes(rew.id)){
      save.titles.push(rew.id);
      save.equippedTitle = rew.id;
      toast("Title: " + rew.id);
    }
  }
  writeSave();
}

/* ===================== 6. SEASON / LOGIN / QUESTS ===================== */
function ensureSeason(){
  const now = Date.now();
  if(!save.pass.endsAt || now >= save.pass.endsAt){
    save.pass.season = (save.pass.season||1) + 1;
    save.pass.xp = 0;
    save.pass.vip = false;
    save.pass.claimedFree = [];
    save.pass.claimedVip = [];
    save.pass.endsAt = now + SEASON_MS;
    writeSave();
    toast("New Season " + save.pass.season + "!");
  }
}
function formatRemain(ms){
  if(ms<0) ms=0;
  const d = Math.floor(ms/86400000);
  const h = Math.floor((ms%86400000)/3600000);
  const m = Math.floor((ms%3600000)/60000);
  if(d>0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
}
function passTier(){ return Math.min(PASS_TIERS, Math.floor(save.pass.xp / PASS_XP_PER_TIER)); }
function unclaimedPassCount(){
  ensureSeason();
  const t = passTier();
  let n=0;
  for(let i=1;i<=t;i++){
    if(!save.pass.claimedFree.includes(i)) n++;
    if(save.pass.vip && !save.pass.claimedVip.includes(i)) n++;
  }
  return n;
}
function ensureLogin(){
  const today = dayKey();
  if(save.login.last === today) return;
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yk = dayKey(yest);
  if(save.login.last === yk) save.login.streak = (save.login.streak||0) + 1;
  else save.login.streak = 1;
  save.login.last = today;
  save.stats.logins = (save.stats.logins||0)+1;
  writeSave();
  checkAchievements();
}
function dailyGiftAmount(){
  return Math.min(50, 15 + (save.login.streak||1) * 5);
}
function canClaimDaily(){
  return (save.login.claimedDay || "") !== dayKey();
}
function loadDailyClaimed(){ /* claimedDay lives on save.login */ }
function markDailyClaimed(){
  save.login.claimedDay = dayKey();
}
function ensureQuests(){
  const today = dayKey();
  if(save.quests.day === today && save.quests.list?.length===3) return;
  const rng = seededRand(hashDay(today+"emojiRushQuests"));
  const pool = [...QUEST_POOL];
  const list = [];
  for(let i=0;i<3;i++){
    const idx = Math.floor(rng()*pool.length);
    const q = pool.splice(idx,1)[0];
    const tier = Math.floor(rng()*3);
    const target = q.target[tier];
    list.push({
      id: q.id+"_"+i, kind:q.key, label:q.label.replace("{n}", String(target)),
      target, progress:0, claimed:false,
      rewardCoins:q.reward.coins + tier*10,
      rewardXp:q.reward.xp + tier*5
    });
  }
  save.quests = { day:today, list };
  writeSave();
}
function bumpQuest(kind, amount, absoluteMax){
  ensureQuests();
  let changed=false;
  for(const q of save.quests.list){
    if(q.claimed || q.kind!==kind) continue;
    if(absoluteMax){
      const next = Math.max(q.progress, amount);
      if(next!==q.progress){ q.progress=Math.min(q.target,next); changed=true; }
    } else {
      q.progress = Math.min(q.target, q.progress + amount);
      changed=true;
    }
  }
  if(changed) writeSave();
}

/* ===================== 7. ACHIEVEMENTS ===================== */
function checkAchievements(){
  let any=false;
  for(const a of ACHIEVEMENTS){
    const st = save.achievements[a.id] || { unlocked:false, claimed:false };
    if(!st.unlocked && a.check(save)){
      st.unlocked = true;
      save.achievements[a.id] = st;
      any=true;
      toast("🏅 " + a.name);
      sfx("unlock");
    } else save.achievements[a.id] = st;
  }
  if(any) writeSave();
}


/* ===================== Character levels & box loot ===================== */
function getCharLevel(id) {
  const lv = save.levels && save.levels[id];
  return (typeof lv === "number" && lv > 0) ? lv : (save.unlocked.includes(id) ? 1 : 0);
}

function grantCharOrDupe(charId) {
  save.levels = save.levels || {};
  save.dupes = save.dupes || {};
  const c = CHARACTERS.find(x => x.id === charId);
  if (!c) return { type: "error" };
  if (!save.unlocked.includes(charId)) {
    save.unlocked.push(charId);
    save.levels[charId] = 1;
    save.dupes[charId] = 0;
    return { type: "new", char: c, level: 1 };
  }
  const lv = getCharLevel(charId);
  if (lv >= MAX_CHAR_LEVEL) {
    const refund = c.rarity === "legend" ? 120 : c.rarity === "epic" ? 80 : c.rarity === "rare" ? 50 : 30;
    grantCoins(refund, true);
    return { type: "max", char: c, coins: refund };
  }
  save.dupes[charId] = (save.dupes[charId] || 0) + 1;
  const need = LEVEL_DUPES_NEEDED[lv] || 999;
  if (save.dupes[charId] >= need) {
    save.dupes[charId] -= need;
    save.levels[charId] = lv + 1;
    return { type: "levelup", char: c, level: lv + 1 };
  }
  return { type: "dupe", char: c, dupes: save.dupes[charId], need };
}

function pickWeightedRarity(pool) {
  let total = 0;
  for (const row of pool) total += row.weight;
  let roll = Math.random() * total;
  for (const row of pool) {
    roll -= row.weight;
    if (roll <= 0) return row.rarity;
  }
  return pool[pool.length - 1].rarity;
}

function rollBoxChar(box) {
  const rarity = pickWeightedRarity(box.pool);
  let candidates = CHARACTERS.filter(c => c.rarity === rarity);
  if (box.seriesIds && box.seriesIds.length) {
    const series = CHARACTERS.filter(c => box.seriesIds.includes(c.id));
    if (series.length && Math.random() < 0.55) candidates = series;
  }
  if (!candidates.length) candidates = CHARACTERS.filter(c => c.id !== 0);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function prepBoosterForEngine() {
  const uiId = save.equippedBooster;
  if (!uiId || uiId === "none") { save.equippedBooster = null; return; }
  const b = BOOSTERS.find(x => x.id === uiId);
  if (!b || (save.boosters[uiId] || 0) <= 0) { save.equippedBooster = null; return; }
  save.boosters[uiId]--;
  const ek = b.engineKey || uiId;
  save.boosters[ek] = (save.boosters[ek] || 0) + 1;
  save.equippedBooster = ek;
  writeSave();
}

function buyLivesWithGems() {
  if (typeof tickLivesRegen === "function") tickLivesRegen();
  else if (save.lives == null) save.lives = MAX_LIVES;
  if (save.lives >= MAX_LIVES) { toast("Lives full!"); return; }
  if (save.gems < LIFE_REFILL_GEMS) { toast(`Need 💎 ${LIFE_REFILL_GEMS}`); return; }
  save.gems -= LIFE_REFILL_GEMS;
  save.lives = Math.min(MAX_LIVES, (save.lives || 0) + LIFE_REFILL_AMOUNT);
  if (save.lives >= MAX_LIVES) save.lifeRegenAt = save.livesAt = 0;
  writeSave();
  sfx("claim");
  toast(`+${LIFE_REFILL_AMOUNT} lives!`);
  refreshMenu();
}

/* ===================== 8. MENU / META RENDERERS ===================== */
function setChipVal(id, n){
  const el = $(id);
  if(!el) return;
  const val = el.querySelector(".val");
  if(val) val.textContent = String(n);
  else el.textContent = String(n);
}
function punchChip(id){
  const el = $(id);
  if(!el) return;
  el.classList.remove("punch");
  void el.offsetWidth;
  el.classList.add("punch");
}
function refreshMenu(){
  ensureSeason(); ensureQuests(); ensureLogin(); loadDailyClaimed();
  if (typeof tickLivesRegen === "function") tickLivesRegen();
  else if (save.lives == null) save.lives = MAX_LIVES;
  setChipVal("menuLives", save.lives);
  const ml = $("menuLives");
  if (ml) {
    const hint = ml.querySelector(".life-hint");
    if (save.lives < MAX_LIVES && save.lifeRegenAt) {
      const ms = Math.max(0, save.lifeRegenAt - Date.now());
      const m = Math.ceil(ms / 60000);
      if (hint) hint.textContent = `next in ${m}m`;
      else {
        const sp = document.createElement("small");
        sp.className = "life-hint";
        sp.textContent = `next in ${m}m`;
        ml.appendChild(sp);
      }
    } else if (hint) hint.remove();
  }
  setChipVal("menuCoins", save.coins);
  setChipVal("menuGems", save.gems);
  const unlockedN = save.unlocked.length;
  if($("charsCoins")) $("charsCoins").textContent = unlockedN + "/" + CHARACTERS.length;
  if($("statGames")) $("statGames").textContent = save.games;
  if($("statClears")) $("statClears").textContent = save.clears;
  if($("statBlitz")) $("statBlitz").textContent = save.blitzes;
  const sel = CHARACTERS.find(c=>c.id===save.selected) || CHARACTERS[0];
  if($("menuMascot")) $("menuMascot").innerHTML = faceHTML(sel.id);
  if($("menuTitle")) $("menuTitle").textContent = save.equippedTitle || "ROOKIE";
  if($("menuLevel")) $("menuLevel").textContent = "Lv " + save.level;
  const need = XP_PER_LEVEL(save.level);
  if($("menuXpTxt")) $("menuXpTxt").textContent = `${save.xp}/${need}`;
  if($("menuXpBar")) $("menuXpBar").style.width = Math.min(100, (save.xp/need)*100) + "%";
  const prev = $("menuMissionPreview");
  if(prev && save.quests && save.quests.list){
    const qs = save.quests.list.slice(0,2);
    prev.innerHTML = qs.map(q=>{
      const pct = Math.min(100, Math.floor((q.progress||0)/Math.max(1,q.target)*100));
      const label = (q.label||"Mission").replace("{n}", String(q.target));
      return `<div class="mission-row"><span>${label}</span><div class="qbar"><i style="width:${pct}%"></i></div></div>`;
    }).join("") || prev.innerHTML;
  }

  const dg = $("btnDailyGift");
  const streak = Math.max(1, save.login.streak|0);
  if(canClaimDaily()){
    dg.classList.add("ready"); dg.disabled = false;
    $("dailyGiftN").textContent = `Claim · 🪙 ${dailyGiftAmount()}`;
    $("dailyGiftH").textContent = `day ${streak} streak · tap to collect`;
  } else {
    dg.classList.remove("ready"); dg.disabled = false;
    $("dailyGiftN").textContent = `Day ${streak} locked in`;
    $("dailyGiftH").textContent = "come back tomorrow for more";
  }
  const hc = $("btnHourlyCrate");
  const left = (save.hourlyCrateAt||0) + HOUR_MS - Date.now();
  if(left<=0){
    hc.classList.add("ready"); hc.disabled = false;
    $("hourlyN").textContent = "Crate ready!";
    $("hourlyH").textContent = "tap to rip it open";
  } else {
    hc.classList.remove("ready");
    const m = Math.ceil(left/60000);
    $("hourlyN").textContent = `Ready in ${m}m`;
    $("hourlyH").textContent = "hang tight · free loot incoming";
  }
  const ub = unclaimedPassCount();
  const badge = $("passBadge");
  if(ub>0){ badge.hidden=false; badge.textContent=String(ub); }
  else badge.hidden=true;
}

function renderCharGrid(){
  const grid = $("charGrid");
  grid.innerHTML = "";
  CHARACTERS.forEach(c=>{
    const unlocked = save.unlocked.includes(c.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-card" + (unlocked?"":" locked") + (save.selected===c.id?" selected":"");
    const face = unlocked ? faceHTML(c.id) : faceHTML(c.id);
    btn.innerHTML = `
      <div class="face">${face}</div>
      ${unlocked?"":"<div class='lock-tag'>🔒</div>"}
      ${c.rarity==="legend"||c.rarity==="epic"?`<span class="tier-gem" style="position:absolute;top:3px;left:3px;font-size:10px">💎</span>`:""}`;
    btn.onclick = () => openDetail(c.id);
    grid.appendChild(btn);
  });
  openDetail(save.selected||0);
}
let detailId = 0;
function openDetail(id){
  detailId = id;
  const c = CHARACTERS.find(x=>x.id===id);
  const unlocked = save.unlocked.includes(id);
  $("cdFace").innerHTML = unlocked?faceHTML(c.id):faceHTML(c.id);
  if(!unlocked) $("cdFace").style.filter = "grayscale(.7) brightness(.75)";
  else $("cdFace").style.filter = "";
  $("cdName").textContent = c.name;
  const lv = getCharLevel(id);
  const cdLv = $("cdLevel");
  const cdPts = $("cdPts");
  const cdBar = $("cdXpBar");
  if (cdLv) cdLv.textContent = unlocked ? `Lv ${lv}` : "Locked";
  if (unlocked && cdPts && cdBar) {
    const dupes = save.dupes[id] || 0;
    const need = lv < MAX_CHAR_LEVEL ? (LEVEL_DUPES_NEEDED[lv] || 1) : 0;
    cdPts.textContent = lv >= MAX_CHAR_LEVEL ? "MAX" : `${dupes}/${need}`;
    cdBar.style.width = lv >= MAX_CHAR_LEVEL ? "100%" : `${Math.min(100, (dupes / Math.max(1, need)) * 100)}%`;
  }
  $("cdDesc").textContent = unlocked ? c.desc : ("Locked · open boxes or 🪙 " + c.cost);
  const act = $("cdAction");
  if(unlocked){
    act.textContent = save.selected===id ? "Selected" : "Select Hero";
    act.disabled = save.selected===id;
    act.onclick = () => {
      save.selected = id; writeSave(); sfx("tap");
      toast(c.name + " ready!");
      renderCharGrid(); openDetail(id); refreshMenu();
    };
  } else {
    act.textContent = `Unlock · 🪙 ${c.cost}`;
    act.disabled = save.coins < c.cost;
    act.onclick = () => {
      if(save.coins < c.cost) return;
      save.coins -= c.cost;
      save.unlocked.push(id);
      save.selected = id;
      writeSave(); sfx("unlock");
      toast("Unlocked " + c.name + "!");
      checkAchievements();
      refreshMenu(); renderCharGrid(); openDetail(id);
    };
  }
}

function renderSelectGrid(){
  const grid = $("selectGrid");
  grid.innerHTML = "";
  let current = CHARACTERS.find(c=>c.id===save.selected) || CHARACTERS[0];
  const paint = () => {
    $("selFace").innerHTML = faceHTML(current.id);
    $("selName").textContent = current.name;
    $("selDesc").textContent = current.desc;
  };
  paint();
  CHARACTERS.forEach(c=>{
    const unlocked = save.unlocked.includes(c.id);
    const btn = document.createElement("button");
    btn.disabled = !unlocked;
    btn.innerHTML = `${unlocked?faceHTML(c.id):"🔒"}<small>${c.name.split(" ")[0]}</small>`;
    if(c.id===current.id) btn.classList.add("active");
    btn.onclick = () => {
      current = c; save.selected = c.id; writeSave();
      sfx("tap");
      [...grid.children].forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      paint();
    };
    grid.appendChild(btn);
  });
  const bp = $("boosterPick");
  if (bp) {
    bp.innerHTML = "";
    const mkCard = (id, ico, title, sub, owned, active) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "booster-card" + (active ? " active" : "");
      btn.dataset.booster = id;
      btn.innerHTML = `<span class="b-ico">${ico}</span><span><h4>${title}</h4><p>${sub}</p></span>`;
      if (id !== "none" && owned <= 0) btn.disabled = true;
      return btn;
    };
    const noneId = !save.equippedBooster ? "none" : null;
    const noneBtn = mkCard("none", "✨", "None", "Play without a booster", 1, !save.equippedBooster);
    noneBtn.onclick = () => { save.equippedBooster = null; writeSave(); renderSelectGrid(); sfx("tap"); };
    bp.appendChild(noneBtn);
    BOOSTERS.forEach(b => {
      const owned = save.boosters[b.id] || 0;
      const btn = mkCard(b.id, b.ico, b.name, `${b.desc} · ×${owned}`, owned, save.equippedBooster === b.id);
      btn.onclick = () => { save.equippedBooster = b.id; writeSave(); renderSelectGrid(); sfx("tap"); };
      bp.appendChild(btn);
    });
    const lbl = $("selBoosterLabel");
    if (lbl) {
      const eq = save.equippedBooster ? BOOSTERS.find(x => x.id === save.equippedBooster) : null;
      lbl.textContent = eq ? eq.name : "None";
    }
  }
  $("btnStartRound").onclick = () => { ensureAudio(); prepBoosterForEngine(); startMusic(); beginRound(current); };
}

function renderPass(){
  ensureSeason();
  $("passXpChip").textContent = "⭐ " + save.pass.xp;
  $("passTimer").textContent = formatRemain(save.pass.endsAt - Date.now());
  const buy = $("btnBuyVip");
  if(save.pass.vip){ buy.textContent = "VIP ACTIVE"; buy.disabled = true; }
  else { buy.textContent = `VIP · 🪙 ${VIP_COST}`; buy.disabled = save.coins < VIP_COST; }
  const t = passTier();
  const into = save.pass.xp % PASS_XP_PER_TIER;
  $("passNearLab").textContent = t>=PASS_TIERS ? "Season maxed!" : `Tier ${t} → ${t+1} · ${into}/${PASS_XP_PER_TIER}`;
  $("passNearBar").style.width = (t>=PASS_TIERS?100:(into/PASS_XP_PER_TIER)*100) + "%";
  const track = $("passTrack");
  track.innerHTML = "";
  PASS_REWARDS.forEach(tier=>{
    const unlocked = save.pass.xp >= tier.xp;
    const el = document.createElement("div");
    el.className = "tier" + (unlocked?"":" locked") + (tier.tier===Math.min(PASS_TIERS,t+1)?" current":"");
    const freeClaimed = save.pass.claimedFree.includes(tier.tier);
    const vipClaimed = save.pass.claimedVip.includes(tier.tier);
    el.innerHTML = `
      <div class="n">${tier.tier}</div>
      <div class="track free">
        <div>${tier.free.label}</div>
        ${unlocked && !freeClaimed ? `<button class="btn" data-claim="free" data-tier="${tier.tier}">Claim</button>`
          : `<div style="opacity:.6">${freeClaimed?"✓ Claimed":"🔒"}</div>`}
      </div>
      <div class="track vip">
        <div>${tier.vip.label}</div>
        ${save.pass.vip && unlocked && !vipClaimed ? `<button class="btn gold" data-claim="vip" data-tier="${tier.tier}">Claim</button>`
          : `<div style="opacity:.6">${vipClaimed?"✓ Claimed":(save.pass.vip?"🔒":"VIP")}</div>`}
      </div>`;
    track.appendChild(el);
  });
  track.querySelectorAll("[data-claim]").forEach(btn=>{
    btn.onclick = () => {
      const tierN = +btn.getAttribute("data-tier");
      const which = btn.getAttribute("data-claim");
      const rew = PASS_REWARDS.find(x=>x.tier===tierN);
      if(!rew) return;
      if(which==="free"){
        if(save.pass.claimedFree.includes(tierN)) return;
        save.pass.claimedFree.push(tierN);
        applyReward(rew.free);
      } else {
        if(!save.pass.vip || save.pass.claimedVip.includes(tierN)) return;
        save.pass.claimedVip.push(tierN);
        applyReward(rew.vip);
      }
      writeSave(); sfx("claim");
      btn.classList.add("claim-heat");
      toast("Claimed " + (which==="free"?rew.free.label:rew.vip.label));
      checkAchievements();
      renderPass(); refreshMenu();
    };
  });
}

function renderQuests(){
  ensureQuests();
  $("questDayNote").textContent = "Today · " + save.quests.day + " · resets at midnight";
  const list = $("questList");
  list.innerHTML = "";
  save.quests.list.forEach(q=>{
    const done = q.progress >= q.target;
    const el = document.createElement("div");
    el.className = "panel quest-card";
    el.innerHTML = `
      <h3>${q.label}</h3>
      <div class="qbar"><i style="width:${Math.min(100,(q.progress/q.target)*100)}%"></i></div>
      <div class="row">
        <span style="font-weight:800;font-size:.8rem">${q.progress}/${q.target}</span>
        ${q.claimed ? `<span style="font-weight:800;color:var(--mint)">Claimed</span>`
          : done ? `<button class="btn" style="width:auto;padding:8px 12px;font-size:.85rem" data-qid="${q.id}">Claim 🪙${q.rewardCoins}</button>`
          : `<span style="font-weight:800;opacity:.6">🪙${q.rewardCoins} · ⭐${q.rewardXp}</span>`}
      </div>`;
    list.appendChild(el);
  });
  list.querySelectorAll("[data-qid]").forEach(btn=>{
    btn.onclick = () => {
      const q = save.quests.list.find(x=>x.id===btn.getAttribute("data-qid"));
      if(!q || q.claimed || q.progress<q.target) return;
      q.claimed = true;
      grantCoins(q.rewardCoins, true);
      grantXP(q.rewardXp);
      grantPassXP(15);
      writeSave(); sfx("claim"); toast("Quest complete!");
      renderQuests(); refreshMenu();
    };
  });
}



/* Multi-open box bundles (discount packs in store grid) */
function buyBoxBundle(boxId, count, totalCost, currency) {
  const box = BOXES[boxId];
  if (!box) return;
  if (currency === "gems") {
    if (save.gems < totalCost) { toast("Need more gems"); return; }
    save.gems -= totalCost;
  } else {
    if (save.coins < totalCost) { toast("Need more coins"); return; }
    save.coins -= totalCost;
  }
  writeSave();
  const results = [];
  for (let i = 0; i < count; i++) {
    const rolled = rollBoxChar(box);
    results.push(grantCharOrDupe(rolled.id));
    if (box.bonusCoins) grantCoins(box.bonusCoins[0] + Math.floor(Math.random() * 6), true);
  }
  writeSave();
  sfx("claim");
  const last = results[results.length - 1];
  if (last && last.char) openBox(last);
  toast(`Opened ${count} ${box.name}s!`);
  bumpQuest("box", count);
  refreshMenu();
}

function paintSpinWheel() {
  const wheel = $("wheel");
  if (!wheel || wheel.dataset.painted) return;
  wheel.dataset.painted = "1";
  const seg = 360 / SPIN_PRIZES.length;
  const stops = SPIN_PRIZES.map((p, i) => {
    const hue = (i * 47) % 360;
    return `hsl(${hue} 75% 62%) ${i * seg}deg ${(i + 1) * seg}deg`;
  }).join(",");
  wheel.style.background = `conic-gradient(${stops})`;
}


function renderSpin(){
  paintSpinWheel();
  $("pityTxt").textContent = `${save.spin.pity}/${PITY_MAX}`;
  $("pityBar").style.width = (save.spin.pity/PITY_MAX)*100 + "%";
  const free = save.spin.lastFree !== dayKey();
  const btn = $("btnDoSpin");
  btn.disabled = false;
  btn.textContent = free ? "Free Spin" : `Spin · 🪙 ${SPIN_COST}`;
  $("spinNote").textContent = free ? "1 free spin available today" : `Next free spin tomorrow · or pay 🪙 ${SPIN_COST}`;
}

function doSpin(){
  const free = save.spin.lastFree !== dayKey();
  if(!free){
    if(save.coins < SPIN_COST){ toast("Need more coins"); return; }
    save.coins -= SPIN_COST;
  } else {
    save.spin.lastFree = dayKey();
  }
  save.stats.spins = (save.stats.spins||0)+1;
  let idx;
  const forceRare = save.spin.pity >= PITY_MAX;
  if(forceRare){
    const rares = SPIN_PRIZES.map((p,i)=>p.rare?i:-1).filter(i=>i>=0);
    idx = rares[Math.floor(Math.random()*rares.length)];
    save.spin.pity = 0;
  } else {
    idx = Math.floor(Math.random()*SPIN_PRIZES.length);
    if(SPIN_PRIZES[idx].rare) save.spin.pity = 0;
    else save.spin.pity = Math.min(PITY_MAX, save.spin.pity+1);
  }
  const prize = SPIN_PRIZES[idx];
  const wheel = $("spinWheel");
  const seg = 360/SPIN_PRIZES.length;
  const target = 360*5 + (360 - (idx*seg + seg/2));
  wheel.style.transition = "none";
  wheel.style.transform = "rotate(0deg)";
  void wheel.offsetWidth;
  wheel.style.transition = "transform 4s cubic-bezier(.15,.85,.2,1)";
  wheel.style.transform = `rotate(${target}deg)`;
  sfx("spin");
  $("btnDoSpin").disabled = true;
  writeSave();
  setTimeout(()=>{
    if(prize.type==="coins") grantCoins(prize.amount, true);
    else if(prize.type==="gems") grantGems(prize.amount);
    else if(prize.type==="xp"){ grantXP(prize.amount); grantPassXP(Math.floor(prize.amount/2)); }
    else if(prize.type==="booster"){
      const b = BOOSTERS[Math.floor(Math.random()*BOOSTERS.length)];
      save.boosters[b.id] = (save.boosters[b.id]||0)+1;
      toast("Won " + b.name + "!");
    }
    if(prize.type!=="booster") toast("Won " + prize.label + "!");
    sfx("claim");
    writeSave();
    checkAchievements();
    renderSpin(); refreshMenu();
    $("btnDoSpin").disabled = false;
  }, 4100);
}

function renderShop(){
  const sc = $("storeCoins");
  const sg = $("storeGems");
  if (sc) {
    const v = sc.querySelector(".val");
    if (v) v.textContent = String(save.coins);
    else sc.textContent = "🪙 " + save.coins;
  }
  if (sg) {
    const v = sg.querySelector(".val");
    if (v) v.textContent = String(save.gems);
    else sg.textContent = "💎 " + save.gems;
  }
  const grid = $("shopGrid");
  if (!grid) return;
  grid.querySelectorAll(".shop-box .buy").forEach(btn => {
    if (btn.dataset.shellBound) return;
    btn.dataset.shellBound = "1";
    btn.onclick = (e) => {
      e.stopPropagation();
      const article = btn.closest("[data-box]");
      const boxId = article && article.getAttribute("data-box");
      if (!boxId || !BOXES[boxId]) return;
      const box = BOXES[boxId];
      const cost = parseInt(btn.getAttribute("data-cost") || box.cost, 10);
      if (box.currency === "gems") {
        if (save.gems < cost) { toast("Need more gems"); return; }
        save.gems -= cost;
      } else {
        if (save.coins < cost) { toast("Need more coins"); return; }
        save.coins -= cost;
      }
      writeSave();
      sfx("coin");
      const rolled = rollBoxChar(box);
      const result = grantCharOrDupe(rolled.id);
      if (box.bonusCoins) grantCoins(box.bonusCoins[0] + Math.floor(Math.random() * (box.bonusCoins[1] - box.bonusCoins[0] + 1)), true);
      if (box.bonusGems) grantGems(box.bonusGems[0] + Math.floor(Math.random() * (box.bonusGems[1] - box.bonusGems[0] + 1)));
      writeSave();
      bumpQuest("box", 1);
      openBox(result);
      refreshMenu();
    };
  });
  const ok = $("boxRevealOk");
  if (ok && !ok.dataset.shellBound) {
    ok.dataset.shellBound = "1";
    ok.onclick = () => {
      const overlay = $("boxOpen");
      if (overlay) overlay.classList.remove("show");
      sfx("tap");
    };
  }
}

function openBox(result) {
  const overlay = $("boxOpen");
  const face = $("boxRevealEmoji");
  const name = $("boxRevealName");
  if (!overlay || !result || !result.char) return;
  const c = result.char;
  if (face) face.innerHTML = faceHTML(c.id);
  let msg = c.name;
  if (result.type === "new") msg += " — NEW!";
  else if (result.type === "levelup") msg += ` — Level ${result.level}!`;
  else if (result.type === "dupe") msg += ` — Duplicate (${result.dupes}/${result.need})`;
  else if (result.type === "max") msg += ` — MAX! +🪙${result.coins}`;
  if (name) name.textContent = msg;
  overlay.classList.add("show");
  sfx(result.type === "new" || result.type === "levelup" ? "unlock" : "claim");
  checkAchievements();
}

function renderEvents() {
  ensureSeason();
  const ends = save.pass.endsAt - Date.now();
  const timer = $("eventsTimer");
  if (timer) timer.textContent = "Ends in " + formatRemain(ends);
  const title = $("eventsFeaturedTitle");
  const desc = $("eventsFeaturedDesc");
  if (title) title.textContent = "Cloud Carnival";
  if (desc) desc.textContent = "Collect carnival tokens from blitz rounds to unlock exclusive emojis!";
  const list = $("eventsList");
  if (!list) return;
  list.querySelectorAll(".ev-btn").forEach(btn => {
    if (btn.dataset.shellBound) return;
    btn.dataset.shellBound = "1";
    if (!btn.disabled) {
      btn.onclick = () => {
        sfx("tap");
        renderSelectGrid();
        showScreen("select");
      };
    }
  });
}

function renderAchievements(){
  const list = $("achList");
  list.innerHTML = "";
  ACHIEVEMENTS.forEach(a=>{
    const st = save.achievements[a.id] || { unlocked:false, claimed:false };
    const el = document.createElement("div");
    el.className = "panel ach-item" + (st.unlocked?" done":"");
    el.innerHTML = `
      <div class="ico">${st.unlocked?a.ico:"🔒"}</div>
      <div style="flex:1"><h3>${a.name}</h3><p>${a.desc}</p></div>
      ${st.claimed ? `<span style="font-weight:800;color:var(--mint)">✓</span>`
        : st.unlocked ? `<button class="btn claim" data-aid="${a.id}">🪙 ${a.reward}</button>`
        : `<span style="font-weight:800;opacity:.5">🪙 ${a.reward}</span>`}`;
    list.appendChild(el);
  });
  list.querySelectorAll("[data-aid]").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.getAttribute("data-aid");
      const a = ACHIEVEMENTS.find(x=>x.id===id);
      const st = save.achievements[id];
      if(!a || !st?.unlocked || st.claimed) return;
      st.claimed = true;
      grantCoins(a.reward, true);
      writeSave(); sfx("claim"); toast("+" + a.reward + " coins");
      renderAchievements(); refreshMenu();
    };
  });
}

const ACHIEVEMENT_FLAVOR = {
  first_game: "Milestone flavor line 1 — keep chasing the blitz.",
  games_10: "Milestone flavor line 2 — keep chasing the blitz.",
  games_50: "Milestone flavor line 3 — keep chasing the blitz.",
  clears_500: "Milestone flavor line 4 — keep chasing the blitz.",
  clears_2k: "Milestone flavor line 5 — keep chasing the blitz.",
  blitz_5: "Milestone flavor line 6 — keep chasing the blitz.",
  blitz_25: "Milestone flavor line 7 — keep chasing the blitz.",
  score_2k: "Milestone flavor line 8 — keep chasing the blitz.",
  score_5k: "Milestone flavor line 9 — keep chasing the blitz.",
  combo_5: "Milestone flavor line 10 — keep chasing the blitz.",
  unlock_5: "Milestone flavor line 11 — keep chasing the blitz.",
  unlock_all: "Milestone flavor line 12 — keep chasing the blitz.",
  login_3: "Milestone flavor line 13 — keep chasing the blitz.",
  login_7: "Milestone flavor line 14 — keep chasing the blitz.",
  spins_10: "Milestone flavor line 15 — keep chasing the blitz.",
  pass_10: "Milestone flavor line 16 — keep chasing the blitz.",
  power_10: "Milestone flavor line 17 — keep chasing the blitz.",
};
const EVENT_CATALOG = [
  { name:"Cloud Carnival", desc:"Live now · Series box emojis boosted", ico:"🎪" },
  { name:"Blitz Weekend", desc:"2× blitz meter charge all weekend", ico:"⚡" },
  { name:"Rainbow Rush", desc:"More rainbow stars on the board", ico:"🌈" },
  { name:"Fox Fire Focus", desc:"Double XP for Fox Fire matches", ico:"🦊" },
  { name:"Mission Marathon", desc:"Complete 10 missions for a gold box", ico:"🏆" },
  { name:"Sky Fair", desc:"Spin wheel pity reduced to 6", ico:"🎡" },
  { name:"Rotating Mini 1", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 2", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 3", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 4", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 5", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 6", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 7", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 8", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 9", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 10", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 11", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 12", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 13", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 14", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 15", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 16", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 17", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 18", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 19", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 20", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 21", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 22", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 23", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 24", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 25", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 26", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 27", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 28", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 29", desc:"Bonus coins on round end", ico:"✨" },
  { name:"Rotating Mini 30", desc:"Bonus coins on round end", ico:"✨" },
];

/* ===================== 12. NAV / BOOT ===================== */
function bindToggles(){
  const wire = (id, key) => {
    const el = $(id);
    el.classList.toggle("on", !!save[key]);
    el.onclick = () => {
      save[key] = !save[key];
      el.classList.toggle("on", save[key]);
      writeSave(); sfx("tap");
      if(key === "music"){ if(save.music) startMusic(); else stopMusic(); }
    };
  };
  wire("togSfx","sfx"); wire("togMusic","music"); wire("togShake","shake");
}

document.querySelectorAll("[data-back]").forEach(btn=>{
  btn.onclick = () => {
    sfx("tap");
    const dest = btn.getAttribute("data-back");
    if(dest === "menu"){ refreshMenu(); showScreen("menu"); }
  };
});

$("btnPlay").onclick = () => { ensureAudio(); sfx("tap"); renderSelectGrid(); showScreen("select"); };
if($("charsPlay")) $("charsPlay").onclick = () => { ensureAudio(); sfx("tap"); renderSelectGrid(); showScreen("select"); };
if($("charsStore")) $("charsStore").onclick = () => { sfx("tap"); renderShop(); showScreen("store"); };
if($("hubCoinPlus")) $("hubCoinPlus").onclick = () => { sfx("tap"); renderShop(); showScreen("store"); };
if($("hubGemPlus")) $("hubGemPlus").onclick = () => { sfx("tap"); renderShop(); showScreen("store"); };
if($("hubLifePlus")) $("hubLifePlus").onclick = () => { sfx("tap"); buyLivesWithGems(); };
if($("cdInfo")) $("cdInfo").onclick = () => { const c=CHARACTERS.find(x=>x.id===detailId); if(c) toast(c.blurb); };
$("btnChars").onclick = () => { sfx("tap"); showScreen("chars"); renderCharGrid(); };
$("btnPass").onclick = () => { sfx("tap"); ensureSeason(); renderPass(); showScreen("pass"); };
$("btnQuests").onclick = () => { sfx("tap"); ensureQuests(); renderQuests(); showScreen("quests"); };
$("btnSpin").onclick = () => { sfx("tap"); renderSpin(); showScreen("spin"); };
$("btnShop").onclick = () => { sfx("tap"); renderShop(); showScreen("store"); };
$("btnAch").onclick = () => { sfx("tap"); checkAchievements(); renderAchievements(); showScreen("ach"); };
$("btnEvents").onclick = () => { sfx("tap"); renderEvents(); showScreen("events"); };
$("btnHow").onclick = () => { sfx("tap"); showScreen("howto"); };
$("btnSettings").onclick = () => { sfx("tap"); bindToggles(); showScreen("settings"); };

$("btnBuyVip").onclick = () => {
  if(save.pass.vip) return;
  if(save.coins < VIP_COST){ toast("Need 🪙 "+VIP_COST); return; }
  save.coins -= VIP_COST;
  save.pass.vip = true;
  writeSave(); sfx("unlock"); toast("VIP unlocked (soft currency satire)!");
  renderPass(); refreshMenu();
};
$("btnDoSpin").onclick = () => doSpin();

$("btnDailyGift").onclick = () => {
  ensureLogin(); loadDailyClaimed();
  if(!canClaimDaily()){ toast("Already claimed today"); return; }
  const amt = dailyGiftAmount();
  grantCoins(amt, true);
  if(save.login.streak>=3) grantGems(1);
  markDailyClaimed();
  writeSave(); sfx("claim"); toast(`Daily gift +🪙 ${amt}!`);
  checkAchievements();
  refreshMenu();
};
$("btnHourlyCrate").onclick = () => {
  const left = (save.hourlyCrateAt||0) + HOUR_MS - Date.now();
  if(left>0){ toast(`Crate in ${Math.ceil(left/60000)}m`); return; }
  save.hourlyCrateAt = Date.now();
  const coins = 20 + Math.floor(Math.random()*25);
  const gems = Math.random()<0.35 ? 1 : 0;
  grantCoins(coins, true);
  if(gems) grantGems(gems);
  if(Math.random()<0.4){
    const b = BOOSTERS[Math.floor(Math.random()*BOOSTERS.length)];
    save.boosters[b.id]=(save.boosters[b.id]||0)+1;
    toast(`Crate: 🪙${coins}` + (gems?` 💎${gems}`:"") + ` + ${b.name}`);
  } else toast(`Crate: 🪙${coins}` + (gems?` 💎${gems}`:""));
  writeSave(); sfx("claim");
  refreshMenu();
};

$("btnResetSave").onclick = () => {
  if(!confirm("Reset all progress?")) return;
  save = defaultSave();
  writeSave(); refreshMenu(); bindToggles(); sfx("reject"); toast("Progress reset");
};
$("btnPause").onclick = () => {
  if(state!=="Playing" && state!=="Blitz" && state!=="Resolving") return;
  paused = true; $("pauseModal").classList.add("show"); sfx("tap");
};
$("btnResume").onclick = () => {
  paused = false; $("pauseModal").classList.remove("show"); lastTs = performance.now(); sfx("tap");
};
$("btnQuit").onclick = () => {
  paused = false; state = "idle"; resolving = false; pendingFinish=false;
  document.body.classList.remove("blitz");
  $("pauseModal").classList.remove("show");
  $("reviveModal").classList.remove("show");
  stopMusic(); refreshMenu(); showScreen("menu"); sfx("tap");
};
$("btnRevive").onclick = () => {
  if(save.coins < REVIVE_COST){ toast("Need more coins"); return; }
  save.coins -= REVIVE_COST;
  writeSave();
  revived = true; pendingFinish = false; paused = false;
  timeLeft = 15; timePaused = false;
  $("reviveModal").classList.remove("show");
  state = "Playing";
  lastTs = performance.now();
  sfx("power"); toast("+15 seconds!");
  requestAnimationFrame(tick);
};
$("btnSkipRevive").onclick = () => {
  $("reviveModal").classList.remove("show");
  pendingFinish = false;
  finishRound();
};
$("btnReplay").onclick = () => { ensureAudio(); prepBoosterForEngine(); startMusic(); sfx("tap"); beginRound(CHARACTERS.find(c=>c.id===save.selected)||CHARACTERS[0]); };
if($("btnResultChars")) $("btnResultChars").onclick = () => { sfx("tap"); stopMusic(); showScreen("chars"); renderCharGrid(); };
$("btnResultMenu").onclick = () => { sfx("tap"); stopMusic(); refreshMenu(); showScreen("menu"); };

/* wheel labels */
(function paintWheelLabels(){
  const wheel = $("spinWheel");
  SPIN_PRIZES.forEach((p,i)=>{
    const span = document.createElement("span");
    // labels baked into conic — skip absolute for simplicity; prizes announced on land
  });
})();

// Boot note 0: Emoji Rush shell ready — soft currency only.
// Boot note 1: Emoji Rush shell ready — soft currency only.
// Boot note 2: Emoji Rush shell ready — soft currency only.
// Boot note 3: Emoji Rush shell ready — soft currency only.
// Boot note 4: Emoji Rush shell ready — soft currency only.
// Boot note 5: Emoji Rush shell ready — soft currency only.
// Boot note 6: Emoji Rush shell ready — soft currency only.
// Boot note 7: Emoji Rush shell ready — soft currency only.
// Boot note 8: Emoji Rush shell ready — soft currency only.
// Boot note 9: Emoji Rush shell ready — soft currency only.
// Boot note 10: Emoji Rush shell ready — soft currency only.
// Boot note 11: Emoji Rush shell ready — soft currency only.
// Boot note 12: Emoji Rush shell ready — soft currency only.
// Boot note 13: Emoji Rush shell ready — soft currency only.
// Boot note 14: Emoji Rush shell ready — soft currency only.
// Boot note 15: Emoji Rush shell ready — soft currency only.
// Boot note 16: Emoji Rush shell ready — soft currency only.
// Boot note 17: Emoji Rush shell ready — soft currency only.
// Boot note 18: Emoji Rush shell ready — soft currency only.
// Boot note 19: Emoji Rush shell ready — soft currency only.

/* Splash → menu */
ensureSeason(); ensureQuests(); ensureLogin(); loadDailyClaimed();
refreshMenu();
bindToggles();
checkAchievements();
setTimeout(() => {
  showScreen("menu");
  if(save.games === 0) toast("Welcome! Fox Fire is ready.");
  else if(canClaimDaily()) toast("Daily gift ready!");
}, 1200);

["pointerdown","keydown"].forEach(ev => {
  window.addEventListener(ev, () => { ensureAudio(); }, { once:true, capture:true });
});

/* ===================== 13. DEBUG API ===================== */
window.RUSH = Object.assign(window.RUSH || {}, {
  save: () => save,
  grantCoins: (n) => { grantCoins(n|0); },
  grantXP: (n) => { grantXP(n|0); refreshMenu(); },
  openScreen: (name) => openScreen(name),
  grantGems: (n) => { grantGems(n|0); },
  grantPassXP: (n) => { grantPassXP(n|0); refreshMenu(); },
  BOXES,
  CHARACTERS,
  grantCharOrDupe,
  openBox,
});