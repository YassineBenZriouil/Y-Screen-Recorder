import { forwardRef } from "react";

export interface PreviewProps {
    src?: string;
    stream?: MediaStream | null;
    controls?: boolean;
    muted?: boolean;
    autoPlay?: boolean;
    corners?: "rec" | "play" | "none";
}

export const Preview = forwardRef<HTMLVideoElement, PreviewProps>(function Preview(
    { src, stream, controls, muted = true, autoPlay = true, corners = "rec" },
    ref
) {
    return (
        <div className={"preview" + (corners !== "none" ? ` preview--${corners}` : "")}>
            <video
                ref={(node) => {
                    if (typeof ref === "function") ref(node);
                    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = node;
                    if (node && stream !== undefined) node.srcObject = stream;
                }}
                src={src}
                controls={controls}
                muted={muted}
                autoPlay={autoPlay}
                playsInline
            />
            {corners !== "none" ? (
                <div className="preview__corners" aria-hidden>
                    <span /><span /><span /><span />
                </div>
            ) : null}
        </div>
    );
});
