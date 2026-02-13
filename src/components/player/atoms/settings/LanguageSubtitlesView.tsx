import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAsyncFn } from "react-use";

import { FlagIcon } from "@/components/FlagIcon";
import { Icon, Icons } from "@/components/Icon";
import { useCaptions } from "@/components/player/hooks/useCaptions";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { getPrettyLanguageNameFromLocale } from "@/utils/language";

import { CaptionOption } from "./CaptionsView";

export interface LanguageSubtitlesViewProps {
  id: string;
  language: string;
  overlayBackLink?: boolean;
  onTranslateSubtitle?: (caption: CaptionListItem) => void;
}

export function LanguageSubtitlesView({
  id,
  language,
  overlayBackLink,
  onTranslateSubtitle,
}: LanguageSubtitlesViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const selectedCaptionId = usePlayerStore((s) => s.caption.selected?.id);
  const currentTranslateTask = usePlayerStore((s) => s.caption.translateTask);
  const { selectCaptionById } = useCaptions();
  const [currentlyDownloading, setCurrentlyDownloading] = useState<
    string | null
  >(null);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const captionList = usePlayerStore((s) => s.captionList);

  // Trigger scroll when selected caption changes
  useEffect(() => {
    if (selectedCaptionId) {
      setScrollTrigger((prev) => prev + 1);
    }
  }, [selectedCaptionId]);

  // Manual scroll function with smooth behavior
  const scrollToActiveCaption = () => {
    const active = document.querySelector("[data-active-link]");
    if (!active) return;

    active.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const isLoadingExternalSubtitles = usePlayerStore(
    (s) => s.isLoadingExternalSubtitles,
  );

  // Get combined caption list
  const captions = useMemo(
    () =>
      captionList.length !== 0 ? captionList : (getHlsCaptionList?.() ?? []),
    [captionList, getHlsCaptionList],
  );

  // Filter captions for this specific language
  const languageCaptions = useMemo(
    () => captions.filter((caption) => caption.language === language),
    [captions, language],
  );

  // Download handler
  const [downloadReq, startDownload] = useAsyncFn(
    async (captionId: string) => {
      setCurrentlyDownloading(captionId);
      return selectCaptionById(captionId);
    },
    [selectCaptionById, setCurrentlyDownloading],
  );

  // Random subtitle selection
  const handleRandomSelect = async () => {
    if (languageCaptions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * languageCaptions.length);
    const randomCaption = languageCaptions[randomIndex];

    await startDownload(randomCaption.id);

    // Scroll to the newly selected caption after a brief delay to ensure DOM updates
    setTimeout(() => scrollToActiveCaption(), 100);
  };

  // Render subtitle option
  const renderSubtitleOption = (v: CaptionListItem) => {
    const handleDoubleClick = async () => {
      const copyData = {
        id: v.id,
        url: v.url,
        language: v.language,
        type: v.type,
        hasCorsRestrictions: v.needsProxy,
        opensubtitles: v.opensubtitles,
        display: v.display,
        media: v.media,
        isHearingImpaired: v.isHearingImpaired,
        source: v.source,
        encoding: v.encoding,
        delay: 0,
      };

      try {
        await navigator.clipboard.writeText(JSON.stringify(copyData));
        // Could add a toast notification here if needed
      } catch (err) {
        console.error("Failed to copy subtitle data:", err);
      }
    };

    return (
      <CaptionOption
        key={v.id}
        countryCode={v.language}
        selected={
          v.id === selectedCaptionId ||
          (!!currentTranslateTask &&
            !currentTranslateTask.error &&
            v.id === currentTranslateTask.targetCaption.id)
        }
        disabled={
          !!currentTranslateTask &&
          !currentTranslateTask.done &&
          !currentTranslateTask.error
        }
        loading={
          (v.id === currentlyDownloading && downloadReq.loading) ||
          (!!currentTranslateTask &&
            v.id === currentTranslateTask.targetCaption.id &&
            !currentTranslateTask.done &&
            !currentTranslateTask.error)
        }
        error={
          v.id === currentlyDownloading && downloadReq.error
            ? downloadReq.error.toString()
            : undefined
        }
        onClick={() =>
          (!currentTranslateTask ||
            currentTranslateTask.done ||
            currentTranslateTask.error) &&
          startDownload(v.id)
        }
        onTranslate={() => {
          onTranslateSubtitle?.(v);
          router.navigate(
            overlayBackLink
              ? "/captionsOverlay/languagesOverlay/translateSubtitleOverlay"
              : "/captions/languages/translateSubtitleOverlay",
          );
        }}
        isTranslatedTarget={
          !!currentTranslateTask &&
          !currentTranslateTask.error &&
          v.id === currentTranslateTask.targetCaption.id
        }
        onDoubleClick={handleDoubleClick}
        flag
        translatable
        subtitleUrl={v.url}
        subtitleType={v.type}
        subtitleSource={v.source}
        subtitleEncoding={v.encoding}
        isHearingImpaired={v.isHearingImpaired}
      >
        {v.display || v.id}
      </CaptionOption>
    );
  };

  const languageName =
    getPrettyLanguageNameFromLocale(language) ||
    t("player.menus.subtitles.unknownLanguage");

  return (
    <>
      <Menu.BackLink
        onClick={() =>
          router.navigate(overlayBackLink ? "/captionsOverlay" : "/captions")
        }
        rightSide={
          languageCaptions.length > 0 && (
            <button
              type="button"
              onClick={handleRandomSelect}
              className="-mr-2 -my-1 px-2 p-[0.4em] rounded tabbable hover:bg-video-context-light hover:bg-opacity-10"
              title="Pick random subtitle"
            >
              <Icon icon={Icons.REPEAT} className="text-lg" />
            </button>
          )
        }
      >
        <span className="flex items-center">
          <FlagIcon langCode={language} />
          <span className="ml-3">{languageName}</span>
        </span>
      </Menu.BackLink>

      <Menu.ScrollToActiveSection
        className="!pt-1 mt-2 pb-3"
        loaded={scrollTrigger > 0}
      >
        {languageCaptions.length > 0 ? (
          languageCaptions.map(renderSubtitleOption)
        ) : (
          <div className="text-center text-video-context-type-secondary py-2">
            {t("player.menus.subtitles.notFound")}
          </div>
        )}

        {/* Loading indicator */}
        {isLoadingExternalSubtitles && languageCaptions.length === 0 && (
          <div className="text-center text-video-context-type-secondary py-4 mt-2">
            {t("player.menus.subtitles.loadingExternal") ||
              "Loading external subtitles..."}
          </div>
        )}
      </Menu.ScrollToActiveSection>
    </>
  );
}
