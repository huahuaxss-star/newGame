import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/rng.js';

test('same seed -> same sequence', () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a.next(), b.next());
  assert.equal(a.int(0, 100), b.int(0, 100));
});

test('int is within range', () => {
  const r = makeRng(1);
  for (let i = 0; i < 200; i++) { const n = r.int(0, 5); assert.ok(n >= 0 && n <= 5); }
});

test('pick returns an element', () => {
  const r = makeRng(7);
  assert.ok(['a', 'b', 'c'].includes(r.pick(['a', 'b', 'c'])));
});
