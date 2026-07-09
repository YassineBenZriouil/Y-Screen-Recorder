import { Button } from "../components/Button";
import { Preview } from "../components/Preview";
import { LiveTimecode } from "../components/Timecode";
import { Glyph } from "../components/Glyph";
import { Kbd } from "../components/Kbd";
import { useApp } from "../state";
import { useHotkeys } from "../hooks/useHotkeys";
import type { RecorderPhase } from "../hooks/useRecorder";

interface Props {
  phase: RecorderPhase;
  stream: MediaStream | null;
  startedAt: number | null;
  accumulatedMs: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export function RecordingScreen({
  phase,
  stream,
  startedAt,
  accumulatedMs,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: Props) {
  const { state } = useApp();
  const { source, runtime } = state;
  const isPaused = phase === "paused";

  useHotkeys({
    s: onStop,
    p: () => (isPaused ? onResume() : onPause()),
  });

  const audioLabel =
    [runtime.mic && "mic", runtime.system && "system"]
      .filter(Boolean)
      .join(" + ") || "no audio";

  return (
    <section className="screen screen--rec">
      <header className="rec-head">
        <div className={"rec-badge" + (isPaused ? " rec-badge--paused" : "")}>
          <span className="rec-badge__dot" />
          <span>{isPaused ? "PAUSED" : "RECORDING"}</span>
        </div>
        <div className="rec-meta">
          <span>{source?.name ?? "-"}</span>
          <span className="dot-sep" />
          <span>{audioLabel}</span>
          <span className="dot-sep" />
          <span>{runtime.codec.toUpperCase()}</span>
        </div>
      </header>

      <LiveTimecode
        startedAt={startedAt}
        accumulatedMs={accumulatedMs}
        running={phase === "recording"}
        variant={isPaused ? "paused" : "live"}
        size="xl"
        showBlink={phase === "recording"}
      />

      <Preview stream={stream} corners="rec" />

      <footer className="rec-actions">
        <div className="rec-actions__left">
          <Button
            variant="ghost"
            onClick={isPaused ? onResume : onPause}
            iconLeft={<Glyph name={isPaused ? "play" : "pause"} />}
          >
            {isPaused ? "Resume" : "Pause"} <Kbd>P</Kbd>
          </Button>
        </div>
        <div className="rec-actions__right">
          <Button
            variant="danger-ghost"
            onClick={onDiscard}
            iconLeft={<Glyph name="trash" />}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onStop}
            iconLeft={<Glyph name="stop" />}
          >
            Stop &amp; review <Kbd>S</Kbd>
          </Button>
        </div>
      </footer>
    </section>
  );
}
