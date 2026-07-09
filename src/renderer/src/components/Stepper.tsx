import type { Step } from "../types";

interface Node {
    key: Exclude<Step, "countdown" | "paused" | "onboarding">;
    label: string;
    ordinal: string;
}

const NODES: Node[] = [
    { key: "home",      label: "Home",      ordinal: "00" },
    { key: "source",    label: "Source",    ordinal: "01" },
    { key: "config",    label: "Configure", ordinal: "02" },
    { key: "ready",     label: "Ready",     ordinal: "03" },
    { key: "recording", label: "Record",    ordinal: "04" },
    { key: "review",    label: "Review",    ordinal: "05" },
];

function stepIndex(step: Step): number {
    if (step === "countdown" || step === "paused")
        return NODES.findIndex((n) => n.key === "recording");
    if (step === "settings" || step === "onboarding") return -1;
    return NODES.findIndex((n) => n.key === step);
}

export interface StepperProps {
    current: Step;
    onJump?: (target: Node["key"]) => void;
    reachable?: Partial<Record<Node["key"], boolean>>;
}

export function Stepper({ current, onJump, reachable }: StepperProps) {
    const idx = stepIndex(current);
    return (
        <nav className="stepper" aria-label="Progress">
            {NODES.map((n, i) => {
                const done = i < idx;
                const active = i === idx;
                const canJump = reachable?.[n.key] && onJump && (done || active);
                const cls = [
                    "stepper__node",
                    done ? "stepper__node--done" : "",
                    active ? "stepper__node--active" : "",
                    canJump ? "stepper__node--jump" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
                return (
                    <button
                        key={n.key}
                        type="button"
                        className={cls}
                        onClick={() => canJump && onJump?.(n.key)}
                        disabled={!canJump}
                        aria-current={active ? "step" : undefined}
                    >
                        <span className="stepper__ord">{n.ordinal}</span>
                        <span className="stepper__label">{n.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
