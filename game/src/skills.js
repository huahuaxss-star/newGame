// 蠢技能系统 —— 纯逻辑。三选一抽取 + 同流派协同判定。

// 从池中抽 3 个互不相同、且未拥有的技能
export function pickSkill(pool, ownedIds, rng) {
  const bag = pool.filter(s => !ownedIds.includes(s.id));
  const out = [];
  while (out.length < 3 && bag.length) {
    const i = rng.int(0, bag.length - 1);
    out.push(bag.splice(i, 1)[0]);
  }
  return out;
}

// 返回已达到协同阈值的流派 id 列表（默认同流派 3 个触发质变）
export function resolveSynergy(ownedSkills, threshold = 3) {
  const counts = {};
  for (const s of ownedSkills) if (s.synergyId) counts[s.synergyId] = (counts[s.synergyId] || 0) + 1;
  return Object.keys(counts).filter(k => counts[k] >= threshold);
}
