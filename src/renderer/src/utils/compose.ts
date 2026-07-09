import type { PipCorner } from "../types";

export interface OverlayFlags {
    cursorHighlight: boolean;
    keystrokeOverlay: boolean;
    webcam: boolean;
    webcamCorner: PipCorner;
}

export interface CursorPoint {
    x: number;
    y: number;
    displayX: number;
    displayY: number;
    displayW: number;
    displayH: number;
    scaleFactor: number;
}

export interface CompositorRefs {
    cursor: CursorPoint | null;
    cursorFlashUntil: number;
    keystrokes: { key: string; expires: number }[];
    webcamStream: MediaStream | null;
}

export interface Compositor {
    stream: MediaStream;
    stop: () => void;
    refs: CompositorRefs;
    ready: Promise<void>;
}

interface Build {
    screenStream: MediaStream;
    flags: OverlayFlags;
    fps?: number;
}

const KEYSTROKE_LIFETIME_MS = 1600;
const MAX_KEYSTROKES = 5;
const CURSOR_FLASH_MS = 400;
const CURSOR_POLL_MS = 33; // ~30 Hz — plenty for a ring overlay

/**
 * Build a compositor:
 *  - Draws the screen-capture <video> to an off-DOM canvas each frame.
 *  - Overlays cursor ring, keystroke chips, webcam PiP as flags require.
 *  - Emits a MediaStream via canvas.captureStream() + audio tracks from source.
 *
 * Video element is attached to DOM (hidden) so its decoder runs reliably in
 * Chromium — off-DOM video elements can stall.
 */
export function buildCompositor({ screenStream, flags, fps = 30 }: Build): Compositor {
    // Hidden host so <video> decodes reliably.
    const host = document.createElement("div");
    host.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
    document.body.appendChild(host);

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = screenStream;
    host.appendChild(video);

    const webcamVideo = document.createElement("video");
    webcamVideo.autoplay = true;
    webcamVideo.muted = true;
    webcamVideo.playsInline = true;
    host.appendChild(webcamVideo);

    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    // Draw an initial black frame so captureStream immediately has content.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const refs: CompositorRefs = {
        cursor: null,
        cursorFlashUntil: 0,
        keystrokes: [],
        webcamStream: null,
    };

    let running = true;
    let raf = 0;
    let cursorPoll: number | null = null;
    let webcamAttached = false;

    const ready = new Promise<void>((resolve) => {
        const onMeta = () => {
            if (video.videoWidth && video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            resolve();
        };
        if (video.readyState >= 1 && video.videoWidth) {
            onMeta();
        } else {
            video.addEventListener("loadedmetadata", onMeta, { once: true });
        }
    });

    void video.play().catch(() => { /* ignore autoplay policy */ });

    // ------------------------------------------------------------------ draw
    const draw = () => {
        if (!running) return;
        const w = canvas.width;
        const h = canvas.height;
        if (video.readyState >= 2 && video.videoWidth) {
            if (video.videoWidth !== w || video.videoHeight !== h) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, w, h);
        }

        const now = performance.now();

        if (flags.cursorHighlight && refs.cursor) {
            drawCursor(ctx, refs.cursor, refs.cursorFlashUntil, now, canvas.width, canvas.height);
        }

        if (flags.keystrokeOverlay) {
            refs.keystrokes = refs.keystrokes.filter((k) => k.expires > now);
            if (refs.keystrokes.length > 0) {
                drawKeystrokes(ctx, refs.keystrokes.slice(-MAX_KEYSTROKES), now, canvas.width, canvas.height);
            }
        }

        if (flags.webcam) {
            if (refs.webcamStream && !webcamAttached) {
                webcamVideo.srcObject = refs.webcamStream;
                void webcamVideo.play().catch(() => {});
                webcamAttached = true;
            }
            if (webcamVideo.readyState >= 2 && webcamVideo.videoWidth) {
                drawWebcam(ctx, webcamVideo, flags.webcamCorner, canvas.width, canvas.height);
            }
        }

        raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    // Poll cursor via main IPC — mouse events would only fire in the app window.
    if (flags.cursorHighlight) {
        const poll = async () => {
            if (!running) return;
            try {
                const p = await window.yrec.cursorPoint();
                refs.cursor = p;
            } catch { /* ignore */ }
            cursorPoll = window.setTimeout(poll, CURSOR_POLL_MS);
        };
        void poll();
    }

    // Build the output stream. captureStream requires the canvas to have been
    // drawn at least once — the initial fillRect above satisfies that.
    const captured = canvas.captureStream(fps);
    for (const t of screenStream.getAudioTracks()) captured.addTrack(t);

    const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
        if (cursorPoll !== null) clearTimeout(cursorPoll);
        webcamVideo.pause();
        webcamVideo.srcObject = null;
        video.pause();
        video.srcObject = null;
        captured.getTracks().forEach((t) => t.stop());
        try { host.remove(); } catch { /* noop */ }
    };

    return { stream: captured, stop, refs, ready };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------
function drawCursor(
    ctx: CanvasRenderingContext2D,
    p: CursorPoint,
    flashUntil: number,
    now: number,
    canvasW: number,
    canvasH: number
) {
    // Cursor point is in screen coords across all displays. Convert to the
    // display we're actually recording, then scale to canvas.
    const localX = p.x - p.displayX;
    const localY = p.y - p.displayY;
    // If cursor is off the recorded display, skip.
    if (localX < 0 || localY < 0 || localX > p.displayW || localY > p.displayH) return;

    const scaleX = canvasW / p.displayW;
    const scaleY = canvasH / p.displayH;
    const cx = localX * scaleX;
    const cy = localY * scaleY;

    const isFlashing = now < flashUntil;
    const baseR = 30 * Math.max(scaleX, scaleY);
    const r = isFlashing
        ? baseR + ((flashUntil - now) / CURSOR_FLASH_MS) * baseR * 0.6
        : baseR;

    ctx.save();
    // Outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = isFlashing
        ? "rgba(255, 47, 90, 0.18)"
        : "rgba(110, 255, 176, 0.18)";
    ctx.fill();
    // Ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = isFlashing
        ? "rgba(255, 47, 90, 0.95)"
        : "rgba(110, 255, 176, 0.9)";
    ctx.lineWidth = 4 * Math.max(scaleX, scaleY);
    ctx.shadowColor = isFlashing
        ? "rgba(255, 47, 90, 0.7)"
        : "rgba(110, 255, 176, 0.6)";
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.restore();
}

function drawKeystrokes(
    ctx: CanvasRenderingContext2D,
    keys: { key: string; expires: number }[],
    now: number,
    canvasW: number,
    canvasH: number
) {
    const scale = Math.min(canvasW, canvasH) / 720;
    const fontSize = 34 * scale;
    const padX = 14 * scale;
    const padY = 10 * scale;
    const gap = 10 * scale;
    ctx.font = `600 ${fontSize}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = "middle";

    let x = 40 * scale;
    const y = canvasH - 60 * scale;

    for (const k of keys) {
        const textW = ctx.measureText(k.key).width;
        const bw = textW + padX * 2;
        const bh = fontSize + padY * 2;
        const alpha = Math.max(0, (k.expires - now) / KEYSTROKE_LIFETIME_MS);

        ctx.save();
        ctx.globalAlpha = alpha;

        // Card
        ctx.fillStyle = "rgba(10, 11, 16, 0.86)";
        ctx.strokeStyle = "rgba(110, 255, 176, 0.55)";
        ctx.lineWidth = 2 * scale;
        roundRect(ctx, x, y - bh / 2, bw, bh, 10 * scale);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = "#eef0f6";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 2;
        ctx.fillText(k.key, x + padX, y);
        ctx.restore();

        x += bw + gap;
    }
}

function drawWebcam(
    ctx: CanvasRenderingContext2D,
    cam: HTMLVideoElement,
    corner: PipCorner,
    canvasW: number,
    canvasH: number
) {
    const camW = canvasW * 0.24;
    const aspect = cam.videoHeight && cam.videoWidth ? cam.videoHeight / cam.videoWidth : 9 / 16;
    const camH = camW * aspect;
    const margin = 30 * (canvasW / 1920);
    let cx = canvasW - camW - margin;
    let cy = canvasH - camH - margin;
    switch (corner) {
        case "tl": cx = margin;                    cy = margin; break;
        case "tr": cx = canvasW - camW - margin;   cy = margin; break;
        case "bl": cx = margin;                    cy = canvasH - camH - margin; break;
        case "br": cx = canvasW - camW - margin;   cy = canvasH - camH - margin; break;
    }
    const r = 16 * (canvasW / 1920);

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    roundRect(ctx, cx, cy, camW, camH, r);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(cam, cx, cy, camW, camH);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 47, 90, 0.7)";
    ctx.lineWidth = 3 * (canvasW / 1920);
    roundRect(ctx, cx, cy, camW, camH, r);
    ctx.stroke();
    ctx.restore();
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

export function keyLabel(e: KeyboardEvent): string {
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.metaKey) modifiers.push("⌘");
    if (e.shiftKey && e.key.length > 1) modifiers.push("Shift");
    let k = e.key;
    if (k === " ") k = "Space";
    else if (k.length === 1) k = e.shiftKey ? k.toUpperCase() : k;
    else k = k.replace("Arrow", "");
    return [...modifiers, k].join(" + ");
}
