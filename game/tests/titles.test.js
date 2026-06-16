import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addMisunderstanding, checkTitleUnlock } from '../src/titles.js';

const titles = JSON.parse(await readFile(new URL('../config/titles.json', import.meta.url)));

test('crossing threshold unlocks a title once', () => {
  const run = { misunderstanding: 0, titles: [] };
  addMisunderstanding(run, 25);
  assert.deepEqual(checkTitleUnlock(run, titles).map(t => t.id), ['freeloader']);
  assert.deepEqual(checkTitleUnlock(run, titles), []); // 不重复解锁
});

test('big gain can unlock multiple', () => {
  const run = { misunderstanding: 0, titles: [] };
  addMisunderstanding(run, 60);
  assert.deepEqual(checkTitleUnlock(run, titles).map(t => t.id).sort(), ['breadguardian', 'freeloader']);
});
