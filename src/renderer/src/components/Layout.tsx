import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Kbd } from "./Kbd";
import { Stepper } from "./Stepper";
import type { Step } from "../types";

export interface LayoutProps {
    step: Step;
    onJump?: (step: Exclude<Step, "countdown" | "paused">) => void;
    reachable?: Partial<Record<Exclude<Step, "countdown" | "paused">, boolean>>;
    children: ReactNode;
    hideStepper?: boolean;
}

export function Layout({ step, onJump, reachable, children, hideStepper }: LayoutProps) {
    return (
        <div className="shell" data-step={step}>
            <header className="topbar">
                <Logo />
                <div className="topbar__hints">
                    <span><Kbd>R</Kbd> record</span>
                    <span><Kbd>S</Kbd> stop</span>
                    <span><Kbd>P</Kbd> pause</span>
                    <span><Kbd>Esc</Kbd> back</span>
                </div>
            </header>
            {!hideStepper ? (
                <div className="stepper-wrap">
                    <Stepper current={step} onJump={onJump} reachable={reachable} />
                </div>
            ) : null}
            <main className="content">{children}</main>
            <div className="scanlines" aria-hidden />
        </div>
    );
}
