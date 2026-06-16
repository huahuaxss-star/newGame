import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeRng } from '../src/rng.js';
import { spinGacha } from '../src/gacha.js';

const cfg = JSON.parse(await readFile(new URL('../config/gacha.json', import.meta.url)));

test('spinGacha returns a valid segment', () => {
  const seg = spinGacha(cfg, makeRng(9));
  assert.ok(cfg.segments.find(s => s.id === seg.id));
});

test('weighting: exp (highest weight) appears most over many spins', () => {
  const r = makeRng(123); const counts = {};
  for (let i = 0; i < 2000; i++) { const s = spinGacha(cfg, r); counts[s.id] = (counts[s.id] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top, 'exp');
});
