import { systemPreferences, shell } from "electron";

export type MediaPermission = "screen" | "microphone" | "camera";
export type PermissionStatus =
  | "not-determined"
  | "granted"
  | "denied"
  | "restricted"
  | "unknown";

export function getStatus(kind: MediaPermission): PermissionStatus {
  if (process.platform !== "darwin") return "granted";
  try {
    if (kind === "screen") {
      return systemPreferences.getMediaAccessStatus(
        "screen",
      ) as PermissionStatus;
    }
    return systemPreferences.getMediaAccessStatus(kind) as PermissionStatus;
  } catch {
    return "unknown";
  }
}

export async function askIfNeeded(kind: MediaPermission): Promise<boolean> {
  if (process.platform !== "darwin") return true;
  if (kind === "screen") {
    // Screen recording requires the user to enable manually - Electron cannot request it.
    return getStatus("screen") === "granted";
  }
  try {
    return await systemPreferences.askForMediaAccess(kind);
  } catch {
    return false;
  }
}

export async function openSystemSettings(pane: MediaPermission): Promise<void> {
  if (process.platform !== "darwin") return;
  const url =
    pane === "screen"
      ? "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
      : pane === "microphone"
        ? "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        : "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera";
  await shell.openExternal(url);
}
