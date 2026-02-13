import { Icons } from "@/components/Icon";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import { usePlayerStore } from "@/stores/player/store";
import { isSafari } from "@/utils/detectFeatures";

export function Airplay() {
  const canAirplay = usePlayerStore((s) => s.interface.canAirplay);
  const display = usePlayerStore((s) => s.display);

  // Show Airplay button on Safari browsers (which support AirPlay natively)
  // or when the webkit event has confirmed availability
  if (!canAirplay && !isSafari) return null;

  return (
    <VideoPlayerButton
      onClick={() => display?.startAirplay()}
      icon={Icons.AIRPLAY}
    />
  );
}
