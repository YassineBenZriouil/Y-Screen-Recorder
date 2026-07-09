import { useCallback, useEffect, useState } from "react";
import type { SourceInfo } from "../types";

export function useSources(autoRefreshMs = 5000) {
    const [sources, setSources] = useState<SourceInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const list = await window.yrec.listSources();
            setSources(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load sources");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh(false);
        if (autoRefreshMs <= 0) return;
        const id = window.setInterval(() => void refresh(true), autoRefreshMs);
        return () => clearInterval(id);
    }, [refresh, autoRefreshMs]);

    return { sources, loading, error, refresh };
}
