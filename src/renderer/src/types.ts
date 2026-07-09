import type { SourceInfo } from "../../preload";

export type { SourceInfo };

export type Step =
    | "source"
    | "config"
    | "ready"
    | "countdown"
    | "recording"
    | "paused"
    | "review";

export type CodecId = "vp9" | "vp8" | "h264";
export type CountdownSecs = 0 | 3 | 5;
export type QualityId = "hd" | "fullhd" | "qhd";

export interface Settings {
    mic: boolean;
    system: boolean;
    codec: CodecId;
    countdown: CountdownSecs;
    quality: QualityId;
}

export const DEFAULT_SETTINGS: Settings = {
    mic: false,
    system: false,
    codec: "vp9",
    countdown: 3,
    quality: "fullhd",
};

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
}

export interface ToastMsg {
    id: number;
    text: string;
    kind: "info" | "success" | "error";
    actionLabel?: string;
    action?: () => void;
}
