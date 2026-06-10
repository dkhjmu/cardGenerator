/* ============================================================
   너구리런 — 원-키 자동전진 러너
   탭 = 점프 / 공중에서 한 번 더 = 더블점프
   몬스터는 밟아서 처치 · 구덩이 빠지면 낙사 · 코인 수집
   ============================================================ */
'use strict';

/* ---------- 캔버스 & 적응형 스케일 ---------- */
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let DPR = 1, CSSW = 0, CSSH = 0, SCALE = 1, VIEW_W = 0, VIEW_H = 0, GROUND_Y = 0;

const GROUND_H = 120;          // 지면 두께(논리 px)
const MIN_W = 820, MIN_H = 470; // 최소로 보여줄 논리 가로/세로
const GRAV = 2300, JUMP_V = 800, BOUNCE = 640;
const P_W = 42, P_H = 44;
const COIN_R = 13;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  CSSW = window.innerWidth; CSSH = window.innerHeight;
  cv.width = Math.round(CSSW * DPR); cv.height = Math.round(CSSH * DPR);
  cv.style.width = CSSW + 'px'; cv.style.height = CSSH + 'px';
  SCALE = Math.min(CSSW / MIN_W, CSSH / MIN_H);
  VIEW_W = CSSW / SCALE; VIEW_H = CSSH / SCALE;
  GROUND_Y = VIEW_H - GROUND_H;
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, 0, 0);
  if (player && player.onGround) player.y = GROUND_Y - player.h;
}
window.addEventListener('resize', resize);

/* ---------- 유틸 ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

/* ---------- 테마 (스테이지별 배경) ---------- */
const THEMES = [
  { name: '들판',       sky: ['#aee9ff', '#e7faff'], hillFar: '#bfe6a8', hillNear: '#9ad97f', grass: '#86cf63', dirt: '#caa06a', dirt2: '#b78a54', cloud: '#ffffff', deco: 'cloud' },
  { name: '노을 언덕',   sky: ['#ffc59e', '#ffe9c7'], hillFar: '#f6a98a', hillNear: '#e98a73', grass: '#e58368', dirt: '#b96a55', dirt2: '#a25846', cloud: '#fff0e0', deco: 'cloud' },
  { name: '깊은 숲',     sky: ['#bfeedd', '#e8fbf2'], hillFar: '#7fc7a0', hillNear: '#5aab83', grass: '#4f9f74', dirt: '#8a6f4c', dirt2: '#735a3c', cloud: '#ffffff', deco: 'tree' },
  { name: '사막',       sky: ['#ffe2a6', '#fff4d8'], hillFar: '#f0cf8e', hillNear: '#e6bd6d', grass: '#e0b35e', dirt: '#cf9a4a', dirt2: '#b8853a', cloud: '#fff6e0', deco: 'sun' },
  { name: '사탕 나라',   sky: ['#ffd2ec', '#ffeaf6'], hillFar: '#ffb3da', hillNear: '#ff97c9', grass: '#ff86bf', dirt: '#d96fa3', dirt2: '#c25c8e', cloud: '#ffffff', deco: 'candy' },
  { name: '별밤',       sky: ['#33305e', '#5b4f86'], hillFar: '#403a6b', hillNear: '#2e2a52', grass: '#4a4378', dirt: '#3a3460', dirt2: '#2c2750', cloud: '#fff7d6', deco: 'star', night: true },
  { name: '눈 덮인 산',  sky: ['#cdeeff', '#f3fbff'], hillFar: '#dceefa', hillNear: '#c2e2f5', grass: '#eaf6ff', dirt: '#bcd4e6', dirt2: '#a3c0d6', cloud: '#ffffff', deco: 'snow' },
  { name: '바다 절벽',   sky: ['#9fe0e8', '#e2fbfb'], hillFar: '#79c9cf', hillNear: '#52b1bb', grass: '#46a6b0', dirt: '#cbb083', dirt2: '#b3955f', cloud: '#ffffff', deco: 'cloud' },
  { name: '용암 동굴',   sky: ['#3a2230', '#5e3340'], hillFar: '#4a2630', hillNear: '#371c25', grass: '#7a3030', dirt: '#52242a', dirt2: '#3c191d', cloud: '#ff8a4a', deco: 'lava', night: true },
  { name: '무지개 성',   sky: ['#cdb4ff', '#ffe0f4'], hillFar: '#c39bf0', hillNear: '#a97ee6', grass: '#b083f0', dirt: '#8a5fc8', dirt2: '#744fb0', cloud: '#ffffff', deco: 'rainbow' },
];
const MON_COLORS = [
  { body: '#8a7bd8', dark: '#6a5cc0', foot: '#5547a8' }, // 보라 워커
  { body: '#ff9f6b', dark: '#ec7e49', foot: '#c9622f' }, // 주황 점퍼
  { body: '#5fd0b0', dark: '#3cb693', foot: '#2c9676' }, // 민트 (큰)
];

/* ---------- 게임 상태 ---------- */
let state = 'menu';   // menu | intro | play | paused | clear | gameover | win
let player = null;
let level = null;
let camX = 0, camShake = 0;
let coinsRun = 0;     // 이번 런 누적 코인
let coinsStage = 0;   // 이번 스테이지 코인
let lives = 3;
let stage = 1;
let stageTime = 0;
let timeNow = 0;
const particles = [];

/* ---------- 저장 ---------- */
const SAVE = {
  load() {
    try {
      this.unlock = +localStorage.getItem('mr_unlock') || 1;
      this.bestCoins = +localStorage.getItem('mr_bestcoins') || 0;
      this.cleared = localStorage.getItem('mr_cleared') === '1';
      this.stars = JSON.parse(localStorage.getItem('mr_stars') || '{}') || {};
      // 이전 버전 기록 보정: 별 데이터 없이 클리어된 스테이지는 별 1개로
      for (let i = 1; i < this.unlock; i++) if (!this.stars[i]) this.stars[i] = 1;
      if (this.cleared) for (let i = 1; i <= 10; i++) if (!this.stars[i]) this.stars[i] = 1;
    } catch (e) { this.unlock = 1; this.bestCoins = 0; this.cleared = false; this.stars = {}; }
  },
  save() {
    try {
      localStorage.setItem('mr_unlock', this.unlock);
      localStorage.setItem('mr_bestcoins', this.bestCoins);
      localStorage.setItem('mr_cleared', this.cleared ? '1' : '0');
      localStorage.setItem('mr_stars', JSON.stringify(this.stars));
    } catch (e) {}
  }
};
SAVE.load();

/* ---------- 사운드 (간단 비프) ---------- */
let actx = null, muted = false;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); }
function sfx(type) {
  if (muted || !actx) return;
  try {
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    let d = 0.12, vol = 0.1;
    if (type === 'jump') { o.type = 'square'; o.frequency.setValueAtTime(360, t); o.frequency.exponentialRampToValueAtTime(720, t + 0.12); }
    else if (type === 'double') { o.type = 'square'; o.frequency.setValueAtTime(560, t); o.frequency.exponentialRampToValueAtTime(960, t + 0.12); }
    else if (type === 'coin') { o.type = 'triangle'; o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1320, t + 0.05); d = 0.1; vol = 0.08; }
    else if (type === 'stomp') { o.type = 'square'; o.frequency.setValueAtTime(640, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.14); d = 0.14; }
    else if (type === 'hit') { o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.22); d = 0.22; vol = 0.12; }
    else if (type === 'clear') { o.type = 'triangle'; o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(659, t + 0.1); o.frequency.setValueAtTime(880, t + 0.2); d = 0.34; }
    else if (type === 'heal') { o.type = 'triangle'; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(880, t + 0.08); d = 0.2; vol = 0.09; }
    else if (type === 'power') { o.type = 'square'; o.frequency.setValueAtTime(523, t); o.frequency.setValueAtTime(659, t + 0.07); o.frequency.setValueAtTime(784, t + 0.14); o.frequency.setValueAtTime(1047, t + 0.21); d = 0.32; vol = 0.08; }
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.start(t); o.stop(t + d);
  } catch (e) {}
}

/* ---------- 레벨 생성 ---------- */
function coinArc(coins, sx, baseGap, n, sp) {
  for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0.5; coins.push({ x: sx + i * sp, gap: baseGap + Math.sin(t * Math.PI) * 64, got: false }); }
}
function coinRow(coins, sx, baseGap, n, sp) { for (let i = 0; i < n; i++) coins.push({ x: sx + i * sp, gap: baseGap, got: false }); }

function makeMonster(cx, gap, stg, rng) {
  let type = Math.floor(rng() * 3);
  const big = type === 2;
  const w = big ? 50 : 42, h = big ? 46 : 40;
  const moves = rng() < (0.45 + stg * 0.03);
  const spd = moves ? (24 + rng() * 40 + stg * 2) : 0;
  const range = 40 + rng() * 90;
  return { x: cx - w / 2, w, h, baseGap: gap || 0, type, alive: true, dead: 0,
    vx: spd * (rng() < 0.5 ? -1 : 1), minX: cx - w / 2 - range, maxX: cx - w / 2 + range, bob: rng() * 6.28 };
}

function generateStage(stg) {
  const rng = mulberry32(1337 + stg * 7919);
  const prog = (stg - 1) / 9;
  const baseSpeed = 215 + (stg - 1) * 21;
  const airTime = 2 * JUMP_V / GRAV;
  const jumpDist = baseSpeed * airTime;
  const length = baseSpeed * 100 * 1.06;
  const spans = [], platforms = [], monsters = [], coins = [], items = [];
  let runStart = 0, x = 720;          // 시작 안전구간
  coinRow(coins, 360, 70, 3, 40);
  while (x < length) {
    const pitChance = 0.16 + 0.20 * prog;
    if (x > 1050 && rng() < pitChance) {
      let pw = jumpDist * (0.40 + rng() * 0.28);
      pw = Math.min(pw, jumpDist * 0.72);
      spans.push({ x0: runStart, x1: x });
      if (rng() < 0.45) {
        const pxp = x + pw * 0.5;
        platforms.push({ x: pxp - 58, w: 116, gap: 118 });
        coinArc(coins, pxp - 36, 150, 4, 24);
      } else {
        coinArc(coins, x + pw * 0.5 - 48, 86, 5, 24);
      }
      runStart = x + pw;
      x = runStart + (150 + rng() * 170);
    } else {
      const r = rng();
      if (r < 0.40) {
        const count = (prog > 0.4 && rng() < 0.32) ? 2 : 1;
        for (let i = 0; i < count; i++) monsters.push(makeMonster(x + i * 78, 0, stg, rng));
        x += 170 + count * 64 + rng() * 150;
      } else if (r < 0.45) {
        // 아이템: 하트(회복) 또는 무적별
        items.push({ x: x + 20, gap: 64 + rng() * 60, kind: rng() < 0.45 ? 'heart' : 'star', got: false });
        x += 160 + rng() * 130;
      } else if (r < 0.70) {
        coinArc(coins, x, 64, 5, 26);
        x += 190 + rng() * 150;
      } else {
        const w = 96 + rng() * 70, gap = 96 + rng() * 44;
        platforms.push({ x, w, gap });
        coinRow(coins, x + 16, gap + 34, Math.max(2, Math.floor(w / 28)), 28);
        if (rng() < 0.30) { const m = makeMonster(x + w * 0.5, gap, stg, rng); m.minX = x + 6; m.maxX = x + w - m.w - 6; m.vx = m.vx || 30; monsters.push(m); }
        x += w + 150 + rng() * 140;
      }
    }
  }
  spans.push({ x0: runStart, x1: length + 1600 });
  return { spans, platforms, monsters, coins, items, goalX: length + 760, baseSpeed, stage: stg };
}

function overSolid(px) { const s = level.spans; for (let i = 0; i < s.length; i++) if (px >= s[i].x0 && px <= s[i].x1) return true; return false; }
function safeRespawnX(fx) { let best = 80; for (const s of level.spans) if (s.x0 <= fx) best = Math.max(best, Math.min(fx, s.x1 - 70)); return best; }

/* ---------- 파티클 ---------- */
function burst(x, y, color, n, spd, life) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = spd * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.3, life: life || 0.5, max: life || 0.5, color, size: 3 + Math.random() * 4, g: 900 });
  }
}

/* ---------- 시작/진행 ---------- */
function startStage(s) {
  stage = s; level = generateStage(s); lives = 3; coinsStage = 0; stageTime = 0; camX = 0; camShake = 0;
  particles.length = 0;
  player = { x: 200, y: GROUND_Y - P_H, w: P_W, h: P_H, vy: 0, prevY: GROUND_Y - P_H, onGround: true, jumpsLeft: 2, inv: 0, star: 0, sq: 1, runPhase: 0, dead: false };
  state = 'play';
  document.getElementById('hud').classList.remove('hide');
  document.getElementById('tapHint').classList.remove('hide');
  hideScreen(); updateHUD();
}

function doJump() {
  if (state !== 'play' || player.dead) return;
  if (player.jumpsLeft > 0) {
    const dbl = player.jumpsLeft < 2 && !player.onGround;
    player.vy = -JUMP_V * (dbl ? 0.92 : 1);
    player.jumpsLeft--; player.onGround = false; player.sq = 1.32;
    burst(player.x + player.w / 2, player.y + player.h, 'rgba(255,255,255,.8)', dbl ? 8 : 5, 160, 0.4);
    sfx(dbl ? 'double' : 'jump');
    document.getElementById('tapHint').classList.add('hide');
  }
}

function hurt() {
  if (player.inv > 0 || player.star > 0) return;
  lives--; player.inv = 1.5; camShake = 12; sfx('hit');
  burst(player.x + player.w / 2, player.y + player.h / 2, '#ff7aa2', 12, 200, 0.6);
  updateHUD();
  if (lives <= 0) { player.dead = true; setTimeout(() => endGame(false), 700); }
}

function endGame(won) {
  if (won) {
    coinsRun += coinsStage;
    SAVE.stars[stage] = Math.max(SAVE.stars[stage] || 0, Math.max(1, lives));
    if (stage >= SAVE.unlock) SAVE.unlock = Math.min(10, stage + 1);
    if (stage >= 10) { SAVE.cleared = true; SAVE.bestCoins = Math.max(SAVE.bestCoins, coinsRun); SAVE.save(); state = 'win'; showWin(); return; }
    SAVE.save(); state = 'clear'; sfx('clear'); showClear();
  } else {
    SAVE.bestCoins = Math.max(SAVE.bestCoins, coinsRun + coinsStage); SAVE.save();
    state = 'gameover'; showGameOver();
  }
  document.getElementById('hud').classList.add('hide');
}

/* ---------- 업데이트 ---------- */
function update(dt) {
  timeNow += dt;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  if (state !== 'play') return;
  stageTime += dt;
  if (camShake > 0) camShake = Math.max(0, camShake - dt * 40);

  const prog = clamp(player.x / level.goalX, 0, 1);
  const speed = level.baseSpeed * (1 + 0.18 * prog) * (player.dead ? 0 : 1);

  // 몬스터 패트롤
  for (const m of level.monsters) {
    if (!m.alive) { m.dead += dt; continue; }
    m.bob += dt * 5;
    if (m.vx) { m.x += m.vx * dt; if (m.x < m.minX) { m.x = m.minX; m.vx *= -1; } else if (m.x > m.maxX) { m.x = m.maxX; m.vx *= -1; } }
  }

  if (!player.dead) {
    player.prevY = player.y;
    player.vy += GRAV * dt;
    player.y += player.vy * dt;
    player.x += speed * dt;
    player.sq += (1 - player.sq) * Math.min(1, dt * 12);
    if (player.inv > 0) player.inv -= dt;
    if (player.star > 0) {
      player.star -= dt;
      if (Math.random() < dt * 22) {
        const hue = Math.floor(Math.random() * 360);
        particles.push({ x: player.x + Math.random() * player.w, y: player.y + Math.random() * player.h, vx: -60 - Math.random() * 60, vy: -30 + Math.random() * 60, life: 0.45, max: 0.45, color: `hsl(${hue},85%,72%)`, size: 3 + Math.random() * 3, g: 120 });
      }
    }
    if (player.onGround) player.runPhase += speed * dt * 0.05;

    let landed = false;
    const feet = player.x + player.w / 2;
    // 플랫폼(원웨이)
    for (const pl of level.platforms) {
      const top = GROUND_Y - pl.gap;
      if (player.vy >= 0 && player.x + player.w > pl.x && player.x < pl.x + pl.w) {
        if (player.prevY + player.h <= top + 4 && player.y + player.h >= top) { player.y = top - player.h; player.vy = 0; landed = true; }
      }
    }
    // 지면
    if (!landed && overSolid(feet) && player.vy >= 0 && player.y + player.h >= GROUND_Y) {
      player.y = GROUND_Y - player.h; player.vy = 0; landed = true;
    }
    if (landed) {
      if (!player.onGround) { player.sq = 0.7; burst(player.x + player.w / 2, player.y + player.h, 'rgba(255,255,255,.6)', 4, 110, 0.3); }
      player.onGround = true; player.jumpsLeft = 2; player.lastGroundX = player.x;
    } else { player.onGround = false; }

    // 코인
    const pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    for (const c of level.coins) {
      if (c.got) continue;
      const cy = GROUND_Y - c.gap;
      if (Math.abs(c.x - pcx) < COIN_R + 20 && Math.abs(cy - pcy) < COIN_R + 22) {
        c.got = true; coinsStage++; sfx('coin'); burst(c.x, cy, '#ffd45e', 6, 130, 0.4); updateHUD();
      }
    }

    // 아이템
    for (const it of level.items) {
      if (it.got) continue;
      const iy = GROUND_Y - it.gap;
      if (Math.abs(it.x - pcx) < 34 && Math.abs(iy - pcy) < 38) {
        it.got = true;
        if (it.kind === 'heart') {
          if (lives < 3) { lives++; sfx('heal'); burst(it.x, iy, '#ff7aa2', 12, 160, 0.55); }
          else { coinsStage += 5; sfx('coin'); burst(it.x, iy, '#ffd45e', 12, 160, 0.55); }
          updateHUD();
        } else {
          player.star = 6; sfx('power'); camShake = 5;
          burst(it.x, iy, '#ffd45e', 8, 200, 0.6); burst(it.x, iy, '#9be3c0', 6, 180, 0.6); burst(it.x, iy, '#b69cff', 6, 180, 0.6);
        }
      }
    }

    // 몬스터 충돌
    for (const m of level.monsters) {
      if (!m.alive) continue;
      const my = (GROUND_Y - m.baseGap) - m.h;
      if (player.x < m.x + m.w && player.x + player.w > m.x && player.y < my + m.h && player.y + player.h > my) {
        if (player.star > 0) {
          m.alive = false; m.dead = 0.0001; sfx('stomp'); camShake = 7;
          burst(m.x + m.w / 2, my + m.h / 2, MON_COLORS[m.type].body, 14, 220, 0.55);
        } else if (player.vy > 0 && player.prevY + player.h <= my + 16) {
          m.alive = false; m.dead = 0.0001; player.vy = -BOUNCE; player.jumpsLeft = Math.max(player.jumpsLeft, 1);
          coinsStage += 0; sfx('stomp'); camShake = 6;
          burst(m.x + m.w / 2, my + m.h, MON_COLORS[m.type].body, 12, 180, 0.5);
        } else { hurt(); }
      }
    }

    // 낙사
    if (player.y > VIEW_H + 80) {
      lives--; sfx('hit'); camShake = 10; updateHUD();
      if (lives <= 0) { player.dead = true; setTimeout(() => endGame(false), 500); }
      else { const rx = safeRespawnX(player.x); player.x = rx; player.y = GROUND_Y - player.h - 4; player.vy = 0; player.onGround = true; player.jumpsLeft = 2; player.inv = 1.6; }
    }

    // 골인
    if (player.x >= level.goalX) endGame(true);
  }

  camX = Math.max(0, player.x - VIEW_W * 0.26);
  updateProgress(prog);
}

/* ---------- 렌더 ---------- */
function drawBackground(th) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 데코 (별/구름/태양 등) — 화면 고정 + 약한 패럴럭스
  if (th.deco === 'star' || th.deco === 'snow') {
    ctx.fillStyle = th.night ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.9)';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 211 - camX * 0.1) % (VIEW_W + 60) + VIEW_W + 60) % (VIEW_W + 60) - 30;
      const sy = (i * 97) % (VIEW_H * 0.7);
      circ(sx, sy, th.deco === 'snow' ? 2.5 : (i % 5 === 0 ? 2.4 : 1.4));
    }
  }
  if (th.deco === 'sun' || th.deco === 'lava') { ctx.fillStyle = th.deco === 'lava' ? 'rgba(255,150,80,.5)' : 'rgba(255,240,180,.9)'; circ(VIEW_W * 0.8, VIEW_H * 0.22, 60); }

  // 먼 언덕 (패럴럭스 0.3)
  const off1 = -(camX * 0.3) % 520;
  ctx.fillStyle = th.hillFar;
  for (let i = -1; i < VIEW_W / 520 + 2; i++) {
    const bx = off1 + i * 520;
    ctx.beginPath(); ctx.moveTo(bx, GROUND_Y + 20);
    ctx.quadraticCurveTo(bx + 130, GROUND_Y - 150, bx + 260, GROUND_Y + 20);
    ctx.quadraticCurveTo(bx + 390, GROUND_Y - 110, bx + 520, GROUND_Y + 20);
    ctx.closePath(); ctx.fill();
  }
  // 구름 / 나무 등 중간 데코
  if (th.deco === 'cloud' || th.deco === 'candy' || th.deco === 'rainbow') {
    const off = -(camX * 0.45) % 480;
    ctx.fillStyle = th.cloud + (th.cloud.length === 7 ? 'cc' : '');
    for (let i = -1; i < VIEW_W / 480 + 2; i++) {
      const bx = off + i * 480 + 60, by = 70 + (i % 3) * 46;
      ctx.beginPath(); ctx.arc(bx, by, 26, 0, 7); ctx.arc(bx + 30, by - 8, 32, 0, 7); ctx.arc(bx + 64, by, 24, 0, 7); ctx.fill();
    }
  }
  if (th.deco === 'rainbow') {
    const cols = ['#ff8fb1', '#ffc24d', '#9be3c0', '#6cc6ff', '#b69cff'];
    ctx.lineWidth = 10;
    for (let i = 0; i < cols.length; i++) { ctx.strokeStyle = cols[i] + 'aa'; ctx.beginPath(); ctx.arc(VIEW_W * 0.5 - camX * 0.2, GROUND_Y + 60, 220 - i * 12, Math.PI, 0); ctx.stroke(); }
  }
  // 가까운 언덕 (패럴럭스 0.55)
  const off2 = -(camX * 0.55) % 460;
  ctx.fillStyle = th.hillNear;
  for (let i = -1; i < VIEW_W / 460 + 2; i++) {
    const bx = off2 + i * 460;
    ctx.beginPath(); ctx.moveTo(bx, GROUND_Y + 30);
    ctx.quadraticCurveTo(bx + 115, GROUND_Y - 95, bx + 230, GROUND_Y + 30);
    ctx.quadraticCurveTo(bx + 345, GROUND_Y - 70, bx + 460, GROUND_Y + 30);
    ctx.closePath(); ctx.fill();
  }
}

function drawGround(th) {
  const left = camX - 40, right = camX + VIEW_W + 40;
  // 구덩이 심연
  const spans = level.spans;
  for (let i = 0; i < spans.length - 1; i++) {
    const gx0 = spans[i].x1, gx1 = spans[i + 1].x0;
    if (gx1 < left || gx0 > right) continue;
    const ag = ctx.createLinearGradient(0, GROUND_Y, 0, VIEW_H);
    ag.addColorStop(0, 'rgba(20,16,30,.30)'); ag.addColorStop(1, 'rgba(20,16,30,0)');
    ctx.fillStyle = ag; ctx.fillRect(gx0, GROUND_Y, gx1 - gx0, VIEW_H - GROUND_Y);
  }
  for (const s of spans) {
    if (s.x1 < left || s.x0 > right) continue;
    const x = Math.max(s.x0, left - 20), w = Math.min(s.x1, right + 20) - x;
    ctx.fillStyle = th.dirt; rr(x, GROUND_Y, w, VIEW_H - GROUND_Y + 4, 0); ctx.fill();
    // 흙 결
    ctx.fillStyle = th.dirt2;
    for (let dx = Math.ceil((x) / 70) * 70; dx < x + w; dx += 70) { ell(dx, GROUND_Y + 46, 10, 6); ell(dx + 35, GROUND_Y + 80, 8, 5); }
    // 잔디/표면 라운드 캡 (가장자리만 둥글게)
    ctx.fillStyle = th.grass;
    const capR = 14;
    rr(s.x0 === 0 ? x : Math.max(x, s.x0), GROUND_Y - 6, w + (x > s.x0 ? 0 : 0), 26, 12); ctx.fill();
    ctx.fillStyle = th.grass; rr(x, GROUND_Y - 6, w, 24, 0); ctx.fill();
    // 둥근 가장자리
    ctx.fillStyle = th.grass;
    if (s.x0 >= left - 20) circ(s.x0 + 12, GROUND_Y + 6, 13);
    if (s.x1 <= right + 20) circ(s.x1 - 12, GROUND_Y + 6, 13);
  }
  // 플랫폼
  for (const pl of level.platforms) {
    if (pl.x + pl.w < left || pl.x > right) continue;
    const top = GROUND_Y - pl.gap;
    ctx.fillStyle = th.dirt; rr(pl.x, top, pl.w, 26, 12); ctx.fill();
    ctx.fillStyle = th.grass; rr(pl.x, top, pl.w, 13, 12); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.08)'; rr(pl.x + 6, top + 26, pl.w - 12, 6, 4); ctx.fill();
  }
}

function drawCoin(c) {
  const cy = GROUND_Y - c.gap;
  const sx = Math.abs(Math.cos(timeNow * 4 + c.x * 0.05));
  ctx.save(); ctx.translate(c.x, cy); ctx.scale(0.4 + sx * 0.6, 1);
  const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, COIN_R);
  g.addColorStop(0, '#ffe89a'); g.addColorStop(1, '#f4b431');
  ctx.fillStyle = g; circ(0, 0, COIN_R);
  ctx.fillStyle = '#d99520'; ctx.lineWidth = 0; ctx.beginPath(); ctx.arc(0, 0, COIN_R, 0, 7); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d99520'; ctx.stroke();
  ctx.fillStyle = '#e8a93a'; ctx.font = '700 15px Jua'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (sx > 0.4) ctx.fillText('★', 0, 1);
  ctx.restore();
}

function drawHeartShape(x, y, s, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.62);
  ctx.bezierCurveTo(x - s * 1.05, y + s * 0.02, x - s * 0.6, y - s * 0.68, x, y - s * 0.18);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 0.68, x + s * 1.05, y + s * 0.02, x, y + s * 0.62);
  ctx.fill();
}
function starPath(x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5 - Math.PI / 2;
    const rad = i % 2 ? r * 0.48 : r;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}
function drawItem(it) {
  const y = GROUND_Y - it.gap + Math.sin(timeNow * 3 + it.x * 0.013) * 5;
  if (it.kind === 'heart') {
    ctx.fillStyle = 'rgba(255,122,162,.22)'; circ(it.x, y, 25);
    drawHeartShape(it.x, y + 1.5, 17, '#e0567f');
    drawHeartShape(it.x, y, 16, '#ff7aa2');
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ell(it.x - 5.5, y - 5, 3.4, 2.4);
  } else {
    const rot = Math.sin(timeNow * 2.2 + it.x * 0.01) * 0.25;
    ctx.fillStyle = 'rgba(255,210,90,.25)'; circ(it.x, y, 27);
    starPath(it.x, y + 1.5, 18, rot); ctx.fillStyle = '#e8a93a'; ctx.fill();
    starPath(it.x, y, 17, rot); ctx.fillStyle = '#ffd45e'; ctx.fill();
    // 귀여운 눈
    ctx.fillStyle = '#3a3346'; circ(it.x - 4.5, y - 1, 1.9); circ(it.x + 4.5, y - 1, 1.9);
    ctx.fillStyle = 'rgba(255,140,170,.5)'; circ(it.x - 8, y + 3.5, 2.2); circ(it.x + 8, y + 3.5, 2.2);
  }
}

function drawMonster(m) {
  const baseY = GROUND_Y - m.baseGap;
  const col = MON_COLORS[m.type];
  ctx.save();
  if (!m.alive) {
    // 처치 연출: 납작
    const t = clamp(m.dead * 6, 0, 1);
    ctx.globalAlpha = 1 - t;
    ctx.translate(m.x + m.w / 2, baseY);
    ctx.scale(1 + t * 0.4, 1 - t * 0.8);
    ctx.fillStyle = col.body; rr(-m.w / 2, -m.h, m.w, m.h, m.w * 0.42); ctx.fill();
    ctx.restore(); return;
  }
  const bobY = Math.sin(m.bob) * 3;
  ctx.translate(m.x + m.w / 2, baseY + bobY);
  // 발
  ctx.fillStyle = col.foot; ell(-m.w * 0.24, -3, m.w * 0.16, 6); ell(m.w * 0.24, -3, m.w * 0.16, 6);
  // 몸
  ctx.fillStyle = col.body; rr(-m.w / 2, -m.h, m.w, m.h, m.w * 0.45); ctx.fill();
  // 배 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ell(0, -m.h * 0.55, m.w * 0.26, m.h * 0.28);
  // 눈
  const dir = m.vx >= 0 ? 1 : -1;
  ctx.fillStyle = '#fff'; circ(-m.w * 0.16, -m.h * 0.62, m.w * 0.13); circ(m.w * 0.16, -m.h * 0.62, m.w * 0.13);
  ctx.fillStyle = '#3a3346'; circ(-m.w * 0.16 + dir * 2, -m.h * 0.62, m.w * 0.06); circ(m.w * 0.16 + dir * 2, -m.h * 0.62, m.w * 0.06);
  // 찡그린 눈썹
  ctx.strokeStyle = col.dark; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-m.w * 0.28, -m.h * 0.82); ctx.lineTo(-m.w * 0.05, -m.h * 0.74); ctx.moveTo(m.w * 0.28, -m.h * 0.82); ctx.lineTo(m.w * 0.05, -m.h * 0.74); ctx.stroke();
  // 입
  ctx.beginPath(); ctx.arc(0, -m.h * 0.32, m.w * 0.12, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  ctx.restore();
}

function drawRaccoon(p) {
  const cx = p.x + p.w / 2, footY = p.y + p.h, w = p.w, h = p.h;
  ctx.save();
  ctx.translate(cx, footY);
  const sy = p.sq, sx = 2 - sy;
  ctx.scale(sx, sy);
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) ctx.globalAlpha = 0.4;

  // 꼬리 (뒤, 왼쪽) — 줄무늬
  let tx = -w * 0.34, ty = -h * 0.46, ang = Math.PI * 1.02, r = w * 0.2;
  const wag = (p.onGround ? Math.sin(p.runPhase) * 0.12 : 0.22);
  ang += wag;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 ? '#5b6470' : '#aeb8c6';
    circ(tx, ty, r);
    ang -= 0.34; tx += Math.cos(ang) * r * 1.05; ty += Math.sin(ang) * r * 1.05; r *= 0.86;
  }
  ctx.fillStyle = '#4a525e'; circ(tx, ty, r * 1.1); // 꼬리 끝

  // 다리
  ctx.fillStyle = '#9aa4b2';
  const swing = p.onGround ? Math.sin(p.runPhase) * 5 : 3;
  rr(-w * 0.26, -10 - Math.max(0, swing), w * 0.2, 12, 5); ctx.fill();
  rr(w * 0.06, -10 - Math.max(0, -swing), w * 0.2, 12, 5); ctx.fill();

  // 몸
  ctx.fillStyle = '#c7d0dc'; rr(-w / 2, -h, w, h, w * 0.46); ctx.fill();
  ctx.fillStyle = '#f3ede1'; ell(0, -h * 0.4, w * 0.28, h * 0.32); // 배

  // 팔
  ctx.fillStyle = '#aeb8c6'; ell(w * 0.34, -h * 0.5, w * 0.12, h * 0.16);

  // 머리
  const hy = -h * 0.86, hr = w * 0.5;
  ctx.fillStyle = '#c7d0dc'; circ(0, hy, hr);
  // 귀
  ctx.fillStyle = '#c7d0dc'; circ(-hr * 0.66, hy - hr * 0.62, hr * 0.4); circ(hr * 0.66, hy - hr * 0.62, hr * 0.4);
  ctx.fillStyle = '#8b94a2'; circ(-hr * 0.66, hy - hr * 0.55, hr * 0.22); circ(hr * 0.66, hy - hr * 0.55, hr * 0.22);
  // 눈 마스크 (너구리 시그니처)
  ctx.fillStyle = '#5b6470';
  ell(-hr * 0.36, hy + hr * 0.02, hr * 0.34, hr * 0.3); ell(hr * 0.36, hy + hr * 0.02, hr * 0.34, hr * 0.3);
  ctx.fillStyle = '#5b6470'; rr(-hr * 0.5, hy - hr * 0.06, hr, hr * 0.34, hr * 0.18); ctx.fill();
  // 눈
  ctx.fillStyle = '#fff'; circ(-hr * 0.34, hy + hr * 0.04, hr * 0.2); circ(hr * 0.34, hy + hr * 0.04, hr * 0.2);
  ctx.fillStyle = '#2f2a3a'; circ(-hr * 0.3, hy + hr * 0.06, hr * 0.11); circ(hr * 0.38, hy + hr * 0.06, hr * 0.11);
  ctx.fillStyle = '#fff'; circ(-hr * 0.26, hy + hr * 0.01, hr * 0.045); circ(hr * 0.42, hy + hr * 0.01, hr * 0.045);
  // 주둥이
  ctx.fillStyle = '#f3ede1'; ell(0, hy + hr * 0.42, hr * 0.34, hr * 0.26);
  ctx.fillStyle = '#3a3346'; circ(0, hy + hr * 0.32, hr * 0.1);
  // 볼터치
  ctx.fillStyle = 'rgba(255,140,170,.55)'; circ(-hr * 0.62, hy + hr * 0.36, hr * 0.14); circ(hr * 0.62, hy + hr * 0.36, hr * 0.14);
  ctx.restore();
}

function drawGoal() {
  const gx = level.goalX;
  if (gx < camX - 40 || gx > camX + VIEW_W + 80) return;
  ctx.fillStyle = '#8a8298'; rr(gx, GROUND_Y - 200, 8, 200, 4); ctx.fill();
  ctx.fillStyle = '#ffce5c'; circ(gx + 4, GROUND_Y - 200, 9);
  // 체크무늬 깃발
  const fw = 64, fh = 44, cell = 11;
  for (let r = 0; r < fh / cell; r++) for (let c = 0; c < fw / cell; c++) {
    ctx.fillStyle = (r + c) % 2 ? '#4a4458' : '#fffdf7';
    ctx.fillRect(gx + 8 + c * cell, GROUND_Y - 196 + r * cell, cell, cell);
  }
  ctx.font = '600 22px Jua'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('GOAL', gx + 4, GROUND_Y - 210);
}

function render() {
  const th = THEMES[(stage - 1) % 10];
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawBackground(th);
  ctx.save();
  let shx = 0, shy = 0;
  if (camShake > 0) { shx = (Math.random() - 0.5) * camShake; shy = (Math.random() - 0.5) * camShake; }
  ctx.translate(-camX + shx, shy);
  drawGround(th);
  for (const c of level.coins) if (!c.got && c.x > camX - 40 && c.x < camX + VIEW_W + 40) drawCoin(c);
  for (const it of level.items) if (!it.got && it.x > camX - 50 && it.x < camX + VIEW_W + 50) drawItem(it);
  for (const m of level.monsters) if (m.x > camX - 60 && m.x < camX + VIEW_W + 60 && (m.alive || m.dead < 0.3)) drawMonster(m);
  drawGoal();
  if (player && player.star > 0 && !(player.star < 1.5 && Math.floor(timeNow * 8) % 2 === 0)) {
    const hue = (timeNow * 320) % 360;
    const pcx2 = player.x + player.w / 2, pcy2 = player.y + player.h / 2 - 8;
    ctx.fillStyle = `hsla(${hue},85%,72%,.32)`; circ(pcx2, pcy2, 46);
    ctx.fillStyle = `hsla(${(hue + 60) % 360},85%,72%,.16)`; circ(pcx2, pcy2, 58);
  }
  if (player) drawRaccoon(player);
  for (const p of particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; circ(p.x, p.y, p.size); }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.restore();
}

/* ---------- HUD / 화면 ---------- */
function updateHUD() {
  const hearts = document.getElementById('hearts');
  let html = '';
  for (let i = 0; i < 3; i++) html += `<div class="heart${i < lives ? '' : ' empty'}"></div>`;
  hearts.innerHTML = html;
  document.getElementById('coinCount').textContent = coinsStage;
  document.getElementById('stageLabel').textContent = `STAGE ${stage} · ${THEMES[(stage - 1) % 10].name}`;
}
function updateProgress(prog) {
  document.getElementById('progFill').style.width = (prog * 100) + '%';
  document.getElementById('progMarker').style.left = (prog * 100) + '%';
}
const scr = document.getElementById('screen');
function showScreen(html) { scr.innerHTML = html; scr.classList.remove('hide'); }
function hideScreen() { scr.classList.add('hide'); }

function showMenu() {
  state = 'menu';
  document.getElementById('hud').classList.add('hide');
  document.getElementById('tapHint').classList.add('hide');
  let grid = '';
  for (let i = 1; i <= 10; i++) {
    const st = SAVE.stars[i] || 0;
    const locked = i > SAVE.unlock;
    let inner = locked ? '🔒' : `<span class="num">${i}</span>`;
    if (!locked && st > 0) inner += `<span class="srow">${'★'.repeat(st)}<span class="off">${'☆'.repeat(3 - st)}</span></span>`;
    grid += `<button class="sbtn ${locked ? 'locked' : st > 0 ? 'clear' : ''}" data-stage="${locked ? '' : i}">${inner}</button>`;
  }
  showScreen(`
    <div class="card">
      <div class="title">너구리<span class="accent">런</span></div>
      <div class="subtitle">자동으로 달려요! 탭하면 점프,<br>공중에서 또 탭하면 더블점프.<br>몬스터는 콩! 밟아서 처치해요.<br><span style="color:#ff7aa2">♥ 하트</span>로 회복, <span style="color:#e8a93a">★ 별</span>을 먹으면 잠깐 무적!</div>
      <div class="stat-row">
        <div class="stat"><div class="n">${SAVE.cleared ? '✓' : Object.keys(SAVE.stars).length + '/10'}</div><div class="l">진행</div></div>
        <div class="stat"><div class="n">${SAVE.bestCoins}</div><div class="l">최고 코인</div></div>
      </div>
      <div class="section-label">스테이지 선택</div>
      <div class="stage-grid">${grid}</div>
      <div class="btn-col"><button class="btn green" data-act="play1">${SAVE.unlock > 1 ? '이어서 도전' : '게임 시작'}</button></div>
    </div>`);
}
function showIntro(s) {
  state = 'intro';
  showScreen(`
    <div class="card">
      <div class="subtitle" style="margin:0">STAGE ${s} / 10</div>
      <div class="title" style="font-size:clamp(30px,8vw,42px)">${THEMES[(s - 1) % 10].name}</div>
      <div class="subtitle">목표 지점까지 무사히 도착하세요!<br>체력 <span style="color:#ff7aa2">♥♥♥</span></div>
      <div class="btn-col"><button class="btn" data-act="go" data-stage="${s}">출발!</button></div>
    </div>`);
}
function showClear() {
  const st = Math.max(1, lives);
  showScreen(`
    <div class="card">
      <div class="clear-stars">${'★'.repeat(st)}<span class="off">${'☆'.repeat(3 - st)}</span></div>
      <div class="title" style="font-size:clamp(30px,8vw,42px)">스테이지 클리어!</div>
      <div class="stat-row">
        <div class="stat"><div class="n">${coinsStage}</div><div class="l">코인</div></div>
        <div class="stat"><div class="n">${stageTime.toFixed(1)}s</div><div class="l">시간</div></div>
        <div class="stat"><div class="n">${lives}<span style="color:#ff7aa2">♥</span></div><div class="l">남은 체력</div></div>
      </div>
      <div class="btn-col"><button class="btn green" data-act="next">다음 스테이지 →</button>
      <button class="btn ghost" data-act="menu">스테이지 목록</button></div>
    </div>`);
}
function showGameOver() {
  showScreen(`
    <div class="card">
      <div class="big-emoji">😵</div>
      <div class="title" style="font-size:clamp(30px,8vw,42px)">앗, 쓰러졌어요</div>
      <div class="subtitle">STAGE ${stage} · 코인 ${coinsStage}개 모았어요</div>
      <div class="btn-col"><button class="btn" data-act="retry">다시 도전</button>
      <button class="btn ghost" data-act="menu">스테이지 목록</button></div>
    </div>`);
}
function showWin() {
  showScreen(`
    <div class="card">
      <div class="big-emoji">👑</div>
      <div class="title">전부 <span class="accent">클리어!</span></div>
      <div class="subtitle">10개 스테이지를 모두 깼어요!<br>대단한 너구리예요 🦝</div>
      <div class="stat-row"><div class="stat"><div class="n">${coinsRun}</div><div class="l">총 코인</div></div></div>
      <div class="btn-col"><button class="btn green" data-act="play1">처음부터 다시</button>
      <button class="btn ghost" data-act="menu">스테이지 목록</button></div>
    </div>`);
}
function showPause() {
  state = 'paused';
  document.getElementById('hud').classList.add('hide');
  showScreen(`
    <div class="card">
      <div class="title" style="font-size:clamp(30px,8vw,42px)">잠깐 멈춤</div>
      <div class="btn-col"><button class="btn green" data-act="resume">계속하기</button>
      <button class="btn ghost" data-act="menu">스테이지 목록</button></div>
    </div>`);
}

/* ---------- 입력 ---------- */
cv.addEventListener('pointerdown', () => { ensureAudio(); if (state === 'play') doJump(); });
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); ensureAudio(); if (state === 'play') doJump(); }
  if (e.code === 'Escape' && state === 'play') showPause();
});
scr.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-act],[data-stage]'); if (!b) return;
  e.stopPropagation(); ensureAudio();
  const act = b.getAttribute('data-act');
  const st = b.getAttribute('data-stage');
  if (b.classList.contains('sbtn')) { if (st) { coinsRun = 0; showIntro(+st); } return; }
  if (act === 'play1') { coinsRun = 0; showIntro(1); }
  else if (act === 'go') { startStage(+st); }
  else if (act === 'next') { coinsRun += coinsStage; showIntro(stage + 1); }
  else if (act === 'retry') { startStage(stage); }
  else if (act === 'resume') { state = 'play'; document.getElementById('hud').classList.remove('hide'); hideScreen(); }
  else if (act === 'menu') { showMenu(); }
});
document.getElementById('pauseBtn').addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') showPause(); });

/* ---------- 메인 루프 ---------- */
let last = 0;
function loop(t) {
  const dt = Math.min(0.033, (t - last) / 1000 || 0); last = t;
  update(dt);
  if (level) render();
  requestAnimationFrame(loop);
}

/* ---------- 부팅 ---------- */
function boot() {
  resize();
  // 메뉴 배경용 더미 레벨
  stage = 1; level = generateStage(1);
  player = { x: 200, y: GROUND_Y - P_H, w: P_W, h: P_H, vy: 0, prevY: 0, onGround: true, jumpsLeft: 2, inv: 0, sq: 1, runPhase: 1, dead: false };
  showMenu();
  requestAnimationFrame(loop);
}
if (document.fonts && document.fonts.load) {
  Promise.race([document.fonts.load('22px Jua'), new Promise(r => setTimeout(r, 1500))]).then(boot);
} else { boot(); }
