import {
    createContext,
    useContext,
    useReducer,
    useMemo,
    useCallback,
    useEffect,
    type Dispatch,
    type ReactNode,
    createElement,
} from "react";
import type { RecentTake, Settings, SourceInfo, Step, Take, ToastMsg } from "./types";

interface AppState {
    step: Step;
    prevStep: Step;
    source: SourceInfo | null;
    settings: Settings | null;
    recents: RecentTake[];
    take: Take | null;
    toasts: ToastMsg[];
    // Non-persistent runtime knobs used during a single session
    runtime: {
        mic: boolean;
        system: boolean;
        codec: Settings["defaults"]["codec"];
        quality: Settings["defaults"]["quality"];
        countdown: Settings["defaults"]["countdown"];
        bitrate: Settings["defaults"]["bitrate"];
        cursorHighlight: boolean;
        keystrokeOverlay: boolean;
        webcam: boolean;
        webcamCorner: Settings["defaults"]["webcamCorner"];
    };
}

type Action =
    | { type: "GO"; step: Step }
    | { type: "SET_SOURCE"; source: SourceInfo | null }
    | { type: "SET_SETTINGS"; settings: Settings }
    | { type: "SET_RECENTS"; recents: RecentTake[] }
    | { type: "SET_TAKE"; take: Take | null }
    | { type: "PATCH_RUNTIME"; patch: Partial<AppState["runtime"]> }
    | { type: "TOAST_ADD"; toast: ToastMsg }
    | { type: "TOAST_REMOVE"; id: number };

function initialRuntime(settings: Settings | null): AppState["runtime"] {
    if (!settings)
        return {
            mic: false,
            system: false,
            codec: "vp9",
            quality: "fullhd",
            countdown: 3,
            bitrate: "high",
            cursorHighlight: false,
            keystrokeOverlay: false,
            webcam: false,
            webcamCorner: "br",
        };
    return { ...settings.defaults };
}

function reducer(state: AppState, a: Action): AppState {
    switch (a.type) {
        case "GO":
            if (a.step === state.step) return state;
            return { ...state, prevStep: state.step, step: a.step };
        case "SET_SOURCE":
            return { ...state, source: a.source };
        case "SET_SETTINGS":
            // First hydration also seeds runtime from defaults.
            if (!state.settings) {
                return {
                    ...state,
                    settings: a.settings,
                    runtime: initialRuntime(a.settings),
                };
            }
            return { ...state, settings: a.settings };
        case "SET_RECENTS":
            return { ...state, recents: a.recents };
        case "SET_TAKE":
            return { ...state, take: a.take };
        case "PATCH_RUNTIME":
            return { ...state, runtime: { ...state.runtime, ...a.patch } };
        case "TOAST_ADD":
            return { ...state, toasts: [...state.toasts, a.toast] };
        case "TOAST_REMOVE":
            return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) };
    }
}

const initial: AppState = {
    step: "home",
    prevStep: "home",
    source: null,
    settings: null,
    recents: [],
    take: null,
    toasts: [],
    runtime: initialRuntime(null),
};

interface Ctx {
    state: AppState;
    dispatch: Dispatch<Action>;
    go: (step: Step) => void;
    goBack: () => void;
    toast: (text: string, opts?: Partial<Omit<ToastMsg, "id" | "text">>) => void;
    dismissToast: (id: number) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initial);

    const go = useCallback((step: Step) => dispatch({ type: "GO", step }), []);
    const goBack = useCallback(
        () => dispatch({ type: "GO", step: state.prevStep }),
        [state.prevStep]
    );
    const dismissToast = useCallback(
        (id: number) => dispatch({ type: "TOAST_REMOVE", id }),
        []
    );
    const toast = useCallback(
        (text: string, opts?: Partial<Omit<ToastMsg, "id" | "text">>) => {
            const id = Date.now() + Math.random();
            dispatch({
                type: "TOAST_ADD",
                toast: {
                    id,
                    text,
                    kind: opts?.kind ?? "info",
                    actionLabel: opts?.actionLabel,
                    action: opts?.action,
                },
            });
            setTimeout(() => dispatch({ type: "TOAST_REMOVE", id }), 5200);
        },
        []
    );

    // Apply theme from settings to <html>
    useEffect(() => {
        if (!state.settings) return;
        document.documentElement.setAttribute("data-theme", state.settings.theme);
    }, [state.settings?.theme]);

    const value = useMemo(
        () => ({ state, dispatch, go, goBack, toast, dismissToast }),
        [state, go, goBack, toast, dismissToast]
    );

    return createElement(AppCtx.Provider, { value }, children);
}

export function useApp(): Ctx {
    const c = useContext(AppCtx);
    if (!c) throw new Error("useApp outside provider");
    return c;
}
