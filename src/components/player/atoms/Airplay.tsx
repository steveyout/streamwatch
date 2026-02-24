import { Icons } from "@/components/Icon";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import { usePlayerStore } from "@/stores/player/store";
import { isSafari } from "@/utils/detectFeatures";

export function Airplay() {
  const canAirplay = usePlayerStore((s) => s.interface.canAirplay);
  const display = usePlayerStore((s) => s.display);
  const source = usePlayerStore((s) => s.source);

  // Check if source is supported for casting
  // HLS is always supported (proxied if needed)
  // MP4/File is only supported if it doesn't need headers (no proxy available)
  const isCastable = (() => {
    if (!source) return false;
    if (source.type === "hls") return true;
    if (source.type === "file") {
      const hasHeaders =
        Object.keys(source.headers || {}).length > 0 ||
        Object.keys(source.preferredHeaders || {}).length > 0;
      return !hasHeaders;
    }
    return true; // Unknown types assumed castable
  })();

  // Show Airplay button on Safari browsers (which support AirPlay natively)
  // or when the webkit event has confirmed availability
  if ((!canAirplay && !isSafari) || !isCastable) return null;

  return (
    <VideoPlayerButton
      onClick={() => display?.startAirplay()}
      icon={Icons.AIRPLAY}
    />
  );
}
