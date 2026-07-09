# Improvement Plan — Y Screen Recorder

Audit of current Electron screen recorder (Electron 8, single renderer). Grouped by concern. Priority tags: **[P0]** critical/blocker, **[P1]** high value, **[P2]** nice-to-have.

---

## 1. Current State Snapshot

- Electron 8.0.2, `nodeIntegration: true`, `remote` module in renderer.
- Single-window app (800x600). One HTML file, one JS file, one CSS file.
- Records via `MediaRecorder` → `video/webm; codecs=vp9`, saves via `dialog.showSaveDialog` + `fs.writeFile`.
- No audio, no pause, no timer, no settings, no keyboard shortcuts, no error handling.
- CSS references Bulma-style classes (`is-primary`, `is-warning`, `is-text`, `content`) but Bulma is **not loaded** — dead classes.
- HTML has `<h2>START RECORDING</h2>` but CSS only styles `h1`. `.tit_Img` class defined, never used.

---

## 2. Critical Bugs & Correctness [P0]

1. **Start button crashes if no source picked.** `startBtn.onclick` calls `mediaRecorder.start()` but `mediaRecorder` is `undefined` until `selectSource` runs. Guard or disable Start until a source is chosen.
2. **`recordedChunks` never cleared** between recordings. Second recording concatenates the first. Reset array on `mediaRecorder.start()` or in `onstart`.
3. **Save dialog cancellation writes nothing but leaves chunks.** After successful save also clear chunks. If user cancels, either keep buffer for retry or discard explicitly.
4. **`remote` deprecated / removed in Electron 12+.** App is pinned to Electron 8 (2020, unpatched CVEs). Migrate to `@electron/remote` or preferably IPC + `contextBridge`.
5. **`nodeIntegration: true` + no `contextIsolation`** = full Node in renderer. Any XSS = RCE. Even for local content, harden: `contextIsolation: true`, `nodeIntegration: false`, preload script exposing narrow API via `contextBridge`.
6. **No `Content-Security-Policy`** meta tag in `index.html`.
7. **`beforeunload` stops recorder but does not save** — user loses recording on window close during record. Prompt to save or auto-save to temp path.
8. **Icon path `assets/rec` missing extension.** File is `rec.png`. Works on some platforms but fragile — use full filename.

---

## 3. Feature Gaps

### 3.1 Recording capabilities [P0/P1]
- **Audio capture** [P0]: system audio + microphone. Currently `audio: false`. Add toggles for mic (via `getUserMedia({audio:true})`) and desktop audio (`chromeMediaSource: 'desktop'` with audio constraint on Windows/Linux; macOS needs virtual audio device — document limitation).
- **Pause / Resume** [P1]: `MediaRecorder.pause()` / `resume()`. Button + shortcut.
- **Recording timer** [P0]: elapsed HH:MM:SS while recording. Users have zero feedback of duration.
- **Countdown before start** [P1]: 3-2-1 overlay so user can switch windows.
- **Region selection** [P1]: record only a rectangle of a screen. Requires a transparent selector window (`BrowserWindow` with `transparent: true, frame: false, fullscreen: true`) that returns crop rect; apply via canvas re-encode or CSS clip on preview + post-process crop with ffmpeg.
- **Webcam overlay (picture-in-picture)** [P1]: composite webcam stream on canvas with screen stream. Common demand for tutorial recordings.
- **Multiple format outputs** [P1]: `.mp4` (H.264 via ffmpeg-static post-process) in addition to `.webm`. Most users expect mp4.
- **Quality / bitrate / FPS settings** [P1]: expose `videoBitsPerSecond`, `MediaRecorder` frame rate constraint (`video: { mandatory: { ..., maxFrameRate: 60 } }`), resolution scaling.
- **Codec choice** [P2]: vp8/vp9/h264 dropdown with capability check via `MediaRecorder.isTypeSupported`.
- **Cursor highlight / click flash** [P2]: canvas overlay ring on mouse position, flash on click. Big UX win for tutorials.
- **Keystroke display** [P2]: render pressed keys on-screen overlay.
- **Zoom-on-cursor** [P2]: à la ScreenStudio.

### 3.2 Post-recording [P1]
- **Preview + trim** before save. Currently the file drops straight to disk. Add in-app playback, in/out markers, then export.
- **Auto-save to configurable default folder** (with "save as" as override). Persist last path.
- **Filename template** (`recording-YYYY-MM-DD_HHmmss`).
- **Recent recordings list** on home screen.
- **Copy path / Open folder / Open file** actions after save.
- **Export GIF** [P2] via `gif.js` or ffmpeg.

### 3.3 App-level [P1]
- **Global keyboard shortcuts** via `globalShortcut` (start/stop/pause even when window not focused). Default: `Ctrl+Shift+R` start/stop, `Ctrl+Shift+P` pause.
- **Tray icon** with start/stop/quit; window can hide to tray during recording so the recorder itself isn't captured.
- **"Hide window while recording"** toggle.
- **Persistent settings** (electron-store) — last source, audio prefs, save path, format, bitrate.
- **Auto-updater** (`electron-updater` / Forge publisher).
- **Crash reporter** hookup.
- **First-run permissions guide** on macOS (Screen Recording + Microphone in System Settings).

---

## 4. UX / UI Issues

### 4.1 Current pain points
- Video element renders empty black box before any source selected — looks broken.
- No indication of which source is being recorded except button text change.
- No recording state indicator (blinking red dot, timer).
- "Choose a Video Source" is the last button but is the **first required action** — flow is backwards.
- Native context menu (`Menu.popup`) for source picking gives text-only list — thumbnails missing. `desktopCapturer` returns `source.thumbnail` (NativeImage) — use it.
- No confirmation on stop before save dialog.
- No way to cancel/discard a bad recording without saving.
- Window is not resizable-aware — layout centered vertically breaks on small heights.
- No dark/light theme toggle (currently hard-dark only).
- Buttons cluster horizontally with no clear primary vs secondary hierarchy once styled.
- Save dialog appears every time — no default folder, no "silent save".

### 4.2 Redesigned flow
```
1. Home screen: [Select Source ▾] [Audio: Off ▾] [Quality: 1080p60 ▾]
                   ↓
2. Source picker: thumbnail grid (screens + windows), search field
                   ↓
3. Preview panel with source name badge + settings summary
                   ↓
4. [● Record] (large primary) with optional 3s countdown
                   ↓
5. Recording HUD: red dot • 00:12:34 • [❚❚ Pause] [■ Stop] [✕ Discard]
                   (window minimizes to tray; overlay HUD stays)
                   ↓
6. Review screen: playback, trim handles, [Save] [Save As] [Discard] [Copy to clipboard]
                   ↓
7. Toast: "Saved to …" [Open folder] [Show in explorer]
```

### 4.3 Visual/layout suggestions
- Replace centered flex-column with a proper app shell: sidebar (recent + settings) + main area.
- Use CSS custom properties for theme tokens (`--bg`, `--surface`, `--accent`, `--danger`, `--text`, `--muted`).
- Adopt a real icon set (Lucide/Feather via inline SVG — no font dep).
- Consistent 4/8px spacing scale; current CSS mixes 10/20px arbitrarily.
- Button hierarchy: one filled primary, ghost/outline secondaries. Currently three competing colors (blue, red, blue-outline).
- Add micro-interactions: pulse on record button while recording, ripple on click, subtle motion on state change (< 200ms).
- Accessible focus rings (`:focus-visible`) — currently none.
- Keyboard-first: `Tab` order deliberate, `Enter` on focused source thumbnail selects, `Esc` cancels picker.
- Prefer system font stack over `Arial, sans-serif` (`-apple-system, Segoe UI, Roboto, ...`).
- Custom title bar (`frame: false` + `-webkit-app-region: drag`) for cohesive look, or keep native — pick one intentionally.
- Empty states: when no source selected, show illustrated placeholder + CTA instead of black video box.

### 4.4 Accessibility
- No `aria-label` on icon-only buttons (planned).
- No `role="status"` live region for recording timer/state.
- Color contrast: `#e0e0e0` on `#121212` passes; verify accent `#2196f3` against dark bg for text usage (marginal).
- Add `prefers-reduced-motion` handling for future animations.
- Keyboard shortcuts must be discoverable (visible hints, `?` help modal).

---

## 5. Design System Proposal

Palette (dark, default):
```
--bg:        #0e0f13
--surface:   #171922
--surface-2: #1f2230
--border:    #2a2e3d
--text:      #e6e8ef
--muted:     #8a8fa3
--accent:    #4f8cff        (primary)
--accent-2:  #7c5cff        (secondary/gradient pair)
--danger:    #ff4d5e        (record / stop)
--success:   #34d399
```
Light theme mirrors with inverted surfaces.

Type scale: 12 / 14 / 16 / 20 / 28 (rem-based). Weights 400/500/600 only.

Radius: 6 (inputs) / 10 (cards) / 999 (pill buttons).

Shadow: single elevation token `0 8px 24px rgba(0,0,0,.35)`.

Motion: 120ms ease-out for hover, 200ms cubic-bezier(.2,.8,.2,1) for state changes.

---

## 6. Architecture / Code Quality

- **Split main/renderer/preload cleanly.** New `src/main/`, `src/preload/`, `src/renderer/`.
- **Adopt bundler** (Vite via `electron-vite` or Forge's Vite/webpack templates) → ES modules, HMR, TypeScript ready.
- **TypeScript** for renderer state machine (recording states: `idle | selecting | ready | countdown | recording | paused | reviewing | saving`). A proper FSM (XState or hand-rolled) prevents the current "click Start with no source" class of bugs.
- **IPC boundary**: main owns filesystem, dialogs, globalShortcut, tray, settings, ffmpeg; renderer owns capture + UI. `contextBridge` exposes typed API.
- **Componentize UI**: even without a framework, extract HUD, SourcePicker, ReviewPanel into modules with clear props/events. Or adopt Svelte/React for real state binding — current imperative DOM patching won't scale past 2 more features.
- **Config module** (`electron-store`) for persistence.
- **Logging** (`electron-log`) instead of `console.log`.
- **Tests**: at minimum Playwright end-to-end for click-through flow; unit tests on FSM transitions.
- **Lint/format**: ESLint + Prettier (currently `lint` is a no-op). Add `typecheck` script if TS adopted.
- **Dependency refresh**: Electron 8 → current LTS (30+). Audit `npm audit` will scream — plan migration in one PR.
- **Remove dead code**: `.tit_Img` CSS, `<h1>` styling (only `<h2>` in DOM), Bulma-style classnames without Bulma.

---

## 7. Performance

- vp9 encoding at high resolution is CPU heavy. Offer vp8 or h264 fallback. Detect and warn on slow encode (dropped frames).
- Preview `<video>` at full source resolution wastes GPU — downscale preview to display size.
- Long recordings hold everything in RAM (`recordedChunks` array of Blobs). Stream to disk via `Node fs.createWriteStream` from main process, or write incremental chunks on `dataavailable(timeslice)`. Currently no `timeslice` passed to `start()` — a 1-hour recording will OOM.
- Debounce source list refresh; cache thumbnails.

---

## 8. Security Hardening

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` where possible.
- Preload with `contextBridge.exposeInMainWorld('api', {...})`.
- CSP meta: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';`.
- Validate all IPC input in main.
- Disable `remote` module entirely; use `ipcRenderer.invoke` + `ipcMain.handle`.
- File writes: main validates path is inside user-chosen dir; refuse traversal.
- Enable Electron Fuses (disable Node CLI inspect args in prod).

---

## 9. Packaging & Distribution

- Forge is already set up (Squirrel/deb/rpm/zip). Add:
  - macOS: `@electron-forge/maker-dmg` + code signing + notarization config.
  - Windows: code-signing cert instructions.
  - Auto-update publisher (GitHub/S3).
- App metadata: `author`, `description`, `homepage`, proper `productName` ("Y Screen Recorder"), bundle id (`com.yassine.yscreenrecorder`).
- Icons: provide `.ico` (Windows), `.icns` (macOS), 512px `.png` (Linux). Currently only `rec.png`.

---

## 10. Prioritized Roadmap

**Milestone 1 — Stabilize (1 week)**
- Fix P0 bugs (§2.1–2.3, 2.7).
- Add recording timer + red-dot indicator.
- Add audio (mic + system where supported).
- Reset chunks per session; stream to disk with timeslice.

**Milestone 2 — Modernize stack (1–2 weeks)**
- Upgrade Electron, remove `remote`, add preload + contextBridge, CSP.
- Introduce Vite + TypeScript + ESLint/Prettier.
- Extract FSM; refactor renderer.

**Milestone 3 — UX overhaul (2 weeks)**
- Source picker with thumbnail grid.
- Redesigned app shell + design tokens + theme.
- Review/trim screen.
- Global shortcuts + tray + settings persistence.

**Milestone 4 — Power features (ongoing)**
- Region select, webcam PiP, cursor highlight.
- mp4 export via ffmpeg-static.
- Countdown, keystroke overlay, GIF export.
- Auto-updater, signing, notarization.

---

## 11. Quick Wins (< 1 day each)

- Disable Start button until source picked.
- Reset `recordedChunks` at start.
- Add timer element updating every 500ms.
- Add `aria-label` to icon buttons.
- Add CSP meta tag.
- Fix icon path to `rec.png`.
- Replace `remote` dialog with IPC handler (prep for Electron upgrade).
- Delete dead CSS (`.tit_Img`, `h1` block, Bulma classnames on buttons).
- Add `Ctrl+R` / `Ctrl+S` shortcuts via `globalShortcut`.
