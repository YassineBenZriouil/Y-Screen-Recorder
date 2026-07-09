import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";

interface Props {
  from: number;
  onDone: () => void;
  onCancel: () => void;
}

export function CountdownScreen({ from, onDone, onCancel }: Props) {
  const [n, setN] = useState(from);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (from <= 0) {
      onDone();
      return;
    }
    setN(from);
    const step = () => {
      setN((prev) => {
        if (prev <= 1) {
          onDone();
          return 0;
        }
        timerRef.current = window.setTimeout(step, 1000);
        return prev - 1;
      });
    };
    timerRef.current = window.setTimeout(step, 1000);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  return (
    <section className="countdown">
      <span key={n} className="countdown__num">
        {n}
      </span>
      <span className="countdown__label">Get ready - recording in {n}s</span>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </section>
  );
}
