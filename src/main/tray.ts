import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import type { NativeImage } from "electron";
import { join } from "node:path";

let tray: Tray | null = null;

type Phase = "idle" | "recording" | "paused";

interface Handlers {
    onToggleRecord: () => void;
    onTogglePause: () => void;
    onDiscard: () => void;
}

let currentPhase: Phase = "idle";
let handlers: Handlers | null = null;

function iconPath(): string {
    return join(__dirname, "../../public/YR.png");
}

function buildIcon(): NativeImage {
    const img = nativeImage.createFromPath(iconPath());
    if (img.isEmpty()) return nativeImage.createEmpty();
    return img.resize({ width: 16, height: 16 });
}

function rebuildMenu(win: BrowserWindow | null): void {
    if (!tray) return;
    const recording = currentPhase !== "idle";
    const paused = currentPhase === "paused";
    const menu = Menu.buildFromTemplate([
        {
            label: recording ? "Stop recording" : "Start recording",
            click: () => handlers?.onToggleRecord(),
        },
        {
            label: paused ? "Resume" : "Pause",
            enabled: recording,
            click: () => handlers?.onTogglePause(),
        },
        {
            label: "Discard current take",
            enabled: recording,
            click: () => handlers?.onDiscard(),
        },
        { type: "separator" },
        {
            label: "Show window",
            click: () => {
                if (!win) return;
                if (win.isMinimized()) win.restore();
                win.show();
                win.focus();
            },
        },
        { type: "separator" },
        {
            label: "Quit Y·REC",
            click: () => app.quit(),
        },
    ]);
    tray.setContextMenu(menu);
    const badge = paused ? "PAUSED" : recording ? "REC" : "";
    tray.setToolTip(badge ? `Y·REC — ${badge}` : "Y·REC");
}

export function createTray(win: BrowserWindow, h: Handlers): void {
    handlers = h;
    if (tray) return;
    tray = new Tray(buildIcon());
    tray.setToolTip("Y·REC");
    tray.on("click", () => {
        if (!win) return;
        if (win.isVisible() && !win.isMinimized()) {
            win.hide();
        } else {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });
    rebuildMenu(win);
}

export function updatePhase(win: BrowserWindow | null, phase: Phase): void {
    currentPhase = phase;
    rebuildMenu(win);
}

export function destroyTray(): void {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}
