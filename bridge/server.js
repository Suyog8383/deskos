#!/usr/bin/env node
/**
 * DeskOS Bridge — the "Executor"
 *
 * A local WebSocket server that receives JSON payloads from the DeskOS
 * mobile app (gesture commands + OCR text) and turns them into native OS
 * actions: media/volume/desktop macros (PowerShell / AppleScript / bash)
 * and a direct write to the system clipboard. No cloud, no accounts —
 * phone and laptop just need to be on the same network.
 *
 * Run: npm start   (optionally BRIDGE_PORT=... BRIDGE_TOKEN=... npm start)
 * See PROTOCOL.md for the message schema.
 */
'use strict';

const { WebSocketServer } = require('ws');
const os = require('os');
const { resolveAction } = require('./gestureMap');
const { runMacro } = require('./macroExecutor');
const { writeClipboard } = require('./clipboard');

const PORT = Number(process.env.BRIDGE_PORT) || 8787;
const TOKEN = process.env.BRIDGE_TOKEN || null;

function localAddresses() {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const iface of Object.values(nets)) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

function reply(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

async function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    reply(ws, { type: 'error', error: 'invalid_json' });
    return;
  }

  if (TOKEN && msg.token !== TOKEN) {
    reply(ws, { type: 'error', error: 'unauthorized' });
    return;
  }

  if (msg.type === 'gesture') {
    const action = resolveAction(msg.command);
    if (!action) {
      reply(ws, { type: 'error', error: 'unknown_command', command: msg.command });
      return;
    }
    try {
      await runMacro(action);
      reply(ws, { type: 'ack', for: 'gesture', command: msg.command, action });
    } catch (err) {
      reply(ws, { type: 'error', error: 'macro_failed', action, message: err.message });
    }
    return;
  }

  if (msg.type === 'ocr') {
    if (typeof msg.text !== 'string' || msg.text.length === 0) {
      reply(ws, { type: 'error', error: 'empty_ocr_text' });
      return;
    }
    try {
      await writeClipboard(msg.text);
      reply(ws, { type: 'ack', for: 'ocr', chars: msg.text.length });
    } catch (err) {
      reply(ws, { type: 'error', error: 'clipboard_failed', message: err.message });
    }
    return;
  }

  reply(ws, { type: 'error', error: 'unknown_type', received: msg.type });
}

function start() {
  const wss = new WebSocketServer({ port: PORT });

  wss.on('connection', ws => {
    console.log('[bridge] phone connected');
    reply(ws, { type: 'hello', platform: process.platform });

    ws.on('message', raw => {
      handleMessage(ws, raw).catch(err => {
        console.error('[bridge] unhandled error', err);
      });
    });

    ws.on('close', () => console.log('[bridge] phone disconnected'));
  });

  console.log(`[bridge] DeskOS bridge listening on ws://0.0.0.0:${PORT}`);
  const addrs = localAddresses();
  if (addrs.length) {
    console.log('[bridge] point the app at one of:');
    addrs.forEach(a => console.log(`           ws://${a}:${PORT}`));
  } else {
    console.log('[bridge] no non-internal IPv4 interface found — check your network connection');
  }
  if (TOKEN) {
    console.log('[bridge] token auth ENABLED — include { token } in every message');
  }

  return wss;
}

if (require.main === module) {
  start();
}

module.exports = { start, handleMessage };
