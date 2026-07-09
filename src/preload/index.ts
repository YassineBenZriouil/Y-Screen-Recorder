import { contextBridge, ipcRenderer } from "electron";

export type SourceKind = "screen" | "window";

export interface SourceInfo {
    id: string;
    name: string;
    kind: SourceKind;
    thumbnail: string;
    appIcon: string | null;
}

export type SaveResult =
    | { canceled: true }
    | { canceled: false; filePath: string };

const api = {
    listSources: (): Promise<SourceInfo[]> => ipcRenderer.invoke("sources:list"),
    saveRecording: (payload: {
        buffer: ArrayBuffer;
        extension: string;
        suggestedName?: string;
    }): Promise<SaveResult> => ipcRenderer.invoke("recording:save", payload),
    revealInFolder: (filePath: string): Promise<void> =>
        ipcRenderer.invoke("shell:reveal", filePath),
    openExternal: (url: string): Promise<void> =>
        ipcRenderer.invoke("shell:openExternal", url),
};

contextBridge.exposeInMainWorld("yrec", api);

export type YrecApi = typeof api;
