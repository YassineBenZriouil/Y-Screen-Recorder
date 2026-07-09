import { useCallback, useEffect, useState } from "react";
import type { SourceInfo } from "../types";

export function useSources(autoLoad = true) {
    const [sources, setSources] = useState<SourceInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await window.yrec.listSources();
            setSources(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load sources");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (autoLoad) refresh();
    }, [autoLoad, refresh]);

    return { sources, loading, error, refresh };
}
