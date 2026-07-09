import { Button } from "../components/Button";
import { Preview } from "../components/Preview";
import { Timecode } from "../components/Timecode";
import { Glyph } from "../components/Glyph";
import { SectionHeader } from "../components/SectionHeader";
import { useApp } from "../state";

interface Props {
  onSave: () => void;
  onDiscard: () => void;
  onAgain: () => void;
  onCopyBlob: () => void;
  saving: boolean;
  autoSave: boolean;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReviewScreen({
  onSave,
  onDiscard,
  onAgain,
  onCopyBlob,
  saving,
  autoSave,
}: Props) {
  const { state } = useApp();
  const take = state.take;

  if (!take) {
    return (
      <section className="screen">
        <div className="empty">Nothing to review.</div>
      </section>
    );
  }

  return (
    <section className="screen screen--review">
      <SectionHeader
        eyebrow="Step 05 - Take complete"
        title="Review, then save."
        description={
          autoSave
            ? "Auto-save is on - the file will be written to your default folder."
            : "Scrub to preview. Save writes to disk."
        }
      />

      <div className="review-grid">
        <div>
          <Preview
            src={take.url}
            controls
            muted={false}
            autoPlay={false}
            corners="play"
          />
        </div>
        <aside className="review-side">
          <div className="review-side__block">
            <div className="review-side__key">Duration</div>
            <Timecode ms={take.durationMs} variant="static" size="md" />
          </div>
          <div className="review-side__block">
            <div className="review-side__key">Source</div>
            <div className="review-side__val">{take.sourceName}</div>
          </div>
          <div className="review-side__block">
            <div className="review-side__key">Encode</div>
            <div className="review-side__val">
              {take.codec.toUpperCase()} · .{take.extension}
            </div>
          </div>
          <div className="review-side__block">
            <div className="review-side__key">Audio</div>
            <div className="review-side__val">{take.audioLabel}</div>
          </div>
          <div className="review-side__block">
            <div className="review-side__key">Size</div>
            <div className="review-side__val">{fmtBytes(take.sizeBytes)}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onCopyBlob}
            iconLeft={<Glyph name="save" />}
          >
            Download to Downloads
          </Button>
        </aside>
      </div>

      <footer className="screen__foot">
        <Button
          variant="danger-ghost"
          onClick={onDiscard}
          iconLeft={<Glyph name="trash" />}
        >
          Throw away
        </Button>
        <Button
          variant="ghost"
          onClick={onAgain}
          iconLeft={<Glyph name="reload" />}
        >
          Record another
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onSave}
          loading={saving}
          iconLeft={<Glyph name="save" />}
        >
          {saving ? "Saving…" : autoSave ? "Save now" : "Save recording"}
        </Button>
      </footer>
    </section>
  );
}
