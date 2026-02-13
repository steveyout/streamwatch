import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { useSkipTime } from "@/components/player/hooks/useSkipTime";
import { Menu } from "@/components/player/internals/ContextMenu";
import { TIDBSubmissionForm } from "@/components/player/TIDBSubmissionForm";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { formatSeconds } from "@/utils/formatSeconds";

export function SkipSegmentsView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const display = usePlayerStore((s) => s.display);
  const segments = useSkipTime();
  const tidbKey = usePreferencesStore((s) => s.tidbKey);
  const { setCurrentOverlay } = useOverlayStack();
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  // Memoize the segment object to prevent re-renders from clearing form inputs
  const segmentData = useMemo(
    () => ({
      type: "intro" as const,
      start_ms: null,
      end_ms: null,
      confidence: null,
      submission_count: 0,
    }),
    [],
  );

  const handleSeek = (seconds: number) => {
    display?.setTime(seconds);
  };

  const getSegmentTypeLabel = (
    type: "intro" | "recap" | "credits" | "preview",
  ) => {
    switch (type) {
      case "intro":
        return t("player.segment.intro");
      case "recap":
        return t("player.segment.recap");
      case "credits":
        return t("player.segment.credits");
      case "preview":
        return t("player.segment.preview");
      default:
        return type;
    }
  };

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {t("player.skipTime.skipSegments")}
      </Menu.BackLink>
      <Menu.Section>
        <div className="flex gap-2 mb-4">
          {tidbKey ? (
            <Button
              theme="purple"
              className="flex-1"
              onClick={() => setShowSubmissionForm(true)}
            >
              {t("player.skipTime.submitSegment")}
            </Button>
          ) : (
            <div className="flex-1 text-center text-sm text-type-secondary p-3 bg-video-context-light bg-opacity-10 rounded-lg">
              {t("player.skipTime.connectApiKeyMessage")}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {segments.length === 0 ? (
            <div className="text-center py-4 text-type-secondary">
              {t("player.skipTime.noSegments")}
            </div>
          ) : (
            segments.map((segment) => {
              // Handle start time (null means 0/start of video)
              const startTime = (segment.start_ms ?? 0) / 1000;
              // Handle end time (null means end of video)
              const endTime = segment.end_ms ? segment.end_ms / 1000 : null;

              return (
                <button
                  key={`${segment.type}-${segment.submission_count}-${segment.start_ms || "null"}`}
                  type="button"
                  onClick={() => handleSeek(startTime)}
                  className="w-full text-left p-3 rounded-xl bg-video-context-light bg-opacity-10 hover:bg-opacity-20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-video-context-type-main font-medium">
                      {getSegmentTypeLabel(segment.type)}
                    </span>
                    <span className="text-video-context-type-secondary text-sm">
                      {segment.start_ms === null
                        ? "0:00"
                        : formatSeconds(startTime)}{" "}
                      -{" "}
                      {endTime === null
                        ? t("player.skipTime.endOfVideo")
                        : formatSeconds(endTime)}
                    </span>
                  </div>
                  <div className="text-xs text-type-secondary mt-1">
                    {segment.submission_count} submissions
                    {segment.confidence !== null && (
                      <span className="ml-2">
                        ({Math.round(segment.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Menu.Section>

      {showSubmissionForm && tidbKey && (
        <TIDBSubmissionForm
          segment={segmentData}
          onSuccess={() => {
            setShowSubmissionForm(false);
            setCurrentOverlay("tidb-submission-success");
            // Optionally refresh segments here
          }}
          onCancel={() => setShowSubmissionForm(false)}
        />
      )}
    </>
  );
}
