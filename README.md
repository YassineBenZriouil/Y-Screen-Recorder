# Y·REC

> A distinctive, feature-rich screen recorder for Windows, macOS, and Linux - built with Electron, React, and TypeScript.

Created by **Yassine Ben Zriouil**  
[GitHub](https://github.com/yassine-bz) · yassinebenzriuoil7@gmail.com

---

## Features

### Recording

| Feature                | Details                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Source picker**      | Grid of screens and window thumbnails with search and filter (All / Screens / Windows)                                       |
| **Audio capture**      | Microphone + system audio, toggled individually                                                                              |
| **Codec selection**    | VP9 (best compression), VP8 (widest support), H.264 (fastest encode) - auto-fallback if unsupported                          |
| **Resolution presets** | 720p, 1080p, 1440p                                                                                                           |
| **Bitrate / FPS**      | Standard (4 Mbps · 30 FPS), High (6 Mbps · 60 FPS), Lossless (20 Mbps · 60 FPS)                                              |
| **Countdown**          | Off / 3s / 5s before recording starts                                                                                        |
| **Pause / Resume**     | Pause and resume mid-recording                                                                                               |
| **Overlay compositor** | Canvas-based compositing engine that renders cursor highlight, keystroke display, and webcam PiP directly into the recording |

### Overlay Compositor

- **Cursor highlight** - a glowing green ring follows the mouse cursor, flashing red on click. Position is polled via IPC at ~30 Hz for accuracy across all displays.
- **Keystroke display** - pressed keys appear as chips at the bottom of the recording, fading out after 1.6 s. Supports modifiers (Ctrl, Alt, ⌘, Shift) and special keys.
- **Webcam picture-in-picture** - live webcam overlay in any corner (TL / TR / BL / BR) with rounded corners and a red border.

### Review & Save

- **Preview player** - watch your recording before saving with playback controls
- **Metadata panel** - duration, source name, codec, audio config, file size
- **Download to Downloads folder** - quick export without the save dialog
- **Save dialog** - native OS save dialog with filename suggestion
- **Recent recordings** - home screen gallery with thumbnails, timestamps, file sizes
- **Open / Reveal in folder / Copy path** - right-click actions on recent takes
- **Auto-save mode** - skip the dialog entirely, writes to the configured directory with a timestamped filename template

### Settings

Persistent JSON-based configuration stored per-user:

- **Theme** - Dark / Light (applies immediately)
- **Default save directory** - folder picker with `Choose…` dialog
- **Filename template** - customizable with tokens like `{date}`, `{time}`, `{counter}`, `{year}`, `{month}`, `{day}`, `{hour}`, `{minute}`, `{second}`
- **Auto-save** - toggle to bypass the save dialog
- **Minimize while recording** - sends the window to the taskbar/dock during a take
- **Recording defaults** - audio, codec, resolution, bitrate, countdown, overlays pre-filled on every new take
- **Global shortcut customization** - click any shortcut row and press keys to rebind; Esc cancels

Recording defaults, theme, and shortcuts all persist across restarts.

### Global Shortcuts

Work anywhere on your system, even when the window is hidden:

| Action                 | Default            |
| ---------------------- | ------------------ |
| Start / Stop recording | `Ctrl + Shift + R` |
| Stop recording         | `Ctrl + Shift + S` |
| Pause / Resume         | `Ctrl + Shift + P` |
| Discard current take   | `Ctrl + Shift + X` |

All rebindable from the Settings page.

### System Tray

A tray icon with a context menu showing Start/Stop, Pause, Discard, Show Window, and Quit. The tooltip updates to show recording status ("REC" or "PAUSED"). Click the tray icon to toggle window visibility.

### Onboarding

A three-step first-run wizard:

1. **Grant permissions** - macOS users see their Screen Recording, Microphone, and Camera permission status with links to System Settings. Other OS users can skip.
2. **Pick a source** - overview of the source picker UI.
3. **Start recording** - explains keyboard shortcuts.

### Keyboard Shortcuts (In-App)

| Key     | Action                         |
| ------- | ------------------------------ |
| `R`     | Start recording (Ready screen) |
| `S`     | Stop recording                 |
| `P`     | Pause / Resume                 |
| `Esc`   | Close dialog / Go back         |
| `Enter` | Confirm dialog                 |
| `?`     | Open help modal                |

### macOS Permissions

Check and request Screen Recording, Microphone, and Camera permissions. Opens the correct System Settings pane automatically.

### Sound Effects

Short audio beeps on record start, record stop, errors, and countdown ticks - generated via the Web Audio API (no asset files).

### Security

- Content-Security-Policy enforced via `<meta>` tag
- `contextIsolation: true` + `nodeIntegration: false`
- Full `contextBridge` preload script - renderer never has direct Node access
- All IPC input validated in the main process

---

## Built With

- **Electron 30** - cross-platform desktop shell
- **React 18** - UI framework
- **TypeScript** - type safety across the entire codebase
- **electron-vite 2** - fast HMR dev server and production builds
- **Vite 5** - bundler under the hood
- **Web APIs** - `MediaRecorder`, `MediaDevices.getUserMedia`, Canvas 2D compositing
- **CSS Custom Properties** - themable design tokens

---

## Project Structure

```
y-rec/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Window creation, IPC handlers
│   │   ├── store.ts       # Persistent settings + recent list (JSON file)
│   │   ├── shortcuts.ts   # Global keyboard shortcut registration
│   │   ├── tray.ts        # System tray icon + context menu
│   │   └── permissions.ts # macOS media permission helpers
│   ├── preload/
│   │   ├── index.ts       # contextBridge API (window.yrec)
│   │   └── api.d.ts       # Type declarations for window.yrec
│   └── renderer/
│       ├── index.html     # HTML shell with CSP meta
│       └── src/
│           ├── main.tsx   # React entry point
│           ├── App.tsx    # Root component + step orchestrator
│           ├── state.ts   # useReducer + Context (step FSM)
│           ├── types.ts   # Shared TypeScript types
│           ├── screens/   # 8 screen components
│           ├── components/# 16 reusable UI primitives
│           ├── hooks/     # 6 custom React hooks
│           ├── utils/     # Compositor engine + sound effects
│           └── styles/    # tokens.css, base.css, components.css
├── assets/                # App icon (rec.png)
├── public/                # YR.png (window + tray icon)
└── package.json           # Scripts: dev, start, build, typecheck
```

---

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Preview production build
npm run start

# Type-check both node and web tsconfigs
npm run typecheck

# Production build (compiles to out/)
npm run build
```

Build output goes to `out/`.

---

## Packaging - installers for Windows, macOS, Linux

Packaging is handled by [`electron-builder`](https://www.electron.build/).
It turns the compiled app in `out/` into platform-native installers under
`release/<version>/`.

### Build for your own platform

```bash
npm run dist
```

### Build for a specific platform

```bash
npm run dist:win     # Windows  - .exe (NSIS installer + portable)
npm run dist:mac     # macOS    - .dmg + .zip (Intel + Apple Silicon)
npm run dist:linux   # Linux    - .AppImage + .deb + .rpm
```

Artifacts land in `release/<version>/` with names like:

- `Y-REC-2.0.0-x64-Setup.exe`
- `Y-REC-2.0.0-x64-Portable.exe`
- `Y-REC-2.0.0-x64-mac.dmg`, `Y-REC-2.0.0-arm64-mac.dmg`
- `Y-REC-2.0.0-x64-linux.AppImage`, `.deb`, `.rpm`

### Cross-platform limits

You can only build **for the OS you're running on** (Wine can produce Windows
builds from macOS/Linux, but signing and reliability suffer). To ship all
three platforms without owning all three OSes, use the GitHub Actions
workflow described next.

---

## Release to GitHub (industry-standard distribution)

The workflow at `.github/workflows/release.yml` builds installers on three
GitHub-hosted runners in parallel (Windows, macOS, Linux) and attaches them
to a GitHub Release automatically.

### One-time setup

1. Push this repo to GitHub if it isn't there yet:
   ```bash
   git remote add origin https://github.com/<your-username>/Y-Screen-Recorder.git
   git push -u origin master
   ```
2. Nothing else. GitHub Actions is enabled by default. The workflow uses the
   built-in `GITHUB_TOKEN` - no manual secrets required.

### Cutting a release

Each time you want to publish a version:

1. Bump `"version"` in `package.json` (e.g. `2.1.0`).
2. Commit and push:
   ```bash
   git add package.json
   git commit -m "release 2.1.0"
   git push
   ```
3. Tag the commit and push the tag - this fires the workflow:
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```
4. Open **Actions** on GitHub. The "Release" workflow runs on Windows, macOS,
   and Linux in parallel. Takes ~10–15 minutes total.
5. When finished, open **Releases** on GitHub. A **draft** release named
   `v2.1.0` will be waiting with every installer attached.
6. Add release notes and hit **Publish release**. Your users can now download
   from the Releases page.

### Manual run

Prefer not to tag? Go to **Actions → Release → Run workflow** on GitHub.
Same output; you'll need to manually promote the draft release when done.

---

## Distribution is 100% free

You do **not** need to pay anyone to build or ship `.exe`, `.dmg`, `.AppImage`,
etc. Everything set up here is free forever:

- `electron-builder` - free open source.
- GitHub Actions - free for public repos, generous free tier for private.
- GitHub Releases - free hosting for the installer files.
- Runners (Windows, macOS, Linux) - free on GitHub-hosted runners.

The **only** paid thing in the whole pipeline is code signing, and code
signing is **optional**. It is a cosmetic upgrade that removes a first-run
warning; the app runs identically with or without it.

### What "unsigned" means for your users

Because the installers aren't signed by a paid certificate authority, the
first time someone runs them the OS shows a scary-looking warning that they
have to click past **once**. After that first click, the app runs normally
forever and never nags again.

- **Windows** - a blue "Windows protected your PC" dialog appears.
  User clicks _More info_ → _Run anyway_. Done.
- **macOS** - "Y-REC can't be opened because Apple cannot check it."
  User right-clicks the app → _Open_ → _Open_. Done.
- **Linux** - no warning at all.

Many popular open-source apps ship unsigned. It is normal and legal.

### If you ever want to remove the warnings (never required)

- **Windows** - buy an EV Code Signing certificate ($200–400/year).
  Add `CSC_LINK` + `CSC_KEY_PASSWORD` as GitHub repo secrets.
- **macOS** - Apple Developer Program ($99/year) + notarization.
  Add `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` secrets.

electron-builder auto-detects these secrets and signs. If they don't exist,
it builds unsigned - which is exactly what the current setup does. No
changes needed to keep using the free path.

---

## Better icons (optional)

The build uses `build/icon.png` (currently 542×542) for every platform, and
electron-builder auto-generates the right formats. For sharper Windows and
macOS results, drop these next to `icon.png`:

- `build/icon.ico` - Windows (multi-size bundle). Generate from a
  1024×1024 PNG at https://cloudconvert.com/png-to-ico.
- `build/icon.icns` - macOS. Generate from PNG with `png2icns` or an
  online converter.

electron-builder will prefer them over the PNG.

---

## Scripts reference

| Script               | What it does                               |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Dev mode with HMR                          |
| `npm run build`      | Compile main + preload + renderer → `out/` |
| `npm run typecheck`  | TypeScript check without emitting          |
| `npm run dist`       | Compile + package for the current OS       |
| `npm run dist:win`   | Compile + package Windows installers       |
| `npm run dist:mac`   | Compile + package macOS installers         |
| `npm run dist:linux` | Compile + package Linux installers         |
| `npm run release`    | Compile + package + publish (used by CI)   |

---

## License

MIT - Yassine Ben Zriouil
