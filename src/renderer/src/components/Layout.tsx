import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Kbd } from "./Kbd";
import { Stepper } from "./Stepper";
import { Button } from "./Button";
import { Glyph } from "./Glyph";
import type { Step } from "../types";

export interface LayoutProps {
    step: Step;
    onJump?: (step: Exclude<Step, "countdown" | "paused" | "onboarding">) => void;
    reachable?: Partial<Record<Exclude<Step, "countdown" | "paused" | "onboarding">, boolean>>;
    onSettings?: () => void;
    onHelp?: () => void;
    onHome?: () => void;
    children: ReactNode;
    hideStepper?: boolean;
    hideChrome?: boolean;
}

export function Layout({
    step,
    onJump,
    reachable,
    onSettings,
    onHelp,
    onHome,
    children,
    hideStepper,
    hideChrome,
}: LayoutProps) {
    return (
        <div className="shell" data-step={step}>
            {!hideChrome ? (
                <header className="topbar">
                    <button
                        type="button"
                        className="topbar__brand"
                        onClick={onHome}
                        title="Go home"
                    >
                        <Logo />
                    </button>
                    <div className="topbar__actions">
                        <div className="topbar__hints">
                            <span><Kbd>R</Kbd> record</span>
                            <span><Kbd>S</Kbd> stop</span>
                            <span><Kbd>P</Kbd> pause</span>
                            <span><Kbd>?</Kbd> help</span>
                        </div>
                        {onHelp ? (
                            <Button variant="icon" onClick={onHelp} aria-label="Keyboard shortcuts" title="Shortcuts (?)">?</Button>
                        ) : null}
                        {onSettings ? (
                            <Button variant="icon" onClick={onSettings} aria-label="Settings" title="Settings">⚙</Button>
                        ) : null}
                    </div>
                </header>
            ) : null}
            {!hideStepper && !hideChrome ? (
                <div className="stepper-wrap">
                    <Stepper current={step} onJump={onJump} reachable={reachable} />
                </div>
            ) : null}
            <main className="content">{children}</main>
            <div className="scanlines" aria-hidden />
        </div>
    );
}
