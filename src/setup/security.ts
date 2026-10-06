import disableDevtool from "disable-devtool";

import { conf } from "@/setup/config";

const DEFAULT_REDIRECT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export function initializeSecurity(): void {
  if (typeof window === "undefined") return;

  // If DevTools is explicitly enabled via environment or config, do not activate security restrictions
  if (conf().ENABLE_DEVTOOLS) {
    return;
  }

  // Allow developer bypass if explicitly requested via query param or localStorage
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("debug_mode") === "true" ||
      localStorage.getItem("streamwatch_allow_debug") === "true"
    ) {
      return;
    }
  } catch (e) {
    // ignore in restricted environments
  }

  const redirectUrl =
    (window as any).__CONFIG__?.VITE_DEVTOOL_REDIRECT_URL ||
    import.meta.env.VITE_DEVTOOL_REDIRECT_URL ||
    DEFAULT_REDIRECT_URL;

  const triggerRedirect = () => {
    try {
      window.stop();
      if (document.documentElement) {
        document.documentElement.innerHTML = "";
      }
    } catch (e) {
      // ignore
    }
    window.location.replace(redirectUrl);
  };

  // Block context menu (Right Click -> Inspect)
  window.addEventListener(
    "contextmenu",
    (e) => {
      e.preventDefault();
      return false;
    },
    true,
  );

  // Block keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Option+I/J/C/U)
  window.addEventListener(
    "keydown",
    (e) => {
      const keyCode = e.keyCode || e.which;
      const key = (e.key || "").toLowerCase();

      // F12
      if (key === "f12" || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerRedirect();
        return false;
      }

      // Ctrl+Shift+I / J / C or Cmd+Option+I / J / C
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.shiftKey || e.altKey) &&
        (key === "i" ||
          key === "j" ||
          key === "c" ||
          keyCode === 73 ||
          keyCode === 74 ||
          keyCode === 67)
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerRedirect();
        return false;
      }

      // Ctrl+U (View Source) or Ctrl+S (Save)
      if (
        (e.ctrlKey || e.metaKey) &&
        (key === "u" || key === "s" || keyCode === 85 || keyCode === 83)
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerRedirect();
        return false;
      }
    },
    true,
  );

  // Initialize disable-devtool library
  try {
    disableDevtool({
      url: redirectUrl,
      ondevtoolopen() {
        triggerRedirect();
      },
      disableMenu: true,
      clearLog: true,
      interval: 100,
      detectors: "all",
    });
  } catch (err) {
    // If disable-devtool fails, our inline & fallback protections remain active
  }

  // Anti-debugging loop / timing detector
  setInterval(() => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    if (performance.now() - start > 100) {
      triggerRedirect();
    }
  }, 400);

  // Sabotage console output to prevent scrapers from logging or inspecting objects/network data
  try {
    const noop = () => {};
    const methods: Array<keyof Console> = [
      "log",
      "debug",
      "info",
      "warn",
      "error",
      "dir",
      "table",
      "trace",
    ];
    methods.forEach((method) => {
      try {
        (console as any)[method] = noop;
      } catch (e) {
        // ignore
      }
    });
  } catch (e) {
    // ignore
  }
}
