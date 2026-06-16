import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeRng } from '../src/rng.js';
import { pickSkill, resolveSynergy } from '../src/skills.js';

const pool = JSON.parse(await readFile(new URL('../config/skills.json', import.meta.url)));

test('pickSkill returns 3 distinct skills', () => {
  const three = pickSkill(pool, [], makeRng(3));
  assert.equal(three.length, 3);
  assert.equal(new Set(three.map(s => s.id)).size, 3);
});

test('pickSkill excludes already-owned', () => {
  const owned = pool.slice(0, 5).map(s => s.id);
  const three = pickSkill(pool, owned, makeRng(3));
  assert.ok(three.every(s => !owned.includes(s.id)));
});

test('3 same-school skills trigger synergy', () => {
  assert.deepEqual(resolveSynergy([{ synergyId: 'nap' }, { synergyId: 'nap' }, { synergyId: 'nap' }]), ['nap']);
});

test('mixed schools -> no synergy', () => {
  assert.deepEqual(resolveSynergy([{ synergyId: 'nap' }, { synergyId: 'eat' }, { synergyId: 'weight' }]), []);
});
