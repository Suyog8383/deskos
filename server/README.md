# DeskOS Server — Local PC Bridge

The Node.js backend that bridges your **iQOO phone** ↔ **Windows PC**.

## What it does

| Feature | Detail |
|---|---|
| WebSocket server | Receives JSON commands from the mobile app |
| OS Macro execution | Triggers real PC keystrokes (virtual desktops, media, etc.) |
| AI endpoint | Forwards OCR text to OpenRouter (DeepSeek / MiniMax) |

---

## Quick Start

### 1. Install dependencies
```bash
cd server
npm install
```

### 2. Configure your API key
```bash
copy .env.example .env
```
Open `.env` and replace `sk-or-paste-your-key-here` with your real OpenRouter key from https://openrouter.ai/keys

### 3. Open Windows Firewall port 8080
Run this **once** in PowerShell as Administrator:
```powershell
New-NetFirewallRule -DisplayName "DeskOS Bridge" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
```

### 4. Start the server
```bash
npm start
```

You'll see your PC's local IP printed on startup — paste that into the mobile app.

For development with auto-restart:
```bash
npm run dev
```

---

## WebSocket Protocol

Connect from the phone to: `ws://<PC-IP>:8080`

### Send a macro command
```json
{ "action": "SWIPE_RIGHT" }
```

### Send an AI query (OCR text)
```json
{ "action": "AI_QUERY", "text": "What does this Java error mean?" }
```

### List all supported actions
```json
{ "action": "LIST_ACTIONS" }
```

---

## HTTP Endpoints

| Method | URL | Body | Description |
|---|---|---|---|
| GET | `/health` | — | Server health check |
| GET | `/actions` | — | List all macro actions |
| POST | `/macro` | `{"action":"SWIPE_RIGHT"}` | Trigger a macro |
| POST | `/ai` | `{"text":"..."}` | AI query |

---

## Supported Macro Actions

| Action | Keys | Effect |
|---|---|---|
| `SWIPE_RIGHT` | Ctrl+Win+→ | Next virtual desktop |
| `SWIPE_LEFT` | Ctrl+Win+← | Previous virtual desktop |
| `MEDIA_PLAY_PAUSE` | MediaPlay | Toggle music |
| `MEDIA_NEXT` | MediaNext | Next track |
| `MEDIA_PREV` | MediaPrev | Previous track |
| `VOLUME_UP` | AudioVolUp | Volume + |
| `VOLUME_DOWN` | AudioVolDown | Volume - |
| `VOLUME_MUTE` | AudioMute | Mute/Unmute |
| `SHOW_DESKTOP` | Win+D | Show/hide desktop |
| `TASK_VIEW` | Win+Tab | Task view |
| `CLOSE_WINDOW` | Alt+F4 | Close window |
| `MINIMIZE_WIN` | Win+↓ | Minimize window |
| `MAXIMIZE_WIN` | Win+↑ | Maximize window |
| `LOCK_SCREEN` | Win+L | Lock screen |
| `SCREENSHOT` | Win+Shift+S | Snipping tool |
| `TASK_MANAGER` | Ctrl+Shift+Esc | Task Manager |

---

## File Structure

```
server/
├── server.js       — Main entry: WS + HTTP server
├── macros.js       — Action → keystroke mapping (nut.js)
├── ai.js           — OpenRouter API integration
├── .env            — Your secrets (gitignored)
├── .env.example    — Template
└── package.json    — Dependencies
```

---

## AI Cost Control

Default model: `deepseek/deepseek-chat` (~$0.14/M tokens).  
Max tokens per response: **512** (hardcoded in `ai.js` to protect your $10 credit).  
To switch models, edit `AI_MODEL` in your `.env`.
