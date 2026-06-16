// 误会 → 名声 → 称号 meta —— 纯逻辑，游戏的灵魂。
export function addMisunderstanding(run, amount) {
  run.misunderstanding = (run.misunderstanding || 0) + amount;
  return run.misunderstanding;
}

// 返回本次新解锁的称号（已达阈值且未持有），并写入 run.titles
export function checkTitleUnlock(run, titles) {
  run.titles = run.titles || [];
  const newly = titles.filter(t => run.misunderstanding >= t.threshold && !run.titles.includes(t.id));
  for (const t of newly) run.titles.push(t.id);
  return newly;
}
