# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DeskOS — an iQOO Hackathon 2026 entry. A docked Android phone becomes an
offline-first spatial peripheral for a laptop: the front camera reads hand
gestures to drive PC macros (media/volume/virtual-desktop/etc.) with no
hands leaving the keyboard, and the rear camera OCRs documents straight to
the laptop's clipboard. Everything runs on-device (no cloud APIs for the
vision pipeline) — hardware/NPU usage is part of the scoring.

## Repo layout — four independent projects, not one workspace

This is **not** an npm workspace. Each of the four subtrees below has its
own `package.json`, its own `node_modules`, and (where applicable) its own
test runner. Running a command in one does not install or test the others.

| Path | What | Test runner |
|---|---|---|
| `/` (root) | The React Native app (phone side) | Jest |
| `bridge/` | Node WebSocket bridge: gesture→OS-macro + OCR-text→clipboard | Node's built-in `node --test` |
| `server/` | A **second, independent** Node bridge (Windows-focused, `nut-js` keystrokes + an OpenRouter AI/OCR endpoint) | none |
| `native/vision-camera-hand-landmarker/` | Local Nitro native module: MediaPipe hand-landmark detection (Android only) | none |

**`bridge/` and `server/` are two separately-built implementations of the
same "laptop executor" role**, from two different branches merged
independently (`bridge/` from this session, `server/` from a teammate's
`feat/deskos-backend` PR). They use **incompatible wire protocols** —
`bridge/` speaks `{ "type": "gesture"|"ocr", ... }` (see
`bridge/PROTOCOL.md`), `server/` speaks `{ "action": "SWIPE_RIGHT", ... }`
(see `server/README.md`). Neither has the mobile app wired up to it yet.
Anyone picking this up needs to consolidate on one before the phone can
actually talk to a laptop — check with the team before extending either.

## Commands

### React Native app (root)
```sh
npm install
npm test                    # jest (excludes bridge/ and native/*/ — see jest.config.js)
npx jest -t "renders correctly"   # run a single test by name
npx jest __tests__/App.test.tsx   # run a single test file
npx tsc --noEmit             # typecheck
npm run lint                 # eslint .
npm start                    # Metro dev server
npm run android / npm run ios
```

### bridge/ (WebSocket→macro+clipboard executor)
```sh
cd bridge && npm install
npm start                    # BRIDGE_PORT=8787 by default; BRIDGE_TOKEN=... to require a pairing token
npm test                     # node --test — runs everything under bridge/__tests__/
node --test __tests__/gestureMap.test.js   # a single test file
```

### server/ (the other executor — Windows keystrokes + AI/OCR endpoint)
```sh
cd server && npm install
cp .env.example .env         # set OPENROUTER API key
npm start                    # or `npm run dev` for nodemon auto-restart; PORT=8080 by default
```

### native/vision-camera-hand-landmarker/ (Nitro module, Android only)
```sh
cd native/vision-camera-hand-landmarker && npm install
npm run codegen              # nitrogen (regenerates the Kotlin/C++ glue from the .nitro.ts spec) + typecheck + bob build
npm run typecheck            # tsc --noEmit only
```
After editing `src/specs/*.nitro.ts`, you must run `npm run codegen` and
then reinstall/resync the root app (`npm install` at repo root, then a
Gradle sync) for the change to reach the RN app, since it's consumed via
a `file:` dependency in the root `package.json`.

Before this module will actually build: download the MediaPipe model file
to `android/src/main/assets/hand_landmarker.task` (command in this
module's README) and Gradle-sync. It has not been compiled or run on an
Android toolchain/device — verify on a real iQOO device before relying on
it.

## Architecture

### Camera pipeline: react-native-vision-camera v5 uses Nitro Modules, not classic frame processors

This app's `react-native-vision-camera` version (5.2.3) is a from-scratch
rewrite built on **Nitro Modules**, not the classic `useFrameProcessor` +
`react-native-worklets-core` API most VisionCamera tutorials/docs describe.
The real APIs in use here:
- `useFrameOutput({ onFrame, pixelFormat, ... })` (not `useFrameProcessor`)
- Requires `react-native-vision-camera-worklets` + `react-native-worklets`
  (the standalone Software Mansion package, not Reanimated) as peer deps,
  and `react-native-worklets/plugin` registered **last** in
  `babel.config.js`.
- `Camera` takes an `outputs={[...]}` array of output objects (photo output,
  frame output, etc.) rather than separate frame-processor props — see
  `App.tsx`'s `CameraConsole` (photo capture) and
  `src/gesture/GestureConsole.tsx` (frame output) for both patterns.
- There is no `VisionCameraProxy`/`initFrameProcessorPlugin` registry in
  this version. A custom native "frame processor plugin" is just an
  ordinary Nitro `HybridObject` (see the native module below), called
  directly from inside an `onFrame` worklet.

### Gesture pipeline split: native does per-frame classification, JS does temporal tracking

`src/gesture/useHandGesture.ts` calls the native
`HandLandmarker.detect(buffer, width, height, rotationDegrees)`
(`native/vision-camera-hand-landmarker`) once per frame, which runs MediaPipe
Tasks Vision `HandLandmarker` (`RunningMode.IMAGE`, synchronous — deliberately
chosen so it can be called directly from the worklet without async callback
plumbing) and a rule-based classifier over the 21 landmarks, returning a
small struct (gesture label, confidence, handedness, palm x/y) — not the
full landmark set, to keep the JSI payload cheap.

Static gestures (`OPEN_PALM`, `FIST`, `THUMBS_UP`, `THUMBS_DOWN`,
`POINT_UP`, `POINT_DOWN`, `PINCH`) come from that native classifier.
`SWIPE_LEFT`/`SWIPE_RIGHT` do **not** — they're motion gestures, detected
in JS by `useHandGesture` tracking `palmX` across frames over time. The
full gesture vocabulary lives in `src/gesture/types.ts` and is **deliberately
kept in sync with** `bridge/gestureMap.js`'s command table — if you add a
gesture on one side, add it on the other.

`Delegate` (MediaPipe's acceleration selector) only has `GPU`/`NPU` members
in the version pinned here — no `CPU` constant. The native `detect()` tries
`NPU` first, falls back to `GPU`, then to no delegate set at all (MediaPipe's
own default) if both fail to initialize.

### Gesture-driven file sorter (`src/files/`)

A local (phone-only, no bridge/server involved) feature: browse
`DocumentDirectoryPath/DeskOS/Inbox` and file images into user-defined
folders (e.g. "Favourite", "School") using the same front-camera gesture
pipeline as `src/gesture/`, instead of tapping through a picker.

- `gestureSort.ts` — pure `interpretGestureAction(gesture, folders, pendingMove, currentFileId)`
  state machine, unit tested in `__tests__/gestureSort.test.ts`. Rules: a
  folder's assigned static gesture (one of the 7 in `ASSIGNABLE_GESTURES`,
  `types.ts` — everything except the two swipes) shown with the **right**
  hand copies the current file into that folder; `SWIPE_LEFT` deletes the
  current file outright; `SWIPE_RIGHT` only acts if the current file was
  just copied (i.e. `pendingMove` matches it), in which case it deletes
  the original to turn that copy into a move.
- `folderStore.ts` persists folder metadata (id/name/assigned gesture) to
  AsyncStorage — not the files themselves, which live on disk as real
  directories.
- `fileOps.ts` wraps `@dr.pogodin/react-native-fs` for the actual
  copy/delete calls, and `useFileSorter.ts` is the edge-triggered glue
  (re-runs `useHandGesture`'s frame stream through `interpretGestureAction`
  once per newly-held gesture, not once per frame, since a held static
  gesture reports the same label every frame).

**Deliberately scoped to the app's own sandbox directory, not the system
Gallery/MediaStore** — copy/move/delete inside an app's own storage needs
zero runtime permissions on any Android version, which is what lets this
feature skip permission handling for now. Real "import from Gallery" would
need scoped-storage consent (`MediaStore.createWriteRequest`/
`createDeleteRequest` on API 30+, or `READ_MEDIA_IMAGES` just to read) —
that's intentionally not wired up yet; `fileOps.ts` seeds a few placeholder
files into `Inbox` on first run as a stand-in so the sort flow has
something to demo in the meantime.

Handedness ("right hand" for the copy rule) comes straight from
MediaPipe's raw front-camera reading, unverified against what the user
actually sees on screen (front camera frames are typically mirrored for
display) — see the caveat in `gestureSort.ts` if it turns out inverted on
a real device.

### Jest config gotcha

`jest.config.js` explicitly excludes `bridge/` and `native/*/` via
`testPathIgnorePatterns` — without that, Jest's default test-file globbing
picks up `bridge/__tests__/*.test.js` (written for Node's `node --test`,
not Jest) and fails them. If you add another subpackage with its own
tests, exclude it the same way.

It also `moduleNameMapper`s five packages to manual mocks in `__mocks__/`
(`react-native-vision-camera`, `react-native-vision-camera-hand-landmarker`,
`react-native-worklets`, `@dr.pogodin/react-native-fs`,
`@react-native-async-storage/async-storage`) because all of them have
native bindings (or, for async-storage, an ESM-only jest export this
repo's default `transformIgnorePatterns` won't parse) that don't work
directly in the Jest environment. Extend those mocks rather than trying to
run the real native modules under test.

### Android build constraint

`minSdkVersion` is 24 across the app (`android/build.gradle`'s
`rootProject.ext`) because MediaPipe Tasks Vision's manifest requires it —
don't lower it without checking that dependency first.
