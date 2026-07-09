import type { ReactNode } from "react";

export interface PillProps {
    active?: boolean;
    onClick?: () => void;
    children: ReactNode;
    disabled?: boolean;
}

export function Pill({ active, onClick, children, disabled }: PillProps) {
    return (
        <button
            type="button"
            className={"pill" + (active ? " pill--on" : "")}
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
        >
            <span className="pill__led" />
            <span>{children}</span>
        </button>
    );
}
