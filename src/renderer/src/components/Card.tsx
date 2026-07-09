import type { ReactNode } from "react";

export interface CardProps {
    children: ReactNode;
    className?: string;
    as?: "div" | "section" | "article";
}

export function Card({ children, className = "", as = "div" }: CardProps) {
    const Tag = as;
    return <Tag className={"card " + className}>{children}</Tag>;
}

export function CardHead({ children }: { children: ReactNode }) {
    return <div className="card__head">{children}</div>;
}

export function CardBody({ children }: { children: ReactNode }) {
    return <div className="card__body">{children}</div>;
}

export function CardFoot({ children }: { children: ReactNode }) {
    return <div className="card__foot">{children}</div>;
}
