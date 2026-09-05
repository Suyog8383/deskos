# DeskOS Bridge

The laptop-side "Executor" from the DeskOS architecture: a local
WebSocket server that turns JSON payloads from the mobile app into
native OS actions. No cloud, no accounts — the phone and laptop just
need to be on the same Wi-Fi/hotspot network.

## Run it

```sh
cd bridge
npm install
npm start
```

It logs the LAN address(es) to point the app at, e.g.:

```
[bridge] DeskOS bridge listening on ws://0.0.0.0:8787
[bridge] point the app at one of:
           ws://192.168.1.42:8787
```

## What it does

- **Gesture → macro**: `{ "type": "gesture", "command": "OPEN_PALM" }` is
  resolved via `gestureMap.js` and dispatched to a platform macro script
  (`macros/windows.ps1`, `macros/mac.applescript`, or `macros/linux.sh`
  for local development on Linux).
- **OCR → clipboard**: `{ "type": "ocr", "text": "..." }` is written
  straight to the system clipboard (`clip` / `pbcopy` / `xclip`/`xsel`).

Full message schema: see [`PROTOCOL.md`](./PROTOCOL.md).

## Optional pairing token

```sh
BRIDGE_TOKEN=demo123 npm start
```

Every client message must then include `"token": "demo123"`, or it's
rejected with `{ "type": "error", "error": "unauthorized" }`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `BRIDGE_PORT` | `8787` | WebSocket listen port |
| `BRIDGE_TOKEN` | *(unset)* | Optional shared-secret pairing token |

## Test

```sh
npm test
```

Runs the pure-logic unit tests (gesture→action resolution, and the
gesture map staying in sync with the macro executor's action allow-list).
The platform macro scripts themselves aren't unit-tested since they have
real system side effects (media keys, clipboard, desktop switching) —
verify each one by hand on the actual demo machine before going on stage.
