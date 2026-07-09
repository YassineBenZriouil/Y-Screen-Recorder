import {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    shell,
    desktopCapturer,
    Menu,
    nativeImage,
} from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const isDev = !app.isPackaged;

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
    const win = new BrowserWindow({
        width: 1040,
        height: 820,
        minWidth: 520,
        minHeight: 680,
        backgroundColor: "#0a0b10",
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
        win.loadURL(process.env.ELECTRON_RENDERER_URL);
    } else {
        win.loadFile(join(__dirname, "../renderer/index.html"));
    }

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
type SourceKind = "screen" | "window";
interface SourceInfo {
    id: string;
    name: string;
    kind: SourceKind;
    thumbnail: string; // data URL
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

ipcMain.handle(
    "recording:save",
    async (_evt, payload: { buffer: ArrayBuffer; extension: string; suggestedName?: string }) => {
        const defaultName = payload.suggestedName || `y-rec-${stamp()}.${payload.extension}`;
        const defaultPath = join(homedir(), "Videos", defaultName);
        const res = await dialog.showSaveDialog({
            title: "Save recording",
            defaultPath,
            buttonLabel: "Save recording",
            filters: [
                { name: "Video", extensions: [payload.extension] },
                { name: "All files", extensions: ["*"] },
            ],
        });
        if (res.canceled || !res.filePath) return { canceled: true as const };
        await writeFile(res.filePath, Buffer.from(payload.buffer));
        return { canceled: false as const, filePath: res.filePath };
    }
);

ipcMain.handle("shell:reveal", async (_evt, filePath: string) => {
    shell.showItemInFolder(filePath);
});

ipcMain.handle("shell:openExternal", async (_evt, url: string) => {
    await shell.openExternal(url);
});

function stamp(): string {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
