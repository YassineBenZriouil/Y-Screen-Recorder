import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    createElement,
} from "react";
import { Button } from "./Button";
import { Glyph, type GlyphName } from "./Glyph";

export type ConfirmTone = "neutral" | "danger" | "success";

export interface ConfirmOptions {
    title: string;
    message?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmTone;
    icon?: GlyphName;
    destructive?: boolean;
}

interface Resolvable {
    opts: ConfirmOptions;
    resolve: (value: boolean) => void;
}

interface ConfirmCtx {
    ask: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<Resolvable | null>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    const ask = useCallback(
        (opts: ConfirmOptions): Promise<boolean> =>
            new Promise((resolve) => setPending({ opts, resolve })),
        []
    );

    const resolve = useCallback(
        (value: boolean) => {
            if (pending) {
                pending.resolve(value);
                setPending(null);
            }
        },
        [pending]
    );

    useEffect(() => {
        if (!pending) return;
        confirmBtnRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                resolve(false);
            } else if (e.key === "Enter") {
                e.preventDefault();
                resolve(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pending, resolve]);

    const value = useMemo(() => ({ ask }), [ask]);

    return createElement(
        Ctx.Provider,
        { value },
        children,
        pending
            ? createElement(ConfirmDialogView, {
                  key: "cd",
                  opts: pending.opts,
                  onConfirm: () => resolve(true),
                  onCancel: () => resolve(false),
                  confirmBtnRef,
              })
            : null
    );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
    const c = useContext(Ctx);
    if (!c) throw new Error("useConfirm outside ConfirmProvider");
    return c.ask;
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------
interface ViewProps {
    opts: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
    confirmBtnRef: React.RefObject<HTMLButtonElement>;
}

function ConfirmDialogView({ opts, onConfirm, onCancel, confirmBtnRef }: ViewProps) {
    const tone: ConfirmTone = opts.tone ?? (opts.destructive ? "danger" : "neutral");
    const icon: GlyphName = opts.icon ?? (opts.destructive ? "trash" : "check");
    const confirmLabel = opts.confirmLabel ?? (opts.destructive ? "Delete" : "OK");
    const cancelLabel = opts.cancelLabel ?? "Cancel";

    return (
        <div
            className="confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
        >
            <div className="confirm__backdrop" onClick={onCancel} />
            <div className={`confirm__card confirm__card--${tone}`}>
                <div className={`confirm__icon confirm__icon--${tone}`} aria-hidden>
                    <Glyph name={icon} size={20} />
                </div>
                <div className="confirm__body">
                    <h2 id="confirm-title" className="confirm__title">
                        {opts.title}
                    </h2>
                    {opts.message ? (
                        <div className="confirm__msg">{opts.message}</div>
                    ) : null}
                </div>
                <div className="confirm__actions">
                    <Button variant="ghost" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button
                        ref={confirmBtnRef}
                        variant={opts.destructive ? "danger" : "primary"}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
