import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    ariaLabel?: string;
    size?: "sm" | "md" | "lg";
}

export function Modal({ open, onClose, children, ariaLabel, size = "md" }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="modal" role="dialog" aria-modal="true" aria-label={ariaLabel}>
            <div className="modal__backdrop" onClick={onClose} />
            <div className={`modal__card modal__card--${size}`}>{children}</div>
        </div>
    );
}
