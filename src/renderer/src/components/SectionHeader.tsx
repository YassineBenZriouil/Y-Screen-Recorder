import type { ReactNode } from "react";

export interface SectionHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    right?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, right }: SectionHeaderProps) {
    return (
        <header className="section-header">
            <div>
                {eyebrow ? <div className="section-header__eyebrow">{eyebrow}</div> : null}
                <h1 className="section-header__title">{title}</h1>
                {description ? (
                    <p className="section-header__desc">{description}</p>
                ) : null}
            </div>
            {right ? <div className="section-header__right">{right}</div> : null}
        </header>
    );
}
