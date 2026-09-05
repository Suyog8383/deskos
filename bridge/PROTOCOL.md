# DeskOS Bridge Protocol

Plain JSON over a single WebSocket connection — one JSON object per frame,
no envelope or versioning needed at this scope.

## Client → Server (phone → laptop)

### Gesture command

```json
{ "type": "gesture", "command": "OPEN_PALM" }
```

`command` is matched case-insensitively against `gestureMap.js`, which is
the live source of truth for the gesture → OS-action table:

| command | action |
|---|---|
| `OPEN_PALM` | `play_pause` |
| `FIST` | `mute_toggle` |
| `SWIPE_LEFT` | `desktop_left` |
| `SWIPE_RIGHT` | `desktop_right` |
| `THUMBS_UP` | `volume_up` |
| `THUMBS_DOWN` | `volume_down` |
| `POINT_UP` | `next_track` |
| `POINT_DOWN` | `prev_track` |
| `PINCH` | `app_switch` |

### OCR text

```json
{ "type": "ocr", "text": "recognized text from the document" }
```

Writes `text` straight to the laptop's system clipboard.

### Optional pairing token

If the server was started with `BRIDGE_TOKEN` set, every message must
include a matching `token` field or it's rejected:

```json
{ "type": "gesture", "command": "OPEN_PALM", "token": "demo123" }
```

## Server → Client (laptop → phone)

```json
{ "type": "hello", "platform": "win32" }
```
Sent once, right after the WebSocket connection opens.

```json
{ "type": "ack", "for": "gesture", "command": "OPEN_PALM", "action": "play_pause" }
{ "type": "ack", "for": "ocr", "chars": 128 }
```
Sent after a command/OCR payload is handled successfully.

```json
{ "type": "error", "error": "unknown_command", "command": "..." }
{ "type": "error", "error": "invalid_json" }
{ "type": "error", "error": "unauthorized" }
{ "type": "error", "error": "unknown_type", "received": "..." }
{ "type": "error", "error": "empty_ocr_text" }
{ "type": "error", "error": "macro_failed", "action": "...", "message": "..." }
{ "type": "error", "error": "clipboard_failed", "message": "..." }
```
