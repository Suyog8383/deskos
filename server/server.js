'use strict';

/**
 * server.js — DeskOS Local PC Bridge
 *
 * Starts two services on the same port:
 *   1. WebSocket server  (ws://0.0.0.0:PORT)  — receives JSON commands from the iQOO phone
 *   2. HTTP server       (http://0.0.0.0:PORT) — POST /ai endpoint as HTTP fallback
 *
 * WebSocket Message Protocol (phone → PC):
 *   { "action": "SWIPE_RIGHT" }
 *   { "action": "MEDIA_PLAY_PAUSE" }
 *   { "action": "AI_QUERY", "text": "What does this error mean?" }
 *   { "action": "LIST_ACTIONS" }
 *
 * Server Response Protocol (PC → phone):
 *   { "status": "ok", "action": "SWIPE_RIGHT", "desc": "Next virtual desktop" }
 *   { "status": "ok", "action": "AI_QUERY", "result": "The error means..." }
 *   { "status": "error", "message": "Unknown action: FOOBAR" }
 */

require('dotenv').config();

const http    = require('http');
const os      = require('os');
const { WebSocketServer } = require('ws');
const { executeMacro, listActions } = require('./macros');
const { queryAI, listModels }       = require('./ai');

const PORT = parseInt(process.env.PORT || '8080', 10);

// ─── HTTP Server ────────────────────────────────────────────────────────────
// Handles both WebSocket upgrades and regular HTTP requests on the same port.
const httpServer = http.createServer(async (req, res) => {
  // CORS headers so the phone's React Native fetch() works without issues
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── GET /health — quick sanity check ──────────────────────────────────────
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), port: PORT }));
    return;
  }

  // ── GET /actions — list all supported macro actions ───────────────────────
  if (req.method === 'GET' && req.url === '/actions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ actions: listActions() }));
    return;
  }

  // ── GET /models — list all available AI models ────────────────────────────
  if (req.method === 'GET' && req.url === '/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ models: listModels() }));
    return;
  }

  // ── POST /ai — AI query via HTTP (fallback for non-WS clients) ────────────
  if (req.method === 'POST' && req.url === '/ai') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { text, model, systemPrompt } = JSON.parse(body);
        if (!text) throw new Error('"text" field is required');

        const ai = await queryAI(text, model, systemPrompt);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', result: ai.result, model: ai.model, modelLabel: ai.modelLabel }));
      } catch (err) {
        console.error('[HTTP /ai] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // ── POST /macro — trigger a macro via HTTP ────────────────────────────────
  if (req.method === 'POST' && req.url === '/macro') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { action } = JSON.parse(body);
        if (!action) throw new Error('"action" field is required');

        const result = await executeMacro(action);
        const statusCode = result.success ? 200 : 400;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: result.success ? 'ok' : 'error', ...result }));
      } catch (err) {
        console.error('[HTTP /macro] Error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // ── 404 fallback ──────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
});

// ─── WebSocket Server ───────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`[WS] 📱 Phone connected from ${clientIP}`);

  // Send a welcome handshake so the phone knows it's connected
  ws.send(JSON.stringify({
    status: 'connected',
    message: 'DeskOS bridge ready',
    supportedActions: listActions().map(a => a.action),
  }));

  ws.on('message', async (raw) => {
    let payload;

    // ── Parse incoming message ─────────────────────────────────────────────
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      console.warn('[WS] ⚠️  Invalid JSON received:', raw.toString().slice(0, 100));
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      return;
    }

    const { action, text, systemPrompt } = payload;
    console.log(`[WS] ← Received action: "${action}"`);

    // ── Route by action type ───────────────────────────────────────────────
    try {
      // LIST_ACTIONS — returns all supported macro names
      if (action === 'LIST_ACTIONS') {
        ws.send(JSON.stringify({ status: 'ok', action, actions: listActions() }));
        return;
      }

      // LIST_MODELS — returns all available AI models
      if (action === 'LIST_MODELS') {
        ws.send(JSON.stringify({ status: 'ok', action, models: listModels() }));
        return;
      }

      // AI_QUERY — send OCR text to OpenRouter
      // Optional fields: "model" (model ID) and "systemPrompt"
      if (action === 'AI_QUERY') {
        if (!text) {
          ws.send(JSON.stringify({ status: 'error', message: 'AI_QUERY requires a "text" field' }));
          return;
        }
        const ai = await queryAI(text, payload.model, systemPrompt);
        ws.send(JSON.stringify({ status: 'ok', action, result: ai.result, model: ai.model, modelLabel: ai.modelLabel }));
        return;
      }

      // Everything else — try to execute as a macro
      const result = await executeMacro(action);
      if (result.success) {
        ws.send(JSON.stringify({ status: 'ok', action, desc: result.desc }));
      } else {
        ws.send(JSON.stringify({ status: 'error', message: result.error }));
      }

    } catch (err) {
      console.error(`[WS] ❌ Error handling "${action}":`, err.message);
      ws.send(JSON.stringify({ status: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] 📴 Phone disconnected (${clientIP})`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Connection error (${clientIP}):`, err.message);
  });
});

// ─── Start ──────────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║         DeskOS PC Bridge  🖥️ → 📱          ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  WebSocket  ws://0.0.0.0:${PORT}              ║`);
  console.log(`║  HTTP       http://0.0.0.0:${PORT}            ║`);
  console.log('╠════════════════════════════════════════════╣');

  // Print all local network IPs so you can easily connect from the phone
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`║  Phone URL: ws://${iface.address}:${PORT.toString().padEnd(5)}       ║`);
      }
    }
  }

  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  AI Model:  ${(process.env.AI_MODEL || 'not configured').padEnd(31)}║`);
  console.log(`║  API Key:   ${process.env.OPENROUTER_API_KEY ? '✅ configured' : '❌ missing — check .env'}           ║`);
  console.log('╚════════════════════════════════════════════╝\n');
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...');
  wss.close(() => {
    httpServer.close(() => {
      console.log('[SERVER] Goodbye! 👋');
      process.exit(0);
    });
  });
});
