import type { SourceInfo } from "../types";

export interface SourceCardProps {
    source: SourceInfo;
    selected?: boolean;
    onSelect: (source: SourceInfo) => void;
}

export function SourceCard({ source, selected, onSelect }: SourceCardProps) {
    return (
        <button
            type="button"
            className={"source-card" + (selected ? " source-card--on" : "")}
            onClick={() => onSelect(source)}
        >
            <div className="source-card__thumb">
                <img src={source.thumbnail} alt="" draggable={false} />
                {source.appIcon ? (
                    <img className="source-card__icon" src={source.appIcon} alt="" />
                ) : null}
            </div>
            <div className="source-card__meta">
                <span className="source-card__kind">{source.kind}</span>
                <span className="source-card__name" title={source.name}>
                    {source.name}
                </span>
            </div>
        </button>
    );
}
