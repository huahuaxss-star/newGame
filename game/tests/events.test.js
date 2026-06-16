import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveChoice } from '../src/events.js';

test('resolveChoice applies stat delta and misunderstanding', () => {
  const run = { misunderstanding: 0, hippo: { stats: { def: 10, rage: 0 } } };
  const choice = { label: 'x', outcome: { stats: { def: -2 }, misunderstanding: 25, log: 'ok', nextNode: 'n1' } };
  const r = resolveChoice(run, choice);
  assert.equal(run.hippo.stats.def, 8);
  assert.equal(run.misunderstanding, 25);
  assert.equal(r.nextNode, 'n1');
});

test('resolveChoice clamps stats at 0', () => {
  const run = { misunderstanding: 0, hippo: { stats: { def: 1 } } };
  resolveChoice(run, { outcome: { stats: { def: -5 }, misunderstanding: 0, log: '' } });
  assert.equal(run.hippo.stats.def, 0);
});
