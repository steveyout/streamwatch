import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { Flare } from "@/components/utils/Flare";
import { Transition } from "@/components/utils/Transition";
import { useOverlayStack } from "@/stores/interface/overlayStack";

export function TIDBSubmissionSuccessPopout() {
  const { t } = useTranslation();
  const currentOverlay = useOverlayStack((s) => s.currentOverlay);
  const setCurrentOverlay = useOverlayStack((s) => s.setCurrentOverlay);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() => {
    if (currentOverlay === "tidb-submission-success") {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Auto-dismiss after 3 seconds (same as volume popout)
      timeoutRef.current = setTimeout(() => {
        setCurrentOverlay(null);
      }, 3e3);
    }

    // Cleanup timeout on unmount or when overlay changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentOverlay, setCurrentOverlay]);

  return (
    <Transition
      animation="slide-down"
      show={currentOverlay === "tidb-submission-success"}
      className="absolute inset-x-0 top-4 flex justify-center pointer-events-none"
    >
      <Flare.Base className="hover:flare-enabled pointer-events-auto bg-video-context-background pl-4 pr-6 py-3 group w-80 h-full rounded-lg transition-colors text-video-context-type-main">
        <Flare.Light
          enabled
          flareSize={200}
          cssColorVar="--colors-video-context-light"
          backgroundClass="bg-video-context-background duration-100"
          className="rounded-lg"
        />
        <Flare.Child className="flex items-center gap-3 pointer-events-auto relative transition-transform">
          <Icon className="text-green-500" icon={Icons.CHECKMARK} />
          <span className="font-medium">
            {t("player.skipTime.feedback.modal.success.title")}
          </span>
        </Flare.Child>
      </Flare.Base>
    </Transition>
  );
}
