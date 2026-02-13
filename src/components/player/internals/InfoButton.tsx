import { useEffect } from "react";

import { Icons } from "@/components/Icon";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { VideoPlayerButton } from "./Button";

export function InfoButton() {
  const meta = usePlayerStore((s) => s.meta);
  const { showModal, isModalVisible } = useOverlayStack();
  const setHasOpenOverlay = usePlayerStore((s) => s.setHasOpenOverlay);

  useEffect(() => {
    setHasOpenOverlay(isModalVisible("player-details"));
  }, [setHasOpenOverlay, isModalVisible]);

  const handleClick = async () => {
    if (!meta?.tmdbId) return;

    showModal("player-details", {
      id: Number(meta.tmdbId),
      type: meta.type === "movie" ? "movie" : "show",
    });
  };

  const enableLowPerformanceMode = usePreferencesStore(
    (state) => state.enableLowPerformanceMode,
  );

  if (enableLowPerformanceMode) {
    return null;
  }

  // Don't render button if meta, tmdbId, or type is missing/invalid
  if (
    !meta?.tmdbId ||
    !meta.type ||
    (meta.type !== "movie" && meta.type !== "show")
  ) {
    return null;
  }

  return (
    <VideoPlayerButton
      icon={Icons.CIRCLE_QUESTION}
      iconSizeClass="text-base"
      className="p-2 !-mr-2 relative z-10"
      onClick={handleClick}
    />
  );
}
