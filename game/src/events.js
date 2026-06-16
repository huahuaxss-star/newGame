// 行程事件系统 —— 纯逻辑。结算一个分支选择：改数值、加误会值、给下一节点。
export function resolveChoice(run, choice) {
  const o = choice.outcome || {};
  if (o.stats) {
    for (const [k, v] of Object.entries(o.stats)) {
      run.hippo.stats[k] = Math.max(0, (run.hippo.stats[k] || 0) + v);
    }
  }
  if (o.misunderstanding) run.misunderstanding = (run.misunderstanding || 0) + o.misunderstanding;
  return { log: o.log || '', nextNode: o.nextNode || null };
}
