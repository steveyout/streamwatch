/// <reference types="chromecast-caf-sender" />

import { useEffect, useRef, useState } from "react";

import { VideoPlayerButton } from "@/components/player/internals/Button";
import { usePlayerStore } from "@/stores/player/store";

// Allow the custom element in TSX
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "google-cast-launcher": any;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export interface ChromecastProps {
  className?: string;
}

export function Chromecast({ className }: ChromecastProps) {
  const [castHidden, setCastHidden] = useState(false);
  const isCasting = usePlayerStore((s) => s.interface.isCasting);
  const launcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = window as unknown as { cast?: typeof cast };
    const castFramework = w.cast?.framework;

    // If cast framework is not available (e.g., on Safari), hide the button
    if (!castFramework) {
      setCastHidden(true);
      return;
    }

    const context = castFramework.CastContext.getInstance();
    const updateVisibility = () => {
      const state = context.getCastState();
      // Hide only if we know for sure there are no devices available
      // Show the button for other states (NOT_CONNECTED, CONNECTING, CONNECTED)
      setCastHidden(state === castFramework.CastState.NO_DEVICES_AVAILABLE);
    };

    const handler = () => updateVisibility();
    context.addEventListener(
      castFramework.CastContextEventType.CAST_STATE_CHANGED,
      handler,
    );
    updateVisibility();

    return () => {
      context.removeEventListener(
        castFramework.CastContextEventType.CAST_STATE_CHANGED,
        handler,
      );
    };
  }, []);

  useEffect(() => {
    if (!launcherRef.current || launcherRef.current.children.length > 0) return;

    const launcher = document.createElement("google-cast-launcher");
    launcherRef.current.appendChild(launcher);
  }, []);

  return (
    <VideoPlayerButton
      className={[
        className ?? "",
        "google-cast-button",
        "cast-button-container",
        isCasting ? "casting" : "",
        castHidden ? "hidden" : "",
      ].join(" ")}
    >
      <div ref={launcherRef} />
    </VideoPlayerButton>
  );
}
