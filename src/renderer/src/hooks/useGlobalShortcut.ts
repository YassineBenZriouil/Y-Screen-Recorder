import { useEffect } from "react";
import type { ShortcutKey } from "../types";

export function useGlobalShortcut(handler: (key: ShortcutKey) => void, enabled = true) {
    useEffect(() => {
        if (!enabled) return;
        const off = window.yrec.onShortcut(handler);
        return off;
    }, [handler, enabled]);
}
