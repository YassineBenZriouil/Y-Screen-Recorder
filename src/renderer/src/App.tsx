import { useCallback, useEffect, useState } from "react";
import { AppProvider, useApp } from "./state";
import { Layout } from "./components/Layout";
import { ToastStack } from "./components/Toast";
import { ConfirmProvider, useConfirm } from "./components/ConfirmDialog";
import { HelpModal } from "./components/HelpModal";
import { HomeScreen } from "./screens/HomeScreen";
import { SourceScreen } from "./screens/SourceScreen";
import { ConfigScreen } from "./screens/ConfigScreen";
import { ReadyScreen } from "./screens/ReadyScreen";
import { CountdownScreen } from "./screens/CountdownScreen";
import { RecordingScreen } from "./screens/RecordingScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { useRecorder } from "./hooks/useRecorder";
import { useSettings } from "./hooks/useSettings";
import { useRecents } from "./hooks/useRecents";
import { useGlobalShortcut } from "./hooks/useGlobalShortcut";
import { useHotkeys } from "./hooks/useHotkeys";
import { sounds } from "./utils/sounds";
import type { Step, Take, ShortcutKey } from "./types";

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
    const { settings } = useSettings();
    const { refresh: refreshRecents } = useRecents();
    const confirm = useConfirm();

    const [saving, setSaving] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [checkedMediaRecorder, setCheckedMediaRecorder] = useState(false);

    // ---------- MediaRecorder availability guard ----------
    useEffect(() => {
        if (checkedMediaRecorder) return;
        if (typeof MediaRecorder === "undefined") {
            toast("MediaRecorder API not available in this environment.", { kind: "error" });
        } else if (!MediaRecorder.isTypeSupported("video/webm")) {
            toast("Your Electron build does not support WebM recording.", { kind: "error" });
        }
        setCheckedMediaRecorder(true);
    }, [checkedMediaRecorder, toast]);

    // ---------- Route past onboarding on first load ----------
    useEffect(() => {
        if (!settings) return;
        if (settings.onboarding === "pending" && state.step !== "onboarding") {
            go("onboarding");
        } else if (settings.onboarding === "seen" && state.step === "onboarding") {
            go("home");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings?.onboarding]);

    // ---------- Track drop recovery ----------
    useEffect(() => {
        const off = recorder.onTrackDropped(() => {
            toast("Capture source disappeared. Finalizing what we have…", { kind: "error" });
            sounds.error();
            void doStop();
        });
        return off;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recorder]);

    // ---------- Notify main of recording phase (tray + hide window) ----------
    useEffect(() => {
        const p =
            recorder.phase === "recording"
                ? "recording"
                : recorder.phase === "paused"
                  ? "paused"
                  : "idle";
        void window.yrec.setPhase(p);
    }, [recorder.phase]);

    // ---------- Arm + start ----------
    const arm = useCallback(async () => {
        if (!state.source) return;
        const rt = state.runtime;
        try {
            await recorder.arm({
                source: state.source,
                audio: { mic: rt.mic, system: rt.system },
                codec: rt.codec,
                quality: rt.quality,
                bitrate: rt.bitrate,
                overlays: {
                    cursorHighlight: rt.cursorHighlight,
                    keystrokeOverlay: rt.keystrokeOverlay,
                    webcam: rt.webcam,
                    webcamCorner: rt.webcamCorner,
                },
            });
        } catch (e) {
            toast(
                `Could not open capture: ${e instanceof Error ? e.message : String(e)}`,
                { kind: "error" }
            );
            sounds.error();
            return;
        }
        if (rt.countdown > 0) {
            go("countdown");
        } else {
            recorder.start();
            sounds.recordStart();
            go("recording");
        }
    }, [state.source, state.runtime, recorder, go, toast]);

    const beginAfterCountdown = useCallback(() => {
        recorder.start();
        sounds.recordStart();
        go("recording");
    }, [recorder, go]);

    const cancelCountdown = useCallback(() => {
        recorder.cancel();
        go("ready");
    }, [recorder, go]);

    // ---------- Stop ----------
    const doStop = useCallback(async () => {
        const result = await recorder.stop();
        sounds.recordStop();
        if (!result || result.blob.size === 0) {
            toast("Nothing was captured.", { kind: "error" });
            go("ready");
            return;
        }
        const audioLabel =
            [state.runtime.mic && "mic", state.runtime.system && "system"]
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
            thumbnail: result.thumbnail,
        };
        dispatch({ type: "SET_TAKE", take });

        // Auto-save flow
        if (settings?.autoSave) {
            await autoSaveTake(take);
        } else {
            go("review");
        }
    }, [recorder, state.runtime, state.source, dispatch, go, toast, settings?.autoSave]);

    // ---------- Auto-save helper ----------
    const autoSaveTake = useCallback(async (take: Take) => {
        setSaving(true);
        try {
            const buffer = await take.blob.arrayBuffer();
            const res = await window.yrec.saveRecording({
                buffer,
                extension: take.extension,
                durationMs: take.durationMs,
                sourceName: take.sourceName,
                codec: take.codec,
                thumbnail: take.thumbnail,
                autoSave: true,
            });
            if (!res.canceled) {
                toast(`Auto-saved: ${res.filePath}`, {
                    kind: "success",
                    actionLabel: "Reveal",
                    action: () => window.yrec.revealInFolder(res.filePath),
                });
                URL.revokeObjectURL(take.url);
                dispatch({ type: "SET_TAKE", take: null });
                await refreshRecents();
                go("home");
            }
        } catch (e) {
            toast(`Save failed: ${e instanceof Error ? e.message : String(e)}`, {
                kind: "error",
            });
            go("review"); // fall back to review so user can retry manually
        } finally {
            setSaving(false);
        }
    }, [dispatch, go, refreshRecents, toast]);

    // ---------- Discard mid-recording ----------
    const doDiscardRecording = useCallback(async () => {
        const ok = await confirm({
            title: "Discard this recording?",
            message: "The current take will be stopped and thrown away. You can't undo this.",
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

    // ---------- Save from review ----------
    const doSave = useCallback(async () => {
        if (!state.take) return;
        setSaving(true);
        try {
            const buffer = await state.take.blob.arrayBuffer();
            const res = await window.yrec.saveRecording({
                buffer,
                extension: state.take.extension,
                durationMs: state.take.durationMs,
                sourceName: state.take.sourceName,
                codec: state.take.codec,
                thumbnail: state.take.thumbnail,
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
                await refreshRecents();
                go("home");
            }
        } catch (e) {
            toast(`Save failed: ${e instanceof Error ? e.message : String(e)}`, {
                kind: "error",
            });
        } finally {
            setSaving(false);
        }
    }, [state.take, dispatch, go, refreshRecents, toast]);

    // ---------- Copy blob to Downloads (workaround for "copy to clipboard" of binary) ----------
    const doCopyBlob = useCallback(async () => {
        if (!state.take) return;
        try {
            const a = document.createElement("a");
            a.href = state.take.url;
            a.download = `y-rec-${Date.now()}.${state.take.extension}`;
            a.click();
            toast("Download started.");
        } catch (e) {
            toast(`Failed: ${e instanceof Error ? e.message : String(e)}`, { kind: "error" });
        }
    }, [state.take, toast]);

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
        go("home");
        toast("Take discarded.");
    }, [confirm, state.take, dispatch, go, toast]);

    const doAgain = useCallback(() => {
        if (state.take) URL.revokeObjectURL(state.take.url);
        dispatch({ type: "SET_TAKE", take: null });
        go("ready");
    }, [state.take, dispatch, go]);

    // ---------- Global shortcuts ----------
    const handleShortcut = useCallback(
        (key: ShortcutKey) => {
            void window.yrec.showWindow();
            const inCapture =
                state.step === "recording" ||
                state.step === "paused" ||
                state.step === "countdown";
            if (key === "record") {
                if (state.step === "home" || state.step === "source" || state.step === "config" || state.step === "ready") {
                    void arm();
                } else if (inCapture) {
                    void doStop();
                }
            } else if (key === "stop") {
                if (inCapture) void doStop();
            } else if (key === "pause") {
                if (recorder.phase === "recording") recorder.pause();
                else if (recorder.phase === "paused") recorder.resume();
            } else if (key === "discard") {
                if (inCapture) void doDiscardRecording();
            }
        },
        [state.step, arm, doStop, doDiscardRecording, recorder]
    );

    useGlobalShortcut(handleShortcut);

    // ---------- In-app hotkey for help ----------
    useHotkeys({
        "?": () => setHelpOpen(true),
    });

    // ---------- Stepper reachability ----------
    const reachable: Partial<Record<Exclude<Step, "countdown" | "paused" | "onboarding">, boolean>> = {
        home: true,
        source: true,
        config: !!state.source,
        ready: !!state.source,
        recording: false,
        review: !!state.take,
        settings: false,
    };

    const onJump = (target: Exclude<Step, "countdown" | "paused" | "onboarding">) => {
        if (reachable[target]) go(target);
    };

    const inCapture =
        state.step === "recording" ||
        state.step === "countdown" ||
        state.step === "paused";

    if (state.step === "onboarding") {
        return (
            <>
                <Layout step={state.step} hideChrome>
                    <OnboardingScreen onDone={() => go("home")} />
                </Layout>
                <ToastStack />
            </>
        );
    }

    return (
        <>
            <Layout
                step={state.step}
                onJump={onJump}
                reachable={reachable}
                onSettings={() => go("settings")}
                onHelp={() => setHelpOpen(true)}
                onHome={() => go("home")}
                hideStepper={inCapture || state.step === "settings"}
            >
                {state.step === "home" && <HomeScreen />}
                {state.step === "settings" && <SettingsScreen />}
                {state.step === "source" && <SourceScreen />}
                {state.step === "config" && <ConfigScreen />}
                {state.step === "ready" && <ReadyScreen onArm={arm} />}
                {state.step === "countdown" && (
                    <CountdownScreen
                        from={state.runtime.countdown}
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
                        onCopyBlob={doCopyBlob}
                        saving={saving}
                        autoSave={!!settings?.autoSave}
                    />
                )}
                <ToastStack />
                <HelpModal
                    open={helpOpen}
                    onClose={() => setHelpOpen(false)}
                    globalShortcuts={settings?.shortcuts}
                />
            </Layout>
        </>
    );
}
