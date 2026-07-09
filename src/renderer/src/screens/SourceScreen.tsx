import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { SourceCard } from "../components/SourceCard";
import { Segment } from "../components/Segment";
import { SectionHeader } from "../components/SectionHeader";
import { Glyph } from "../components/Glyph";
import { useSources } from "../hooks/useSources";
import { useApp } from "../state";
import type { SourceInfo } from "../types";

type Tab = "all" | "screen" | "window";

const TABS = [
    { value: "all", label: "All" },
    { value: "screen", label: "Screens" },
    { value: "window", label: "Windows" },
] as const;

export function SourceScreen() {
    const { state, dispatch, go, toast } = useApp();
    const { sources, loading, error, refresh } = useSources();
    const [tab, setTab] = useState<Tab>("all");
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sources.filter((s) => {
            if (tab !== "all" && s.kind !== tab) return false;
            if (q && !s.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [sources, tab, query]);

    const choose = (src: SourceInfo) => {
        dispatch({ type: "SET_SOURCE", source: src });
    };

    const proceed = () => {
        if (!state.source) {
            toast("Pick a source first", { kind: "error" });
            return;
        }
        go("config");
    };

    return (
        <section className="screen screen--source">
            <SectionHeader
                eyebrow="Step 01"
                title="What are you capturing?"
                description="Pick one screen or an individual window. Sources refresh live."
                right={
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={refresh}
                        iconLeft={<Glyph name="reload" />}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                }
            />

            <div className="source-toolbar">
                <Segment<Tab>
                    value={tab}
                    options={TABS}
                    onChange={setTab}
                    aria-label="Filter by kind"
                />
                <input
                    type="search"
                    className="input"
                    placeholder="Search sources…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {error ? <div className="banner banner--error">{error}</div> : null}

            <div className="source-grid">
                {loading && filtered.length === 0 ? (
                    <div className="empty">Scanning sources…</div>
                ) : filtered.length === 0 ? (
                    <div className="empty">No sources match your search.</div>
                ) : (
                    filtered.map((s) => (
                        <SourceCard
                            key={s.id}
                            source={s}
                            selected={state.source?.id === s.id}
                            onSelect={choose}
                        />
                    ))
                )}
            </div>

            <footer className="screen__foot">
                <div className="foot-note">
                    {state.source ? (
                        <>
                            Selected: <b>{state.source.name}</b>
                        </>
                    ) : (
                        "Nothing selected"
                    )}
                </div>
                <Button
                    variant="primary"
                    size="lg"
                    onClick={proceed}
                    disabled={!state.source}
                    iconRight={<Glyph name="forward" />}
                >
                    Continue
                </Button>
            </footer>
        </section>
    );
}
