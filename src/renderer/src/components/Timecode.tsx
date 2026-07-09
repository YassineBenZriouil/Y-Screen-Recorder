import { useEffect, useState, useRef } from "react";

export type TimecodeVariant = "idle" | "live" | "paused" | "static";

export interface TimecodeProps {
    ms: number;
    variant?: TimecodeVariant;
    size?: "sm" | "md" | "lg" | "xl";
    showBlink?: boolean;
}

export function formatTimecode(ms: number): {
    h: string;
    m: string;
    s: string;
    ms: string;
} {
    const clamped = Math.max(0, Math.floor(ms));
    const totalS = Math.floor(clamped / 1000);
    return {
        h: String(Math.floor(totalS / 3600)).padStart(2, "0"),
        m: String(Math.floor((totalS % 3600) / 60)).padStart(2, "0"),
        s: String(totalS % 60).padStart(2, "0"),
        ms: "." + String(clamped % 1000).padStart(3, "0"),
    };
}

export function Timecode({
    ms,
    variant = "idle",
    size = "lg",
    showBlink = false,
}: TimecodeProps) {
    const parts = formatTimecode(ms);
    return (
        <div className={`tc tc--${variant} tc--${size}`} role="timer" aria-live="off">
            <span className="tc__part">{parts.h}</span>
            <span className={"tc__sep" + (showBlink ? " tc__sep--blink" : "")}>:</span>
            <span className="tc__part">{parts.m}</span>
            <span className={"tc__sep" + (showBlink ? " tc__sep--blink" : "")}>:</span>
            <span className="tc__part">{parts.s}</span>
            <span className="tc__ms">{parts.ms}</span>
        </div>
    );
}

export interface LiveTimecodeProps {
    startedAt: number | null;
    accumulatedMs: number;
    running: boolean;
    variant?: TimecodeVariant;
    size?: "sm" | "md" | "lg" | "xl";
    showBlink?: boolean;
}

export function LiveTimecode({
    startedAt,
    accumulatedMs,
    running,
    ...rest
}: LiveTimecodeProps) {
    const [ms, setMs] = useState(accumulatedMs);
    const raf = useRef<number | null>(null);

    useEffect(() => {
        if (!running || startedAt === null) {
            setMs(accumulatedMs);
            return;
        }
        const tick = () => {
            setMs(accumulatedMs + (Date.now() - startedAt));
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
        return () => {
            if (raf.current !== null) cancelAnimationFrame(raf.current);
        };
    }, [running, startedAt, accumulatedMs]);

    return <Timecode ms={ms} {...rest} />;
}
