'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleMessage } = require('../server');

function fakeSocket() {
  return {
    readyState: 1,
    OPEN: 1,
    sent: [],
    send(data) {
      this.sent.push(JSON.parse(data));
    },
  };
}

test('rejects invalid JSON', async () => {
  const ws = fakeSocket();
  await handleMessage(ws, '{not json');
  assert.deepEqual(ws.sent, [{ type: 'error', error: 'invalid_json' }]);
});

test('rejects unknown message types', async () => {
  const ws = fakeSocket();
  await handleMessage(ws, JSON.stringify({ type: 'mystery' }));
  assert.deepEqual(ws.sent, [{ type: 'error', error: 'unknown_type', received: 'mystery' }]);
});

test('rejects unknown gesture commands', async () => {
  const ws = fakeSocket();
  await handleMessage(ws, JSON.stringify({ type: 'gesture', command: 'BARREL_ROLL' }));
  assert.deepEqual(ws.sent, [
    { type: 'error', error: 'unknown_command', command: 'BARREL_ROLL' },
  ]);
});

test('rejects empty OCR text', async () => {
  const ws = fakeSocket();
  await handleMessage(ws, JSON.stringify({ type: 'ocr', text: '' }));
  assert.deepEqual(ws.sent, [{ type: 'error', error: 'empty_ocr_text' }]);
});

test('enforces BRIDGE_TOKEN when set', async () => {
  process.env.BRIDGE_TOKEN = 'secret';
  delete require.cache[require.resolve('../server')];
  const { handleMessage: handleWithToken } = require('../server');
  const ws = fakeSocket();
  await handleWithToken(ws, JSON.stringify({ type: 'gesture', command: 'OPEN_PALM' }));
  assert.deepEqual(ws.sent, [{ type: 'error', error: 'unauthorized' }]);
  delete process.env.BRIDGE_TOKEN;
  delete require.cache[require.resolve('../server')];
});
