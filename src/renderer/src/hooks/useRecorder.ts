import { useCallback, useEffect, useRef, useState } from "react";
import type { CodecId, Settings, SourceInfo } from "../types";

export type RecorderPhase = "idle" | "arming" | "recording" | "paused" | "stopping";

interface StartArgs {
    source: SourceInfo;
    settings: Settings;
}

interface RecordingResult {
    blob: Blob;
    mime: string;
    extension: string;
    durationMs: number;
    codec: CodecId;
}

const MIME_MAP: Record<CodecId, string> = {
    vp9: "video/webm; codecs=vp9",
    vp8: "video/webm; codecs=vp8",
    h264: "video/webm; codecs=h264",
};

function chooseMime(preferred: CodecId): string {
    const target = MIME_MAP[preferred];
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(target)) {
        return target;
    }
    for (const m of [MIME_MAP.vp9, MIME_MAP.vp8, "video/webm"]) {
        if (MediaRecorder.isTypeSupported(m)) return m;
    }
    return "video/webm";
}

export interface UseRecorderApi {
    phase: RecorderPhase;
    stream: MediaStream | null;
    startedAt: number | null;
    accumulatedMs: number;
    arm: (args: StartArgs) => Promise<void>;
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => Promise<RecordingResult | null>;
    cancel: () => void;
    error: string | null;
}

export function useRecorder(): UseRecorderApi {
    const [phase, setPhase] = useState<RecorderPhase>("idle");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [accumulatedMs, setAccumulatedMs] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const mimeRef = useRef<string>("video/webm");
    const codecRef = useRef<CodecId>("vp9");
    const stopResolverRef = useRef<((r: RecordingResult | null) => void) | null>(null);
    const accRef = useRef<number>(0);
    const startedRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const setAcc = (v: number) => { accRef.current = v; setAccumulatedMs(v); };
    const setStart = (v: number | null) => { startedRef.current = v; setStartedAt(v); };
    const setStreamBoth = (s: MediaStream | null) => { streamRef.current = s; setStream(s); };

    const arm = useCallback(async ({ source, settings }: StartArgs) => {
        setError(null);
        setPhase("arming");
        try {
            const size = qualityConstraints(settings.quality);
            const videoConstraints = {
                mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: source.id,
                    minFrameRate: 30,
                    maxFrameRate: 60,
                    minWidth: size.width,
                    maxWidth: size.width,
                    minHeight: size.height,
                    maxHeight: size.height,
                },
            } as unknown as MediaTrackConstraints;

            const audio: MediaStreamConstraints["audio"] = settings.system
                ? ({
                      mandatory: { chromeMediaSource: "desktop" },
                  } as unknown as MediaTrackConstraints)
                : false;

            const screenStream = await navigator.mediaDevices.getUserMedia({
                audio,
                video: videoConstraints,
            });

            if (settings.mic) {
                try {
                    const mic = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false,
                    });
                    mic.getAudioTracks().forEach((t) => screenStream.addTrack(t));
                } catch (e) {
                    // Non-fatal: keep screen stream, mic failed.
                    setError(
                        `Mic unavailable: ${e instanceof Error ? e.message : String(e)}`
                    );
                }
            }

            setStreamBoth(screenStream);
            codecRef.current = settings.codec;
        } catch (e) {
            setPhase("idle");
            setError(e instanceof Error ? e.message : "Capture failed");
            throw e;
        }
    }, []);

    const start = useCallback(() => {
        const s = streamRef.current;
        if (!s) {
            setError("Stream not armed");
            return;
        }
        const mime = chooseMime(codecRef.current);
        mimeRef.current = mime;

        let rec: MediaRecorder;
        try {
            rec = new MediaRecorder(s, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
        } catch (e) {
            setError(`Recorder init: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }

        chunksRef.current = [];
        rec.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeRef.current.split(";")[0] });
            const result: RecordingResult = {
                blob,
                mime: mimeRef.current,
                extension: "webm",
                durationMs: accRef.current,
                codec: codecRef.current,
            };
            stopResolverRef.current?.(result);
            stopResolverRef.current = null;
            recorderRef.current = null;
            teardownStream();
            setPhase("idle");
        };
        rec.onerror = (e: Event) => {
            const err = (e as { error?: DOMException }).error;
            setError(`Recorder error: ${err?.message ?? "unknown"}`);
        };

        recorderRef.current = rec;
        rec.start(1000);
        setAcc(0);
        setStart(Date.now());
        setPhase("recording");
    }, []);

    const pause = useCallback(() => {
        const r = recorderRef.current;
        if (!r || r.state !== "recording") return;
        r.pause();
        if (startedRef.current !== null) {
            setAcc(accRef.current + (Date.now() - startedRef.current));
            setStart(null);
        }
        setPhase("paused");
    }, []);

    const resume = useCallback(() => {
        const r = recorderRef.current;
        if (!r || r.state !== "paused") return;
        r.resume();
        setStart(Date.now());
        setPhase("recording");
    }, []);

    const stop = useCallback((): Promise<RecordingResult | null> => {
        const r = recorderRef.current;
        if (!r) return Promise.resolve(null);
        if (phase === "recording" && startedRef.current !== null) {
            setAcc(accRef.current + (Date.now() - startedRef.current));
            setStart(null);
        }
        setPhase("stopping");
        return new Promise<RecordingResult | null>((resolve) => {
            stopResolverRef.current = resolve;
            try {
                r.stop();
            } catch {
                resolve(null);
            }
        });
    }, [phase]);

    const cancel = useCallback(() => {
        const r = recorderRef.current;
        chunksRef.current = [];
        if (r && (r.state === "recording" || r.state === "paused")) {
            try { r.stop(); } catch { /* noop */ }
        }
        stopResolverRef.current?.(null);
        stopResolverRef.current = null;
        recorderRef.current = null;
        teardownStream();
        setAcc(0);
        setStart(null);
        setPhase("idle");
    }, []);

    const teardownStream = () => {
        const s = streamRef.current;
        if (s) {
            s.getTracks().forEach((t) => t.stop());
        }
        setStreamBoth(null);
    };

    useEffect(() => () => cancel(), [cancel]);

    return {
        phase,
        stream,
        startedAt,
        accumulatedMs,
        arm,
        start,
        pause,
        resume,
        stop,
        cancel,
        error,
    };
}

function qualityConstraints(q: Settings["quality"]): { width: number; height: number } {
    const map: Record<Settings["quality"], { width: number; height: number }> = {
        hd:     { width: 1280, height: 720 },
        fullhd: { width: 1920, height: 1080 },
        qhd:    { width: 2560, height: 1440 },
    };
    return map[q];
}
