import { useEffect, useMemo, useRef } from "react";

import { usePlayerStore } from "@/stores/player/store";
import { useWatchPartyStore } from "@/stores/watchParty";

/**
 * Component that detects when the player exits or media changes
 * and resets the watch party state
 */
export function WatchPartyResetter() {
  const meta = usePlayerStore((s) => s.meta);
  const { disable } = useWatchPartyStore();

  // Store the current base media to track changes
  const previousBaseMediaRef = useRef<string | null>(null);

  // Memoize the base media ID (without episode details for shows)
  // This allows episode changes within the same show to keep the room active
  const baseMediaId = useMemo(() => {
    if (!meta) return null;

    // For shows, only track the show ID, not the episode
    // This allows episode navigation within the same show
    return `${meta.type}-${meta.tmdbId}`;
  }, [meta]);

  // Handle media changes (when switching to a different show/movie)
  useEffect(() => {
    // If base media has changed (different show/movie), reset watch party
    if (
      baseMediaId &&
      previousBaseMediaRef.current !== null &&
      baseMediaId !== previousBaseMediaRef.current
    ) {
      // eslint-disable-next-line no-console
      console.log("Base media changed, disabling watch party:", {
        previous: previousBaseMediaRef.current,
        current: baseMediaId,
      });
      disable();
    }

    // Update the ref with current base media
    previousBaseMediaRef.current = baseMediaId;
  }, [baseMediaId, disable]);

  // Handle component unmount (player exited) - separate effect
  useEffect(() => {
    return () => {
      // Only disable when component actually unmounts
      // eslint-disable-next-line no-console
      console.log("WatchPartyResetter unmounting, disabling watch party");
      disable();
    };
    // Empty dependency array means this cleanup only runs on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // This component doesn't render anything
}
