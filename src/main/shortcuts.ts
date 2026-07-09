import { globalShortcut, BrowserWindow } from "electron";
import type { Shortcuts } from "./store";

export type ShortcutKey = keyof Shortcuts;

let registeredMap: Partial<Record<ShortcutKey, string>> = {};

function send(win: BrowserWindow | null, key: ShortcutKey) {
    if (!win || win.isDestroyed()) return;
    win.webContents.send("shortcut:fired", key);
}

export function registerAll(win: BrowserWindow | null, shortcuts: Shortcuts): void {
    unregisterAll();
    const keys: ShortcutKey[] = ["record", "stop", "pause", "discard"];
    for (const key of keys) {
        const accel = shortcuts[key];
        if (!accel) continue;
        try {
            const ok = globalShortcut.register(accel, () => send(win, key));
            if (ok) registeredMap[key] = accel;
        } catch {
            /* silently skip conflicts */
        }
    }
}

export function unregisterAll(): void {
    for (const accel of Object.values(registeredMap)) {
        if (accel) {
            try { globalShortcut.unregister(accel); } catch { /* ignore */ }
        }
    }
    registeredMap = {};
}
