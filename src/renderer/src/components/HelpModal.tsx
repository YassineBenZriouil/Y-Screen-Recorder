import { Modal } from "./Modal";
import { Button } from "./Button";
import { Kbd } from "./Kbd";
import type { Shortcuts } from "../types";

interface Row {
    label: string;
    keys: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
    globalShortcuts?: Shortcuts;
}

function splitAccel(accel: string): string[] {
    return accel.split("+");
}

export function HelpModal({ open, onClose, globalShortcuts }: Props) {
    const inApp: Row[] = [
        { label: "Start recording (Ready screen)", keys: ["R"] },
        { label: "Stop recording", keys: ["S"] },
        { label: "Pause / resume", keys: ["P"] },
        { label: "Close dialog / go back", keys: ["Esc"] },
        { label: "Confirm dialog", keys: ["Enter"] },
        { label: "Open this help", keys: ["?"] },
    ];

    const global: Row[] = globalShortcuts
        ? [
              { label: "Start / stop from anywhere", keys: splitAccel(globalShortcuts.record) },
              { label: "Stop from anywhere", keys: splitAccel(globalShortcuts.stop) },
              { label: "Pause from anywhere", keys: splitAccel(globalShortcuts.pause) },
              { label: "Discard from anywhere", keys: splitAccel(globalShortcuts.discard) },
          ]
        : [];

    return (
        <Modal open={open} onClose={onClose} ariaLabel="Keyboard shortcuts">
            <header className="modal__head">
                <div>
                    <h2 className="modal__title">Keyboard shortcuts</h2>
                    <p className="modal__sub">Move faster with the keyboard.</p>
                </div>
                <Button variant="icon" onClick={onClose} aria-label="Close">✕</Button>
            </header>
            <div className="modal__body">
                <section className="help-sec">
                    <div className="help-sec__label">In-app</div>
                    <ul className="help-list">
                        {inApp.map((r) => (
                            <li key={r.label}>
                                <span>{r.label}</span>
                                <span className="help-keys">
                                    {r.keys.map((k, i) => (
                                        <Kbd key={i}>{k}</Kbd>
                                    ))}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
                {global.length > 0 ? (
                    <section className="help-sec">
                        <div className="help-sec__label">Global (system-wide)</div>
                        <ul className="help-list">
                            {global.map((r) => (
                                <li key={r.label}>
                                    <span>{r.label}</span>
                                    <span className="help-keys">
                                        {r.keys.map((k, i) => (
                                            <Kbd key={i}>{k}</Kbd>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
            </div>
        </Modal>
    );
}
