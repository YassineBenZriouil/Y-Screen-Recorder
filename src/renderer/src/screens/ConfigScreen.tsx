import { Button } from "../components/Button";
import { Pill } from "../components/Pill";
import { Segment } from "../components/Segment";
import { Field } from "../components/Field";
import { SectionHeader } from "../components/SectionHeader";
import { Glyph } from "../components/Glyph";
import { useApp } from "../state";
import type { BitratePreset, CodecId, CountdownSecs, PipCorner, QualityId } from "../types";

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

const BITRATES: readonly { value: BitratePreset; label: string; hint: string }[] = [
    { value: "standard", label: "Standard", hint: "4 Mbps · 30 FPS" },
    { value: "high",     label: "High",     hint: "6 Mbps · 60 FPS" },
    { value: "lossless", label: "Lossless", hint: "20 Mbps · 60 FPS" },
] as const;

const CORNERS: readonly { value: PipCorner; label: string }[] = [
    { value: "tl", label: "TL" },
    { value: "tr", label: "TR" },
    { value: "bl", label: "BL" },
    { value: "br", label: "BR" },
] as const;

export function ConfigScreen() {
    const { state, dispatch, go } = useApp();
    const { runtime, source } = state;

    const patch = (p: Partial<typeof runtime>) =>
        dispatch({ type: "PATCH_RUNTIME", patch: p });

    return (
        <section className="screen screen--config">
            <SectionHeader
                eyebrow="Step 02"
                title="Set up the take"
                description={
                    source
                        ? `Recording “${source.name}”. Adjust audio, encode, overlays.`
                        : "Choose a source first."
                }
                right={
                    <Button variant="ghost" size="sm" onClick={() => go("source")} iconLeft={<Glyph name="back" />}>
                        Change source
                    </Button>
                }
            />

            <div className="fields">
                <Field ordinal="A" label="Audio inputs" help="Mix any combination.">
                    <div className="row-inline">
                        <Pill active={runtime.mic} onClick={() => patch({ mic: !runtime.mic })}>
                            Microphone
                        </Pill>
                        <Pill active={runtime.system} onClick={() => patch({ system: !runtime.system })}>
                            System audio
                        </Pill>
                    </div>
                </Field>

                <Field ordinal="B" label="Encode" help="Codec inside a .webm container.">
                    <Segment<CodecId>
                        value={runtime.codec}
                        options={CODECS}
                        onChange={(codec) => patch({ codec })}
                    />
                </Field>

                <Field ordinal="C" label="Resolution" help="Target capture size.">
                    <Segment<QualityId>
                        value={runtime.quality}
                        options={QUALITIES}
                        onChange={(quality) => patch({ quality })}
                    />
                </Field>

                <Field ordinal="D" label="Bitrate / FPS" help="Higher = larger files.">
                    <Segment<BitratePreset>
                        value={runtime.bitrate}
                        options={BITRATES}
                        onChange={(bitrate) => patch({ bitrate })}
                    />
                </Field>

                <Field ordinal="E" label="Countdown" help="Buffer before recording starts.">
                    <Segment<string>
                        value={String(runtime.countdown)}
                        options={COUNTDOWN}
                        onChange={(v) => patch({ countdown: Number(v) as CountdownSecs })}
                    />
                </Field>

                <Field ordinal="F" label="Overlays" help="Compose extras directly into the recording (uses canvas — costs some CPU).">
                    <div className="row-inline">
                        <Pill
                            active={runtime.cursorHighlight}
                            onClick={() => patch({ cursorHighlight: !runtime.cursorHighlight })}
                        >
                            Cursor highlight
                        </Pill>
                        <Pill
                            active={runtime.keystrokeOverlay}
                            onClick={() => patch({ keystrokeOverlay: !runtime.keystrokeOverlay })}
                        >
                            Keystrokes
                        </Pill>
                        <Pill
                            active={runtime.webcam}
                            onClick={() => patch({ webcam: !runtime.webcam })}
                        >
                            Webcam PiP
                        </Pill>
                    </div>
                </Field>

                {runtime.webcam ? (
                    <Field ordinal="G" label="Webcam corner" help="Where the PiP sits.">
                        <Segment<PipCorner>
                            value={runtime.webcamCorner}
                            options={CORNERS}
                            onChange={(webcamCorner) => patch({ webcamCorner })}
                        />
                    </Field>
                ) : null}
            </div>

            <footer className="screen__foot">
                <Button variant="ghost" onClick={() => go("source")} iconLeft={<Glyph name="back" />}>
                    Back
                </Button>
                <Button variant="primary" size="lg" onClick={() => go("ready")} iconRight={<Glyph name="forward" />}>
                    Continue
                </Button>
            </footer>
        </section>
    );
}
