import logoSrc from "../assets/YR.png";

export interface LogoProps {
    size?: number;
    withWordmark?: boolean;
}

export function Logo({ size = 32, withWordmark = true }: LogoProps) {
    return (
        <div className="logo">
            <img
                src={logoSrc}
                alt="Y·REC"
                width={size}
                height={size}
                className="logo__mark"
                draggable={false}
            />
            {withWordmark ? (
                <div className="logo__text">
                    <span className="logo__name">Y·REC</span>
                    <span className="logo__tag">screen recorder</span>
                </div>
            ) : null}
        </div>
    );
}
