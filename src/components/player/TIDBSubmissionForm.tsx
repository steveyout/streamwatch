import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Modal, useModal } from "@/components/overlays/Modal";
import { SegmentData } from "@/components/player/hooks/useSkipTime";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { Heading3, Paragraph } from "@/components/utils/Text";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { submitIntro } from "@/utils/tidb";

import { IconPatch } from "../buttons/IconPatch";
import { Flare } from "../utils/Flare";

type SegmentType = "intro" | "recap" | "credits" | "preview";

// Helper function to parse time format (hh:mm:ss, mm:ss, or seconds)
// Returns null if empty string, NaN if invalid, or number if valid
function parseTimeToSeconds(timeStr: string): number | null {
  if (!timeStr.trim()) return null;

  // Check if it's in hh:mm:ss format
  const hhmmssMatch = timeStr.match(/^(\d{1,2}):(0?[0-5]\d):(0?[0-5]\d)$/);
  if (hhmmssMatch) {
    const hours = parseInt(hhmmssMatch[1], 10);
    const minutes = parseInt(hhmmssMatch[2], 10);
    const seconds = parseInt(hhmmssMatch[3], 10);

    if (hours > 99 || minutes > 59 || seconds > 59) {
      return NaN;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  // Check if it's in mm:ss format
  const mmssMatch = timeStr.match(/^(\d{1,3}):(0?[0-5]\d)$/);
  if (mmssMatch) {
    const minutes = parseInt(mmssMatch[1], 10);
    const seconds = parseInt(mmssMatch[2], 10);

    if (minutes > 999 || seconds > 59) {
      return NaN;
    }

    return minutes * 60 + seconds;
  }

  if (timeStr.includes(":")) {
    return NaN;
  }
  const parsed = parseFloat(timeStr);
  if (
    Number.isNaN(parsed) ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 21600000
  ) {
    return NaN;
  }

  return parsed;
}

interface TIDBSubmissionFormProps {
  segment: SegmentData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TIDBSubmissionForm({
  segment,
  onSuccess,
  onCancel,
}: TIDBSubmissionFormProps) {
  const { t } = useTranslation();
  const meta = usePlayerStore((s) => s.meta);
  const tidbKey = usePreferencesStore((s) => s.tidbKey);
  const submissionModal = useModal("tidb-submission");
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    segment: SegmentType;
    start: string;
    end: string;
  }>({
    segment: segment.type as SegmentType,
    start: "",
    end: "",
  });

  // Pre-fill the form with current segment data
  useEffect(() => {
    if (segment) {
      setFormData({
        segment: segment.type as SegmentType,
        start: segment.start_ms ? (segment.start_ms / 1000).toString() : "",
        end: segment.end_ms ? (segment.end_ms / 1000).toString() : "",
      });
    }
  }, [segment]);

  // Show modal when component mounts
  useEffect(() => {
    submissionModal.show();
  }, [submissionModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.segment) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.segment"));
      return;
    }

    if (!tidbKey) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.tidbKey"));
      return;
    }
    if (!meta) {
      // eslint-disable-next-line no-alert
      alert(t("player.skipTime.feedback.modal.error.mediaInfo"));
      return;
    }
    setIsSubmitting(true);
    try {
      const startSeconds = parseTimeToSeconds(formData.start);
      const endSeconds = parseTimeToSeconds(formData.end);

      // Validate required fields based on segment type
      if (formData.segment === "intro" || formData.segment === "recap") {
        if (endSeconds === null || Number.isNaN(endSeconds)) {
          // eslint-disable-next-line no-alert
          alert(t("player.skipTime.feedback.modal.error.endTime"));
          setIsSubmitting(false);
          return;
        }
      } else if (
        formData.segment === "credits" ||
        formData.segment === "preview"
      ) {
        if (startSeconds === null || Number.isNaN(startSeconds)) {
          // eslint-disable-next-line no-alert
          alert(t("player.skipTime.feedback.modal.error.startTime"));
          setIsSubmitting(false);
          return;
        }
      }

      const submissionData: {
        tmdb_id: number;
        type: "movie" | "tv";
        segment: SegmentType;
        season?: number;
        episode?: number;
        start_sec?: number | null;
        end_sec?: number | null;
      } = {
        tmdb_id: parseInt(meta.tmdbId.toString(), 10),
        type: meta.type === "show" ? "tv" : "movie",
        segment: formData.segment,
      };

      if (meta.type === "show" && meta.season && meta.episode) {
        submissionData.season = meta.season.number;
        submissionData.episode = meta.episode.number;
      }

      if (formData.segment === "intro" || formData.segment === "recap") {
        submissionData.start_sec = startSeconds !== null ? startSeconds : null;
        submissionData.end_sec = endSeconds!;
      } else if (
        formData.segment === "credits" ||
        formData.segment === "preview"
      ) {
        submissionData.start_sec = startSeconds!;
        submissionData.end_sec = endSeconds !== null ? endSeconds : null;
      }

      await submitIntro(submissionData, tidbKey);

      submissionModal.hide();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error submitting:", error);
      // eslint-disable-next-line no-alert
      alert(
        `${t("player.skipTime.feedback.modal.error.submission")}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    submissionModal.hide();
    if (onCancel) onCancel();
  };

  return (
    <Modal id={submissionModal.id}>
      <Helmet>
        <html data-no-scroll />
      </Helmet>
      <div className="flex absolute inset-0 items-center justify-center pt-safe">
        <Flare.Base
          className={classNames(
            "group -m-[0.705em] rounded-3xl bg-background-main",
            "max-w-[1200px] max-h-[650px]",
            "bg-mediaCard-hoverBackground/60 backdrop-filter backdrop-blur-lg shadow-lg overflow-hidden",
            "h-[97%] w-[95%]",
            "relative",
          )}
        >
          <div className="transition-transform duration-300 h-full relative">
            <Flare.Light
              flareSize={300}
              cssColorVar="--colors-mediaCard-hoverAccent"
              backgroundClass="bg-modal-background duration-100"
              className="rounded-3xl bg-background-main group-hover:opacity-100 transition-opacity duration-300"
            />
            <div className="absolute right-4 top-4 z-50 pointer-events-auto">
              <button
                type="button"
                className="text-s font-semibold text-type-secondary hover:text-white transition-transform hover:scale-95 select-none"
                onClick={handleClose}
              >
                <IconPatch icon={Icons.X} />
              </button>
            </div>
            <Flare.Child className="pointer-events-auto relative h-full overflow-y-auto scrollbar-none select-text p-6 pt-20 sm:pt-6">
              <div className="select-text">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon={Icons.CLOCK} className="h-5 w-5 text-white" />
                  <Heading3 className="!mt-0 !mb-0">
                    {t("player.skipTime.feedback.modal.title")}
                  </Heading3>
                </div>
                <Paragraph className="!mt-2 !mb-6 text-gray-300">
                  {t("player.skipTime.feedback.modal.description")}
                </Paragraph>

                <div className="space-y-6">
                  {/* Section: Segment type and timestamps (example-style card) */}
                  <div className="space-y-4 rounded-xl border border-background-secondary bg-authentication-inputBg/50 p-6">
                    <h2 className="text-lg font-semibold text-white">
                      {t("player.skipTime.feedback.modal.segmentType")}
                      <span className="text-red-500 ml-1">*</span>
                    </h2>

                    <div className="flex flex-wrap gap-2">
                      {(["intro", "recap", "credits", "preview"] as const).map(
                        (seg) => (
                          <Button
                            key={seg}
                            theme="secondary"
                            className={
                              formData.segment === seg
                                ? "!border-2 !border-buttons-purple !bg-buttons-purple/20 focus:outline-none focus-visible:outline-none"
                                : "!border-2 !border-background-secondary hover:!bg-authentication-inputBg focus:outline-none focus-visible:outline-none"
                            }
                            onClick={() =>
                              setFormData({ ...formData, segment: seg })
                            }
                          >
                            {seg === "intro"
                              ? t("player.skipTime.feedback.modal.types.intro")
                              : seg === "recap"
                                ? t(
                                    "player.skipTime.feedback.modal.types.recap",
                                  )
                                : seg === "credits"
                                  ? t(
                                      "player.skipTime.feedback.modal.types.credits",
                                    )
                                  : t(
                                      "player.skipTime.feedback.modal.types.preview",
                                    )}
                          </Button>
                        ),
                      )}
                    </div>

                    <p className="text-sm text-gray-400">
                      {t("player.skipTime.feedback.modal.whenToDesc")}
                    </p>

                    <form
                      ref={formRef}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="tidb-start"
                            className="block text-sm font-medium text-white mb-1"
                          >
                            {t("player.skipTime.feedback.modal.startTimeLabel")}
                            {formData.segment === "credits" ||
                            formData.segment === "preview" ? (
                              <span className="text-red-500 ml-1">*</span>
                            ) : null}
                          </label>
                          <AuthInputBox
                            value={formData.start}
                            onChange={(value) =>
                              setFormData({ ...formData, start: value })
                            }
                            placeholder={t(
                              `player.skipTime.feedback.modal.placeholders.start.${formData.segment}`,
                            )}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="tidb-end"
                            className="block text-sm font-medium text-white mb-1"
                          >
                            {t("player.skipTime.feedback.modal.endTimeLabel")}
                            {formData.segment === "intro" ||
                            formData.segment === "recap" ? (
                              <span className="text-red-500 ml-1">*</span>
                            ) : null}
                          </label>
                          <AuthInputBox
                            value={formData.end}
                            onChange={(value) =>
                              setFormData({ ...formData, end: value })
                            }
                            placeholder={t(
                              `player.skipTime.feedback.modal.placeholders.end.${formData.segment}`,
                            )}
                          />
                        </div>
                      </div>

                      {/* Timing guidance (segment-specific) */}
                      <div className="rounded-lg border border-background-secondary bg-modal-background p-4">
                        <h3 className="font-semibold text-white mb-2 text-sm">
                          {t(
                            `player.skipTime.feedback.modal.guide.${formData.segment}.whenToTitle`,
                            {
                              defaultValue: t(
                                "player.skipTime.feedback.modal.whenToTitle",
                              ),
                            },
                          )}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                          <div>
                            <span className="font-medium text-gray-300 block mb-0.5">
                              {t(
                                "player.skipTime.feedback.modal.guide.startLabel",
                              )}
                            </span>
                            {t(
                              `player.skipTime.feedback.modal.guide.${formData.segment}.startDesc`,
                              {
                                defaultValue: t(
                                  "player.skipTime.feedback.modal.guide.startDesc",
                                ),
                              },
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-300 block mb-0.5">
                              {t(
                                "player.skipTime.feedback.modal.guide.endLabel",
                              )}
                            </span>
                            {t(
                              `player.skipTime.feedback.modal.guide.${formData.segment}.endDesc`,
                              {
                                defaultValue: t(
                                  "player.skipTime.feedback.modal.guide.endDesc",
                                ),
                              },
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-300 block mb-0.5">
                              {t(
                                "player.skipTime.feedback.modal.guide.durationLabel",
                              )}
                            </span>
                            {t(
                              `player.skipTime.feedback.modal.guide.${formData.segment}.durationDesc`,
                              {
                                defaultValue: t(
                                  "player.skipTime.feedback.modal.guide.durationDesc",
                                ),
                              },
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-300 block mb-0.5">
                              {t(
                                "player.skipTime.feedback.modal.guide.excludeLabel",
                              )}
                            </span>
                            {t(
                              `player.skipTime.feedback.modal.guide.${formData.segment}.excludeDesc`,
                              {
                                defaultValue: t(
                                  "player.skipTime.feedback.modal.guide.excludeDesc",
                                ),
                              },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 justify-between">
                        <Button
                          theme="secondary"
                          onClick={handleClose}
                          disabled={isSubmitting}
                        >
                          {t("player.skipTime.feedback.modal.cancel")}
                        </Button>
                        <Button
                          theme="purple"
                          disabled={isSubmitting}
                          loading={isSubmitting}
                          icon={Icons.ARROW_RIGHT}
                          onClick={() => formRef.current?.requestSubmit()}
                        >
                          {isSubmitting
                            ? t("player.skipTime.feedback.modal.submitting")
                            : t("player.skipTime.feedback.modal.submit")}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </Flare.Child>
          </div>
        </Flare.Base>
      </div>
    </Modal>
  );
}
