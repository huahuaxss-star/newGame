import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, damage, stepRound, triggerUlt, applyDodge } from '../src/battle.js';

const mkHippo = () => ({
  id: 'hippo', name: '河马', isHippo: true, sprite: 'hippo_idle',
  stats: { hp: 360, maxHp: 360, atk: 40, def: 10, weight: 200, rage: 0, maxRage: 100 }, statuses: {}
});
const mkThief = (over = {}) => ({
  id: 'thief', name: '小盗', isHippo: false, sprite: 'enemy_thief',
  stats: { hp: 80, maxHp: 80, atk: 18, def: 4, weight: 40, rage: 0, maxRage: 100, ...over }, statuses: {}
});
// 战斗流程测试用的平衡：weightToDamage 0.1（与 balance.json 一致），避免一击秒杀，回合可推进
const BAL = { maxRounds: 15, weightToDamage: 0.1, ultRageCost: 100 };

// --- Task 1.1 ---
test('damage = atk - def, min 1', () => {
  assert.equal(damage({ atk: 40 }, { def: 10 }, { weightToDamage: 0 }), 30);
  assert.equal(damage({ atk: 5 }, { def: 99 }, { weightToDamage: 0 }), 1);
});
test('weight adds to hippo damage', () => {
  assert.equal(damage({ atk: 40, weight: 200 }, { def: 10 }, { weightToDamage: 0.5 }), 30 + 100);
});
test('createBattle sets round 1 and not over', () => {
  const b = createBattle(mkHippo(), [mkThief()], BAL);
  assert.equal(b.round, 1); assert.equal(b.over, false);
});

// --- Task 1.2 ---
test('stepRound: hippo auto-attacks, enemy loses hp', () => {
  const b = createBattle(mkHippo(), [mkThief()], BAL);
  const before = b.enemies[0].stats.hp;
  stepRound(b);
  assert.ok(b.enemies[0].stats.hp < before);
  assert.equal(b.round, 2);
});
test('stepRound: win when all enemies dead', () => {
  const b = createBattle(mkHippo(), [mkThief({ hp: 1 })], BAL);
  stepRound(b);
  assert.equal(b.over, true); assert.equal(b.win, true);
});
test('stepRound: rage builds on attack', () => {
  const b = createBattle(mkHippo(), [mkThief()], BAL);
  stepRound(b);
  assert.ok(b.hippo.stats.rage > 0);
});
test('stepRound: lose if maxRounds exceeded and enemies alive', () => {
  const b = createBattle(mkHippo(), [mkThief({ hp: 99999 })], { ...BAL, maxRounds: 1 });
  stepRound(b);
  assert.equal(b.over, true); assert.equal(b.win, false);
});

// --- Task 1.3 ---
test('triggerUlt needs full rage, hits all, resets rage', () => {
  const b = createBattle(mkHippo(), [mkThief(), { ...mkThief(), id: 't2' }], BAL);
  b.hippo.stats.rage = 100;
  assert.equal(triggerUlt(b), true);
  assert.equal(b.hippo.stats.rage, 0);
  assert.ok(b.enemies.every(e => e.stats.hp < e.stats.maxHp));
});
test('triggerUlt fails without full rage', () => {
  const b = createBattle(mkHippo(), [mkThief()], BAL);
  b.hippo.stats.rage = 50;
  assert.equal(triggerUlt(b), false);
});
test('applyDodge negates enemy hits this round', () => {
  const b = createBattle(mkHippo(), [mkThief()], BAL);
  applyDodge(b);
  const hpBefore = b.hippo.stats.hp;
  stepRound(b);
  assert.equal(b.hippo.stats.hp, hpBefore);
});
