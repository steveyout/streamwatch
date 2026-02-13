import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { SegmentData } from "@/components/player/hooks/useSkipTime";
import { TIDBSubmissionForm } from "@/components/player/TIDBSubmissionForm";
import { Transition } from "@/components/utils/Transition";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

interface ThumbsFeedbackProps {
  controlsShowing: boolean;
  feedbackData?: {
    segment: SegmentData;
    skipTime: number;
  } | null;
  onAction?: () => void;
}

export function ThumbsFeedback({
  controlsShowing,
  feedbackData,
  onAction,
}: ThumbsFeedbackProps) {
  const { t } = useTranslation();
  const time = usePlayerStore((s) => s.progress.time);
  const tidbKey = usePreferencesStore((s) => s.tidbKey);

  // State for feedback
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Handle feedback data changes
  useEffect(() => {
    if (feedbackData) {
      // Clear any existing timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }

      // Hide feedback after 5 seconds
      feedbackTimeoutRef.current = setTimeout(() => {
        onAction?.();
      }, 5000);
    }
  }, [feedbackData, onAction]);

  const handleThumbsUp = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    onAction?.();
  }, [onAction]);

  const handleThumbsDown = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setShowSubmissionModal(true);
  }, []);

  const setCurrentOverlay = useOverlayStack((s) => s.setCurrentOverlay);

  const handleSubmissionSuccess = useCallback(() => {
    setShowSubmissionModal(false);
    setCurrentOverlay("tidb-submission-success");
    onAction?.();
  }, [onAction, setCurrentOverlay]);

  const handleSubmissionCancel = useCallback(() => {
    setShowSubmissionModal(false);
    onAction?.();
  }, [onAction]);

  // Don't show thumbs feedback if TIDB API key is not set
  if (!tidbKey || tidbKey.trim() === "") {
    return null;
  }

  // Only show feedback if we're within the 5-second window after skip
  const shouldShowFeedback = !!(
    feedbackData &&
    time >= feedbackData.skipTime + 0.1 &&
    time <= feedbackData.skipTime + 5
  );

  if (!shouldShowFeedback && !showSubmissionModal) return null;

  let bottom = "bottom-[calc(6rem+env(safe-area-inset-bottom))]";
  if (!controlsShowing) {
    bottom = "bottom-[calc(3rem+env(safe-area-inset-bottom))]";
  }

  return (
    <>
      <div className="absolute right-[calc(3rem+env(safe-area-inset-right))] bottom-0 pointer-events-none">
        <Transition
          animation="fade"
          show={shouldShowFeedback}
          className="absolute right-0"
        >
          <div
            className={classNames(
              "absolute bottom-0 right-0 transition-[bottom] duration-200 flex flex-col items-end space-y-2",
              bottom,
            )}
          >
            <div className="text-sm font-medium text-white whitespace-nowrap">
              {t("player.skipTime.feedback.title")}
            </div>
            <div className="flex items-center space-x-3 pointer-events-auto">
              <button
                type="button"
                onClick={handleThumbsUp}
                className={classNames(
                  "h-10 w-10 rounded-full flex items-center justify-center pointer-events-auto",
                  "bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText",
                  "scale-95 hover:scale-100 transition-all duration-200",
                )}
                aria-label="Thumbs up"
              >
                <Icon className="text-xl" icon={Icons.THUMBS_UP} />
              </button>
              <button
                type="button"
                onClick={handleThumbsDown}
                className={classNames(
                  "h-10 w-10 rounded-full flex items-center justify-center pointer-events-auto",
                  "bg-buttons-primary hover:bg-buttons-primaryHover text-buttons-primaryText",
                  "scale-95 hover:scale-100 transition-all duration-200",
                )}
                aria-label="Thumbs down"
              >
                <Icon className="text-xl" icon={Icons.THUMBS_DOWN} />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      {showSubmissionModal && feedbackData && (
        <TIDBSubmissionForm
          segment={feedbackData.segment}
          onSuccess={handleSubmissionSuccess}
          onCancel={handleSubmissionCancel}
        />
      )}
    </>
  );
}
