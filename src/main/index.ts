import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  desktopCapturer,
  Menu,
  nativeImage,
  clipboard,
  screen,
} from "electron";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  load as loadStore,
  getSettings,
  updateSettings,
  resetSettings,
  listRecents,
  addRecent,
  removeRecent,
  fillTemplate,
  type Settings,
  type RecentTake,
} from "./store";
import { registerAll, unregisterAll } from "./shortcuts";
import { createTray, updatePhase, destroyTray } from "./tray";
import {
  getStatus,
  askIfNeeded,
  openSystemSettings,
  type MediaPermission,
} from "./permissions";

const isDev = !app.isPackaged;
let mainWin: BrowserWindow | null = null;
let saveCounter = 0;

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
async function createWindow() {
  const settings = await getSettings();

  mainWin = new BrowserWindow({
    width: 1080,
    height: 840,
    minWidth: 520,
    minHeight: 680,
    backgroundColor: settings.theme === "light" ? "#f6f6f8" : "#0a0b10",
    title: "Y·REC",
    icon: nativeImage.createFromPath(join(__dirname, "../../public/YR.png")),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWin.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWin.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWin.on("closed", () => {
    mainWin = null;
  });

  mainWin.webContents.on("render-process-gone", (_e, details) => {
    console.error("Renderer crashed:", details);
  });

  // Wire tray + global shortcuts
  createTray(mainWin, {
    onToggleRecord: () => sendShortcut("record"),
    onTogglePause: () => sendShortcut("pause"),
    onDiscard: () => sendShortcut("discard"),
  });
  registerAll(mainWin, settings.shortcuts);
}

function sendShortcut(key: string) {
  if (!mainWin || mainWin.isDestroyed()) return;
  mainWin.webContents.send("shortcut:fired", key);
}

app.whenReady().then(async () => {
  await loadStore();
  await createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  unregisterAll();
  destroyTray();
});

// ---------------------------------------------------------------------------
// IPC - Sources
// ---------------------------------------------------------------------------
type SourceKind = "screen" | "window";
interface SourceInfo {
  id: string;
  name: string;
  kind: SourceKind;
  thumbnail: string;
  appIcon: string | null;
}

ipcMain.handle("sources:list", async (): Promise<SourceInfo[]> => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.id.startsWith("screen") ? "screen" : "window",
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
  }));
});

// ---------------------------------------------------------------------------
// IPC - Recording save
// ---------------------------------------------------------------------------
interface SavePayload {
  buffer: ArrayBuffer;
  extension: string;
  suggestedName?: string;
  durationMs: number;
  sourceName: string;
  codec: "vp9" | "vp8" | "h264";
  thumbnail?: string;
  autoSave?: boolean;
}

type SaveResult =
  | { canceled: true }
  | { canceled: false; filePath: string; entry: RecentTake };

async function ensureDir(dir: string) {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function uniquePath(
  dir: string,
  name: string,
  ext: string,
): Promise<string> {
  let candidate = join(dir, `${name}.${ext}`);
  let n = 2;
  while (existsSync(candidate)) {
    candidate = join(dir, `${name} (${n}).${ext}`);
    n++;
  }
  return candidate;
}

ipcMain.handle(
  "recording:save",
  async (_evt, payload: SavePayload): Promise<SaveResult> => {
    const settings = await getSettings();
    saveCounter += 1;
    const base = fillTemplate(settings.filenameTemplate, {
      counter: saveCounter,
    });
    const defaultName = payload.suggestedName || `${base}.${payload.extension}`;
    const dir = settings.defaultSaveDir || join(app.getPath("home"), "Videos");
    await ensureDir(dir);

    let filePath: string;
    if (settings.autoSave || payload.autoSave) {
      filePath = await uniquePath(dir, base, payload.extension);
    } else {
      const res = await dialog.showSaveDialog(
        (mainWin ?? undefined) as BrowserWindow,
        {
          title: "Save recording",
          defaultPath: join(dir, defaultName),
          buttonLabel: "Save recording",
          filters: [
            { name: "Video", extensions: [payload.extension] },
            { name: "All files", extensions: ["*"] },
          ],
        },
      );
      if (res.canceled || !res.filePath) return { canceled: true };
      filePath = res.filePath;
    }

    await ensureDir(dirname(filePath));
    await writeFile(filePath, Buffer.from(payload.buffer));
    const info = await stat(filePath);
    const entry: RecentTake = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      filePath,
      savedAt: Date.now(),
      durationMs: payload.durationMs,
      sizeBytes: info.size,
      codec: payload.codec,
      extension: payload.extension,
      sourceName: payload.sourceName,
      thumbnail: payload.thumbnail,
    };
    await addRecent(entry);
    return { canceled: false, filePath, entry };
  },
);

// ---------------------------------------------------------------------------
// IPC - Shell / clipboard
// ---------------------------------------------------------------------------
ipcMain.handle("shell:reveal", async (_evt, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("shell:open", async (_evt, filePath: string) => {
  const err = await shell.openPath(filePath);
  return { ok: err === "", error: err };
});

ipcMain.handle("shell:openExternal", async (_evt, url: string) => {
  await shell.openExternal(url);
});

ipcMain.handle("clipboard:writeText", async (_evt, text: string) => {
  clipboard.writeText(text);
});

ipcMain.handle("dialog:pickDirectory", async (_evt, current?: string) => {
  const res = await dialog.showOpenDialog(
    (mainWin ?? undefined) as BrowserWindow,
    {
      title: "Choose save folder",
      defaultPath: current,
      properties: ["openDirectory", "createDirectory"],
    },
  );
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

// ---------------------------------------------------------------------------
// IPC - Settings
// ---------------------------------------------------------------------------
ipcMain.handle("settings:get", async () => await getSettings());

ipcMain.handle("settings:update", async (_evt, patch: Partial<Settings>) => {
  const next = await updateSettings(patch);
  if (patch.shortcuts && mainWin) registerAll(mainWin, next.shortcuts);
  if (patch.theme && mainWin) {
    mainWin.setBackgroundColor(next.theme === "light" ? "#f6f6f8" : "#0a0b10");
  }
  return next;
});

ipcMain.handle("settings:reset", async () => {
  const next = await resetSettings();
  if (mainWin) registerAll(mainWin, next.shortcuts);
  return next;
});

// ---------------------------------------------------------------------------
// IPC - Recents
// ---------------------------------------------------------------------------
ipcMain.handle("recents:list", async () => await listRecents());
ipcMain.handle(
  "recents:remove",
  async (_evt, id: string, alsoDeleteFile?: boolean) =>
    await removeRecent(id, alsoDeleteFile === true),
);
ipcMain.handle("recents:exists", async (_evt, filePath: string) =>
  existsSync(filePath),
);

// ---------------------------------------------------------------------------
// IPC - Recording phase (for tray badge + window hide)
// ---------------------------------------------------------------------------
ipcMain.handle(
  "recording:phase",
  async (_evt, phase: "idle" | "recording" | "paused") => {
    updatePhase(mainWin, phase);
    const settings = await getSettings();
    if (settings.hideWindowWhileRecording && mainWin) {
      if (phase === "recording" && !mainWin.isMinimized()) mainWin.minimize();
      if (phase === "idle" && mainWin.isMinimized()) mainWin.restore();
    }
  },
);

ipcMain.handle("window:show", async () => {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
});

// ---------------------------------------------------------------------------
// IPC - Permissions (macOS)
// ---------------------------------------------------------------------------
ipcMain.handle("perm:status", (_evt, kind: MediaPermission) => getStatus(kind));
ipcMain.handle(
  "perm:ask",
  async (_evt, kind: MediaPermission) => await askIfNeeded(kind),
);
ipcMain.handle("perm:openSettings", async (_evt, kind: MediaPermission) => {
  await openSystemSettings(kind);
});

// ---------------------------------------------------------------------------
// IPC - Cursor tracking (for overlay compositor)
// ---------------------------------------------------------------------------
ipcMain.handle("cursor:point", () => {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  return {
    x: point.x,
    y: point.y,
    displayX: display.bounds.x,
    displayY: display.bounds.y,
    displayW: display.size.width,
    displayH: display.size.height,
    scaleFactor: display.scaleFactor,
  };
});

// ---------------------------------------------------------------------------
// IPC - App info
// ---------------------------------------------------------------------------
ipcMain.handle("app:info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
}));
