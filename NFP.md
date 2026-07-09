# NFP — New Feature Propositions

Collection of proposals to evolve Y·REC from a functional recorder into a polished, professional-grade screen recording tool. Each section is a self-contained feature area.

---

## 1. Settings Page

A dedicated persistent-settings screen accessible from anywhere in the app.

**Persistent storage:** Read/write a JSON config file via `app.getPath("userData")` through new IPC channels (`settings:load`, `settings:save`). No external dependency needed.

**Editable preferences:**
- Default save directory (override `~/Videos`)
- Filename template (e.g. `y-rec-{date}-{time}`, `recording-{counter}`)
- Default audio/codec/quality/countdown values (so the Config screen pre-fills them)
- Auto-save toggle — skip the save dialog entirely, write directly to default dir
- "Hide window while recording" — auto-minimize to tray on record start
- Theme toggle: dark / light (currently hard-dark only)
- Keyboard shortcut customization (remap R, S, P, Esc)

**UI:**
- New step `"settings"` in the FSM
- Gear icon in the topbar (always visible)
- Sections organized with the same Field/Segment components used in ConfigScreen
- "Reset to defaults" button

---

## 2. Recording Enhancements

### 2.1 Region Selection
A transparent overlay window (`BrowserWindow` with `transparent: true, frame: false, fullscreen: true`) that lets the user drag a rectangle to capture only a portion of the screen. The crop coordinates get applied via a canvas re-encode or as a CSS clip + ffmpeg post-process.

### 2.2 Webcam Picture-in-Picture
Composite a `getUserMedia({ video: true })` webcam feed onto the screen capture via a `<canvas>` overlay. Controls for position (bottom-right, bottom-left, top-right) and size.

### 2.3 Cursor Highlight + Click Flash
Canvas overlay ring that follows the mouse cursor with a flash animation on click. Configurable color and size. Big UX win for tutorials.

### 2.4 Keystroke Display
Overlay that renders pressed keys in the corner of the recording (à la ScreenStudio). Configurable position, font size, opacity, and max visible keys.

### 2.5 MP4 Export
Post-process the recorded `.webm` blob through `ffmpeg-static` (bundled in main process) to produce `.mp4` (H.264/AAC). Offer the choice in the save dialog or as a setting.

### 2.6 Bitrate / FPS Controls
Expose `videoBitsPerSecond` and `maxFrameRate` in the Config screen. Current hardcoded values: 6 Mbps, 30–60 FPS. Presets: "Standard" (4 Mbps, 30 FPS), "High" (6 Mbps, 60 FPS), "Lossless" (20 Mbps, 60 FPS).

---

## 3. Post-Recording

### 3.1 In-App Trim Editor
After stopping, show a waveform/timeline with in/out markers. Export only the trimmed segment. Implementation: copy the captured blob into a second `MediaRecorder` or use a `<canvas>` playback + re-encode approach.

### 3.2 Recent Recordings List
Home screen showing thumbnails and metadata of recent takes (stored in the persistent settings JSON). Actions: play, reveal in folder, delete. Persist across app restarts.

### 3.3 Auto-Save Mode
When enabled in Settings, skip the save dialog entirely: write directly to the configured default directory with the configured filename template. Post-save toast shows the path with "Reveal" and "Open" actions.

### 3.4 Copy to Clipboard
Button in the Review screen that copies the blob or file path to the system clipboard.

### 3.5 GIF Export
Convert a segment of the recording to animated GIF via `ffmpeg-static` or the `gif.js` library. Useful for quick sharing.

---

## 4. App-Level Features

### 4.1 System Tray
Tray icon with menu: "Start/Stop recording", "Pause/Resume", "Show window", "Quit". During recording, the app window can minimize to tray so the recorder isn't captured by itself.

### 4.2 Global Keyboard Shortcuts
Register shortcuts via Electron's `globalShortcut` API so they work even when the window is unfocused or minimized.
- `Ctrl+Shift+R` — start / stop recording
- `Ctrl+Shift+P` — pause / resume
- `Ctrl+Shift+Esc` — cancel / discard

### 4.3 Auto-Updater
Integrate `electron-updater` with GitHub Releases or a private S3 bucket. Check for updates on startup. Settings page shows current version + "Check for updates" button.

### 4.4 macOS Permissions Guide
First-run dialog that explains how to grant Screen Recording and Microphone permissions in System Settings, with a "Open System Settings" button (`shell.openExternal("x-apple.systempreferences:...")`).

### 4.5 First-Run Onboarding
A lightweight 3-step walkthrough on very first launch: "Grant permissions" → "Pick a source" → "Start recording". Dismissable, and skippable.

### 4.6 Crash Reporter
Catch unhandled exceptions in main and renderer, write a crash log to `userData`, and optionally prompt to open a GitHub issue with pre-filled diagnostic info.

---

## 5. UX Polish

### 5.1 Light Theme
The design tokens in `tokens.css` already use CSS custom properties — introduce a `[data-theme="light"]` variant with inverted surfaces. Toggle from Settings.

### 5.2 Always-on-Top HUD
When recording, show a small floating indicator (red dot + timer + pause/stop buttons) in a separate always-on-top `BrowserWindow` so the user sees status even when the main window is minimized.

### 5.3 Sound Effects
Play short audio cues on record start/stop and on errors. Use `Audio` API with base64-encoded short clips (no extra files).

### 5.4 Window Resize Smoothing
Current layout works best at fixed sizes. Make the app shell responsive: grid-based layout, min-width breakpoints, content that reflows gracefully below 520px.

### 5.5 Keyboard-First Navigation
Every action reachable via keyboard. Tab order deliberate. Focus rings visible. Help modal (`?`) showing all shortcuts.

### 5.6 Source Thumbnail Refresh
Auto-refresh source thumbnails periodically (every 5 seconds) while the source picker is open, so new windows appear without manual refresh.

---

## 6. Technical Debt / Reliability

### 6.1 Stream to Disk (Prevent OOM)
Current implementation holds all recorded chunks in RAM (`recordedChunks` array). On long recordings this will exhaust memory. Solution: pass a `timeslice` to `MediaRecorder.start(timeslice)` and write each chunk to a temp file via IPC, or pipe through a `WritableStream` to the main process.

### 6.2 Error Recovery on Stream Drop
If the desktop capture stream drops mid-recording (source window closed, screen disconnected), detect via `track.onended` and gracefully stop + save what was captured so far instead of losing everything.

### 6.3 Crash Auto-Save
If the renderer process crashes during recording, the main process should detect the crash (via `webContents` crash event) and finalize the recording from the temp chunk file before quitting.

### 6.4 MediaRecorder Availability Check
On devices/browsers where `MediaRecorder` is unavailable or VP9 isn't supported, show a clear error at step 1 instead of failing silently later.

### 6.5 Audio Sync Check
Flag if system audio + mic are out of sync (common issue with desktop capture). Could measure drift between audio tracks and warn the user.
