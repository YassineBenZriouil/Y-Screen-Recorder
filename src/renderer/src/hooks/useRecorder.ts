import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BitratePreset,
  CodecId,
  OverlaySettings,
  QualityId,
  SourceInfo,
} from "../types";
import { buildCompositor, keyLabel, type Compositor } from "../utils/compose";

export type RecorderPhase =
  | "idle"
  | "arming"
  | "recording"
  | "paused"
  | "stopping";

interface ArmArgs {
  source: SourceInfo;
  audio: { mic: boolean; system: boolean };
  codec: CodecId;
  quality: QualityId;
  bitrate: BitratePreset;
  overlays: OverlaySettings;
}

export interface RecordingResult {
  blob: Blob;
  mime: string;
  extension: string;
  durationMs: number;
  codec: CodecId;
  thumbnail?: string;
}

const MIME_MAP: Record<CodecId, string> = {
  vp9: "video/webm; codecs=vp9",
  vp8: "video/webm; codecs=vp8",
  h264: "video/webm; codecs=h264",
};

const QUALITY: Record<QualityId, { width: number; height: number }> = {
  hd: { width: 1280, height: 720 },
  fullhd: { width: 1920, height: 1080 },
  qhd: { width: 2560, height: 1440 },
};

const BITRATES: Record<BitratePreset, { bps: number; fps: number }> = {
  standard: { bps: 4_000_000, fps: 30 },
  high: { bps: 6_000_000, fps: 60 },
  lossless: { bps: 20_000_000, fps: 60 },
};

function chooseMime(preferred: CodecId): string {
  const target = MIME_MAP[preferred];
  if (
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported(target)
  ) {
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
  arm: (args: ArmArgs) => Promise<void>;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<RecordingResult | null>;
  cancel: () => void;
  error: string | null;
  onTrackDropped: (cb: () => void) => () => void;
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
  const stopResolverRef = useRef<((r: RecordingResult | null) => void) | null>(
    null,
  );
  const accRef = useRef<number>(0);
  const startedRef = useRef<number | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const outputStreamRef = useRef<MediaStream | null>(null);
  const compositorRef = useRef<Compositor | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const trackDropListeners = useRef<Set<() => void>>(new Set());
  const kbHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  const setAcc = (v: number) => {
    accRef.current = v;
    setAccumulatedMs(v);
  };
  const setStart = (v: number | null) => {
    startedRef.current = v;
    setStartedAt(v);
  };
  const setPreview = (s: MediaStream | null) => {
    previewStreamRef.current = s;
    setStream(s);
  };

  const emitTrackDropped = useCallback(() => {
    for (const cb of trackDropListeners.current) cb();
  }, []);

  const arm = useCallback(
    async ({ source, audio, codec, quality, bitrate, overlays }: ArmArgs) => {
      setError(null);
      setPhase("arming");
      try {
        const size = QUALITY[quality];
        const rate = BITRATES[bitrate];
        const videoConstraints = {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: source.id,
            minFrameRate: rate.fps === 60 ? 30 : rate.fps,
            maxFrameRate: rate.fps,
            minWidth: size.width,
            maxWidth: size.width,
            minHeight: size.height,
            maxHeight: size.height,
          },
        } as unknown as MediaTrackConstraints;

        const audioConstraint: MediaStreamConstraints["audio"] = audio.system
          ? ({
              mandatory: { chromeMediaSource: "desktop" },
            } as unknown as MediaTrackConstraints)
          : false;

        const raw = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: videoConstraints,
        });

        if (audio.mic) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });
            mic.getAudioTracks().forEach((t) => raw.addTrack(t));
          } catch (e) {
            setError(
              `Mic unavailable: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }

        // Track drop detection - if the source window closes we bail gracefully.
        for (const t of raw.getVideoTracks()) {
          t.addEventListener("ended", emitTrackDropped);
        }

        rawStreamRef.current = raw;
        codecRef.current = codec;

        let outputStream: MediaStream = raw;
        if (
          overlays.cursorHighlight ||
          overlays.keystrokeOverlay ||
          overlays.webcam
        ) {
          const comp = buildCompositor({
            screenStream: raw,
            flags: overlays,
            fps: rate.fps,
          });
          compositorRef.current = comp;
          outputStream = comp.stream;

          if (overlays.webcam) {
            try {
              const cam = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
              });
              comp.refs.webcamStream = cam;
            } catch (e) {
              setError(
                `Webcam unavailable: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }

          if (overlays.cursorHighlight) {
            // Global click flash - mousedown fires inside app window;
            // outside-window clicks can't be observed without native hook.
            const ch = () => {
              comp.refs.cursorFlashUntil = performance.now() + 400;
            };
            window.addEventListener("mousedown", ch, true);
            clickHandlerRef.current = ch;
          }
          if (overlays.keystrokeOverlay) {
            const kh = (e: KeyboardEvent) => {
              comp.refs.keystrokes.push({
                key: keyLabel(e),
                expires: performance.now() + 1600,
              });
            };
            window.addEventListener("keydown", kh, true);
            kbHandlerRef.current = kh;
          }
          // Wait for compositor's <video> to load before flipping the
          // recorder over to the canvas stream - otherwise the first
          // frames come out black.
          await comp.ready;
        }

        outputStreamRef.current = outputStream;
        setPreview(outputStream);
      } catch (e) {
        setPhase("idle");
        const msg = e instanceof Error ? e.message : "Capture failed";
        setError(msg);
        throw new Error(msg);
      }
    },
    [emitTrackDropped],
  );

  const start = useCallback(() => {
    const s = outputStreamRef.current;
    if (!s) {
      setError("Stream not armed");
      return;
    }
    const mime = chooseMime(codecRef.current);
    mimeRef.current = mime;

    let rec: MediaRecorder;
    try {
      const bps = 6_000_000; // recorder ignores hint if codec disagrees; overlay path uses canvas fps
      rec = new MediaRecorder(s, { mimeType: mime, videoBitsPerSecond: bps });
    } catch (e) {
      setError(`Recorder init: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mimeRef.current.split(";")[0],
      });
      const result: RecordingResult = {
        blob,
        mime: mimeRef.current,
        extension: "webm",
        durationMs: accRef.current,
        codec: codecRef.current,
      };
      captureThumbnail().then((thumb) => {
        if (thumb) result.thumbnail = thumb;
        stopResolverRef.current?.(result);
        stopResolverRef.current = null;
        teardown();
        setPhase("idle");
      });
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

  const captureThumbnail = async (): Promise<string | undefined> => {
    const s = outputStreamRef.current;
    if (!s) return undefined;
    try {
      const video = document.createElement("video");
      video.srcObject = s;
      video.muted = true;
      await video.play();
      const w = 320;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 180;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const cx = c.getContext("2d");
      if (!cx) return undefined;
      cx.drawImage(video, 0, 0, w, h);
      video.pause();
      return c.toDataURL("image/png");
    } catch {
      return undefined;
    }
  };

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
      try {
        r.stop();
      } catch {
        /* noop */
      }
    }
    stopResolverRef.current?.(null);
    stopResolverRef.current = null;
    teardown();
    setAcc(0);
    setStart(null);
    setPhase("idle");
  }, []);

  const teardown = () => {
    if (compositorRef.current) {
      compositorRef.current.refs.webcamStream
        ?.getTracks()
        .forEach((t) => t.stop());
      compositorRef.current.stop();
      compositorRef.current = null;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    outputStreamRef.current = null;
    setPreview(null);
    recorderRef.current = null;
    if (clickHandlerRef.current) {
      window.removeEventListener("mousedown", clickHandlerRef.current, true);
      clickHandlerRef.current = null;
    }
    if (kbHandlerRef.current) {
      window.removeEventListener("keydown", kbHandlerRef.current, true);
      kbHandlerRef.current = null;
    }
  };

  const onTrackDropped = useCallback((cb: () => void) => {
    trackDropListeners.current.add(cb);
    return () => {
      trackDropListeners.current.delete(cb);
    };
  }, []);

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
    onTrackDropped,
  };
}
