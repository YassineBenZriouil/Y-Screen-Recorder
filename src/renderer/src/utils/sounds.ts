let ctx: AudioContext | null = null;

function audioCtx(): AudioContext {
    if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
    }
    return ctx;
}

function beep(freq: number, dur: number, gain = 0.08, type: OscillatorType = "sine") {
    try {
        const a = audioCtx();
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.frequency.value = freq;
        osc.type = type;
        g.gain.setValueAtTime(0, a.currentTime);
        g.gain.linearRampToValueAtTime(gain, a.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
        osc.connect(g).connect(a.destination);
        osc.start();
        osc.stop(a.currentTime + dur);
    } catch { /* silent */ }
}

export const sounds = {
    recordStart(): void {
        beep(880, 0.08, 0.06, "square");
        setTimeout(() => beep(1320, 0.12, 0.06, "square"), 90);
    },
    recordStop(): void {
        beep(660, 0.1, 0.06, "square");
        setTimeout(() => beep(330, 0.16, 0.06, "square"), 100);
    },
    error(): void {
        beep(220, 0.16, 0.08, "sawtooth");
        setTimeout(() => beep(180, 0.24, 0.08, "sawtooth"), 120);
    },
    click(): void {
        beep(1200, 0.03, 0.02, "square");
    },
    countdown(): void {
        beep(1000, 0.06, 0.05, "sine");
    },
};
