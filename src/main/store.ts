import { app } from "electron";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type Theme = "dark" | "light";
export type CodecId = "vp9" | "vp8" | "h264";
export type QualityId = "hd" | "fullhd" | "qhd";
export type BitratePreset = "standard" | "high" | "lossless";
export type PipCorner = "tl" | "tr" | "bl" | "br";
export type OnboardingStatus = "pending" | "seen";

export interface Shortcuts {
    record: string;
    stop: string;
    pause: string;
    discard: string;
}

export interface Settings {
    version: number;
    theme: Theme;
    defaultSaveDir: string;
    filenameTemplate: string;
    autoSave: boolean;
    hideWindowWhileRecording: boolean;
    defaults: {
        mic: boolean;
        system: boolean;
        codec: CodecId;
        quality: QualityId;
        countdown: 0 | 3 | 5;
        bitrate: BitratePreset;
        cursorHighlight: boolean;
        keystrokeOverlay: boolean;
        webcam: boolean;
        webcamCorner: PipCorner;
    };
    shortcuts: Shortcuts;
    onboarding: OnboardingStatus;
}

export interface RecentTake {
    id: string;
    filePath: string;
    savedAt: number;
    durationMs: number;
    sizeBytes: number;
    codec: CodecId;
    extension: string;
    sourceName: string;
    thumbnail?: string;
}

export interface Db {
    settings: Settings;
    recents: RecentTake[];
}

const DEFAULT_SETTINGS: Settings = {
    version: 1,
    theme: "dark",
    defaultSaveDir: join(homedir(), "Videos"),
    filenameTemplate: "y-rec-{date}-{time}",
    autoSave: false,
    hideWindowWhileRecording: false,
    defaults: {
        mic: false,
        system: false,
        codec: "vp9",
        quality: "fullhd",
        countdown: 3,
        bitrate: "high",
        cursorHighlight: false,
        keystrokeOverlay: false,
        webcam: false,
        webcamCorner: "br",
    },
    shortcuts: {
        record: "CommandOrControl+Shift+R",
        stop: "CommandOrControl+Shift+S",
        pause: "CommandOrControl+Shift+P",
        discard: "CommandOrControl+Shift+X",
    },
    onboarding: "pending",
};

let cached: Db | null = null;

function file(): string {
    return join(app.getPath("userData"), "yrec-store.json");
}

async function ensureDir() {
    const dir = app.getPath("userData");
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

async function readRaw(): Promise<Db> {
    await ensureDir();
    const path = file();
    if (!existsSync(path)) {
        const db: Db = { settings: DEFAULT_SETTINGS, recents: [] };
        await writeFile(path, JSON.stringify(db, null, 2), "utf8");
        return db;
    }
    try {
        const raw = await readFile(path, "utf8");
        const parsed = JSON.parse(raw) as Partial<Db>;
        return {
            settings: mergeSettings(DEFAULT_SETTINGS, parsed.settings ?? {}),
            recents: Array.isArray(parsed.recents) ? parsed.recents : [],
        };
    } catch {
        return { settings: DEFAULT_SETTINGS, recents: [] };
    }
}

function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
    return {
        ...base,
        ...patch,
        defaults: { ...base.defaults, ...(patch.defaults ?? {}) },
        shortcuts: { ...base.shortcuts, ...(patch.shortcuts ?? {}) },
    };
}

async function persist(db: Db): Promise<void> {
    await ensureDir();
    await writeFile(file(), JSON.stringify(db, null, 2), "utf8");
}

export async function load(): Promise<Db> {
    if (!cached) cached = await readRaw();
    return cached;
}

export async function getSettings(): Promise<Settings> {
    return (await load()).settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const db = await load();
    db.settings = mergeSettings(db.settings, patch);
    await persist(db);
    return db.settings;
}

export async function resetSettings(): Promise<Settings> {
    const db = await load();
    db.settings = DEFAULT_SETTINGS;
    await persist(db);
    return db.settings;
}

export async function listRecents(): Promise<RecentTake[]> {
    return (await load()).recents;
}

export async function addRecent(entry: RecentTake): Promise<RecentTake[]> {
    const db = await load();
    db.recents = [entry, ...db.recents.filter((r) => r.filePath !== entry.filePath)];
    if (db.recents.length > 24) db.recents = db.recents.slice(0, 24);
    await persist(db);
    return db.recents;
}

export async function removeRecent(id: string, alsoDeleteFile = false): Promise<RecentTake[]> {
    const db = await load();
    const target = db.recents.find((r) => r.id === id);
    db.recents = db.recents.filter((r) => r.id !== id);
    await persist(db);
    if (alsoDeleteFile && target) {
        try { await unlink(target.filePath); } catch { /* ignore */ }
    }
    return db.recents;
}

export function fillTemplate(template: string, ctx: { counter: number }): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const map: Record<string, string> = {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`,
        counter: String(ctx.counter),
        year: String(d.getFullYear()),
        month: pad(d.getMonth() + 1),
        day: pad(d.getDate()),
        hour: pad(d.getHours()),
        minute: pad(d.getMinutes()),
        second: pad(d.getSeconds()),
    };
    return template.replace(/\{([a-z]+)\}/gi, (_, k: string) => map[k.toLowerCase()] ?? `{${k}}`);
}
