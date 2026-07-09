# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — run app via `electron-forge start`
- `npm run package` — package app (no installer)
- `npm run make` — build platform installers (Squirrel/Windows, deb, rpm, zip/darwin)
- `npm run publish` — publish via electron-forge
- No lint/test setup (`npm run lint` is a no-op).

## Architecture

Electron desktop screen recorder. Two-process split:

- **Main** (`src/index.js`): creates `BrowserWindow` (800x600, `nodeIntegration: true`), loads `src/index.html`, handles standard lifecycle (`ready`, `window-all-closed`, `activate`) plus `electron-squirrel-startup` for Windows install shortcuts.
- **Renderer** (`src/render.js`): all recording logic. Flow:
  1. `desktopCapturer.getSources({ types: ["window", "screen"] })` → build `remote.Menu` popup of sources.
  2. On pick, `navigator.mediaDevices.getUserMedia` with `chromeMediaSource: "desktop"` + source id → attach stream to `<video>` preview.
  3. `MediaRecorder` (`video/webm; codecs=vp9`) records chunks into `recordedChunks[]`.
  4. On stop, chunks → `Blob` → `Buffer` → `remote.dialog.showSaveDialog` → `fs.writeFile`.

Key constraints:
- Uses `electron.remote` and `nodeIntegration: true` — tied to Electron 8 API. `remote` module removed in Electron 12+; upgrading requires refactor to `@electron/remote` or IPC.
- Audio disabled in constraints (`audio: false`).
- No preload script; renderer directly requires `electron`, `fs`.

`assets/` holds the app icon (`rec`) referenced by `BrowserWindow`.
