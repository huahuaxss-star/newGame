// Juice —— 打击感即喜剧。顿帧/屏震/飘字/粒子/挤压。参数尽量读 balance。
let frozenUntil = 0;

export function hitstop(ms = 90) { frozenUntil = performance.now() + ms; }
export function isFrozen() { return performance.now() < frozenUntil; }

export function shakeStage(stageEl, hard = false) {
  if (!stageEl) return;
  const cls = hard ? 'shake-hard' : 'shake';
  stageEl.classList.remove('shake', 'shake-hard'); void stageEl.offsetWidth; stageEl.classList.add(cls);
  setTimeout(() => stageEl.classList.remove(cls), hard ? 420 : 300);
}

// 命中白闪（敌人被打高亮一下）—— 用 filter（不与内联 animation 冲突）
export function flash(el) {
  if (!el) return;
  el.classList.add('hitflash');
  setTimeout(() => el.classList.remove('hitflash'), 150);
}
// 击退（JS 直接改 transform，因为敌人内联占用了 animation 属性）
export function knockback(el, dist = 14) {
  if (!el) return;
  el.style.transition = 'transform .07s ease-out';
  el.style.transform = `translateX(${dist}px)`;
  setTimeout(() => { el.style.transform = ''; }, 95);
}

// 全屏冲击闪光
export function screenFlash(stageEl, color = '#ffffff', dur = 180) {
  if (!stageEl) return;
  const f = document.createElement('div');
  f.style.cssText = `position:absolute;inset:0;background:${color};pointer-events:none;z-index:32;animation:scrflash ${dur}ms ease-out forwards`;
  stageEl.appendChild(f);
  setTimeout(() => f.remove(), dur + 30);
}

// 在某元素上播放动画类（squash / hop / shakeit）
export function anim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 500);
}

// 伤害飘字
export function popDamage(layer, x, y, n, crit = false) {
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'popnum' + (crit ? ' crit' : '');
  el.textContent = (crit ? '' : '-') + n;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 850);
}

// 通用特效贴图（fx_shock / fx_star / fx_slash …）
export function sprite(layer, x, y, key, size = 150) {
  if (!layer) return;
  const el = document.createElement('img');
  el.src = `assets/${key}.png`;
  el.style.cssText = `position:absolute;left:${x - size/2}px;top:${y - size/2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:24;animation:dustpop .5s ease-out forwards`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 520);
}

// 灰尘冲击贴图（用美术 fx_dust.png）
export function dust(layer, x, y) {
  if (!layer) return;
  const el = document.createElement('img');
  el.src = 'assets/fx_dust.png';
  el.style.cssText = `position:absolute;left:${x-60}px;top:${y-30}px;width:120px;height:120px;pointer-events:none;z-index:23;animation:dustpop .5s ease-out forwards`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 520);
}

// 粒子爆裂（灰尘/星星）
export function burst(layer, x, y, color = '#fff', count = 10) {
  if (!layer) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const ang = (Math.PI * 2 * i) / count + Math.random();
    const dist = 30 + Math.random() * 40;
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', (Math.sin(ang) * dist - 20) + 'px');
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.background = color;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 720);
  }
}
