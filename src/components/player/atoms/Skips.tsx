import { useCallback } from "react";

import { Icons } from "@/components/Icon";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export function SkipForward(props: {
  iconSizeClass?: string;
  inControl: boolean;
}) {
  const display = usePlayerStore((s) => s.display);
  const time = usePlayerStore((s) => s.progress.time);
  const enableDoubleClickToSeek = usePreferencesStore(
    (s) => s.enableDoubleClickToSeek,
  );
  const commit = useCallback(() => {
    display?.setTime(time + 10);
  }, [display, time]);
  if (!props.inControl || enableDoubleClickToSeek) return null;
  return (
    <VideoPlayerButton
      iconSizeClass={props.iconSizeClass}
      onClick={commit}
      icon={Icons.SKIP_FORWARD}
    />
  );
}

export function SkipBackward(props: {
  iconSizeClass?: string;
  inControl: boolean;
}) {
  const display = usePlayerStore((s) => s.display);
  const time = usePlayerStore((s) => s.progress.time);
  const enableDoubleClickToSeek = usePreferencesStore(
    (s) => s.enableDoubleClickToSeek,
  );
  const commit = useCallback(() => {
    display?.setTime(time - 10);
  }, [display, time]);
  if (!props.inControl || enableDoubleClickToSeek) return null;
  return (
    <VideoPlayerButton
      iconSizeClass={props.iconSizeClass}
      onClick={commit}
      icon={Icons.SKIP_BACKWARD}
    />
  );
}
