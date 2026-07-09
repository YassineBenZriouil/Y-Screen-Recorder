import type { YrecApi } from "./index";

declare global {
    interface Window {
        yrec: YrecApi;
    }
}

export {};
