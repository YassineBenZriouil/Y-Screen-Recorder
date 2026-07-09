import {
    createContext,
    useContext,
    useReducer,
    useMemo,
    useCallback,
    type Dispatch,
    type ReactNode,
    createElement,
} from "react";
import type { Settings, SourceInfo, Step, Take, ToastMsg } from "./types";
import { DEFAULT_SETTINGS } from "./types";

interface AppState {
    step: Step;
    source: SourceInfo | null;
    settings: Settings;
    take: Take | null;
    toasts: ToastMsg[];
}

type Action =
    | { type: "GO"; step: Step }
    | { type: "SET_SOURCE"; source: SourceInfo | null }
    | { type: "SET_SETTINGS"; patch: Partial<Settings> }
    | { type: "SET_TAKE"; take: Take | null }
    | { type: "TOAST_ADD"; toast: ToastMsg }
    | { type: "TOAST_REMOVE"; id: number }
    | { type: "RESET" };

const initial: AppState = {
    step: "source",
    source: null,
    settings: DEFAULT_SETTINGS,
    take: null,
    toasts: [],
};

function reducer(state: AppState, a: Action): AppState {
    switch (a.type) {
        case "GO":
            return { ...state, step: a.step };
        case "SET_SOURCE":
            return { ...state, source: a.source };
        case "SET_SETTINGS":
            return { ...state, settings: { ...state.settings, ...a.patch } };
        case "SET_TAKE":
            return { ...state, take: a.take };
        case "TOAST_ADD":
            return { ...state, toasts: [...state.toasts, a.toast] };
        case "TOAST_REMOVE":
            return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) };
        case "RESET":
            return { ...initial, settings: state.settings };
    }
}

interface Ctx {
    state: AppState;
    dispatch: Dispatch<Action>;
    go: (step: Step) => void;
    toast: (text: string, opts?: Partial<Omit<ToastMsg, "id" | "text">>) => void;
    dismissToast: (id: number) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initial);

    const go = useCallback((step: Step) => dispatch({ type: "GO", step }), []);
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

    const value = useMemo(
        () => ({ state, dispatch, go, toast, dismissToast }),
        [state, go, toast, dismissToast]
    );

    return createElement(AppCtx.Provider, { value }, children);
}

export function useApp(): Ctx {
    const c = useContext(AppCtx);
    if (!c) throw new Error("useApp outside provider");
    return c;
}
