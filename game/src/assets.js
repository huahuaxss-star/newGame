// 美术槽位加载:缺图自动 fallback 到 emoji 占位,游戏永不因缺图崩溃。
// 图丢进 assets/<key>.png 同名覆盖即生效。
const FALLBACK_EMOJI = {
  hippo_idle: '🦛', hippo_sit: '🦛', hippo_sneeze: '🦛', hippo_roll: '🦛', hippo_ult: '😤', hippo_sleep: '😴',
  enemy_thief: '🦝', enemy_thief2: '🐀', enemy_fakehero: '🦸',
  item_pillow: '🛏️', item_tray: '🍽️', item_umbrella: '☂️', item_bread: '🥖',
  icon_hp: '❤️', icon_atk: '👊', icon_def: '🛡️', icon_weight: '⚖️', icon_rage: '🔥', icon_fame: '⭐',
  default: '❓'
};

const cache = new Map();

// 返回 { kind:'img'|'emoji', value, key }。img 加载成功后 value 变为图片 src(对象引用原地更新)。
export function getAsset(key) {
  if (cache.has(key)) return cache.get(key);
  const resolved = { kind: 'emoji', value: FALLBACK_EMOJI[key] || FALLBACK_EMOJI.default, key };
  // 仅浏览器环境尝试加载真实图片
  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.onload = () => { resolved.kind = 'img'; resolved.value = img.src; };
    img.onerror = () => { /* 保持 emoji 占位 */ };
    img.src = `assets/${key}.png`;
  }
  cache.set(key, resolved);
  return resolved;
}
