import type {
    SourceInfo,
    Settings,
    RecentTake,
    Shortcuts,
    ShortcutKey,
    PipCorner,
    BitratePreset,
    CodecId,
    QualityId,
    Theme,
    PermissionStatus,
    MediaPermission,
    AppInfo,
} from "../../preload";

export type {
    SourceInfo,
    Settings,
    RecentTake,
    Shortcuts,
    ShortcutKey,
    PipCorner,
    BitratePreset,
    CodecId,
    QualityId,
    Theme,
    PermissionStatus,
    MediaPermission,
    AppInfo,
};

export type Step =
    | "onboarding"
    | "home"
    | "source"
    | "config"
    | "ready"
    | "countdown"
    | "recording"
    | "paused"
    | "review"
    | "settings";

export type CountdownSecs = 0 | 3 | 5;

export interface Take {
    blob: Blob;
    url: string;
    durationMs: number;
    mime: string;
    extension: string;
    codec: CodecId;
    sourceName: string;
    audioLabel: string;
    sizeBytes: number;
    thumbnail?: string;
}

export interface ToastMsg {
    id: number;
    text: string;
    kind: "info" | "success" | "error";
    actionLabel?: string;
    action?: () => void;
}

export interface OverlaySettings {
    cursorHighlight: boolean;
    keystrokeOverlay: boolean;
    webcam: boolean;
    webcamCorner: PipCorner;
}
