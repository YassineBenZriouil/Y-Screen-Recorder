export type GlyphName =
    | "record"
    | "stop"
    | "pause"
    | "play"
    | "trash"
    | "back"
    | "forward"
    | "check"
    | "reload"
    | "save"
    | "reveal";

export function Glyph({ name, size = 14 }: { name: GlyphName; size?: number }) {
    const s = size;
    const stroke = 1.6;
    const common = {
        width: s,
        height: s,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: stroke,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
    };
    switch (name) {
        case "record":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />
                </svg>
            );
        case "stop":
            return (
                <svg {...common}>
                    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
                </svg>
            );
        case "pause":
            return (
                <svg {...common}>
                    <rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
                    <rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none" />
                </svg>
            );
        case "play":
            return (
                <svg {...common}>
                    <polygon points="7,5 20,12 7,19" fill="currentColor" stroke="none" />
                </svg>
            );
        case "trash":
            return (
                <svg {...common}>
                    <path d="M4 7h16" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                    <path d="M9 7V4h6v3" />
                </svg>
            );
        case "back":
            return (
                <svg {...common}>
                    <polyline points="15 6 9 12 15 18" />
                </svg>
            );
        case "forward":
            return (
                <svg {...common}>
                    <polyline points="9 6 15 12 9 18" />
                </svg>
            );
        case "check":
            return (
                <svg {...common}>
                    <polyline points="4 12 10 18 20 6" />
                </svg>
            );
        case "reload":
            return (
                <svg {...common}>
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <polyline points="21 4 21 10 15 10" />
                </svg>
            );
        case "save":
            return (
                <svg {...common}>
                    <path d="M5 4h11l3 3v13H5z" />
                    <path d="M8 4v6h8V4" />
                    <path d="M8 20v-6h8v6" />
                </svg>
            );
        case "reveal":
            return (
                <svg {...common}>
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
            );
    }
}
