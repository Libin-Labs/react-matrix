import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as api from '../dist/esm/index.js';

const rows = [
  { id: 'a', label: 'Ada', group: 'People' },
  { id: 'b', label: 'Bob' },
];
const columns = [
  { id: 'read', label: 'Read' },
  { id: 'write', label: 'Write' },
];

test('lookup deduplicates relationships and is immune to delimiter/prototype collisions', () => {
  const lookup = api.createMatrixLookup(rows, columns, [
    { rowId: 'a', columnId: 'read' },
    { rowId: 'a', columnId: 'read' },
    { rowId: 'b', columnId: 'write' },
  ]);
  assert.equal(lookup.size, 2);
  assert.equal(lookup.has('a', 'read'), true);
  assert.equal(lookup.has('a', 'write'), false);
  assert.equal(lookup.has('missing', 'read'), false);
  const special = api.createMatrixLookup(
    [
      { id: 'a|b', label: '1' },
      { id: 'a', label: '2' },
      { id: '__proto__', label: '3' },
    ],
    [
      { id: 'c', label: '1' },
      { id: 'b|c', label: '2' },
    ],
    [
      { rowId: 'a|b', columnId: 'c' },
      { rowId: '__proto__', columnId: 'b|c' },
    ],
  );
  assert.equal(special.has('a', 'b|c'), false);
  assert.equal(special.has('__proto__', 'b|c'), true);
});

test('setting cells is immutable, stable, and idempotent and removes duplicates', () => {
  const value = Object.freeze([
    Object.freeze({ rowId: 'a', columnId: 'read' }),
    Object.freeze({ rowId: 'a', columnId: 'read' }),
    Object.freeze({ rowId: 'b', columnId: 'write' }),
  ]);
  const next = api.setMatrixCell(value, 'a', 'write', true);
  assert.deepEqual(next, [
    { rowId: 'a', columnId: 'read' },
    { rowId: 'b', columnId: 'write' },
    { rowId: 'a', columnId: 'write' },
  ]);
  assert.deepEqual(api.setMatrixCell(next, 'a', 'write', true), next);
  assert.deepEqual(api.setMatrixCell(value, 'a', 'read', false), [
    { rowId: 'b', columnId: 'write' },
  ]);
  assert.equal(value.length, 3);
});

test('groups coalesce in first-seen order and preserve member order', () => {
  const items = [
    ...rows,
    { id: 'c', label: 'C', group: 'People' },
    { id: 'd', label: 'D', group: '' },
  ];
  const groups = api.groupMatrixItems(items);
  assert.deepEqual(
    groups.map((group) => group.group),
    ['People', null, ''],
  );
  assert.deepEqual(
    groups[0].items.map((item) => item.id),
    ['a', 'c'],
  );
  assert.equal(items.length, 4);
});

test('invalid axes and dangling relationships reject', () => {
  assert.throws(() => api.createMatrixLookup([rows[0], rows[0]], columns, []), TypeError);
  assert.throws(() => api.createMatrixLookup([{ id: '', label: 'Empty' }], columns, []), TypeError);
  assert.throws(
    () => api.createMatrixLookup(rows, columns, [{ rowId: 'unknown', columnId: 'read' }]),
    TypeError,
  );
  assert.throws(
    () => api.createMatrixLookup(rows, columns, [{ rowId: 'a', columnId: 'unknown' }]),
    TypeError,
  );
  assert.throws(() => api.setMatrixCell([], '', 'read', true), TypeError);
  assert.throws(() => api.groupMatrixItems([{ id: 'a', label: 1 }]), TypeError);
});

test('CommonJS helpers and export surface match ESM', () => {
  const cjs = createRequire(import.meta.url)('../dist/cjs/index.js');
  assert.deepEqual(Object.keys(cjs).sort(), Object.keys(api).sort());
  assert.deepEqual(
    cjs.setMatrixCell([], 'a', 'read', true),
    api.setMatrixCell([], 'a', 'read', true),
  );
});
