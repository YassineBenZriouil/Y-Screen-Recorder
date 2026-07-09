import { Button } from "../components/Button";
import { Glyph } from "../components/Glyph";
import { SectionHeader } from "../components/SectionHeader";
import { Timecode } from "../components/Timecode";
import { useApp } from "../state";
import { useRecents } from "../hooks/useRecents";
import { useConfirm } from "../components/ConfirmDialog";
import type { RecentTake } from "../types";

function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtWhen(ms: number): string {
    const d = new Date(ms);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    if (sameDay) return `Today · ${h}:${m}`;
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day} · ${h}:${m}`;
}

export function HomeScreen() {
    const { go, toast } = useApp();
    const { recents, remove, refresh } = useRecents();
    const confirm = useConfirm();

    const startNew = () => go("source");

    const openTake = async (t: RecentTake) => {
        const exists = await window.yrec.fileExists(t.filePath);
        if (!exists) {
            toast("File no longer exists on disk.", { kind: "error" });
            await remove(t.id, false);
            return;
        }
        const res = await window.yrec.openFile(t.filePath);
        if (!res.ok) toast(`Could not open: ${res.error}`, { kind: "error" });
    };

    const revealTake = async (t: RecentTake) => {
        const exists = await window.yrec.fileExists(t.filePath);
        if (!exists) {
            toast("File no longer exists.", { kind: "error" });
            await remove(t.id, false);
            return;
        }
        await window.yrec.revealInFolder(t.filePath);
    };

    const copyPath = async (t: RecentTake) => {
        await window.yrec.copyText(t.filePath);
        toast("Path copied to clipboard.", { kind: "success" });
    };

    const removeTake = async (t: RecentTake) => {
        const alsoDelete = await confirm({
            title: "Remove this take from the list?",
            message:
                "Choose whether to also delete the file on disk. Removing only from the list keeps the file.",
            confirmLabel: "Remove & delete file",
            cancelLabel: "Remove from list",
            destructive: true,
            icon: "trash",
        });
        // Confirm result: true = destructive path (delete file); false = keep file
        await remove(t.id, alsoDelete);
        toast(alsoDelete ? "File deleted." : "Removed from list.");
    };

    return (
        <section className="screen screen--home">
            <SectionHeader
                eyebrow="Home"
                title="Ready to record?"
                description="Start a new take, or reopen something from your recent recordings."
                right={
                    <div className="row-inline">
                        <Button variant="ghost" size="sm" onClick={() => refresh()} iconLeft={<Glyph name="reload" />}>
                            Refresh
                        </Button>
                        <Button variant="record" size="lg" onClick={startNew} iconLeft={<Glyph name="record" />}>
                            New recording
                        </Button>
                    </div>
                }
            />

            {recents.length === 0 ? (
                <div className="home-empty">
                    <div className="home-empty__mark" aria-hidden />
                    <h3>No recordings yet</h3>
                    <p>Once you save a take, it will appear here for quick access.</p>
                    <Button variant="record" onClick={startNew} iconLeft={<Glyph name="record" />}>
                        Start your first recording
                    </Button>
                </div>
            ) : (
                <div className="recents-grid">
                    {recents.map((t) => (
                        <article key={t.id} className="recent-card">
                            <button
                                type="button"
                                className="recent-card__thumb"
                                onClick={() => openTake(t)}
                                title="Open in default player"
                            >
                                {t.thumbnail ? (
                                    <img src={t.thumbnail} alt="" />
                                ) : (
                                    <div className="recent-card__placeholder">
                                        <Glyph name="play" size={28} />
                                    </div>
                                )}
                                <div className="recent-card__duration">
                                    <Timecode ms={t.durationMs} variant="static" size="sm" />
                                </div>
                            </button>
                            <div className="recent-card__meta">
                                <div className="recent-card__title" title={t.sourceName}>
                                    {t.sourceName}
                                </div>
                                <div className="recent-card__sub">
                                    {fmtWhen(t.savedAt)}
                                    <span className="dot-sep" />
                                    {fmtBytes(t.sizeBytes)}
                                    <span className="dot-sep" />
                                    {t.codec.toUpperCase()}
                                </div>
                            </div>
                            <div className="recent-card__actions">
                                <Button
                                    variant="icon"
                                    onClick={() => revealTake(t)}
                                    aria-label="Reveal in folder"
                                    title="Reveal in folder"
                                >
                                    <Glyph name="reveal" />
                                </Button>
                                <Button
                                    variant="icon"
                                    onClick={() => copyPath(t)}
                                    aria-label="Copy path"
                                    title="Copy file path"
                                >
                                    <Glyph name="save" />
                                </Button>
                                <Button
                                    variant="icon"
                                    onClick={() => removeTake(t)}
                                    aria-label="Remove"
                                    title="Remove from list"
                                >
                                    <Glyph name="trash" />
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
