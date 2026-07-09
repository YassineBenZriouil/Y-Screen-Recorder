import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

export type ButtonVariant =
    | "primary"
    | "ghost"
    | "danger"
    | "danger-ghost"
    | "record"
    | "icon";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = "ghost",
        size = "md",
        fullWidth,
        iconLeft,
        iconRight,
        loading,
        children,
        className = "",
        disabled,
        ...rest
    },
    ref
) {
    const classes = [
        "btn",
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth ? "btn--full" : "",
        loading ? "btn--loading" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <button
            ref={ref}
            className={classes}
            disabled={disabled || loading}
            {...rest}
        >
            {iconLeft ? <span className="btn__icon">{iconLeft}</span> : null}
            {children ? <span className="btn__label">{children}</span> : null}
            {iconRight ? <span className="btn__icon">{iconRight}</span> : null}
        </button>
    );
});
