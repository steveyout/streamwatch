import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Icons } from "@/components/Icon";
import { IconPill } from "@/components/layout/IconPill";
import { useModal } from "@/components/overlays/Modal";
import { Paragraph } from "@/components/text/Paragraph";
import { Title } from "@/components/text/Title";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { ErrorContainer, ErrorLayout } from "@/pages/layouts/ErrorLayout";
import { getMediaKey } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

import { ErrorCardInModal } from "../errors/ErrorCard";

export interface PlaybackErrorPartProps {
  onResume?: (startFromSourceId: string) => void;
  currentSourceId?: string | null;
}

export function PlaybackErrorPart(props: PlaybackErrorPartProps) {
  const { t } = useTranslation();
  const playbackError = usePlayerStore((s) => s.interface.error);
  const currentSourceId = usePlayerStore((s) => s.sourceId);
  const currentEmbedId = usePlayerStore((s) => s.embedId);
  const meta = usePlayerStore((s) => s.meta);
  const failedEmbedsPerMedia = usePlayerStore((s) => s.failedEmbedsPerMedia);
  const addFailedSource = usePlayerStore((s) => s.addFailedSource);
  const addFailedEmbed = usePlayerStore((s) => s.addFailedEmbed);
  const modal = useModal("error");
  const settingsRouter = useOverlayRouter("settings");
  const hasOpenedSettings = useRef(false);
  const hasAutoResumed = useRef(false);
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const enableAutoResumeOnPlaybackError = usePreferencesStore(
    (s) => s.enableAutoResumeOnPlaybackError,
  );

  // Mark the failed source/embed and handle UI when a playback error occurs
  useEffect(() => {
    if (playbackError && currentSourceId) {
      // Only mark source/embed as failed for fatal errors
      const isFatalError =
        playbackError.type === "hls"
          ? (playbackError.hls?.fatal ?? false)
          : playbackError.type === "htmlvideo";

      if (isFatalError) {
        // If there's an active embed, disable that embed instead of the source
        if (currentEmbedId) {
          addFailedEmbed(currentSourceId, currentEmbedId);

          // Check if all embeds for this source have now failed
          // If so, disable the entire source
          const mediaKey = getMediaKey(meta);
          const failedEmbeds =
            mediaKey && failedEmbedsPerMedia[mediaKey]
              ? failedEmbedsPerMedia[mediaKey]
              : {};
          const failedEmbedsForSource = failedEmbeds[currentSourceId] || [];
          // For now, we'll assume if we have 2+ failed embeds for a source, disable it
          // This is a simple heuristic - we could make it more sophisticated
          if (failedEmbedsForSource.length >= 2) {
            addFailedSource(currentSourceId);
          }
        } else {
          // No embed active, disable the source
          addFailedSource(currentSourceId);
        }
      }

      if (!hasOpenedSettings.current && !enableAutoResumeOnPlaybackError) {
        hasOpenedSettings.current = true;
        // Reset the last successful source when a playback error occurs
        setLastSuccessfulSource(null);
        settingsRouter.open();
        settingsRouter.navigate("/source");
      }
    }
  }, [
    playbackError,
    currentSourceId,
    currentEmbedId,
    meta,
    failedEmbedsPerMedia,
    addFailedSource,
    addFailedEmbed,
    settingsRouter,
    setLastSuccessfulSource,
    enableAutoResumeOnPlaybackError,
  ]);

  // Automatically resume scraping from the next source if enabled
  useEffect(() => {
    if (
      playbackError &&
      !hasAutoResumed.current &&
      enableAutoResumeOnPlaybackError &&
      props.currentSourceId &&
      props.onResume
    ) {
      hasAutoResumed.current = true;
      // Immediately call resume without delay since we don't need the overlay
      props.onResume!(props.currentSourceId!);
    }
  }, [
    playbackError,
    enableAutoResumeOnPlaybackError,
    props.currentSourceId,
    props.onResume,
  ]);

  const handleOpenSourcePicker = () => {
    settingsRouter.open();
    settingsRouter.navigate("/source");
  };

  return (
    <ErrorLayout>
      <ErrorContainer>
        <IconPill icon={Icons.WAND}>{t("player.playbackError.badge")}</IconPill>
        <Title>{t("player.playbackError.title")}</Title>
        <Paragraph>
          {enableAutoResumeOnPlaybackError
            ? t("player.playbackError.autoResumeText")
            : t("player.playbackError.text")}
        </Paragraph>
        <div className="flex gap-3">
          {props.currentSourceId &&
            props.onResume &&
            !enableAutoResumeOnPlaybackError && (
              <Button
                onClick={() => props.onResume!(props.currentSourceId!)}
                theme="purple"
                padding="md:px-12 p-2.5"
                className="mt-6"
              >
                {t("player.playbackError.resumeButton")}
              </Button>
            )}
          <Button
            onClick={handleOpenSourcePicker}
            theme="purple"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.menus.sources.title")}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => modal.show()}
            theme="danger"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("errors.showError")}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            href="/"
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
          >
            {t("player.playbackError.homeButton")}
          </Button>
          <Button
            theme="secondary"
            padding="md:px-12 p-2.5"
            className="mt-6"
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
          >
            {t("errors.reloadPage")}
          </Button>
        </div>
      </ErrorContainer>
      {/* Error */}
      <ErrorCardInModal
        onClose={() => modal.hide()}
        error={playbackError}
        id={modal.id}
      />
    </ErrorLayout>
  );
}
