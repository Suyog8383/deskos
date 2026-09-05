'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveAction, GESTURE_TO_ACTION } = require('../gestureMap');
const { VALID_ACTIONS } = require('../macroExecutor');

test('resolves known gesture commands case-insensitively', () => {
  assert.equal(resolveAction('open_palm'), 'play_pause');
  assert.equal(resolveAction('OPEN_PALM'), 'play_pause');
  assert.equal(resolveAction('Fist'), 'mute_toggle');
});

test('returns null for unknown or malformed commands', () => {
  assert.equal(resolveAction('BARREL_ROLL'), null);
  assert.equal(resolveAction(undefined), null);
  assert.equal(resolveAction(42), null);
});

test('every mapped action exists in the macro executor allow-list', () => {
  for (const [command, action] of Object.entries(GESTURE_TO_ACTION)) {
    assert.ok(VALID_ACTIONS.has(action), `${command} -> ${action} is missing from VALID_ACTIONS`);
  }
});
