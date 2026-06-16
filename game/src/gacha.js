// 甜点扭蛋 —— 纯逻辑，带权随机。奖励永远差一点不是河马真正想要的那顿正餐。
export function spinGacha(cfg, rng) {
  const total = cfg.segments.reduce((a, s) => a + s.weight, 0);
  let roll = rng.next() * total;
  for (const s of cfg.segments) {
    if ((roll -= s.weight) < 0) return s;
  }
  return cfg.segments[cfg.segments.length - 1];
}
