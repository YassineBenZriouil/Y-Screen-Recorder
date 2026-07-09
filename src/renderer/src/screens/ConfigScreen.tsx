import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { Segment } from "../components/Segment";
import { Field } from "../components/Field";
import { SectionHeader } from "../components/SectionHeader";
import { Glyph } from "../components/Glyph";
import { useApp } from "../state";
import type { CodecId, CountdownSecs, QualityId } from "../types";

const CODECS: readonly { value: CodecId; label: string; hint?: string }[] = [
    { value: "vp9", label: "VP9", hint: "Best compression" },
    { value: "vp8", label: "VP8", hint: "Widest support" },
    { value: "h264", label: "H.264", hint: "Fastest encode" },
] as const;

const COUNTDOWN: readonly { value: string; label: string }[] = [
    { value: "0", label: "Off" },
    { value: "3", label: "3s" },
    { value: "5", label: "5s" },
] as const;

const QUALITIES: readonly { value: QualityId; label: string; hint?: string }[] = [
    { value: "hd", label: "720p" },
    { value: "fullhd", label: "1080p" },
    { value: "qhd", label: "1440p" },
] as const;

export function ConfigScreen() {
    const { state, dispatch, go } = useApp();
    const { settings, source } = state;

    return (
        <section className="screen screen--config">
            <SectionHeader
                eyebrow="Step 02"
                title="Set up the take"
                description={
                    source
                        ? `Recording “${source.name}”. Adjust audio, quality, and countdown.`
                        : "Choose a source first."
                }
                right={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => go("source")}
                        iconLeft={<Glyph name="back" />}
                    >
                        Change source
                    </Button>
                }
            />

            <div className="fields">
                <Field ordinal="A" label="Audio inputs" help="Mix any combination.">
                    <div className="row-inline">
                        <Pill
                            active={settings.mic}
                            onClick={() =>
                                dispatch({
                                    type: "SET_SETTINGS",
                                    patch: { mic: !settings.mic },
                                })
                            }
                        >
                            Microphone
                        </Pill>
                        <Pill
                            active={settings.system}
                            onClick={() =>
                                dispatch({
                                    type: "SET_SETTINGS",
                                    patch: { system: !settings.system },
                                })
                            }
                        >
                            System audio
                        </Pill>
                    </div>
                </Field>

                <Field ordinal="B" label="Encode" help="Codec inside a .webm container.">
                    <Segment<CodecId>
                        value={settings.codec}
                        options={CODECS}
                        onChange={(codec) =>
                            dispatch({ type: "SET_SETTINGS", patch: { codec } })
                        }
                    />
                </Field>

                <Field ordinal="C" label="Capture size" help="Target resolution.">
                    <Segment<QualityId>
                        value={settings.quality}
                        options={QUALITIES}
                        onChange={(quality) =>
                            dispatch({ type: "SET_SETTINGS", patch: { quality } })
                        }
                    />
                </Field>

                <Field ordinal="D" label="Countdown" help="Buffer before recording starts.">
                    <Segment<string>
                        value={String(settings.countdown)}
                        options={COUNTDOWN}
                        onChange={(v) =>
                            dispatch({
                                type: "SET_SETTINGS",
                                patch: { countdown: Number(v) as CountdownSecs },
                            })
                        }
                    />
                </Field>
            </div>

            <footer className="screen__foot">
                <Button
                    variant="ghost"
                    onClick={() => go("source")}
                    iconLeft={<Glyph name="back" />}
                >
                    Back
                </Button>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => go("ready")}
                    iconRight={<Glyph name="forward" />}
                >
                    Continue
                </Button>
            </footer>
        </section>
    );
}
