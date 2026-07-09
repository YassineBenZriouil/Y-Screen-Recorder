import { useApp } from "../state";
import { Button } from "./Button";

export function ToastStack() {
    const { state, dismissToast } = useApp();
    if (!state.toasts.length) return null;
    return (
        <div className="toast-stack" role="status" aria-live="polite">
            {state.toasts.map((t) => (
                <div key={t.id} className={`toast toast--${t.kind}`}>
                    <span className="toast__text">{t.text}</span>
                    {t.action && t.actionLabel ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                t.action?.();
                                dismissToast(t.id);
                            }}
                        >
                            {t.actionLabel}
                        </Button>
                    ) : null}
                    <button
                        type="button"
                        className="toast__close"
                        aria-label="Dismiss"
                        onClick={() => dismissToast(t.id)}
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}
