// 用 WebAudio 合成占位音效 —— 无需任何音频文件即可有声。后续可换真实音效。
let ctx = null;
const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
function ac() {
  if (!ctx && AudioContextCtor) ctx = new AudioContextCtor();
  return ctx;
}

function unlockAudio() {
  const c = ac(); if (!c) return;
  const resume = c.state === 'suspended' ? c.resume().catch(() => {}) : Promise.resolve();
  resume.then(() => {
    try {
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      const g = c.createGain();
      g.gain.value = 0.0001;
      src.connect(g).connect(c.destination);
      src.start(0);
    } catch (e) {}
    if (bgm && bgmKey && !muted && bgm.paused) bgm.play().catch(() => {});
  });
}

if (typeof window !== 'undefined') {
  ['pointerdown', 'touchstart', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { capture: true, passive: true });
  });
}

function withAudio(fn) {
  const c = ac(); if (!c || muted) return;
  if (c.state === 'suspended') {
    c.resume().then(() => { if (!muted && c.state === 'running') fn(c); }).catch(() => {});
    return;
  }
  fn(c);
}

function tone({ freq = 220, dur = 0.12, type = 'sine', gain = 0.18, slideTo = null }) {
  withAudio((c) => {
    const t = c.currentTime;
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur);
  });
}
// 白噪声爆破（撞击/呼啸感）
function noise({ dur = 0.15, gain = 0.2, lp = 1000 }) {
  withAudio((c) => {
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = c.createGain(); g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  });
}
const seq = (notes, step, opt = {}) => notes.forEach((f, i) => setTimeout(() => tone({ freq: f, dur: opt.dur || 0.16, type: opt.type || 'triangle', gain: opt.gain || 0.2 }), i * step));

// ---------- 背景音乐 ----------
let bgm = null, bgmKey = null, muted = false;
export function playBgm(key, vol = 0.45) {
  if (bgmKey === key && bgm && !bgm.paused) return;
  bgmKey = key;
  if (!bgm) { bgm = new Audio(); bgm.loop = true; }
  if (bgm.dataset_key !== key) { bgm.src = `assets/audio/${key}.mp3`; bgm.dataset_key = key; }
  bgm.volume = vol;
  if (!muted) bgm.play().catch(() => {});
}
export function toggleMute() {
  muted = !muted;
  if (muted) { if (bgm) bgm.pause(); }
  else if (bgmKey) { bgm.play().catch(() => {}); }
  return muted;
}
export function isMuted() { return muted; }
export function pauseBgm() { if (bgm) bgm.pause(); }
export function resumeBgm() { if (bgm && bgmKey && !muted) bgm.play().catch(() => {}); }
// ---- 语音配音 ----
let voices = [];
export function playVoice(key, vol = 1) {
  if (muted) return null;
  const a = new Audio(`assets/audio/${key}.mp3`); a.volume = vol;
  a.play().catch(() => {}); voices.push(a); return a;
}
export function stopVoices() {
  voices.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
  voices = [];
}

export const sfx = {
  sit: () => { tone({ freq: 150, slideTo: 48, dur: 0.22, type: 'sine', gain: 0.38 }); noise({ dur: 0.2, gain: 0.28, lp: 700 }); },  // 一屁股砸地
  sneeze: () => { tone({ freq: 520, slideTo: 150, dur: 0.13, type: 'sawtooth', gain: 0.16 }); noise({ dur: 0.1, gain: 0.12, lp: 2500 }); },
  hit: (combo = 0) => { tone({ freq: 320 + combo * 55, dur: 0.07, type: 'square', gain: 0.14 }); noise({ dur: 0.05, gain: 0.12, lp: 1800 }); },
  thud: () => { tone({ freq: 120, slideTo: 40, dur: 0.24, type: 'square', gain: 0.4 }); noise({ dur: 0.22, gain: 0.3, lp: 600 }); },
  whoosh: () => noise({ dur: 0.16, gain: 0.16, lp: 1400 }),
  crit: () => { tone({ freq: 1400, dur: 0.12, type: 'triangle', gain: 0.22 }); setTimeout(() => tone({ freq: 2050, dur: 0.1, type: 'triangle', gain: 0.16 }), 45); },
  hurt: () => tone({ freq: 540, slideTo: 780, dur: 0.09, type: 'square', gain: 0.12 }),
  ko: () => { tone({ freq: 320, slideTo: 50, dur: 0.36, type: 'sawtooth', gain: 0.34 }); noise({ dur: 0.32, gain: 0.3, lp: 500 }); },
  ult: () => { tone({ freq: 70, slideTo: 240, dur: 0.5, type: 'sawtooth', gain: 0.4 }); noise({ dur: 0.42, gain: 0.32, lp: 900 }); },
  dodge: () => tone({ freq: 680, slideTo: 920, dur: 0.1, type: 'triangle', gain: 0.13 }),
  levelup: () => seq([660, 880, 1175], 70, { gain: 0.2 }),
  title: () => seq([523, 784], 110, { dur: 0.16 }),
  win: () => seq([523, 659, 784, 1046, 1318], 100, { dur: 0.18, gain: 0.22 }),
  defeat: () => seq([440, 392, 330, 247], 160, { type: 'sine', dur: 0.28, gain: 0.2 }),
  click: () => tone({ freq: 420, dur: 0.05, type: 'square', gain: 0.1 }),
  spin: () => tone({ freq: 300, slideTo: 900, dur: 0.5, type: 'sine', gain: 0.1 }),
  dayflip: () => tone({ freq: 720, slideTo: 500, dur: 0.06, type: 'square', gain: 0.1 }),
  // ---- 开场用 ----
  relax: () => seq([523, 659, 784], 130, { type: 'sine', dur: 0.32, gain: 0.12 }),         // 泡澡惬意
  applause: () => { for (let i = 0; i < 7; i++) setTimeout(() => noise({ dur: 0.05, gain: 0.09, lp: 3200 }), i * 55); tone({ freq: 660, dur: 0.2, type: 'triangle', gain: 0.1 }); }, // 掌声
  clank: () => { tone({ freq: 210, slideTo: 90, dur: 0.2, type: 'square', gain: 0.22 }); noise({ dur: 0.12, gain: 0.16, lp: 1400 }); },  // 接错轨道
  crash: () => { tone({ freq: 160, slideTo: 40, dur: 0.3, type: 'sawtooth', gain: 0.34 }); noise({ dur: 0.28, gain: 0.3, lp: 800 }); },   // 哐当
  sob: () => seq([430, 360, 300, 360, 280], 150, { type: 'sine', dur: 0.24, gain: 0.16 }),   // 哭腔
  voice: () => { tone({ freq: 300, dur: 0.07, type: 'square', gain: 0.09 }); setTimeout(() => tone({ freq: 390, dur: 0.06, type: 'square', gain: 0.07 }), 75); }, // 河马"说话"占位音
  spotlight: () => tone({ freq: 520, slideTo: 1100, dur: 0.45, type: 'triangle', gain: 0.16 })
};
