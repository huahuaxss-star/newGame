// 战斗引擎 —— 纯逻辑,无 DOM。表现层在 ui/battleView.js 读取这里的状态做演出。
// 设计：河马"不打架",普攻是被动蠢动作；玩家的能动性来自暴走(triggerUlt)和翻身闪避(applyDodge)。

const clone = (c) => JSON.parse(JSON.stringify(c));

const HIPPO_MOVES = ['一屁股坐下', '打了个喷嚏', '翻了个身', '顺手抢了口吃的'];

// 伤害 = 攻击 + 体重加成 - 防御，最低 1
export function damage(attacker, defender, balance) {
  const w = (attacker.weight || 0) * (balance.weightToDamage || 0);
  return Math.max(1, Math.round((attacker.atk || 0) + w - (defender.def || 0)));
}

export function createBattle(hippo, enemies, balance, opts = {}) {
  return {
    mods: opts.mods || {},
    rng: opts.rng || { next: () => 0 },
    deniedDeath: false,
    round: 1,
    maxRounds: balance.maxRounds,
    hippo: clone(hippo),
    enemies: enemies.map(clone),
    log: [],
    over: false,
    win: null,
    dodgeWindow: false,
    lastMove: null,
    balance
  };
}

function settle(b) {
  if (b.enemies.every(e => e.stats.hp <= 0)) { b.over = true; b.win = true; }
  else if (b.hippo.stats.hp <= 0) { b.over = true; b.win = false; }
  else if (b.round >= b.maxRounds) { b.over = true; b.win = false; }
  return b;
}

// 推进一个回合：河马被动普攻 → 敌人反击(可被翻身闪避) → 结算/进位
export function stepRound(b) {
  if (b.over) return b;

  const target = b.enemies.find(e => e.stats.hp > 0);
  if (target) {
    const move = HIPPO_MOVES[(b.round - 1) % HIPPO_MOVES.length];
    const dmg = damage(b.hippo.stats, target.stats, b.balance);
    target.stats.hp = Math.max(0, target.stats.hp - dmg);
    b.hippo.stats.rage = Math.min(b.hippo.stats.maxRage, b.hippo.stats.rage + 25);
    b.lastMove = { kind: 'attack', move, targetId: target.id, dmg, killed: target.stats.hp <= 0 };
    b.log.push(`河马${move}，${target.name} -${dmg}`);
  }

  // 敌人反击；若玩家在窗口内点了翻身，本回合整轮闪避
  if (b.dodgeWindow) {
    b.dodgeWindow = false;
    b.lastMove = { kind: 'dodge' };
    b.log.push('河马睡梦中翻了个身，正好躲过了所有偷袭。');
  } else {
    const m = b.mods;
    for (const e of b.enemies) {
      if (e.stats.hp <= 0) continue;
      if (m.dodgeChance && b.rng.next() < m.dodgeChance) { b.log.push(`${e.name}的偷袭被河马一个翻身躲过了。`); continue; }
      const dmg = damage(e.stats, b.hippo.stats, b.balance);
      b.hippo.stats.hp -= dmg;
      b.log.push(`${e.name}偷袭，河马 -${dmg}`);
      if (m.thorns) { const t = Math.max(1, Math.round(dmg * m.thorns)); e.stats.hp = Math.max(0, e.stats.hp - t); b.log.push(`（枕头反弹 ${t}）`); }
      if (b.hippo.stats.hp <= 0 && m.denyDeath && !b.deniedDeath) { b.hippo.stats.hp = 1; b.deniedDeath = true; b.log.push('河马：“我没答应。”（拒绝了致命一击）'); }
      b.hippo.stats.hp = Math.max(0, b.hippo.stats.hp);
    }
  }

  settle(b);
  if (!b.over) b.round++;
  return b;
}

// 暴走(被吵醒/饿狠了)：需满饿怒，对全场造成 2 倍伤害，清空怒气
export function triggerUlt(b) {
  if (b.over) return false;
  if (b.hippo.stats.rage < (b.balance.ultRageCost || 100)) return false;
  b.hippo.stats.rage = 0;
  for (const e of b.enemies) {
    if (e.stats.hp <= 0) continue;
    const dmg = damage(b.hippo.stats, e.stats, b.balance) * 2;
    e.stats.hp = Math.max(0, e.stats.hp - dmg);
  }
  b.lastMove = { kind: 'ult' };
  b.log.push('河马被彻底吵醒，短暂暴走！');
  settle(b);
  return true;
}

// 翻身闪避：标记下一次 stepRound 的敌人反击全部落空
export function applyDodge(b) { b.dodgeWindow = true; }
