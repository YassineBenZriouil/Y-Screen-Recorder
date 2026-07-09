export interface SegmentOption<T extends string> {
    value: T;
    label: string;
    hint?: string;
}

export interface SegmentProps<T extends string> {
    value: T;
    options: readonly SegmentOption<T>[];
    onChange: (value: T) => void;
    "aria-label"?: string;
}

export function Segment<T extends string>({
    value,
    options,
    onChange,
    "aria-label": ariaLabel,
}: SegmentProps<T>) {
    return (
        <div className="seg" role="tablist" aria-label={ariaLabel}>
            {options.map((opt) => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={"seg__btn" + (active ? " seg__btn--on" : "")}
                        onClick={() => onChange(opt.value)}
                        title={opt.hint}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
