import { useEffect } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useHotkeys(bindings: Record<string, Handler>, enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            const handler = bindings[k];
            if (handler) {
                e.preventDefault();
                handler(e);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [bindings, enabled]);
}
