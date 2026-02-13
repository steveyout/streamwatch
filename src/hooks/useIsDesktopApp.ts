// Desktop app is detected via a global set by the Electron preload script.
declare global {
  interface Window {
    __PSTREAM_DESKTOP__?: boolean;
  }
}

export function useIsDesktopApp(): boolean {
  return Boolean(window.__PSTREAM_DESKTOP__);
}
