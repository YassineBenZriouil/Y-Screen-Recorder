import { useCallback, useState } from "react";
import { AppProvider, useApp } from "./state";
import { Layout } from "./components/Layout";
import { ToastStack } from "./components/Toast";
import { ConfirmProvider, useConfirm } from "./components/ConfirmDialog";
import { SourceScreen } from "./screens/SourceScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { CountdownScreen } from "./screens/CountdownScreen";
import { RecordingScreen } from "./screens/RecordingScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { useRecorder } from "./hooks/useRecorder";
import type { Step, Take } from "./types";

export function App() {
    return (
        <AppProvider>
            <ConfirmProvider>
                <AppInner />
            </ConfirmProvider>
        </AppProvider>
    );
}

function AppInner() {
    const { state, dispatch, go, toast } = useApp();
    const recorder = useRecorder();
    const [saving, setSaving] = useState(false);
    const confirm = useConfirm();

    const arm = useCallback(async () => {
        if (!state.source) return;
        try {
            await recorder.arm({ source: state.source, settings: state.settings });
        } catch {
            toast("Could not open capture stream.", { kind: "error" });
            return;
        }
        if (state.settings.countdown > 0) {
            go("countdown");
        } else {
            recorder.start();
            go("recording");
        }
    }, [state.source, state.settings, recorder, go, toast]);

    const beginAfterCountdown = useCallback(() => {
        recorder.start();
        go("recording");
    }, [recorder, go]);

    const cancelCountdown = useCallback(() => {
        recorder.cancel();
        go("ready");
    }, [recorder, go]);

    const doStop = useCallback(async () => {
        const result = await recorder.stop();
        if (!result || result.blob.size === 0) {
            toast("Nothing was captured.", { kind: "error" });
            go("ready");
            return;
        }
        const audioLabel =
            [state.settings.mic && "mic", state.settings.system && "system"]
                .filter(Boolean)
                .join(" + ") || "no audio";
        const url = URL.createObjectURL(result.blob);
        const take: Take = {
            blob: result.blob,
            url,
            durationMs: result.durationMs,
            mime: result.mime,
            extension: result.extension,
            codec: result.codec,
            sourceName: state.source?.name ?? "Unknown",
            audioLabel,
            sizeBytes: result.blob.size,
        };
        dispatch({ type: "SET_TAKE", take });
        go("review");
    }, [recorder, state.settings, state.source, dispatch, go, toast]);

    const doDiscardRecording = useCallback(async () => {
        const ok = await confirm({
            title: "Discard this recording?",
            message:
                "The current take will be stopped and thrown away. You can't undo this.",
            confirmLabel: "Discard",
            cancelLabel: "Keep recording",
            destructive: true,
            icon: "trash",
        });
        if (!ok) return;
        recorder.cancel();
        go("ready");
        toast("Recording discarded.");
    }, [confirm, recorder, go, toast]);

    const doSave = useCallback(async () => {
        if (!state.take) return;
        setSaving(true);
        try {
            const buffer = await state.take.blob.arrayBuffer();
            const res = await window.yrec.saveRecording({
                buffer,
                extension: state.take.extension,
            });
            if (!res.canceled) {
                const savedPath = res.filePath;
                toast(`Saved to ${savedPath}`, {
                    kind: "success",
                    actionLabel: "Reveal",
                    action: () => window.yrec.revealInFolder(savedPath),
                });
                URL.revokeObjectURL(state.take.url);
                dispatch({ type: "SET_TAKE", take: null });
                go("ready");
            }
        } catch (e) {
            toast(
                `Save failed: ${e instanceof Error ? e.message : String(e)}`,
                { kind: "error" }
            );
        } finally {
            setSaving(false);
        }
    }, [state.take, dispatch, go, toast]);

    const doThrowAway = useCallback(async () => {
        const ok = await confirm({
            title: "Throw away this take?",
            message: "The recording will be deleted from memory. It hasn't been saved yet.",
            confirmLabel: "Throw away",
            cancelLabel: "Keep",
            destructive: true,
            icon: "trash",
        });
        if (!ok) return;
        if (state.take) URL.revokeObjectURL(state.take.url);
        dispatch({ type: "SET_TAKE", take: null });
        go("ready");
        toast("Take discarded.");
    }, [confirm, state.take, dispatch, go, toast]);

    const doAgain = useCallback(() => {
        if (state.take) URL.revokeObjectURL(state.take.url);
        dispatch({ type: "SET_TAKE", take: null });
        go("ready");
    }, [state.take, dispatch, go]);

    const reachable: Partial<Record<Exclude<Step, "countdown" | "paused">, boolean>> = {
        source: true,
        config: !!state.source,
        ready: !!state.source,
        recording: false,
        review: false,
    };

    const onJump = (target: Exclude<Step, "countdown" | "paused">) => {
        if (reachable[target]) go(target);
    };

    const inCapture =
        state.step === "recording" ||
        state.step === "countdown" ||
        state.step === "paused";

    return (
        <Layout
            step={state.step}
            onJump={onJump}
            reachable={reachable}
            hideStepper={inCapture || state.step === "review"}
        >
            {state.step === "source" && <SourceScreen />}
            {state.step === "config" && <ConfigScreen />}
            {state.step === "ready" && <ReadyScreen onArm={arm} />}
            {state.step === "countdown" && (
                <CountdownScreen
                    from={state.settings.countdown}
                    onDone={beginAfterCountdown}
                    onCancel={cancelCountdown}
                />
            )}
            {(state.step === "recording" || state.step === "paused") && (
                <RecordingScreen
                    phase={recorder.phase}
                    stream={recorder.stream}
                    startedAt={recorder.startedAt}
                    accumulatedMs={recorder.accumulatedMs}
                    onPause={recorder.pause}
                    onResume={recorder.resume}
                    onStop={doStop}
                    onDiscard={doDiscardRecording}
                />
            )}
            {state.step === "review" && (
                <ReviewScreen
                    onSave={doSave}
                    onDiscard={doThrowAway}
                    onAgain={doAgain}
                    saving={saving}
                />
            )}
            <ToastStack />
        </Layout>
    );
}
