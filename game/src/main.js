// 《河马返乡记》—— 对标 Capybara GO 的持久化布局 + 天数推进 + EXP升级三选一 + 场景内自动战斗。
import { loadConfig } from './config.js';
import { makeRng } from './rng.js';
import { createBattle, stepRound, triggerUlt, applyDodge } from './battle.js';
import { pickSkill, resolveSynergy } from './skills.js';
import { addMisunderstanding, checkTitleUnlock } from './titles.js';
import { resolveChoice } from './events.js';
import { spinGacha } from './gacha.js';
import { sfx, playBgm, toggleMute, isMuted, pauseBgm, resumeBgm, playVoice, stopVoices } from './audio.js';
import * as fx from './fx.js';

const app = document.getElementById('app');
const GAME_W = 432;
const GAME_H = 768;
const SCHOOL_ICON = { nap:'😴', eat:'🍞', weight:'⚖️', lazy:'🛋️' };
const SCHOOL_NAME = { nap:'午睡流', eat:'干饭流', weight:'体重流', lazy:'摆烂流' };
const RARITY_CN = { common:'普通', rare:'稀有', epic:'史诗', legendary:'传说' };
const STAT_ICON = { hp: 'icon_hp', maxHpPct: 'icon_hp', atk: 'icon_atk', def: 'icon_def', rage: 'icon_rage', weight: 'icon_weight' };
const chipIcon = (stat) => `<img class="chip-ic" src="assets/${STAT_ICON[stat] || 'icon_fame'}.png" alt="">`;
const ENEMY_ANIM = {
  enemy_thief:    { frames: 6, fw: 174, flip: false },
  enemy_thief2:   { frames: 8, fw: 173, flip: false },
  enemy_fakehero: { frames: 8, fw: 120, flip: false }
};

let C = {}, run = null;
let rng = makeRng(((Date.now() % 100000) | 0) + 7);
let paused = false, gameSpeed = 1;

function togglePause() {
  paused = !paused;
  const g = document.getElementById('game'); if (!g) return;
  if (paused) {
    g.classList.add('paused'); pauseBgm();
    const o = document.createElement('div'); o.className = 'pause-ov'; o.id = 'pause-ov';
    o.innerHTML = `<div class="pause-card"><div class="pause-title">已暂停</div><button class="bigbtn green" id="resumebtn" style="width:220px">继 续</button></div>`;
    g.appendChild(o);
    document.getElementById('resumebtn').onclick = () => { sfx.click(); togglePause(); };
  } else {
    g.classList.remove('paused'); resumeBgm();
    const o = document.getElementById('pause-ov'); if (o) o.remove();
  }
}

function fitGame() {
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  document.documentElement.style.setProperty('--gs', String(s));
}
window.addEventListener('resize', fitGame);
fitGame();

boot();
async function boot() {
  try {
    const names = ['balance','enemies','skills','events','titles','gacha','journey','intro'];
    const cfgs = await Promise.all(names.map(loadConfig));
    C = Object.fromEntries(names.map((n,i)=>[n,cfgs[i]]));
    preloadAssets();
    showTitle();
  } catch (e) {
    app.innerHTML = `<div class="game"><div style="padding:40px">配置加载失败：${e.message}<br><br>请用本地服务打开：<br>cd game && python3 -m http.server 8123 → http://localhost:8123</div></div>`;
  }
}

function preloadAssets() {
  const keys = ['hippo_idle','hippo_sit','hippo_sneeze','hippo_roll','hippo_ult','hippo_sleep','hippo_avatar','hippo_run',
    'enemy_thief','enemy_thief2','enemy_fakehero','bg_far','bg_ground','bg_mid_diner','bg_mid_market','bg_mid_station','bg_mid_temple',
    'icon_hp','icon_atk','icon_def','icon_rage','icon_weight','icon_fame','skill_nap','skill_eat','skill_weight','skill_lazy',
    'ui_btn_green','ui_btn_red','ui_btn_gold','ui_ticket','wheel','wheel_pin','wheel_needle','fx_dust','fx_shock','fx_star','fx_slash',
    'title_bg','title_hippo','title_ticket','title_logo','title_tagline','ui_banner','ui_set','ui_mute','ui_about','ui_day','ui_win','ui_lose','ui_skillbook',
    'intro_1','intro_2','intro_3','intro_4','intro_6'];
  window.__pre = keys.map(k => { const i = new Image(); i.src = `assets/${k}.png`; return i; });
}

/* ---------- 标题 + 开场 ---------- */
function showTitle() {
  app.innerHTML = `<div class="game" id="game">
    <div class="title2">
      <img class="t2-layer" src="assets/title_bg.png" alt="">
      <img class="t2-layer t2-ticket" src="assets/title_ticket.png" alt="">
      <img class="t2-layer t2-hippo" src="assets/title_hippo.png" alt="">
      <div class="t2-row" style="top:1.5%"><img class="t2-logo" src="assets/title_logo.png" alt=""></div>
      <div class="t2-row t2-tagrow" style="top:31%"><img class="t2-tag" src="assets/title_tagline.png" alt=""></div>
      <div class="t2-row" style="bottom:3.5%"><button class="bigbtn green t2-start" id="startbtn">▶ 轻触开始</button></div>
    </div></div>`;
  document.getElementById('startbtn').onclick = () => { sfx.click(); playBgm('bgm_intro'); runIntro(); };
}

function runIntro() {
  const panels = C.intro.panels; let i = 0, timer = null;
  function show() {
    if (i >= panels.length) return startGame();
    const p = panels[i];
    const body = p.black
      ? `<div class="intro black" id="intro">
          <button class="intro-skip" id="skip">跳过 »</button>
          <div class="intro-blacktext fadein">${p.narr}</div>
          <div class="intro-hint">轻触继续</div>
        </div>`
      : p.img
      ? `<div class="intro img" id="intro">
          <img class="intro-full ${p.img === 'intro_4' ? 'cam-rush' : 'cam-ken'}" src="assets/${p.img}.png" alt="">
          <button class="intro-skip" id="skip">跳过 »</button>
          <div class="intro-hint">轻触继续</div>
        </div>`
      : `<div class="intro" id="intro">
          <button class="intro-skip" id="skip">跳过 »</button>
          <div class="intro-narr fadein">${p.narr}</div>
          <div class="intro-stage${p.shake ? ' shakeit' : ''}">
            <img class="intro-hippo" src="assets/${p.sprite}.png" onerror="this.onerror=null;this.src='assets/hippo_sleep.png'" alt="">
            <div class="intro-prop">${p.prop || ''}</div>
          </div>
          ${p.line ? `<div class="intro-bubble${p.cry ? ' cry' : ''} fadein">${p.line}</div>` : '<div class="intro-bubble" style="visibility:hidden">·</div>'}
          <div class="intro-hint">轻触继续</div>
        </div>`;
    app.innerHTML = `<div class="game" id="game">${body}</div>`;
    stopVoices();   // 切镜时停掉上一镜的配音，避免串音
    // 分镜环境音
    const cue = { intro_1: 'relax', intro_2: 'applause', intro_3: 'clank', intro_4: 'crash', intro_6: 'sob' };
    if (p.black) sfx.whoosh(); else if (cue[p.img] && sfx[cue[p.img]]) sfx[cue[p.img]]();
    // 真人配音：主台词 + 偷偷插入的第二句（小声，体现偷感）
    const vtimers = [];
    if (p.voice) { vtimers.push(setTimeout(() => playVoice(p.voice, 1), 350)); }
    else if (!p.black) setTimeout(() => sfx.voice(), 420);   // 没有配音的镜用占位 blip
    if (p.voice2) { vtimers.push(setTimeout(() => playVoice(p.voice2.key, p.voice2.vol || 0.4), p.voice2.at)); }
    const adv = () => { clearTimeout(timer); vtimers.forEach(clearTimeout); stopVoices(); i++; show(); };
    document.getElementById('skip').onclick = (e) => { e.stopPropagation(); clearTimeout(timer); vtimers.forEach(clearTimeout); stopVoices(); sfx.click(); startGame(); };
    document.getElementById('intro').onclick = adv;
    timer = setTimeout(adv, p.dur);
  }
  show();
}

function startGame() { newRun(); transitionIn(); }
function transitionIn() {
  const g = document.getElementById('game'); if (!g) return;
  const s = document.createElement('div'); s.className = 'fadecover';
  g.appendChild(s); sfx.spotlight();
  setTimeout(() => s.remove(), 720);
}

function newRun() {
  playBgm('bgm_main');
  paused = false;
  // 每局新种子 → 流程、事件、敌人、技能、转盘全部不同
  rng = makeRng(((Date.now() % 1000000) | 0) * 2654435761 % 4294967296 >>> 0 || 1);
  run = {
    day: 0, log: [], pendingSkills: 0, misunderstanding: 0, titles: [], skills: [], healPerRound: 0,
    usedEvents: [], deck: [],
    hippo: { id:'hippo', name:'河马', isHippo:true, sprite:'hippo_idle',
             stats: JSON.parse(JSON.stringify(C.balance.hippoStart)), statuses:{} }
  };
  run.deck = buildRun();
  const rest = ['market', 'station', 'temple'];
  for (let i = rest.length - 1; i > 0; i--) { const j = rng.int(0, i); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  run.midOrder = ['diner', ...rest];
  renderShell();
  const [chap, sub] = (C.journey.title || '第一章').split('·').map(x => x.trim());
  pushLog(`<span class="ribbon-ch">${chap}</span><div class="dtitle">${sub || ''}</div><div class="dtext">一只只想回马戏团躺平的河马，被一只魔术箱弹到了几十公里外。返乡路，开始了。每一趟，都不太一样。</div>`, true);
  setButton('green', '下一天', onNextDay);
}

// 程序化生成一局的节点序列（每局不同）
function buildRun() {
  const N = 24, deck = [{ type: 'event' }, { type: 'battle' }];
  const since = { battle: 0, wheel: 9, treasure: 9, rest: 9 };
  for (let d = 3; d < N; d++) {
    for (const k in since) since[k]++;
    const pool = ['event', 'event', 'event'];
    if (since.battle >= 2) pool.push('battle', 'battle');
    if (since.wheel >= 5) pool.push('wheel');
    if (since.treasure >= 4) pool.push('treasure');
    if (since.rest >= 5) pool.push('rest');
    const t = rng.pick(pool);
    if (t in since) since[t] = 0;
    deck.push({ type: t });
  }
  deck.push({ type: 'battle', boss: true });
  return deck;
}

// 按天数缩放生成随机敌人
function genEnemies(day, boss) {
  const hp = 1 + day * 0.13, atk = 1 + day * 0.06, exp = 1 + day * 0.12;
  let uid = 0;
  const scale = (id, mult = 1) => {
    const c = JSON.parse(JSON.stringify(C.enemies[id]));
    c.id = `${id}_${day}_${uid++}`;
    c.stats.maxHp = c.stats.hp = Math.round(c.stats.maxHp * hp * mult);
    c.stats.atk = Math.round(c.stats.atk * atk);
    c.exp = Math.round((c.exp || 30) * exp);
    return c;
  };
  if (boss) { const b = scale('fakehero', 1.7); b.name = '章节头目 · ' + b.name; return [b]; }
  const n = day < 6 ? 1 : (rng.next() < 0.5 ? 1 : 2);
  const roster = day < 5 ? ['thief'] : day < 12 ? ['thief', 'thief2'] : ['thief', 'thief2', 'fakehero'];
  return Array.from({ length: n }, () => scale(rng.pick(roster)));
}

// 背景轨道：3 份拷贝，杜绝快速滚动时的空白缝隙
function bgTrack(k) { const i = `<img src="assets/${k}.png" alt="">`; return `<div class="track">${i}${i}${i}</div>`; }
// 当前中景街区（每 6 天换一个地点，每局顺序不同）
function currentMidKey() {
  const order = (run && run.midOrder) || ['diner'];
  return 'bg_mid_' + order[Math.floor((Math.max(1, run ? run.day : 1) - 1) / 6) % order.length];
}
function updateMidScene() {
  const want = `assets/${currentMidKey()}.png`;
  document.querySelectorAll('.bg-mid img').forEach(im => { if (!im.src.endsWith(want)) im.src = want; });
}

function pickEvent() {
  let pool = C.events.filter(e => !run.usedEvents.includes(e.id));
  if (!pool.length) { run.usedEvents = []; pool = C.events; }
  const ev = rng.pick(pool); run.usedEvents.push(ev.id); return ev;
}

/* ---------- 持久化外壳 ---------- */
function renderShell() {
  app.innerHTML = `
    <div class="game" id="game">
      <div class="topbar"><img class="topicon" id="gearbtn" src="assets/${isMuted() ? 'ui_mute' : 'ui_set'}.png" alt=""><img class="topicon" id="pausebtn" src="assets/ui_about.png" alt=""></div>
      <div class="roundtag" id="roundtag"></div>
      <div class="daybadge"><img class="daybadge-img" src="assets/ui_day.png" alt=""><span class="dn" id="daynum">01</span></div>
      <div class="scene" id="scene">
        <div class="bg bg-far">${bgTrack('bg_far')}</div>
        <div class="bg bg-mid">${bgTrack(currentMidKey())}</div>
        <div class="bg bg-ground">${bgTrack('bg_ground')}</div>
        <div class="battlefield" id="bf"></div>
      </div>
      <div class="lower">
        <div class="hud" id="hud"></div>
        <div class="log" id="log"></div>
        <div class="actionbar"><button class="bigbtn green" id="bigbtn">下一天 ▶</button></div>
      </div>
    </div>`;
  updateHud();
  setScene('idle');
  const gear = document.getElementById('gearbtn');
  if (gear) gear.onclick = () => { gear.src = 'assets/' + (toggleMute() ? 'ui_mute' : 'ui_set') + '.png'; };
  const pb = document.getElementById('pausebtn');
  if (pb) pb.onclick = () => { sfx.click(); togglePause(); };
}

function updateHud() {
  const s = run.hippo.stats;
  const hpPct = Math.max(0, s.hp / s.maxHp), expPct = Math.min(1, s.exp / s.expToNext);
  document.getElementById('hud').innerHTML = `
    <div class="pill">
      <div class="avatar"><img src="assets/hippo_avatar.png" alt=""></div>
      <div class="lvlcol">
        <div class="exprow"><span class="exptag">EXP</span><div class="expbar"><span style="transform:scaleX(${expPct})"></span></div></div>
        <div class="lv">等级 ${s.level}</div>
      </div>
      <div class="badge"><img class="bic-img" src="assets/icon_hp.png" alt=""><div class="bv">${Math.round(hpPct*100)}%<small>${s.hp}/${s.maxHp}</small></div></div>
      <div class="badge"><img class="bic-img" src="assets/icon_atk.png" alt=""><div class="bv">${s.atk}<small>攻击</small></div></div>
      <div class="badge"><img class="bic-img" src="assets/icon_def.png" alt=""><div class="bv">${s.def}<small>防御</small></div></div>
    </div>`;
}

function setScene(mode, b) {
  const bf = document.getElementById('bf');
  document.querySelectorAll('.combatind,.multi').forEach(e=>e.remove());
  const rt = document.getElementById('roundtag');
  const sc = document.getElementById('scene');
  if (mode === 'idle') {
    bf.innerHTML = `<div class="unit hippo-unit"><div class="hippo-sprite sprite"></div></div>`;
    if (rt) rt.style.display = 'none';
    if (sc) sc.classList.remove('paused');
  } else if (mode === 'battle') {
    if (sc) sc.classList.add('paused');
    bf.innerHTML = `<div class="unit hippo-unit" id="u-hippo"><img id="hippoImg" class="battle-hippo sprite" src="assets/hippo_idle.png" alt="">
        <div class="ehp me"><span></span></div></div>` +
      b.enemies.map((e,i)=>{
        const an = ENEMY_ANIM[e.sprite] || { frames: 1, fw: 150, flip: false };
        const n = b.enemies.length;
        const back = n > 1 && i === 0;                 // 双敌时第一个排后面
        const H = Math.round((n > 1 ? 96 : 110) * (back ? 0.84 : 1));
        const dw = Math.round(an.fw * H / 150), dsw = dw * an.frames;
        const right = n === 1 ? 15 : (back ? 3 : 22);  // 前排敌人右移，避免压到河马
        const bottomPx = 6 + (back ? 26 : 0);          // 后排抬高，制造纵深
        return `<div class="unit enemy-unit" id="u-${e.id}" style="right:${right}%;bottom:${bottomPx}px;z-index:${back ? 2 : 4}">
        <div class="enemy-anim sprite" style="--sw:${dsw}px;width:${dw}px;height:${H}px;background-image:url(assets/${e.sprite}.png);background-size:${dsw}px ${H}px;animation:enwalk .8s steps(${an.frames}) infinite;${an.flip ? 'transform:scaleX(-1)' : ''}"></div>
        <div class="ehp foe"><span></span></div><div class="ehp-num" id="hp-${e.id}"></div></div>`; }).join('');
    if (rt) rt.style.display = 'block';
    sc.insertAdjacentHTML('beforeend', `<div class="combatind"><div class="lab">伤害次数</div><div class="cnt" id="combo">0</div></div><div class="multi" id="speedbtn">x${gameSpeed}<small>倍速</small></div>`);
    const sb = document.getElementById('speedbtn');
    if (sb) sb.onclick = () => { gameSpeed = gameSpeed >= 3 ? 1 : gameSpeed + 1; sb.innerHTML = `x${gameSpeed}<small>倍速</small>`; sfx.click(); };
  }
}

function sceneSVG() {
  return `<svg viewBox="0 0 420 340" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79c4ee"/><stop offset="1" stop-color="#cfeeff"/></linearGradient></defs>
    <rect width="420" height="340" fill="url(#sky)"/>
    <circle cx="356" cy="52" r="26" fill="#fff1a8"/><circle cx="356" cy="52" r="34" fill="#fff1a8" opacity=".3"/>
    <g fill="#ffffffdd"><ellipse cx="80" cy="58" rx="40" ry="17"/><ellipse cx="118" cy="50" rx="28" ry="13"/><ellipse cx="250" cy="44" rx="32" ry="14"/></g>
    <ellipse cx="-20" cy="250" rx="190" ry="110" fill="#8fd07a"/><ellipse cx="440" cy="240" rx="210" ry="120" fill="#79bd63"/>
    <!-- 左树丛 -->
    <g fill="#3f8a37"><circle cx="34" cy="180" r="34"/><circle cx="78" cy="172" r="40"/></g><g fill="#57a648"><circle cx="34" cy="172" r="27"/><circle cx="78" cy="164" r="32"/></g>
    <!-- 路牌 -->
    <rect x="150" y="150" width="8" height="60" rx="3" fill="#8a5a30"/>
    <rect x="120" y="156" width="52" height="18" rx="3" fill="#c79a5c" stroke="#8a5a30" stroke-width="2"/>
    <rect x="120" y="178" width="52" height="18" rx="3" fill="#c79a5c" stroke="#8a5a30" stroke-width="2"/>
    <!-- 大篷车小屋 -->
    <g><rect x="196" y="168" width="86" height="56" rx="8" fill="#e7d3a8" stroke="#b78f56" stroke-width="3"/>
      <path d="M190 170 q49 -34 98 0 z" fill="#5b8fd6" stroke="#3f6fb0" stroke-width="3"/>
      <circle cx="212" cy="226" r="11" fill="#6b4a2c" stroke="#3f2c18" stroke-width="3"/><circle cx="266" cy="226" r="11" fill="#6b4a2c" stroke="#3f2c18" stroke-width="3"/>
      <rect x="204" y="190" width="20" height="34" rx="3" fill="#9c6b3f"/><rect x="240" y="186" width="22" height="20" rx="3" fill="#bfe3ff" stroke="#9c6b3f" stroke-width="2"/>
      <rect x="236" y="150" width="6" height="20" fill="#8a5a30"/><path d="M242 150 l16 6 -16 6 z" fill="#d8472c"/></g>
    <!-- 马戏团帐篷 -->
    <g><path d="M320 222 v-26 h66 v26 z" fill="#f3e2cf"/>
      <path d="M312 196 q41 -40 82 0 z" fill="#d8472c"/>
      <path d="M353 158 q-21 18 -41 38 h20 z" fill="#fff"/><path d="M353 158 q21 18 41 38 h-20 z" fill="#fff"/>
      <rect x="349" y="150" width="5" height="12" fill="#8a5a30"/><path d="M354 150 l13 5 -13 5 z" fill="#ffcb3b"/>
      <rect x="345" y="200" width="16" height="22" fill="#a8331d"/></g>
    <!-- 栅栏 -->
    <g stroke="#fff" stroke-width="4" opacity=".9"><line x1="296" y1="226" x2="296" y2="240"/><line x1="308" y1="226" x2="308" y2="240"/><line x1="290" y1="232" x2="314" y2="232"/></g>
    <!-- 地面 -->
    <rect y="232" width="420" height="108" fill="#d9b069"/>
    <rect y="232" width="420" height="9" fill="#c2974c"/>
    <ellipse cx="210" cy="250" rx="150" ry="14" fill="#cda45c" opacity=".5"/>
    <g fill="#74bd5e"><ellipse cx="30" cy="252" rx="14" ry="6"/><ellipse cx="400" cy="256" rx="16" ry="6"/></g>
  </svg>`;
}

function setButton(kind, text, handler, enabled = true) {
  // 重建底部操作区（战斗时这里会被换成暴走/翻身按钮，重建可恢复单按钮）
  const bar = document.querySelector('.actionbar');
  if (!bar) return;
  bar.innerHTML = `<button class="bigbtn ${kind}" id="bigbtn"${enabled ? '' : ' disabled'}></button>`;
  const btn = document.getElementById('bigbtn');
  btn.textContent = text;
  if (handler && enabled) btn.onclick = () => { sfx.click(); handler(); };
}

function pushLog(html, chapter = false) {
  run.log.push(html);
  const log = document.getElementById('log');
  if (!log) return;
  log.insertAdjacentHTML('beforeend', `<div class="daycard${chapter ? ' chapter' : ''}">${html}</div>`);
  log.scrollTop = log.scrollHeight;
}

/* ---------- 天数推进（程序化随机） ---------- */
function onNextDay() {
  if (run.day >= run.deck.length) return renderResult();
  run.day++; sfx.dayflip();
  const dn = document.getElementById('daynum'); if (dn) dn.textContent = String(run.day).padStart(2, '0');
  const node = run.deck[run.day - 1];
  updateMidScene();                                // 进入新地点时切换街景
  if (node.type !== 'battle') setScene('idle');   // 非战斗：河马继续奔跑赶路
  if (node.type === 'battle') {
    const enemies = genEnemies(run.day, node.boss);
    const intro = node.boss ? '一个大块头堵住了去路，看起来是这一带的头目。'
      : rng.pick(['前面有动静，一伙小贼盯上了河马。', '拦路的家伙看起来不太友好。', '草丛里窜出个想找麻烦的。']);
    return startBattle({ enemies, boss: node.boss, intro });
  }
  if (node.type === 'wheel') return openWheel({ text: '镇民塞给河马一张券，让他转个运。' });
  if (node.type === 'treasure') return doTreasure();
  if (node.type === 'rest') return doRest();
  return presentEvent(pickEvent());
}

function presentEvent(ev) {
  if (ev.choices) return showChoiceEvent(ev);
  const chips = (ev.effects || []).map(applyEffect).join('');
  const npc = ev.npcText ? `<div class="dtext" style="color:var(--ink-soft);font-style:italic">${ev.npcText}</div>` : '';
  pushLog(`<div class="dday">第 ${run.day} 天</div><div class="dtext">${ev.text}</div>${npc}${chips ? `<div class="chips">${chips}</div>` : ''}`);
  if (ev.exp) addExp(ev.exp);
  updateHud();
  afterGains(() => setButton('green', '下一天 ▶', onNextDay));
}

function showChoiceEvent(ev) {
  const ov = document.createElement('div'); ov.className = 'overlay center'; ov.id = 'overlay';
  ov.innerHTML = `<div class="center-card">
      <div class="dday" style="color:var(--orange-d);font-weight:800">第 ${run.day} 天</div>
      <div style="font-size:17px;font-weight:700;color:var(--ink);line-height:1.5;margin:8px 0">${ev.text}</div>
      ${ev.npcText ? `<div class="quip">${ev.npcText}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="bigbtn green" data-i="0">${ev.choices[0].label}</button>
        <button class="bigbtn gold" data-i="1">${ev.choices[1].label}</button>
      </div></div>`;
  document.getElementById('game').appendChild(ov);
  ov.querySelectorAll('button').forEach(btn => btn.onclick = () => {
    sfx.click();
    const ch = ev.choices[+btn.dataset.i];
    const { log } = resolveChoice(run, ch);
    if (ch.outcome.exp) addExp(ch.outcome.exp);
    ov.remove();
    pushLog(`<div class="dday">第 ${run.day} 天</div><div class="dtext">${ev.text}</div><div class="dtext" style="color:var(--green-d);font-weight:700">${log}</div>`);
    updateHud();
    afterGains(() => setButton('green', '下一天 ▶', onNextDay));
  });
}

function doTreasure() {
  const rolls = [{ s: 'atk', v: 6, l: '攻击+6' }, { s: 'def', v: 4, l: '防御+4' }, { s: 'maxHp', v: 30, l: '最大生命+30' }];
  const r = rng.pick(rolls);
  run.hippo.stats[r.s] += r.v; if (r.s === 'maxHp') run.hippo.stats.hp += r.v;
  pushLog(`<div class="dday">第 ${run.day} 天 · 意外之财</div><div class="dtext">河马在路边踢到一个包袱，里面居然有点好东西。</div><div class="chips"><span class="chip up">${chipIcon(r.s)}${r.l}</span></div>`);
  addExp(20); updateHud();
  afterGains(() => setButton('green', '下一天 ▶', onNextDay));
}

function doRest() {
  const heal = Math.round(run.hippo.stats.maxHp * 0.4);
  run.hippo.stats.hp = Math.min(run.hippo.stats.maxHp, run.hippo.stats.hp + heal);
  pushLog(`<div class="dday">第 ${run.day} 天 · 歇脚</div><div class="dtext">河马找了块阴凉地，睡了个回笼觉。生命回复了不少。</div><div class="chips"><span class="chip up">${chipIcon('hp')}+${heal}</span></div>`);
  updateHud(); setButton('green', '下一天 ▶', onNextDay);
}

function applyEffect(eff) {
  const s = run.hippo.stats;
  if (eff.stat === 'maxHpPct') { const d = Math.round(s.maxHp * eff.v); s.maxHp += d; s.hp = Math.min(s.hp, s.maxHp); }
  else if (eff.stat) s[eff.stat] = Math.max(0, (s[eff.stat] || 0) + eff.v);
  const dir = eff.v < 0 ? 'down' : 'up';
  return `<span class="chip ${dir}">${chipIcon(eff.stat)}${eff.label}</span>`;
}

/* ---------- EXP / 升级 ---------- */
function addExp(amt) {
  const s = run.hippo.stats; s.exp += amt;
  const L = C.balance.level;
  while (s.exp >= s.expToNext) {
    s.exp -= s.expToNext; s.level++;
    s.expToNext = L.base + L.growth * (s.level - 1);
    s.maxHp += L.hpPerLevel; s.hp += L.hpPerLevel; s.atk += L.atkPerLevel; s.def += L.defPerLevel;
    run.pendingSkills++; sfx.levelup();
  }
}

// 处理升级带来的三选一队列，再执行 cont
function afterGains(cont) {
  if (run.pendingSkills > 0 && C.skills.some(s => !run.skills.find(x => x.id === s.id))) {
    run.pendingSkills--;
    return openSkillChoice(() => afterGains(cont));
  }
  run.pendingSkills = 0;
  cont();
}

// 把已学技能聚合成战斗增益（让构筑真正在战斗里生效）
function battleMods() {
  const m = { dodgeChance: 0, thorns: 0, denyDeath: false, atkOnHeal: 0 };
  for (const s of run.skills) {
    const e = s.effects || {};
    if (e.dodgeChance) m.dodgeChance += e.dodgeChance;
    if (e.thorns) m.thorns += e.thorns;
    if (e.lazyThorns) m.thorns += e.lazyThorns;
    if (e.denyDeath) m.denyDeath = true;
    if (e.atkOnHeal) m.atkOnHeal += e.atkOnHeal;
  }
  const syn = resolveSynergy(run.skills);
  if (syn.includes('nap')) m.dodgeChance += 0.2;     // 午睡流质变：更高闪避
  if (syn.includes('lazy')) m.thorns += 0.3;          // 摆烂流质变：更强反伤
  m.dodgeChance = Math.min(0.65, m.dodgeChance);
  return { m, syn };
}

/* ---------- 战斗（场景内自动战斗，对标 Capybara GO） ---------- */
function startBattle(entry) {
  if (entry.intro) pushLog(`<div class="dday">第 ${run.day} 天${entry.boss ? ' · 头目' : ''}</div><div class="dtext">${entry.intro}</div>`);
  const enemies = entry.enemies;
  const totalExp = enemies.reduce((a, e) => a + (e.exp || 0), 0);
  const { m: mods } = battleMods();
  const b = createBattle(run.hippo, enemies, C.balance, { mods, rng });
  setScene('battle', b);
  playBgm('bgm_battle');
  const bf = document.getElementById('bf');
  let combo = 0, prevHp = b.hippo.stats.hp, armedDodge = false;

  function renderControls() {
    const bar = document.querySelector('.actionbar');
    bar.innerHTML = `<div style="display:flex;gap:8px">
      <button class="bigbtn gold" id="btn-ult" style="flex:1;height:58px;font-size:15px;letter-spacing:0" disabled>暴走</button>
      <button class="bigbtn green" id="btn-dodge" style="flex:1;height:58px;font-size:15px;letter-spacing:0">翻 身</button></div>`;
    document.getElementById('btn-ult').onclick = () => { if (triggerUlt(b)) { ultJuice(); paint(); if (b.over) finish(); } };
    document.getElementById('btn-dodge').onclick = () => { armedDodge = true; sfx.click(); document.getElementById('btn-dodge').textContent = '已备好'; };
  }
  function updateUlt() {
    const u = document.getElementById('btn-ult'); if (!u) return;
    const ready = b.hippo.stats.rage >= (C.balance.ultRageCost || 100);
    u.disabled = !ready; u.textContent = ready ? '暴走！' : `暴走 ${Math.round(b.hippo.stats.rage)}%`;
  }
  function ultJuice() {
    setHippo('ult'); sfx.ult();
    const game = document.getElementById('game');
    fx.shakeStage(game, true); fx.screenFlash(game, '#fff7d0', 240);
    b.enemies.forEach(e => {
      const p = epos(e.id), tu = document.getElementById('u-' + e.id);
      fx.flash(tu && tu.querySelector('.sprite')); fx.knockback(tu && tu.querySelector('.sprite'));
      fx.sprite(bf, p.x, p.y, 'fx_slash', 185); fx.burst(bf, p.x, p.y, '#ffd84d', 20); fx.popDamage(bf, p.x, p.y, '暴走!', true);
    });
    setTimeout(() => setHippo('idle'), 760);
  }
  renderControls();
  paint();
  function paint() {
    const meBar = bf.querySelector('.ehp.me > span');
    if (meBar) meBar.style.transform = `scaleX(${Math.max(0, b.hippo.stats.hp / b.hippo.stats.maxHp)})`;
    b.enemies.forEach(e => {
      const u = document.getElementById('u-' + e.id); if (!u) return;
      u.querySelector('.ehp > span').style.transform = `scaleX(${Math.max(0, e.stats.hp / e.stats.maxHp)})`;
      const num = document.getElementById('hp-' + e.id); if (num) num.textContent = Math.max(0, e.stats.hp);
      u.classList.toggle('dead', e.stats.hp <= 0);
    });
    const rtg = document.getElementById('roundtag'); if (rtg) rtg.textContent = `回合 ${b.round}/${b.maxRounds}`;
    updateUlt();
  }
  function epos(id) {
    const u = document.getElementById('u-' + id), f = bf;
    if (!u) return { x: 280, y: 60 };
    const ur = u.getBoundingClientRect(), fr = f.getBoundingClientRect();
    return { x: ur.left - fr.left + ur.width / 2, y: ur.top - fr.top };
  }
  function setHippo(state) { const h = document.getElementById('hippoImg'); if (h) h.src = `assets/hippo_${state}.png`; }
  function juice(mv) {
    if (!mv || mv.kind !== 'attack') return;
    combo++;
    const cEl = document.getElementById('combo'); if (cEl) cEl.textContent = combo;
    const game = document.getElementById('game'), hEl = document.getElementById('hippoImg');
    const sit = mv.move.includes('坐下'), sneeze = mv.move.includes('喷嚏'), roll = mv.move.includes('翻');
    setHippo(sit ? 'sit' : sneeze ? 'sneeze' : roll ? 'roll' : 'idle');
    fx.anim(hEl, sit ? 'squash' : 'hop');
    const tu = document.getElementById('u-' + mv.targetId), tsp = tu && tu.querySelector('.sprite');
    const p = epos(mv.targetId);
    // 敌人被打：白闪 + 击退 + 飘字 + 斩击 + 迸溅
    fx.flash(tsp); fx.knockback(tsp);
    fx.popDamage(bf, p.x, p.y, mv.dmg, sit);
    fx.sprite(bf, p.x, p.y, 'fx_slash', sit ? 165 : 120);
    fx.burst(bf, p.x, p.y, sit ? '#ffd24d' : '#fff', sit ? 18 : 10);
    if (sit) {                                   // 一屁股砸地：重击拉满
      sfx.sit(); fx.hitstop(150); fx.shakeStage(game, true); fx.screenFlash(game, '#ffffff', 130);
      fx.burst(bf, p.x, p.y + 22, '#d9a86e', 18);
    } else {
      sneeze ? sfx.sneeze() : sfx.hit(combo);
      fx.hitstop(55); fx.shakeStage(game);
    }
    if (mv.killed) {                             // 击杀：定格 + 强震 + KO
      sfx.ko(); fx.hitstop(190); fx.shakeStage(game, true); fx.screenFlash(game, '#ffffff', 200);
      fx.sprite(bf, p.x, p.y, 'fx_star', 150); fx.burst(bf, p.x, p.y, '#ffd84d', 22);
    } else sfx.hurt();
    setTimeout(() => setHippo('idle'), 520);
  }
  function tick() {
    if (b.over) return;
    if (paused) { setTimeout(tick, 150); return; }
    if (fx.isFrozen()) { setTimeout(tick, 60); return; }
    if (run.healPerRound) {
      b.hippo.stats.hp = Math.min(b.hippo.stats.maxHp, b.hippo.stats.hp + run.healPerRound);
      if (mods.atkOnHeal) b.hippo.stats.atk += mods.atkOnHeal;
    }
    if (armedDodge) { applyDodge(b); armedDodge = false; const d = document.getElementById('btn-dodge'); if (d) d.textContent = '翻身'; }
    stepRound(b);
    juice(b.lastMove);
    if (b.hippo.stats.hp < prevHp) fx.anim(document.querySelector('.hippo-unit .sprite'), 'shakeit');
    prevHp = b.hippo.stats.hp;
    paint();
    if (b.over) return finish();
    setTimeout(tick, Math.round(900 / gameSpeed));
  }
  function finish() {
    const rt = document.getElementById('roundtag'); if (rt) rt.style.display = 'none';
    playBgm('bgm_main');
    if (b.win) {
      run.hippo.stats.hp = b.hippo.stats.hp; run.hippo.stats.rage = 0;
      sfx.win();
      pushLog(`<div class="dtext">河马稀里糊涂地赢了。<b>经验 +${totalExp}</b></div>`);
      addExp(totalExp); updateHud();
      setTimeout(() => afterGains(() => { if (entry.boss) return renderResult(); setScene('idle'); setButton('green', '下一天 ▶', onNextDay); }), 700);
    } else {
      endBanner(false); sfx.defeat();
      pushLog(`<div class="dtext">河马被自己绊倒，决定先睡一觉。（失败在这个游戏里不太严重。）</div>`);
      run.hippo.stats.hp = Math.round(run.hippo.stats.maxHp * 0.5);
      updateHud(); setScene('idle');
      setButton('green', '揉揉眼，下一天', onNextDay);
    }
  }
  setTimeout(tick, 650);
}

/* ---------- 三选一技能 overlay ---------- */
function openSkillChoice(done) {
  const three = pickSkill(C.skills, run.skills.map(s => s.id), rng);
  if (!three.length) return done();
  sfx.title();
  const cards = three.map((s, i) => `
    <div class="skillcard" data-i="${i}">
      <div class="icon"><img class="skill-ic" src="assets/skill_${s.school}.png" alt="">${`<span class="ribbon ${s.rarity}">${RARITY_CN[s.rarity]}</span>`}</div>
      <div><div class="sname">${s.name}</div><div class="sdesc">${SCHOOL_NAME[s.school]} · ${s.desc}</div></div>
    </div>`).join('');
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'overlay';
  ov.innerHTML = `
    <div class="hero-pedestal">
      <span class="sparkle" style="left:-6px;top:10px">✨</span><span class="sparkle" style="right:-4px;top:28px;animation-delay:.6s">✨</span>
      <div class="hippo-sprite pedestal-hippo"></div>
    </div>
    <div class="banner art"><h2>选择技能</h2></div>
    <div class="sub">河马其实没想学，但镇民非要教他点什么</div>
    <div class="skillcards">${cards}</div>
    <div class="learned" id="skillbook"><img src="assets/ui_skillbook.png" alt=""><div class="learned-count">已学 ${run.skills.length}</div></div>`;
  document.getElementById('game').appendChild(ov);
  const sbk = document.getElementById('skillbook');
  if (sbk) sbk.onclick = (e) => { e.stopPropagation(); sfx.click(); showLearnedSkills(); };
  ov.querySelectorAll('.skillcard').forEach(card => card.onclick = () => {
    sfx.click();
    const s = three[+card.dataset.i];
    run.skills.push(s); applySkill(s);
    const syn = resolveSynergy(run.skills);
    ov.remove(); updateHud();
    if (syn.length) toast(`协同质变！${syn.map(k => SCHOOL_NAME[k]).join('、')}`);
    setTimeout(done, syn.length ? 700 : 50);
  });
}
function showLearnedSkills() {
  const list = run.skills.length
    ? run.skills.map(s => `<div class="ls-item ${s.school}"><img class="skill-ic" src="assets/skill_${s.school}.png" alt="">
        <div><div class="sname">${s.name}<span class="rtag ${s.rarity}">${RARITY_CN[s.rarity]}</span></div>
        <div class="sdesc">${SCHOOL_NAME[s.school]} · ${s.desc}</div></div></div>`).join('')
    : '<div style="color:var(--ink-soft);text-align:center;padding:24px;font-weight:700">还没学过任何技能</div>';
  const syn = resolveSynergy(run.skills);
  const synLine = syn.length ? `<div class="ls-syn">⚡ 已触发协同：${syn.map(k => SCHOOL_NAME[k]).join('、')}</div>` : '';
  const ov = document.createElement('div'); ov.className = 'overlay center'; ov.id = 'lsoverlay';
  ov.innerHTML = `<div class="ls-panel">
      <div class="banner art"><h2>技能书</h2></div>
      ${synLine}
      <div class="ls-list">${list}</div>
      <button class="bigbtn green" id="lsclose" style="width:62%;margin-top:12px">关 闭</button>
    </div>`;
  document.getElementById('game').appendChild(ov);
  const close = () => { sfx.click(); ov.remove(); };
  document.getElementById('lsclose').onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
}
function applySkill(s) {
  const e = s.effects || {};
  if (e.healPerRound) run.healPerRound += e.healPerRound;
  if (e.weightBonus) run.hippo.stats.weight = Math.round(run.hippo.stats.weight * (1 + e.weightBonus));
}

/* ---------- 转盘 ---------- */
function openWheel(entry) {
  if (entry.text) pushLog(`<div class="dday">第 ${run.day} 天</div><div class="dtext">${entry.text}</div>`);
  const segs = C.gacha.segments;
  const seg360 = 360 / segs.length;
  const labels = segs.map((s, i) => { const a = seg360 * i + seg360 / 2; return `<div class="seglabel" style="transform:rotate(${a}deg) translateY(-74px) rotate(${-a}deg)">${s.label}</div>`; }).join('');
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'overlay';
  ov.innerHTML = `<div class="banner art"><h2>甜点转盘</h2></div>
    <div class="wheelwrap">
      <div class="wheel-real"><img class="wheel-face" src="assets/wheel.png" alt="">${labels}<img class="wheel-needle" id="needle" src="assets/wheel_needle.png" alt=""></div>
      <button class="bigbtn gold" id="spin" style="width:74%;font-size:19px;letter-spacing:2px">转 一 下</button></div>`;
  document.getElementById('game').appendChild(ov);
  document.getElementById('spin').onclick = () => {
    const btn = document.getElementById('spin'); btn.disabled = true; sfx.spin();
    const seg = spinGacha(C.gacha, rng), idx = segs.indexOf(seg);
    const target = 360 * 4 + (seg360 * idx + seg360 / 2);   // 指针转到该扇区中心（缓入缓出由 CSS 曲线控制）
    document.getElementById('needle').style.transform = `translateX(-50%) rotate(${target}deg)`;
    setTimeout(() => {
      // 转出的奖励飞出展示
      sfx.win();
      const reveal = document.createElement('div'); reveal.className = 'gacha-reveal';
      reveal.innerHTML = `<div class="reveal-card"><div class="reveal-sub">恭喜抽中</div><div class="reveal-label">${seg.label}</div></div>`;
      ov.appendChild(reveal);
      const rc = reveal.getBoundingClientRect();
      fx.burst(reveal, reveal.offsetWidth / 2, reveal.offsetHeight / 2, '#ffd84d', 22);
      setTimeout(() => {
        applyGacha(seg); ov.remove(); updateHud();
        pushLog(`<div class="dtext">转盘停在「${seg.label}」。</div>`);
        afterGains(() => setButton('green', '下一天 ▶', onNextDay));
      }, 1500);
    }, 4150);
  };
}
function applyGacha(seg) {
  const r = seg.reward || {}, s = run.hippo.stats;
  if (r.stats) for (const [k, v] of Object.entries(r.stats)) s[k] += v;
  if (r.healFull) s.hp = s.maxHp;
  if (r.exp) addExp(r.exp);
  if (r.skill) { const pool = C.skills.filter(x => !run.skills.find(y => y.id === x.id)); if (pool.length) { const sk = rng.pick(pool); run.skills.push(sk); applySkill(sk); } }
}

/* ---------- 结算 ---------- */
function renderResult() {
  addMisunderstanding(run, 30 + run.day * 4);
  checkTitleUnlock(run, C.titles);
  const tags = run.titles.length ? run.titles.map(id => `<span class="ttag"><img class="chip-ic" src="assets/icon_fame.png" alt="">${C.titles.find(t => t.id === id).name}</span>`).join('')
    : '<span class="quip">（这一路居然没被误会成什么人物。）</span>';
  const ov = document.createElement('div');
  ov.className = 'overlay center'; ov.id = 'overlay';
  ov.innerHTML = `<div class="center-card">
      <img class="result-icon" src="assets/ui_win.png" alt="">
      <div class="big">"传奇就此诞生！"<br>全镇人民认为河马完成了一场伟大冒险。</div>
      <div class="ttags">${tags}</div>
      <div class="punch">"……晚饭呢？"</div>
      <div class="quip">河马只想知道哪里包吃包住。</div>
      <button class="bigbtn green" id="again" style="margin-top:16px">换套蠢办法，再来一局</button>
    </div>`;
  document.getElementById('game').appendChild(ov);
  sfx.win();
  document.getElementById('again').onclick = () => { sfx.click(); ov.remove(); newRun(); };
}

/* ---------- 工具 ---------- */
function endBanner(win) {
  const game = document.getElementById('game'); if (!game) return;
  const el = document.createElement('div'); el.className = 'endbanner';
  el.innerHTML = `<img src="assets/${win ? 'ui_win' : 'ui_lose'}.png" alt=""><div class="endlabel ${win ? 'w' : 'l'}">${win ? '胜利！' : '失败…'}</div>`;
  game.appendChild(el); setTimeout(() => el.remove(), 1250);
}
function toast(msg) {
  const g = document.getElementById('game'); const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg; g.appendChild(t); setTimeout(() => t.remove(), 1300);
}
function enemyEmoji(k) { return ({ enemy_thief:'🦝', enemy_thief2:'🐀', enemy_fakehero:'🦸' })[k] || '👾'; }
