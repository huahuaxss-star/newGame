// 配置校验:坏表早发现,不在运行时静默崩溃
export function validateBalance(b) {
  const errors = [];
  const required = ['maxRounds', 'ultRageCost', 'dodgeWindowMs', 'weightToDamage', 'hitstopMs', 'shakePx', 'hippoStart'];
  for (const k of required) if (b[k] === undefined) errors.push(`balance missing: ${k}`);
  if (b.hippoStart) {
    for (const k of ['hp', 'maxHp', 'atk', 'def', 'weight', 'maxRage'])
      if (b.hippoStart[k] === undefined) errors.push(`hippoStart missing: ${k}`);
  }
  return { errors, value: b };
}

// 浏览器侧:fetch + 返回 JSON(坏表由调用方决定如何提示)
export async function loadConfig(name) {
  const res = await fetch(`config/${name}.json`);
  if (!res.ok) throw new Error(`config ${name} not found`);
  return res.json();
}
