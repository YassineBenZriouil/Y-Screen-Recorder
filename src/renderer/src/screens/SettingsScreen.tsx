import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { Segment } from "../components/Segment";
import { Field } from "../components/Field";
import { SectionHeader } from "../components/SectionHeader";
import { Glyph } from "../components/Glyph";
import { Kbd } from "../components/Kbd";
import { useSettings } from "../hooks/useSettings";
import { useConfirm } from "../components/ConfirmDialog";
import { useApp } from "../state";
import type {
    BitratePreset,
    CodecId,
    PipCorner,
    QualityId,
    Settings,
    Theme,
} from "../types";

const THEMES: readonly { value: Theme; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
] as const;

const CODECS: readonly { value: CodecId; label: string }[] = [
    { value: "vp9", label: "VP9" },
    { value: "vp8", label: "VP8" },
    { value: "h264", label: "H.264" },
] as const;

const QUALITIES: readonly { value: QualityId; label: string }[] = [
    { value: "hd", label: "720p" },
    { value: "fullhd", label: "1080p" },
    { value: "qhd", label: "1440p" },
] as const;

const BITRATES: readonly { value: BitratePreset; label: string; hint: string }[] = [
    { value: "standard", label: "Standard", hint: "4 Mbps · 30 FPS" },
    { value: "high", label: "High", hint: "6 Mbps · 60 FPS" },
    { value: "lossless", label: "Lossless", hint: "20 Mbps · 60 FPS" },
] as const;

const CORNERS: readonly { value: PipCorner; label: string }[] = [
    { value: "tl", label: "TL" },
    { value: "tr", label: "TR" },
    { value: "bl", label: "BL" },
    { value: "br", label: "BR" },
] as const;

const COUNTDOWN: readonly { value: string; label: string }[] = [
    { value: "0", label: "Off" },
    { value: "3", label: "3s" },
    { value: "5", label: "5s" },
] as const;

const TEMPLATE_TOKENS = [
    "{date}",
    "{time}",
    "{counter}",
    "{year}",
    "{month}",
    "{day}",
    "{hour}",
    "{minute}",
    "{second}",
];

function patchDefaults(prev: Settings, patch: Partial<Settings["defaults"]>): Partial<Settings> {
    return { defaults: { ...prev.defaults, ...patch } };
}

function patchShortcuts(prev: Settings, patch: Partial<Settings["shortcuts"]>): Partial<Settings> {
    return { shortcuts: { ...prev.shortcuts, ...patch } };
}

export function SettingsScreen() {
    const { settings, update, reset } = useSettings();
    const { goBack } = useApp();
    const confirm = useConfirm();

    const [recordingKey, setRecordingKey] = useState<
        keyof Settings["shortcuts"] | null
    >(null);

    useEffect(() => {
        if (!recordingKey) return;
        const onKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") {
                setRecordingKey(null);
                return;
            }
            const parts: string[] = [];
            if (e.ctrlKey) parts.push("Control");
            if (e.metaKey) parts.push("CommandOrControl");
            if (e.altKey) parts.push("Alt");
            if (e.shiftKey) parts.push("Shift");
            const k = e.key;
            if (["Control", "Meta", "Alt", "Shift"].includes(k)) return;
            const primary = k.length === 1 ? k.toUpperCase() : k;
            parts.push(primary);
            const accel = Array.from(new Set(parts)).join("+");
            if (settings) {
                void update(patchShortcuts(settings, { [recordingKey]: accel }));
            }
            setRecordingKey(null);
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [recordingKey, settings, update]);

    if (!settings) return null;

    const doReset = async () => {
        const ok = await confirm({
            title: "Reset all settings?",
            message:
                "All preferences will return to their defaults. Your saved recordings are not affected.",
            confirmLabel: "Reset",
            cancelLabel: "Keep my settings",
            destructive: true,
            icon: "reload",
        });
        if (!ok) return;
        await reset();
    };

    const pickDir = async () => {
        const next = await window.yrec.pickDirectory(settings.defaultSaveDir);
        if (next) void update({ defaultSaveDir: next });
    };

    return (
        <section className="screen screen--settings">
            <SectionHeader
                eyebrow="Settings"
                title="Preferences"
                description="Everything here persists between launches."
                right={
                    <div className="row-inline">
                        <Button variant="danger-ghost" size="sm" onClick={doReset} iconLeft={<Glyph name="reload" />}>
                            Reset defaults
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goBack} iconLeft={<Glyph name="back" />}>
                            Back
                        </Button>
                    </div>
                }
            />

            <div className="fields">
                <Field ordinal="A" label="Appearance" help="Theme applies immediately.">
                    <Segment<Theme>
                        value={settings.theme}
                        options={THEMES}
                        onChange={(theme) => update({ theme })}
                    />
                </Field>

                <Field ordinal="B" label="Save folder" help="Where recordings go by default.">
                    <div className="row-inline settings-path">
                        <code className="path-code" title={settings.defaultSaveDir}>
                            {settings.defaultSaveDir}
                        </code>
                        <Button variant="ghost" size="sm" onClick={pickDir}>Choose…</Button>
                    </div>
                </Field>

                <Field
                    ordinal="C"
                    label="Filename template"
                    help={`Tokens: ${TEMPLATE_TOKENS.join(", ")}`}
                >
                    <input
                        type="text"
                        className="input input--full"
                        value={settings.filenameTemplate}
                        onChange={(e) => update({ filenameTemplate: e.target.value })}
                        placeholder="y-rec-{date}-{time}"
                    />
                </Field>

                <Field ordinal="D" label="Auto-save" help="Skip the save dialog and write straight to the folder above.">
                    <div className="row-inline">
                        <Pill active={settings.autoSave} onClick={() => update({ autoSave: !settings.autoSave })}>
                            {settings.autoSave ? "On" : "Off"}
                        </Pill>
                    </div>
                </Field>

                <Field ordinal="E" label="Minimize while recording" help="Send the window to the taskbar during a take. Restores when you stop.">
                    <div className="row-inline">
                        <Pill
                            active={settings.hideWindowWhileRecording}
                            onClick={() =>
                                update({ hideWindowWhileRecording: !settings.hideWindowWhileRecording })
                            }
                        >
                            {settings.hideWindowWhileRecording ? "On" : "Off"}
                        </Pill>
                    </div>
                </Field>
            </div>

            <SectionHeader eyebrow="Defaults" title="Recording defaults" description="Pre-filled every time you start a new take." />

            <div className="fields">
                <Field ordinal="01" label="Audio" help="Toggle mic and system audio.">
                    <div className="row-inline">
                        <Pill
                            active={settings.defaults.mic}
                            onClick={() => update(patchDefaults(settings, { mic: !settings.defaults.mic }))}
                        >
                            Microphone
                        </Pill>
                        <Pill
                            active={settings.defaults.system}
                            onClick={() => update(patchDefaults(settings, { system: !settings.defaults.system }))}
                        >
                            System
                        </Pill>
                    </div>
                </Field>

                <Field ordinal="02" label="Encode" help="Container is always .webm.">
                    <Segment<CodecId>
                        value={settings.defaults.codec}
                        options={CODECS}
                        onChange={(codec) => update(patchDefaults(settings, { codec }))}
                    />
                </Field>

                <Field ordinal="03" label="Resolution">
                    <Segment<QualityId>
                        value={settings.defaults.quality}
                        options={QUALITIES}
                        onChange={(quality) => update(patchDefaults(settings, { quality }))}
                    />
                </Field>

                <Field ordinal="04" label="Bitrate / FPS">
                    <Segment<BitratePreset>
                        value={settings.defaults.bitrate}
                        options={BITRATES}
                        onChange={(bitrate) => update(patchDefaults(settings, { bitrate }))}
                    />
                </Field>

                <Field ordinal="05" label="Countdown">
                    <Segment<string>
                        value={String(settings.defaults.countdown)}
                        options={COUNTDOWN}
                        onChange={(v) =>
                            update(patchDefaults(settings, { countdown: Number(v) as 0 | 3 | 5 }))
                        }
                    />
                </Field>

                <Field ordinal="06" label="Overlays" help="Cursor ring, keystroke chips, and webcam PiP composited into the recording.">
                    <div className="row-inline">
                        <Pill
                            active={settings.defaults.cursorHighlight}
                            onClick={() =>
                                update(
                                    patchDefaults(settings, {
                                        cursorHighlight: !settings.defaults.cursorHighlight,
                                    })
                                )
                            }
                        >
                            Cursor highlight
                        </Pill>
                        <Pill
                            active={settings.defaults.keystrokeOverlay}
                            onClick={() =>
                                update(
                                    patchDefaults(settings, {
                                        keystrokeOverlay: !settings.defaults.keystrokeOverlay,
                                    })
                                )
                            }
                        >
                            Keystrokes
                        </Pill>
                        <Pill
                            active={settings.defaults.webcam}
                            onClick={() =>
                                update(patchDefaults(settings, { webcam: !settings.defaults.webcam }))
                            }
                        >
                            Webcam PiP
                        </Pill>
                    </div>
                </Field>

                <Field ordinal="07" label="Webcam corner" help="Where the PiP sits.">
                    <Segment<PipCorner>
                        value={settings.defaults.webcamCorner}
                        options={CORNERS}
                        onChange={(webcamCorner) => update(patchDefaults(settings, { webcamCorner }))}
                    />
                </Field>
            </div>

            <SectionHeader eyebrow="Shortcuts" title="Global keyboard shortcuts" description="Work anywhere on your system, even when Y·REC is hidden. Click a row and press keys to rebind. Esc cancels." />

            <div className="fields">
                {(
                    [
                        { key: "record" as const, label: "Start / stop recording" },
                        { key: "stop" as const, label: "Stop recording" },
                        { key: "pause" as const, label: "Pause / resume" },
                        { key: "discard" as const, label: "Discard current take" },
                    ]
                ).map((row) => (
                    <Field key={row.key} label={row.label}>
                        <div className="row-inline">
                            <button
                                type="button"
                                className={
                                    "shortcut-chip" + (recordingKey === row.key ? " shortcut-chip--rec" : "")
                                }
                                onClick={() => setRecordingKey(row.key)}
                            >
                                {recordingKey === row.key ? (
                                    <>Press new combo… <Kbd>Esc</Kbd></>
                                ) : (
                                    settings.shortcuts[row.key].split("+").map((k, i) => (
                                        <Kbd key={i}>{k}</Kbd>
                                    ))
                                )}
                            </button>
                        </div>
                    </Field>
                ))}
            </div>
        </section>
    );
}
