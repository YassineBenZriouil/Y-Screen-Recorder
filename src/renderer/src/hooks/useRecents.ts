import { useCallback, useEffect } from "react";
import { useApp } from "../state";

export function useRecents() {
    const { state, dispatch } = useApp();

    const refresh = useCallback(async () => {
        const r = await window.yrec.listRecents();
        dispatch({ type: "SET_RECENTS", recents: r });
    }, [dispatch]);

    const remove = useCallback(
        async (id: string, alsoDeleteFile = false) => {
            const r = await window.yrec.removeRecent(id, alsoDeleteFile);
            dispatch({ type: "SET_RECENTS", recents: r });
        },
        [dispatch]
    );

    useEffect(() => { void refresh(); }, [refresh]);

    return { recents: state.recents, refresh, remove };
}
