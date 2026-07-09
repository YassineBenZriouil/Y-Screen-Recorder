import { Button } from "../components/Button";
import { Timecode } from "../components/Timecode";
import { Glyph } from "../components/Glyph";
import { SectionHeader } from "../components/SectionHeader";
import { Kbd } from "../components/Kbd";
import { useApp } from "../state";
import { useHotkeys } from "../hooks/useHotkeys";

interface Props {
    onArm: () => void;
}

export function ReadyScreen({ onArm }: Props) {
    const { state, go } = useApp();
    const { source, runtime } = state;

    useHotkeys({
        r: () => onArm(),
        Escape: () => go("config"),
    });

    if (!source) {
        return (
            <section className="screen screen--ready">
                <div className="empty">No source selected.</div>
                <Button variant="ghost" onClick={() => go("source")}>Choose source</Button>
            </section>
        );
    }

    const audioLabel =
        [runtime.mic && "Mic", runtime.system && "System"].filter(Boolean).join(" + ") || "No audio";

    const overlays = [
        runtime.cursorHighlight && "cursor",
        runtime.keystrokeOverlay && "keys",
        runtime.webcam && `webcam (${runtime.webcamCorner.toUpperCase()})`,
    ].filter(Boolean).join(" · ") || "None";

    return (
        <section className="screen screen--ready">
            <SectionHeader
                eyebrow="Step 03"
                title="Ready when you are"
                description="Review the setup, then hit the button. R also works."
                right={
                    <Button variant="ghost" size="sm" onClick={() => go("config")} iconLeft={<Glyph name="back" />}>
                        Adjust
                    </Button>
                }
            />

            <div className="ready-stage">
                <Timecode ms={0} variant="idle" size="xl" />

                <dl className="summary">
                    <div>
                        <dt>Source</dt>
                        <dd className="summary__source">
                            <img src={source.thumbnail} alt="" className="summary__thumb" />
                            <span>{source.name}</span>
                        </dd>
                    </div>
                    <div>
                        <dt>Audio</dt>
                        <dd>{audioLabel}</dd>
                    </div>
                    <div>
                        <dt>Encode</dt>
                        <dd>{runtime.codec.toUpperCase()}</dd>
                    </div>
                    <div>
                        <dt>Resolution</dt>
                        <dd>
                            {runtime.quality === "hd" ? "1280 × 720" :
                             runtime.quality === "fullhd" ? "1920 × 1080" : "2560 × 1440"}
                        </dd>
                    </div>
                    <div>
                        <dt>Bitrate</dt>
                        <dd>
                            {runtime.bitrate === "standard" ? "4 Mbps / 30 FPS" :
                             runtime.bitrate === "high" ? "6 Mbps / 60 FPS" : "20 Mbps / 60 FPS"}
                        </dd>
                    </div>
                    <div>
                        <dt>Countdown</dt>
                        <dd>{runtime.countdown === 0 ? "Off" : `${runtime.countdown}s`}</dd>
                    </div>
                    <div>
                        <dt>Overlays</dt>
                        <dd>{overlays}</dd>
                    </div>
                </dl>
            </div>

            <footer className="screen__foot screen__foot--record">
                <div className="foot-hint">
                    Press <Kbd>R</Kbd> to start
                </div>
                <Button variant="record" size="lg" onClick={onArm} iconLeft={<Glyph name="record" size={12} />}>
                    Start recording
                </Button>
            </footer>
        </section>
    );
}
