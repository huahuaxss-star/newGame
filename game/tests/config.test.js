import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBalance } from '../src/config.js';

test('valid balance passes', () => {
  const b = {
    maxRounds: 15, ultRageCost: 100, dodgeWindowMs: 700, weightToDamage: 0.5,
    hitstopMs: 90, shakePx: 8,
    hippoStart: { hp: 360, maxHp: 360, atk: 40, def: 10, weight: 200, rage: 0, maxRage: 100 }
  };
  assert.deepEqual(validateBalance(b).errors, []);
});

test('missing field is reported', () => {
  const { errors } = validateBalance({ maxRounds: 15 });
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.includes('ultRageCost')));
});
