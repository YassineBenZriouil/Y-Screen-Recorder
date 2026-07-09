import { useCallback, useEffect } from "react";
import { useApp } from "../state";
import type { Settings } from "../types";

export function useSettings() {
    const { state, dispatch } = useApp();

    const refresh = useCallback(async () => {
        const s = await window.yrec.getSettings();
        dispatch({ type: "SET_SETTINGS", settings: s });
    }, [dispatch]);

    const update = useCallback(
        async (patch: Partial<Settings>) => {
            const s = await window.yrec.updateSettings(patch);
            dispatch({ type: "SET_SETTINGS", settings: s });
            return s;
        },
        [dispatch]
    );

    const reset = useCallback(async () => {
        const s = await window.yrec.resetSettings();
        dispatch({ type: "SET_SETTINGS", settings: s });
        return s;
    }, [dispatch]);

    useEffect(() => {
        if (!state.settings) void refresh();
    }, [state.settings, refresh]);

    return { settings: state.settings, refresh, update, reset };
}
