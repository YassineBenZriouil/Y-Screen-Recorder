import { contextBridge, ipcRenderer } from "electron";

export type SourceKind = "screen" | "window";
export type CodecId = "vp9" | "vp8" | "h264";
export type QualityId = "hd" | "fullhd" | "qhd";
export type BitratePreset = "standard" | "high" | "lossless";
export type PipCorner = "tl" | "tr" | "bl" | "br";
export type Theme = "dark" | "light";
export type OnboardingStatus = "pending" | "seen";
export type ShortcutKey = "record" | "stop" | "pause" | "discard";
export type MediaPermission = "screen" | "microphone" | "camera";
export type PermissionStatus =
    | "not-determined"
    | "granted"
    | "denied"
    | "restricted"
    | "unknown";

export interface SourceInfo {
    id: string;
    name: string;
    kind: SourceKind;
    thumbnail: string;
    appIcon: string | null;
}

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

export type SaveResult =
    | { canceled: true }
    | { canceled: false; filePath: string; entry: RecentTake };

export interface SavePayload {
    buffer: ArrayBuffer;
    extension: string;
    suggestedName?: string;
    durationMs: number;
    sourceName: string;
    codec: CodecId;
    thumbnail?: string;
    autoSave?: boolean;
}

export interface AppInfo {
    version: string;
    platform: NodeJS.Platform;
    arch: string;
    electron: string;
    chrome: string;
    node: string;
}

const api = {
    // Sources
    listSources: (): Promise<SourceInfo[]> => ipcRenderer.invoke("sources:list"),

    // Recording
    saveRecording: (payload: SavePayload): Promise<SaveResult> =>
        ipcRenderer.invoke("recording:save", payload),
    setPhase: (phase: "idle" | "recording" | "paused"): Promise<void> =>
        ipcRenderer.invoke("recording:phase", phase),

    // Settings
    getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
    updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
        ipcRenderer.invoke("settings:update", patch),
    resetSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:reset"),

    // Recents
    listRecents: (): Promise<RecentTake[]> => ipcRenderer.invoke("recents:list"),
    removeRecent: (id: string, alsoDeleteFile?: boolean): Promise<RecentTake[]> =>
        ipcRenderer.invoke("recents:remove", id, alsoDeleteFile),
    fileExists: (filePath: string): Promise<boolean> =>
        ipcRenderer.invoke("recents:exists", filePath),

    // Shell / clipboard / dialog
    revealInFolder: (filePath: string): Promise<void> =>
        ipcRenderer.invoke("shell:reveal", filePath),
    openFile: (filePath: string): Promise<{ ok: boolean; error: string }> =>
        ipcRenderer.invoke("shell:open", filePath),
    openExternal: (url: string): Promise<void> =>
        ipcRenderer.invoke("shell:openExternal", url),
    copyText: (text: string): Promise<void> =>
        ipcRenderer.invoke("clipboard:writeText", text),
    pickDirectory: (current?: string): Promise<string | null> =>
        ipcRenderer.invoke("dialog:pickDirectory", current),

    // Window
    showWindow: (): Promise<void> => ipcRenderer.invoke("window:show"),

    // Permissions
    permStatus: (kind: MediaPermission): Promise<PermissionStatus> =>
        ipcRenderer.invoke("perm:status", kind),
    permAsk: (kind: MediaPermission): Promise<boolean> =>
        ipcRenderer.invoke("perm:ask", kind),
    permOpenSettings: (kind: MediaPermission): Promise<void> =>
        ipcRenderer.invoke("perm:openSettings", kind),

    // App info
    appInfo: (): Promise<AppInfo> => ipcRenderer.invoke("app:info"),

    // Cursor position (for overlay compositor)
    cursorPoint: (): Promise<{
        x: number; y: number;
        displayX: number; displayY: number;
        displayW: number; displayH: number;
        scaleFactor: number;
    }> => ipcRenderer.invoke("cursor:point"),

    // Events
    onShortcut: (cb: (key: ShortcutKey) => void): (() => void) => {
        const handler = (_e: unknown, key: ShortcutKey) => cb(key);
        ipcRenderer.on("shortcut:fired", handler);
        return () => ipcRenderer.removeListener("shortcut:fired", handler);
    },
};

contextBridge.exposeInMainWorld("yrec", api);

export type YrecApi = typeof api;
