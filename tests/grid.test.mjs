import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('controlled toggles, roving focus, keyboard bounds, disabled/read-only cells and groups', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost' });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement: h, act, useState } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { RelationshipMatrix } = await import('../dist/esm/index.js');
  const rows = [
    { id: 'ada', label: 'Ada', group: 'Staff' },
    { id: 'guest', label: 'Guest', group: 'Guests', disabled: true },
    { id: 'bob', label: 'Bob', group: 'Staff' },
  ];
  const columns = [
    { id: 'read', label: 'Read' },
    { id: 'write', label: 'Write' },
  ];
  const container = document.getElementById('root');
  const root = createRoot(container);
  const changes = [];
  let latest;
  function App() {
    const [value, setValue] = useState([]);
    latest = value;
    return h(RelationshipMatrix, {
      rows,
      columns,
      value,
      groupRows: true,
      isCellDisabled: (row, column) => row.id === 'bob' && column.id === 'write',
      onChange: (next, change) => {
        setValue(next);
        changes.push(change);
      },
    });
  }
  const cell = (position) => container.querySelector(`[data-cell="${position}"]`);
  const key = async (element, value, options = {}) => {
    await act(async () =>
      element.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: value,
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      ),
    );
  };
  try {
    await act(async () => root.render(h(App)));
    assert.equal(container.querySelector('[role="grid"]').getAttribute('aria-rowcount'), '4');
    assert.deepEqual(
      [...container.querySelectorAll('tbody th')].map((item) => item.textContent),
      ['StaffAda', 'Bob', 'GuestsGuest'],
    );
    assert.equal(container.querySelectorAll('button[tabindex="0"]').length, 1);
    await act(async () => cell('0:0').click());
    assert.deepEqual(latest, [{ rowId: 'ada', columnId: 'read' }]);
    assert.equal(cell('0:0').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(changes[0], { rowId: 'ada', columnId: 'read', checked: true });
    await act(async () => cell('0:0').focus());
    await key(cell('0:0'), 'ArrowRight');
    assert.equal(document.activeElement, cell('0:1'));
    await key(cell('0:1'), 'ArrowDown');
    assert.equal(document.activeElement, cell('1:1'));
    assert.equal(cell('1:1').getAttribute('aria-disabled'), 'true');
    await act(async () => cell('1:1').click());
    assert.equal(changes.length, 1);
    await key(cell('1:1'), 'End', { ctrlKey: true });
    assert.equal(document.activeElement, cell('2:1'));
    await key(cell('2:1'), 'ArrowDown');
    assert.equal(document.activeElement, cell('2:1'));
    await key(cell('2:1'), 'Home', { ctrlKey: true });
    assert.equal(document.activeElement, cell('0:0'));
    await act(async () => cell('0:0').click());
    assert.equal(latest.length, 0);
    assert.equal(cell('0:0').getAttribute('aria-pressed'), 'false');
    await act(async () =>
      root.render(
        h(RelationshipMatrix, {
          rows,
          columns,
          value: [],
          readOnly: true,
          onChange: () => assert.fail('read-only change'),
        }),
      ),
    );
    await act(async () => cell('0:0').click());
    assert.equal(container.querySelector('[role="grid"]').getAttribute('aria-readonly'), 'true');
    await act(async () =>
      root.render(
        h(RelationshipMatrix, {
          rows: [],
          columns,
          value: [],
          onChange: () => assert.fail('empty change'),
        }),
      ),
    );
    assert.match(container.querySelector('[role="status"]').textContent, /No relationships/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
