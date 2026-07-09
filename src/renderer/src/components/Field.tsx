import type { ReactNode } from "react";

export interface FieldProps {
    ordinal?: string;
    label: string;
    help?: string;
    children: ReactNode;
}

export function Field({ ordinal, label, help, children }: FieldProps) {
    return (
        <div className="field">
            <div className="field__lead">
                {ordinal ? <span className="field__ord">{ordinal}</span> : null}
                <div>
                    <div className="field__label">{label}</div>
                    {help ? <div className="field__help">{help}</div> : null}
                </div>
            </div>
            <div className="field__control">{children}</div>
        </div>
    );
}
