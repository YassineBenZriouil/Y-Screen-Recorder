import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { Glyph } from "../components/Glyph";
import { Kbd } from "../components/Kbd";
import { useSettings } from "../hooks/useSettings";
import type { PermissionStatus, MediaPermission } from "../types";

interface Props {
    onDone: () => void;
}

interface PermRow {
    kind: MediaPermission;
    label: string;
    hint: string;
}

const ROWS: PermRow[] = [
    { kind: "screen", label: "Screen recording", hint: "Required. Grant in System Settings." },
    { kind: "microphone", label: "Microphone", hint: "Optional. Only needed for mic audio." },
    { kind: "camera", label: "Camera", hint: "Optional. Only needed for webcam PiP." },
];

export function OnboardingScreen({ onDone }: Props) {
    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [perms, setPerms] = useState<Record<MediaPermission, PermissionStatus>>({
        screen: "unknown",
        microphone: "unknown",
        camera: "unknown",
    });
    const { update } = useSettings();

    const isMac = navigator.platform.toLowerCase().includes("mac");

    const refresh = async () => {
        const next: Record<MediaPermission, PermissionStatus> = {
            screen: await window.yrec.permStatus("screen"),
            microphone: await window.yrec.permStatus("microphone"),
            camera: await window.yrec.permStatus("camera"),
        };
        setPerms(next);
    };

    useEffect(() => {
        void refresh();
    }, []);

    const finish = async () => {
        await update({ onboarding: "seen" });
        onDone();
    };

    return (
        <section className="screen screen--onboarding">
            <div className="onb-card">
                <div className="onb-hero">
                    <Logo size={56} withWordmark={false} />
                    <div>
                        <div className="onb-eyebrow">Welcome to</div>
                        <h1 className="onb-title">Y·REC</h1>
                        <p className="onb-tagline">A distinctive screen recorder — three steps to your first take.</p>
                    </div>
                </div>

                <div className="onb-steps">
                    <div className={"onb-step" + (step >= 0 ? " onb-step--on" : "")}>
                        <div className="onb-step__ord">01</div>
                        <div className="onb-step__body">
                            <h3>Grant permissions</h3>
                            {isMac ? (
                                <>
                                    <p>macOS requires you to enable each permission from System Settings.</p>
                                    <ul className="perm-list">
                                        {ROWS.map((r) => {
                                            const s = perms[r.kind];
                                            const granted = s === "granted";
                                            return (
                                                <li key={r.kind}>
                                                    <div>
                                                        <div className="perm-list__label">{r.label}</div>
                                                        <div className="perm-list__hint">{r.hint}</div>
                                                    </div>
                                                    <div className="perm-list__actions">
                                                        <span
                                                            className={
                                                                "perm-badge perm-badge--" +
                                                                (granted ? "on" : s === "denied" ? "off" : "unknown")
                                                            }
                                                        >
                                                            {granted ? "Granted" : s === "denied" ? "Denied" : "Unknown"}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                if (r.kind === "screen") {
                                                                    await window.yrec.permOpenSettings(r.kind);
                                                                } else {
                                                                    await window.yrec.permAsk(r.kind);
                                                                }
                                                                setTimeout(refresh, 400);
                                                            }}
                                                        >
                                                            {r.kind === "screen" ? "Open settings" : "Request"}
                                                        </Button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            ) : (
                                <p>
                                    On Windows and Linux, permissions are prompted the first time you try to capture.
                                    You can skip this step.
                                </p>
                            )}
                            <div className="onb-step__actions">
                                <Button variant="ghost" onClick={refresh} iconLeft={<Glyph name="reload" />}>
                                    Re-check
                                </Button>
                                <Button variant="primary" onClick={() => setStep(1)}>Continue</Button>
                            </div>
                        </div>
                    </div>

                    {step >= 1 ? (
                        <div className="onb-step onb-step--on">
                            <div className="onb-step__ord">02</div>
                            <div className="onb-step__body">
                                <h3>Pick a source</h3>
                                <p>Every recording starts by selecting a screen or a specific window. Thumbnails and search included.</p>
                                <div className="onb-step__actions">
                                    <Button variant="ghost" onClick={() => setStep(0)} iconLeft={<Glyph name="back" />}>Back</Button>
                                    <Button variant="primary" onClick={() => setStep(2)}>Continue</Button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {step >= 2 ? (
                        <div className="onb-step onb-step--on">
                            <div className="onb-step__ord">03</div>
                            <div className="onb-step__body">
                                <h3>Start recording</h3>
                                <p>
                                    Press <Kbd>R</Kbd> on the Ready screen or use the record button. Stop with <Kbd>S</Kbd>, pause with <Kbd>P</Kbd>. Global
                                    hotkeys work anywhere on your system.
                                </p>
                                <div className="onb-step__actions">
                                    <Button variant="ghost" onClick={() => setStep(1)} iconLeft={<Glyph name="back" />}>Back</Button>
                                    <Button variant="record" onClick={finish} iconLeft={<Glyph name="check" />}>Let&#39;s record</Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="onb-skip">
                    <Button variant="ghost" size="sm" onClick={finish}>
                        Skip setup
                    </Button>
                </div>
            </div>
        </section>
    );
}
