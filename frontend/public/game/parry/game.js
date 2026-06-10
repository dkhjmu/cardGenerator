/* ===========================================================
   패리 챔피언 — retro arcade auto-parry survival
   =========================================================== */
(() => {
"use strict";

// ---------- virtual resolution ----------
const VW = 960, VH = 540;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let scale = 1, offX = 0, offY = 0, dpr = 1;

function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = Math.floor(cw * dpr);
  canvas.height = Math.floor(ch * dpr);
  scale = Math.min(cw / VW, ch / VH);
  offX = (cw - VW * scale) / 2;
  offY = (ch - VH * scale) / 2;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener("resize", resize);
resize();

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist2 = (ax, ay, bx, by) => { const dx = ax-bx, dy = ay-by; return dx*dx+dy*dy; };
const TAU = Math.PI * 2;
const pick = arr => arr[randi(0, arr.length-1)];

// ---------- audio (tiny synth) ----------
let actx = null, muted = false;
function audioInit(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }
function beep(freq, dur, type="square", vol=0.12, slideTo=null){
  if(!actx || muted) return;
  const t = actx.currentTime;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40,slideTo), t+dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t+dur);
}
const SFX = {
  parry:  () => { beep(880, .09, "square", .14, 1760); beep(1320, .12, "triangle", .08); },
  hitEnemy:()=> { beep(220, .07, "square", .09, 120); },
  kill:   () => { beep(160, .18, "sawtooth", .12, 50); },
  hurt:   () => { beep(110, .22, "sawtooth", .16, 40); },
  level:  () => { beep(523,.1,"square",.12); setTimeout(()=>beep(659,.1,"square",.12),90); setTimeout(()=>beep(880,.16,"square",.13),180); },
  boss:   () => { beep(70,.5,"sawtooth",.18,40); },
  wave:   () => { beep(330,.1,"square",.1); setTimeout(()=>beep(495,.12,"square",.1),100); },
  shoot:  () => { beep(420,.04,"square",.04,300); },
  over:   () => { beep(330,.2,"sawtooth",.14,60); setTimeout(()=>beep(160,.5,"sawtooth",.14,40),180); },
};

// ---------- input ----------
const keys = {};
window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  if(k === " " && !e.repeat) onParryPressed();
  if(k === "m" && !e.repeat){ muted = !muted; }
  if(k === "p" && !e.repeat && game.state === "playing") game.paused = !game.paused;
  if((k === "enter" || k === " ")){
    if(game.state === "start") startGame();
    else if(game.state === "over") startGame();
  }
  if(game.state === "levelup" && ["1","2","3"].includes(k)) chooseSkill(parseInt(k,10)-1);
  keys[k] = true;
});
window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener("pointerdown", () => {
  audioInit();
  if(game.state === "start" || game.state === "over") startGame();
});
document.getElementById("ov-start").addEventListener("pointerdown", () => { audioInit(); startGame(); });
document.getElementById("ov-over").addEventListener("pointerdown", () => { audioInit(); startGame(); });

// ---------- game state ----------
const game = {
  state: "start",        // start | playing | levelup | over
  paused: false,
  time: 0,
  wave: 0,
  betweenWaves: 0,       // countdown timer between waves
  spawnQueue: [],        // enemy types to spawn this wave
  spawnTimer: 0,
  shake: 0,
  hitstop: 0,
  score: 0,
  maxCombo: 0,
  hi: parseInt(localStorage.getItem("parry_hi") || "0", 10),
  levelQueue: 0,
  flash: 0,
};

let player, enemies, bullets, particles, popups, trails;

function reset(){
  player = {
    x: VW/2, y: VH/2, r: 13,
    speed: 3.1, hp: 100, maxHp: 100,
    level: 1, xp: 0, xpNext: 14,
    parryR: 78, parryDur: 0.30, parryCd: 0.55,
    parryActive: 0, parryCool: 0, autoTimer: 3.0, autoInterval: 3.0,
    attack: 1, pierce: 0,
    combo: 0, comboTimer: 0,
    iframe: 0, face: 0,
  };
  enemies = []; bullets = []; particles = []; popups = []; trails = [];
  game.time = 0; game.wave = 0; game.betweenWaves = 1.4;
  game.spawnQueue = []; game.spawnTimer = 0; game.shake = 0; game.hitstop = 0;
  game.score = 0; game.maxCombo = 0; game.levelQueue = 0; game.flash = 0;
  game.paused = false;
}

function startGame(){
  audioInit();
  reset();
  hide("ov-start"); hide("ov-level"); hide("ov-over");
  game.state = "playing";
}

// ---------- waves ----------
const ENEMY = {
  grunt: { hp:30, speed:.72, r:15, contact:8,  shoot:2.2, bspeed:2.3, color:"#ff2e88", xp:7,  score:100, keep:230, shape:"square" },
  fast:  { hp:18, speed:1.95,r:11, contact:11, shoot:1.5, bspeed:3.4, color:"#ff5a3c", xp:9,  score:150, keep:0,   shape:"tri" },
  tank:  { hp:95, speed:.46, r:25, contact:16, shoot:2.9, bspeed:1.9, color:"#a06bff", xp:18, score:300, keep:170, shape:"big", spread:3 },
};

function buildWave(n){
  const q = [];
  const gr = 3 + Math.floor(n * 1.7);
  const fa = Math.max(0, Math.floor((n-1) * 1.1));
  const ta = Math.floor(n / 2);
  for(let i=0;i<gr;i++) q.push("grunt");
  for(let i=0;i<fa;i++) q.push("fast");
  for(let i=0;i<ta;i++) q.push("tank");
  // shuffle
  for(let i=q.length-1;i>0;i--){ const j=randi(0,i); [q[i],q[j]]=[q[j],q[i]]; }
  return q;
}

function startWave(){
  game.wave++;
  SFX.wave();
  popup(VW/2, VH/2 - 70, "WAVE " + game.wave, "#22e7ff", 26, 1.6);
  if(game.wave % 5 === 0){
    SFX.boss();
    spawnBoss();
    popup(VW/2, VH/2 - 30, "!! BOSS !!", "#ff2e88", 22, 1.8);
    game.spawnQueue = [];
  } else {
    game.spawnQueue = buildWave(game.wave);
  }
  game.spawnTimer = 0.4;
}

function spawnEdgePos(){
  const m = 40;
  const side = randi(0,3);
  if(side===0) return { x: rand(-m,VW+m), y: -m };
  if(side===1) return { x: VW+m, y: rand(-m,VH+m) };
  if(side===2) return { x: rand(-m,VW+m), y: VH+m };
  return { x: -m, y: rand(-m,VH+m) };
}

function spawnEnemy(type){
  const cfg = ENEMY[type];
  const p = spawnEdgePos();
  const hpMul = 1 + (game.wave-1) * 0.10;
  enemies.push({
    type, x:p.x, y:p.y, r:cfg.r,
    hp: cfg.hp*hpMul, maxHp: cfg.hp*hpMul,
    speed: cfg.speed, contact: cfg.contact, color: cfg.color, shape: cfg.shape,
    shootT: rand(0.6, cfg.shoot), shootI: cfg.shoot, bspeed: cfg.bspeed,
    keep: cfg.keep, spread: cfg.spread||1,
    xp: cfg.xp, score: cfg.score, hitFlash: 0, spawnAnim: 0.5, wob: rand(0,TAU),
    boss:false,
  });
}

function spawnBoss(){
  const p = spawnEdgePos();
  const hpMul = 1 + (game.wave-1) * 0.12;
  enemies.push({
    type:"boss", x:p.x, y:p.y, r:48,
    hp: 900*hpMul, maxHp:900*hpMul,
    speed:0.34, contact:24, color:"#ff2e88", shape:"boss",
    shootT:1.5, shootI:1.5, bspeed:2.2, keep:200, spread:1,
    xp:120, score:3000, hitFlash:0, spawnAnim:0.8, wob:0,
    boss:true, phase:0, phaseT:0, pattern:0,
  });
}

// ---------- parry ----------
function onParryPressed(){
  if(game.state !== "playing" || game.paused) return;
  if(player.parryCool > 0) return;
  triggerParry(false);
}
function triggerParry(auto){
  player.parryActive = player.parryDur;
  player.parryCool = player.parryCd;
  player.autoTimer = player.autoInterval;
  game.shake = Math.max(game.shake, 5);
  SFX.parry();
  // ring particles
  for(let i=0;i<22;i++){
    const a = (i/22)*TAU;
    particles.push({ x:player.x, y:player.y, vx:Math.cos(a)*4.5, vy:Math.sin(a)*4.5,
      life:.4, max:.4, r:3, color: auto?"#5cff7a":"#22e7ff", glow:true });
  }
  popup(player.x, player.y - 26, auto ? "AUTO PARRY" : "PARRY!", auto?"#5cff7a":"#22e7ff", 13, .8);
  // shockwave: knockback + small dmg to enemies in range
  for(const e of enemies){
    const d2 = dist2(e.x,e.y,player.x,player.y);
    const rr = (player.parryR + e.r);
    if(d2 < rr*rr){
      const ang = Math.atan2(e.y-player.y, e.x-player.x);
      const kb = e.boss ? 6 : 20;
      e.x += Math.cos(ang)*kb; e.y += Math.sin(ang)*kb;
      damageEnemy(e, 6*player.attack, false);
    }
  }
}

// reflect enemy bullets within parry radius while active
function processParry(){
  if(player.parryActive <= 0) return;
  for(const b of bullets){
    if(b.friendly) continue;
    const rr = player.parryR + b.r;
    if(dist2(b.x,b.y,player.x,player.y) < rr*rr){
      b.friendly = true;
      const tgt = nearestEnemy(b.x, b.y);
      let ang;
      if(tgt) ang = Math.atan2(tgt.y-b.y, tgt.x-b.x);
      else ang = Math.atan2(player.y-b.y, player.x-b.x) + Math.PI;
      const sp = 9.5;
      b.vx = Math.cos(ang)*sp; b.vy = Math.sin(ang)*sp;
      b.damage = 24 * player.attack;
      b.pierce = player.pierce; b.r = 6;
      b.color = "#22e7ff"; b.trail = true;
      addPop(b.x,b.y,"#22e7ff");
      game.flash = Math.max(game.flash, .25);
    }
  }
}
function nearestEnemy(x,y){
  let best=null, bd=Infinity;
  for(const e of enemies){
    const d = dist2(x,y,e.x,e.y);
    if(d<bd){ bd=d; best=e; }
  }
  return best;
}

// ---------- combat ----------
function damageEnemy(e, dmg, fromParry){
  e.hp -= dmg;
  e.hitFlash = 0.12;
  SFX.hitEnemy();
  for(let i=0;i<5;i++){
    const a = rand(0,TAU), s = rand(1,4);
    particles.push({ x:e.x, y:e.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.3, max:.3, r:2, color:e.color });
  }
  if(e.hp <= 0) killEnemy(e);
}
function killEnemy(e){
  e.dead = true;
  SFX.kill();
  game.hitstop = Math.max(game.hitstop, e.boss?0.14:0.05);
  game.shake = Math.max(game.shake, e.boss?14:6);
  // combo + score
  player.combo++; player.comboTimer = 3.0;
  game.maxCombo = Math.max(game.maxCombo, player.combo);
  const mult = 1 + player.combo*0.1;
  const gained = Math.round(e.score * mult);
  game.score += gained;
  popup(e.x, e.y, "+"+gained, "#ffd23f", e.boss?20:12, e.boss?1.4:.9);
  // xp
  gainXp(e.xp);
  // explosion particles
  const n = e.boss ? 60 : 18;
  for(let i=0;i<n;i++){
    const a = rand(0,TAU), s = rand(2, e.boss?9:6);
    particles.push({ x:e.x, y:e.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
      life:rand(.4,.9), max:.9, r:rand(2,e.boss?6:4), color: pick([e.color,"#ffd23f","#fff"]), drag:.92, glow:true });
  }
  if(e.boss){
    game.flash = .6;
    popup(e.x, e.y-40, "BOSS DOWN", "#ff2e88", 22, 2.0);
  }
}

function gainXp(amt){
  player.xp += amt;
  while(player.xp >= player.xpNext){
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.round(player.xpNext * 1.35 + 6);
    game.levelQueue++;
  }
  if(game.levelQueue > 0 && game.state === "playing") openLevelUp();
}

function hurtPlayer(dmg){
  if(player.iframe > 0) return;
  player.hp -= dmg;
  player.iframe = 0.7;
  player.combo = 0; player.comboTimer = 0;
  game.shake = Math.max(game.shake, 10);
  game.flash = Math.max(game.flash, .35);
  SFX.hurt();
  for(let i=0;i<14;i++){
    const a = rand(0,TAU), s = rand(2,6);
    particles.push({ x:player.x, y:player.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.5, max:.5, r:3, color:"#ff5a3c", glow:true });
  }
  if(player.hp <= 0){ player.hp = 0; gameOver(); }
}

function addPop(x,y,color){
  for(let i=0;i<7;i++){
    const a = rand(0,TAU), s = rand(2,5);
    particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.35, max:.35, r:2, color, glow:true });
  }
}
function popup(x,y,text,color,size,life){
  popups.push({ x, y, text, color, size: size||12, life: life||.9, max: life||.9, vy:-0.5 });
}

// ---------- enemy bullet emit ----------
function enemyShoot(e){
  const ang = Math.atan2(player.y-e.y, player.x-e.x);
  const sp = e.bspeed;
  const fire = (a) => {
    bullets.push({ x:e.x, y:e.y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:6,
      friendly:false, damage:e.contact, color:"#ffd23f", life:6, trail:false });
  };
  if(e.boss){
    bossPattern(e);
  } else if(e.spread && e.spread>1){
    const spread = 0.5;
    for(let i=0;i<e.spread;i++){
      const a = ang - spread/2 + (spread/(e.spread-1))*i;
      fire(a);
    }
    SFX.shoot();
  } else {
    fire(ang);
    SFX.shoot();
  }
}

function bossPattern(e){
  const ang = Math.atan2(player.y-e.y, player.x-e.x);
  const sp = e.bspeed;
  const mk = (a, s) => bullets.push({ x:e.x, y:e.y, vx:Math.cos(a)*(s||sp), vy:Math.sin(a)*(s||sp),
    r:7, friendly:false, damage:e.contact, color:"#ff2e88", life:8, trail:false });
  e.pattern = (e.pattern+1) % 3;
  if(e.pattern === 0){            // radial burst
    const n = 16;
    for(let i=0;i<n;i++) mk((i/n)*TAU, 2.0);
  } else if(e.pattern === 1){     // aimed triple spread
    for(let i=-2;i<=2;i++) mk(ang + i*0.22, 2.6);
  } else {                         // spiral
    e._spiral = (e._spiral||0) + 0.6;
    for(let i=0;i<4;i++) mk(e._spiral + i*(TAU/4), 2.2);
  }
  SFX.shoot();
}

// ---------- level up ----------
const SKILLS = [
  { ic:"◎", nm:"패리 범위 +25%", ds:"패리가 닿는 반경이\n넓어진다", apply:p=>{ p.parryR *= 1.25; } },
  { ic:"♥", nm:"최대 체력 +30", ds:"최대 HP가 늘고\n그만큼 회복한다", apply:p=>{ p.maxHp+=30; p.hp=Math.min(p.maxHp,p.hp+30); } },
  { ic:"⚔", nm:"공격력 +35%", ds:"튕긴 탄막의\n피해가 증가한다", apply:p=>{ p.attack *= 1.35; } },
  { ic:"»", nm:"이동속도 +18%", ds:"더 빠르게\n필드를 누빈다", apply:p=>{ p.speed *= 1.18; } },
  { ic:"⏱", nm:"자동 패리 -0.5s", ds:"자동 패리 주기가\n짧아진다", apply:p=>{ p.autoInterval = Math.max(1.0, p.autoInterval-0.5); } },
  { ic:"▤", nm:"패리 지속 +30%", ds:"패리 판정 시간이\n길어진다", apply:p=>{ p.parryDur *= 1.3; } },
  { ic:"➹", nm:"탄막 관통 +1", ds:"튕긴 탄막이 적을\n하나 더 꿰뚫는다", apply:p=>{ p.pierce += 1; } },
  { ic:"✚", nm:"긴급 회복 +40", ds:"즉시 HP를\n40 회복한다", apply:p=>{ p.hp=Math.min(p.maxHp,p.hp+40); } },
];
let curChoices = [];
function openLevelUp(){
  game.state = "levelup";
  SFX.level();
  const pool = SKILLS.slice();
  for(let i=pool.length-1;i>0;i--){ const j=randi(0,i); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  curChoices = pool.slice(0,3);
  const wrap = document.getElementById("cards");
  wrap.innerHTML = "";
  curChoices.forEach((s,i)=>{
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<div class="num">${i+1}</div><div class="ic">${s.ic}</div>`+
      `<div class="nm">${s.nm}</div><div class="ds">${s.ds.replace(/\n/g,"<br/>")}</div>`;
    c.addEventListener("pointerdown", ()=>chooseSkill(i));
    wrap.appendChild(c);
  });
  show("ov-level");
}
function chooseSkill(i){
  if(game.state !== "levelup" || !curChoices[i]) return;
  curChoices[i].apply(player);
  game.levelQueue--;
  hide("ov-level");
  popup(player.x, player.y-30, curChoices[i].nm, "#5cff7a", 12, 1.2);
  if(game.levelQueue > 0){ openLevelUp(); }
  else { game.state = "playing"; }
}

// ---------- game over ----------
function gameOver(){
  game.state = "over";
  SFX.over();
  if(game.score > game.hi){ game.hi = game.score; localStorage.setItem("parry_hi", String(game.hi)); }
  document.getElementById("go-score").textContent = game.score.toLocaleString();
  document.getElementById("go-wave").textContent = game.wave;
  document.getElementById("go-level").textContent = player.level;
  document.getElementById("go-combo").textContent = game.maxCombo;
  document.getElementById("go-hi").textContent = game.hi.toLocaleString();
  // big explosion
  for(let i=0;i<70;i++){
    const a=rand(0,TAU), s=rand(2,9);
    particles.push({ x:player.x,y:player.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:rand(.5,1.1), max:1.1, r:rand(2,5), color:pick(["#ff5a3c","#ffd23f","#fff"]), drag:.93, glow:true });
  }
  show("ov-over");
}

function show(id){ document.getElementById(id).classList.remove("hidden"); }
function hide(id){ document.getElementById(id).classList.add("hidden"); }

// ---------- update ----------
function update(dt){
  game.time += dt;
  if(game.flash > 0) game.flash = Math.max(0, game.flash - dt*2.5);
  if(game.shake > 0) game.shake = Math.max(0, game.shake - dt*40);

  // popups & particles always animate
  updateParticles(dt); updatePopups(dt);

  if(game.state !== "playing" || game.paused) return;

  // hitstop
  if(game.hitstop > 0){ game.hitstop -= dt; return; }

  // ---- player movement ----
  let mx = 0, my = 0;
  if(keys["arrowleft"]||keys["a"]) mx -= 1;
  if(keys["arrowright"]||keys["d"]) mx += 1;
  if(keys["arrowup"]||keys["w"]) my -= 1;
  if(keys["arrowdown"]||keys["s"]) my += 1;
  if(mx||my){
    const l = Math.hypot(mx,my); mx/=l; my/=l;
    player.x = clamp(player.x + mx*player.speed, player.r, VW-player.r);
    player.y = clamp(player.y + my*player.speed, player.r, VH-player.r);
    player.face = Math.atan2(my,mx);
    // movement trail
    if(Math.random()<0.5) trails.push({ x:player.x, y:player.y, life:.25, max:.25, r:player.r });
  }

  // ---- parry timers ----
  if(player.parryActive > 0) player.parryActive -= dt;
  if(player.parryCool > 0) player.parryCool -= dt;
  player.autoTimer -= dt;
  if(player.autoTimer <= 0 && player.parryCool <= 0){ triggerParry(true); }
  processParry();

  if(player.iframe > 0) player.iframe -= dt;
  if(player.comboTimer > 0){ player.comboTimer -= dt; if(player.comboTimer<=0) player.combo=0; }

  // ---- waves / spawning ----
  if(game.betweenWaves > 0){
    game.betweenWaves -= dt;
    if(game.betweenWaves <= 0) startWave();
  } else {
    if(game.spawnQueue.length > 0){
      game.spawnTimer -= dt;
      if(game.spawnTimer <= 0){
        spawnEnemy(game.spawnQueue.shift());
        game.spawnTimer = rand(0.35, 0.8);
      }
    } else if(enemies.length === 0){
      game.betweenWaves = 2.0;
      popup(VW/2, 90, "WAVE CLEAR", "#5cff7a", 16, 1.6);
    }
  }

  // ---- enemies ----
  for(const e of enemies){
    if(e.spawnAnim > 0) e.spawnAnim -= dt;
    if(e.hitFlash > 0) e.hitFlash -= dt;
    e.wob += dt*4;
    const ang = Math.atan2(player.y-e.y, player.x-e.x);
    const d = Math.hypot(player.x-e.x, player.y-e.y);
    let move = e.speed;
    if(e.keep > 0){
      if(d > e.keep + 30) { /* approach */ }
      else if(d < e.keep - 30){ move = -e.speed*0.7; } // back off
      else { // strafe
        const sa = ang + Math.PI/2;
        e.x += Math.cos(sa)*e.speed*0.8;
        e.y += Math.sin(sa)*e.speed*0.8;
        move = 0;
      }
    }
    e.x += Math.cos(ang)*move;
    e.y += Math.sin(ang)*move;
    e.x = clamp(e.x, -60, VW+60); e.y = clamp(e.y, -60, VH+60);

    // shooting (only when on-screen-ish)
    e.shootT -= dt;
    if(e.shootT <= 0 && e.spawnAnim <= 0){
      enemyShoot(e);
      e.shootT = e.boss ? rand(0.5,0.9) : rand(e.shootI*0.7, e.shootI*1.2);
    }

    // contact damage
    if(d < e.r + player.r - 2) hurtPlayer(e.contact);
  }
  enemies = enemies.filter(e => !e.dead);

  // ---- bullets ----
  for(const b of bullets){
    b.x += b.vx; b.y += b.vy; b.life -= dt;
    if(b.trail && Math.random()<0.8){
      particles.push({ x:b.x, y:b.y, vx:0, vy:0, life:.2, max:.2, r:b.r*0.7, color:b.color, glow:true });
    }
    if(b.friendly){
      for(const e of enemies){
        if(dist2(b.x,b.y,e.x,e.y) < (e.r+b.r)*(e.r+b.r)){
          damageEnemy(e, b.damage, true);
          if(b.pierce > 0){ b.pierce--; } else { b.dead = true; }
          break;
        }
      }
    } else {
      if(dist2(b.x,b.y,player.x,player.y) < (player.r+b.r)*(player.r+b.r)){
        hurtPlayer(b.damage); b.dead = true;
      }
    }
    if(b.x<-30||b.x>VW+30||b.y<-30||b.y>VH+30||b.life<=0) b.dead = true;
  }
  bullets = bullets.filter(b => !b.dead);
}

function updateParticles(dt){
  for(const p of particles){
    p.x += p.vx; p.y += p.vy; p.life -= dt;
    if(p.drag){ p.vx*=p.drag; p.vy*=p.drag; }
  }
  particles = particles.filter(p => p.life > 0);
  if(particles.length > 600) particles.splice(0, particles.length-600);
  for(const t of trails){ t.life -= dt; }
  trails = trails.filter(t => t.life > 0);
}
function updatePopups(dt){
  for(const p of popups){ p.y += p.vy; p.life -= dt; }
  popups = popups.filter(p => p.life > 0);
}

// ---------- draw ----------
function draw(){
  // letterbox bg
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,canvas.width/dpr, canvas.height/dpr);

  // shake
  let sx = 0, sy = 0;
  if(game.shake > 0){ sx = rand(-game.shake,game.shake); sy = rand(-game.shake,game.shake); }

  ctx.setTransform(scale*dpr,0,0,scale*dpr, (offX+sx)*dpr, (offY+sy)*dpr);
  // clip to play area
  ctx.beginPath(); ctx.rect(0,0,VW,VH); ctx.save(); ctx.clip();

  drawArena();
  drawTrails();
  if(game.state !== "start"){
    drawParticles(false);
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawParticles(true);
    drawPopups();
  }
  drawFlash();

  ctx.restore();
  if(game.state === "playing" || game.state === "levelup" || game.state === "over") drawHUD();
  if(game.paused && game.state==="playing") drawPause();
}

function drawArena(){
  // dark gradient field
  const g = ctx.createRadialGradient(VW/2,VH/2,80, VW/2,VH/2, VW*0.7);
  g.addColorStop(0,"#120e22"); g.addColorStop(1,"#07060f");
  ctx.fillStyle = g; ctx.fillRect(0,0,VW,VH);
  // grid
  ctx.strokeStyle = "rgba(80,70,140,.12)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for(let x=0;x<=VW;x+=48){ ctx.moveTo(x,0); ctx.lineTo(x,VH); }
  for(let y=0;y<=VH;y+=48){ ctx.moveTo(0,y); ctx.lineTo(VW,y); }
  ctx.stroke();
  // border
  ctx.strokeStyle = "rgba(34,231,255,.25)"; ctx.lineWidth = 2;
  ctx.strokeRect(1,1,VW-2,VH-2);
}

function drawTrails(){
  for(const t of trails){
    const a = t.life/t.max;
    ctx.globalAlpha = a*0.4;
    ctx.fillStyle = "#22e7ff";
    ctx.beginPath(); ctx.arc(t.x,t.y,t.r*a,0,TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(glowPass){
  for(const p of particles){
    if(!!p.glow !== glowPass) continue;
    const a = clamp(p.life/p.max,0,1);
    ctx.globalAlpha = a;
    if(p.glow) ctx.shadowBlur = 8, ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    const s = p.r;
    ctx.fillRect(p.x-s, p.y-s, s*2, s*2);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawBullets(){
  for(const b of bullets){
    ctx.shadowBlur = 10; ctx.shadowColor = b.color;
    ctx.fillStyle = b.color;
    if(b.friendly){
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.45,0,TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.4,0,TAU); ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

function drawEnemies(){
  for(const e of enemies){
    ctx.save();
    ctx.translate(e.x, e.y);
    const scl = e.spawnAnim > 0 ? clamp(1 - e.spawnAnim, 0.1, 1) : 1;
    ctx.scale(scl, scl);
    const col = e.hitFlash > 0 ? "#ffffff" : e.color;
    ctx.shadowBlur = e.boss?22:12; ctx.shadowColor = e.color;
    ctx.fillStyle = col;
    if(e.shape === "tri"){
      const a = Math.atan2(player.y-e.y, player.x-e.x);
      ctx.rotate(a + Math.PI/2);
      ctx.beginPath(); ctx.moveTo(0,-e.r); ctx.lineTo(e.r,e.r); ctx.lineTo(-e.r,e.r); ctx.closePath(); ctx.fill();
    } else if(e.shape === "boss"){
      ctx.rotate(Math.sin(e.wob*0.3)*0.1);
      // body
      ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2);
      ctx.fillStyle = "#1a0a18";
      ctx.fillRect(-e.r*0.7,-e.r*0.7,e.r*1.4,e.r*1.4);
      // eye
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0,0,e.r*0.4,0,TAU); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(0,0,e.r*0.18,0,TAU); ctx.fill();
    } else if(e.shape === "big"){
      ctx.rotate(e.wob*0.2);
      ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2);
      ctx.fillStyle="#1a0a2a"; ctx.fillRect(-e.r*0.5,-e.r*0.5,e.r,e.r);
    } else {
      ctx.rotate(Math.sin(e.wob)*0.15);
      ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2);
      ctx.fillStyle="#2a0a1a"; ctx.fillRect(-e.r*0.45,-e.r*0.45,e.r*0.9,e.r*0.9);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
    // boss hp bar
    if(e.boss){
      const w = 120, h=7, hx=e.x-w/2, hy=e.y-e.r-18;
      ctx.fillStyle="#300"; ctx.fillRect(hx,hy,w,h);
      ctx.fillStyle="#ff2e88"; ctx.fillRect(hx,hy, w*clamp(e.hp/e.maxHp,0,1), h);
      ctx.strokeStyle="#000"; ctx.lineWidth=1; ctx.strokeRect(hx,hy,w,h);
    }
  }
}

function drawPlayer(){
  const p = player;
  // parry aura
  const auraOn = p.parryActive > 0;
  ctx.save();
  ctx.translate(p.x,p.y);
  // auto-parry gauge ring (faint)
  const frac = 1 - clamp(p.autoTimer / p.autoInterval, 0, 1);
  ctx.strokeStyle = "rgba(92,255,122,.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,0,p.parryR, -Math.PI/2, -Math.PI/2 + frac*TAU); ctx.stroke();
  // parry radius ring
  ctx.strokeStyle = auraOn ? "rgba(34,231,255,.9)" : "rgba(34,231,255,.18)";
  ctx.lineWidth = auraOn ? 4 : 1.5;
  if(auraOn){ ctx.shadowBlur=18; ctx.shadowColor="#22e7ff"; }
  ctx.beginPath(); ctx.arc(0,0,p.parryR,0,TAU); ctx.stroke();
  ctx.shadowBlur=0;
  if(auraOn){
    const e = 1 - (p.parryActive/p.parryDur);
    ctx.globalAlpha = (1-e)*0.5;
    ctx.fillStyle = "rgba(34,231,255,.4)";
    ctx.beginPath(); ctx.arc(0,0,p.parryR*(0.4+e*0.8),0,TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // body (diamond)
  const blink = p.iframe>0 && Math.floor(p.iframe*16)%2===0;
  ctx.shadowBlur=14; ctx.shadowColor="#22e7ff";
  ctx.fillStyle = blink ? "#ff5a3c" : "#eafcff";
  ctx.rotate(Math.PI/4);
  ctx.fillRect(-p.r*0.7,-p.r*0.7,p.r*1.4,p.r*1.4);
  ctx.fillStyle = blink ? "#fff" : "#22e7ff";
  ctx.fillRect(-p.r*0.35,-p.r*0.35,p.r*0.7,p.r*0.7);
  ctx.shadowBlur=0;
  ctx.restore();
}

function drawPopups(){
  for(const p of popups){
    const a = clamp(p.life/p.max,0,1);
    ctx.globalAlpha = a;
    ctx.font = `${p.size}px "Press Start 2P", monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#000"; ctx.fillText(p.text, p.x+2, p.y+2);
    ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function drawFlash(){
  if(game.flash > 0){
    ctx.fillStyle = `rgba(255,255,255,${game.flash*0.5})`;
    ctx.fillRect(0,0,VW,VH);
  }
}

// ---------- HUD (virtual coords, after restore) ----------
function drawHUD(){
  ctx.setTransform(scale*dpr,0,0,scale*dpr, offX*dpr, offY*dpr);
  ctx.textBaseline = "top";

  // HP bar (top-left)
  ctx.textAlign = "left";
  hudText("HP", 18, 16, 10, "#e8f7ff");
  const bx=18, by=32, bw=200, bh=14;
  ctx.fillStyle="#1a0a12"; ctx.fillRect(bx,by,bw,bh);
  const hpf = clamp(player.hp/player.maxHp,0,1);
  const hpc = hpf>0.5 ? "#5cff7a" : hpf>0.25 ? "#ffd23f" : "#ff5a3c";
  ctx.fillStyle = hpc; ctx.fillRect(bx,by, bw*hpf, bh);
  ctx.strokeStyle="#000"; ctx.lineWidth=2; ctx.strokeRect(bx,by,bw,bh);
  hudText(Math.ceil(player.hp)+"/"+player.maxHp, bx+bw+10, by+2, 9, "#e8f7ff");

  // LV + XP (below hp)
  hudText("LV "+player.level, 18, 56, 10, "#a06bff");
  const xb=18, xy=72, xw=200, xh=8;
  ctx.fillStyle="#0e0c1c"; ctx.fillRect(xb,xy,xw,xh);
  ctx.fillStyle="#a06bff"; ctx.fillRect(xb,xy, xw*clamp(player.xp/player.xpNext,0,1), xh);
  ctx.strokeStyle="#000"; ctx.lineWidth=1; ctx.strokeRect(xb,xy,xw,xh);

  // wave (top center)
  ctx.textAlign="center";
  const wt = game.betweenWaves>0 ? "NEXT WAVE" : "WAVE "+game.wave;
  hudText(wt, VW/2, 16, 13, "#22e7ff", true);

  // score (top right)
  ctx.textAlign="right";
  hudText("SCORE "+game.score.toLocaleString(), VW-18, 16, 11, "#ffd23f");
  hudText("HI "+game.hi.toLocaleString(), VW-18, 36, 9, "#5cff7a");

  // combo (bottom center, big when active)
  if(player.combo > 1){
    ctx.textAlign="center";
    const pulse = 1 + Math.sin(game.time*12)*0.04;
    const sz = clamp(16 + player.combo, 16, 40) * pulse;
    hudText(player.combo+" COMBO", VW/2, VH-54, sz, "#ff2e88", true);
    const mult = (1 + player.combo*0.1).toFixed(1);
    hudText("x"+mult+" SCORE", VW/2, VH-20, 9, "#ffd23f");
  }

  // mute / pause indicator
  ctx.textAlign="left";
  if(muted) hudText("MUTED [M]", 18, VH-22, 8, "#ff5a3c");

  // parry status (bottom left)
  ctx.textAlign="right";
  const ready = player.parryCool<=0;
  hudText(ready?"PARRY READY":"…", VW-18, VH-22, 8, ready?"#22e7ff":"#555");
}

function hudText(text,x,y,size,color,shadow){
  ctx.font = `${size}px "Press Start 2P", monospace`;
  if(shadow){ ctx.fillStyle="#000"; ctx.fillText(text,x+2,y+2); }
  ctx.fillStyle=color; ctx.fillText(text,x,y);
}

function drawPause(){
  ctx.setTransform(scale*dpr,0,0,scale*dpr, offX*dpr, offY*dpr);
  ctx.fillStyle="rgba(0,0,0,.6)"; ctx.fillRect(0,0,VW,VH);
  ctx.textAlign="center"; ctx.textBaseline="middle";
  hudText("PAUSED", VW/2, VH/2, 28, "#22e7ff", true);
  hudText("P 로 계속", VW/2, VH/2+44, 11, "#e8f7ff");
}

// ---------- main loop ----------
let last = performance.now();
function loop(now){
  let dt = (now - last) / 1000;
  last = now;
  if(dt > 0.05) dt = 0.05; // clamp
  if(!game.paused || game.state!=="playing"){
    update(dt);
  } else {
    updateParticles(dt); updatePopups(dt);
  }
  draw();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);

// debug hooks (harmless; used for headless verification)
window.__pc = {
  step:(dt,n)=>{ n=n||1; for(let i=0;i<n;i++) update(dt||0.016); draw(); },
  draw, start:startGame, parry:()=>onParryPressed(),
  press:(k)=>{keys[k]=true;}, release:(k)=>{keys[k]=false;},
  get game(){return game;}, get player(){return player;},
  get enemies(){return enemies;}, get bullets(){return bullets;},
};

})();
