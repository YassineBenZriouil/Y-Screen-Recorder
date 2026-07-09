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
    const { source, settings } = state;

    useHotkeys({
        r: () => onArm(),
        Escape: () => go("config"),
    });

    if (!source) {
        return (
            <section className="screen screen--ready">
                <div className="empty">No source selected. Go back and pick one.</div>
                <Button variant="ghost" onClick={() => go("source")}>
                    Choose source
                </Button>
            </section>
        );
    }

    const audioLabel =
        [settings.mic && "Mic", settings.system && "System"].filter(Boolean).join(" + ") ||
        "No audio";

    return (
        <section className="screen screen--ready">
            <SectionHeader
                eyebrow="Step 03"
                title="Ready when you are"
                description="Review the setup, then hit the button. R also works."
                right={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => go("config")}
                        iconLeft={<Glyph name="back" />}
                    >
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
                        <dd>{settings.codec.toUpperCase()}</dd>
                    </div>
                    <div>
                        <dt>Size</dt>
                        <dd>
                            {settings.quality === "hd"
                                ? "1280 × 720"
                                : settings.quality === "fullhd"
                                ? "1920 × 1080"
                                : "2560 × 1440"}
                        </dd>
                    </div>
                    <div>
                        <dt>Countdown</dt>
                        <dd>{settings.countdown === 0 ? "Off" : `${settings.countdown}s`}</dd>
                    </div>
                </dl>
            </div>

            <footer className="screen__foot screen__foot--record">
                <div className="foot-hint">
                    Press <Kbd>R</Kbd> to start
                </div>
                <Button
                    variant="record"
                    size="lg"
                    onClick={onArm}
                    iconLeft={<Glyph name="record" size={12} />}
                >
                    Start recording
                </Button>
            </footer>
        </section>
    );
}
