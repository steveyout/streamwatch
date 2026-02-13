import { labelToLanguageCode } from "@p-stream/providers";
import classNames from "classnames";
import Fuse from "fuse.js";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { convert } from "subsrt-ts";

import { subtitleTypeList } from "@/backend/helpers/subs";
import { FileDropHandler } from "@/components/DropFile";
import { FlagIcon } from "@/components/FlagIcon";
import { Icon, Icons } from "@/components/Icon";
import { Spinner } from "@/components/layout/Spinner";
import { useCaptions } from "@/components/player/hooks/useCaptions";
import { Menu } from "@/components/player/internals/ContextMenu";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import {
  captionIsVisible,
  parseSubtitles,
} from "@/components/player/utils/captions";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useLanguageStore } from "@/stores/language";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import {
  getPrettyLanguageNameFromLocale,
  sortLangCodes,
} from "@/utils/language";

/* eslint-disable react/no-unused-prop-types */
export interface CaptionOptionProps {
  countryCode?: string;
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  error?: React.ReactNode;
  flag?: boolean;
  translatable?: boolean;
  isTranslatedTarget?: boolean;
  subtitleUrl?: string;
  subtitleType?: string;
  // subtitle details from wyzie
  subtitleSource?: string;
  subtitleEncoding?: string;
  isHearingImpaired?: boolean;
  onDoubleClick?: () => void;
  onTranslate?: () => void;
}
/* eslint-enable react/no-unused-prop-types */

function CaptionOptionRightSide(props: CaptionOptionProps) {
  if (props.loading) {
    // should override selected and error and not show translate button
    return <Spinner className="text-lg" />;
  }

  function translateBtn(margin: boolean) {
    return (
      props.translatable && (
        <span
          className={classNames(
            "text-buttons-secondaryText px-2 py-1 rounded bg-opacity-0",
            {
              "mr-1": margin,
              "bg-opacity-100 bg-buttons-purpleHover": props.isTranslatedTarget,
            },
            "transition duration-300 ease-in-out",
            "hover:bg-opacity-100 hover:bg-buttons-primaryHover",
            "hover:text-buttons-primaryText",
          )}
          onClick={(e) => {
            e.stopPropagation();
            props.onTranslate?.();
          }}
        >
          <Icon icon={Icons.TRANSLATE} className="text-lg" />
        </span>
      )
    );
  }

  if (props.selected || props.error) {
    return (
      <div className="flex items-center">
        {translateBtn(true)}
        {props.error ? (
          <span className="flex items-center text-video-context-error">
            <Icon className="ml-2" icon={Icons.WARNING} />
          </span>
        ) : (
          <Icon
            icon={Icons.CIRCLE_CHECK}
            className="text-xl text-video-context-type-accent"
          />
        )}
      </div>
    );
  }

  return translateBtn(false);
}

export function CaptionOption(props: CaptionOptionProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  const tooltipContent = useMemo(() => {
    if (!props.subtitleUrl && !props.subtitleSource) return null;

    const parts = [];

    if (props.subtitleSource) {
      parts.push(`Source: ${props.subtitleSource}`);
    }

    if (props.subtitleEncoding) {
      parts.push(`Encoding: ${props.subtitleEncoding}`);
    }

    if (props.isHearingImpaired) {
      parts.push(`Hearing Impaired: Yes`);
    }

    if (props.subtitleUrl) {
      parts.push(`URL: ${props.subtitleUrl}`);
    }

    return parts.join("\n");
  }, [
    props.subtitleUrl,
    props.subtitleSource,
    props.subtitleEncoding,
    props.isHearingImpaired,
  ]);

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(true), 500);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SelectableLink
        selected={props.selected}
        loading={props.loading}
        error={props.error}
        disabled={props.disabled}
        onClick={props.onClick}
        onDoubleClick={props.onDoubleClick}
        rightSide={<CaptionOptionRightSide {...props} />}
      >
        <span
          data-active-link={props.selected ? true : undefined}
          className="flex items-center"
        >
          {props.flag ? (
            <span data-code={props.countryCode} className="mr-3 inline-flex">
              <FlagIcon langCode={props.countryCode} />
            </span>
          ) : null}
          <span
            className={
              props.flag || props.subtitleUrl || props.subtitleSource
                ? "truncate max-w-[100px]"
                : ""
            }
          >
            {props.children}
          </span>
          {props.subtitleType && (
            <span className="ml-2 px-2 py-0.5 rounded bg-video-context-hoverColor bg-opacity-80 text-video-context-type-main text-xs font-semibold">
              {props.subtitleType.toUpperCase()}
            </span>
          )}
          {props.subtitleSource && (
            <span
              className={classNames(
                "ml-2 px-2 py-0.5 rounded text-white text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap",
                {
                  "bg-blue-500": props.subtitleSource.includes("wyzie"),
                  "bg-orange-500": props.subtitleSource === "opensubs",
                  "bg-purple-500": props.subtitleSource === "febbox",
                  "bg-green-500": props.subtitleSource === "granite",
                },
              )}
            >
              {props.subtitleSource.toUpperCase()}
            </span>
          )}
          {props.isHearingImpaired && (
            <Icon icon={Icons.EAR} className="ml-2" />
          )}
        </span>
      </SelectableLink>
      {tooltipContent && showTooltip && (
        <div className="flex flex-col absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-black/80 text-white/80 text-xs rounded-lg backdrop-blur-sm w-60 break-all whitespace-pre-line">
          {tooltipContent}
          {props.onDoubleClick && (
            <span className="text-white/50 text-xs">
              {t("player.menus.subtitles.doubleClickToCopy")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to filter and sort subtitle list with search
export function useSubtitleList(subs: CaptionListItem[], searchQuery: string) {
  const { t: translate } = useTranslation();
  const unknownChoice = translate("player.menus.subtitles.unknownLanguage");
  return useMemo(() => {
    const input = subs.map((t) => ({
      ...t,
      languageName:
        getPrettyLanguageNameFromLocale(t.language) ?? unknownChoice,
    }));
    const sorted = sortLangCodes(input.map((t) => t.language));
    let results = input.sort((a, b) => {
      return sorted.indexOf(a.language) - sorted.indexOf(b.language);
    });

    if (searchQuery.trim().length > 0) {
      const fuse = new Fuse(input, {
        includeScore: true,
        threshold: 0.3, // Lower threshold = stricter matching (0 = exact, 1 = match anything)
        keys: ["languageName"],
      });

      results = fuse.search(searchQuery).map((res) => res.item);
    }

    return results;
  }, [subs, searchQuery, unknownChoice]);
}

export function CustomCaptionOption() {
  const { t } = useTranslation();
  const lang = usePlayerStore((s) => s.caption.selected?.language);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setCustomSubs = useSubtitleStore((s) => s.setCustomSubs);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    const reader = new FileReader();

    reader.addEventListener("load", (event) => {
      if (!event.target || typeof event.target.result !== "string") {
        setError("Failed to read file");
        return;
      }

      try {
        const converted = convert(event.target.result, "srt");
        setCaption({
          language: "custom",
          srtData: converted,
          id: "custom-caption",
        });
        setCustomSubs();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to convert subtitle file",
        );
      }
    });

    reader.addEventListener("error", () => {
      setError("Failed to read file");
    });

    reader.readAsText(file, "utf-8");
  };

  return (
    <CaptionOption
      selected={lang === "custom"}
      error={error}
      onClick={() => fileInput.current?.click()}
    >
      {t("player.menus.subtitles.customChoice")}
      <input
        className="hidden"
        ref={fileInput}
        accept={subtitleTypeList.join(",")}
        type="file"
        onChange={(e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          const file = files[0];
          const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

          if (!subtitleTypeList.includes(fileExtension)) {
            setError(
              `Unsupported file type. Supported: ${subtitleTypeList.join(", ")}`,
            );
            e.target.value = ""; // Reset input
            return;
          }

          handleFileSelect(file);
          e.target.value = ""; // Reset input so same file can be selected again
        }}
      />
    </CaptionOption>
  );
}

export function PasteCaptionOption(props: { selected?: boolean }) {
  const { t } = useTranslation();
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setCustomSubs = useSubtitleStore((s) => s.setCustomSubs);
  const setDelay = useSubtitleStore((s) => s.setDelay);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePaste = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const clipboardText = await navigator.clipboard.readText();
      const parsedData = JSON.parse(clipboardText);

      // Validate the structure
      if (!parsedData.id || !parsedData.url || !parsedData.language) {
        throw new Error("Invalid subtitle data format");
      }

      // Check for CORS restrictions
      if (parsedData.hasCorsRestrictions) {
        throw new Error("Protected subtitle url, cannot be used");
      }

      // Fetch the subtitle content
      const response = await fetch(parsedData.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch subtitle: ${response.status}`);
      }

      const subtitleText = await response.text();

      // Convert to SRT format
      const converted = convert(subtitleText, "srt");

      setCaption({
        language: parsedData.language,
        srtData: converted,
        id: "pasted-caption",
      });
      setCustomSubs();

      // Set delay if included in the pasted data, otherwise reset to 0
      if (parsedData.delay !== undefined) {
        setDelay(parsedData.delay);
      } else {
        setDelay(0);
      }
    } catch (err) {
      console.error("Failed to paste subtitle:", err);
      setError(err instanceof Error ? err.message : "Failed to paste subtitle");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CaptionOption
      onClick={handlePaste}
      loading={isLoading}
      error={error}
      selected={props.selected}
    >
      {t("player.menus.subtitles.pasteChoice")}
    </CaptionOption>
  );
}

export interface CaptionsViewProps {
  id: string;
  backLink?: boolean;
  onChooseLanguage?: (language: string) => void;
}

export function CaptionsView({
  id,
  backLink,
  onChooseLanguage,
}: CaptionsViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const selectedCaptionId = usePlayerStore((s) => s.caption.selected?.id);
  const currentTranslateTask = usePlayerStore((s) => s.caption.translateTask);
  const { disable, selectRandomCaptionFromLastUsedLanguage } = useCaptions();
  const [isRandomSelecting, setIsRandomSelecting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleRandomSelect = async () => {
    if (isRandomSelecting) return; // Prevent multiple simultaneous calls
    setIsRandomSelecting(true);
    try {
      await selectRandomCaptionFromLastUsedLanguage();
    } finally {
      setIsRandomSelecting(false);
    }
  };
  const setCaption = usePlayerStore((s) => s.setCaption);
  const videoTime = usePlayerStore((s) => s.progress.time);
  const srtData = usePlayerStore((s) => s.caption.selected?.srtData);
  const selectedLanguage = usePlayerStore((s) => s.caption.selected?.language);
  const captionList = usePlayerStore((s) => s.captionList);
  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const isLoadingExternalSubtitles = usePlayerStore(
    (s) => s.isLoadingExternalSubtitles,
  );
  const delay = useSubtitleStore((s) => s.delay);
  const appLanguage = useLanguageStore((s) => s.language);
  const setCustomSubs = useSubtitleStore((s) => s.setCustomSubs);

  // Get combined caption list
  const captions = useMemo(
    () =>
      captionList.length !== 0 ? captionList : (getHlsCaptionList?.() ?? []),
    [captionList, getHlsCaptionList],
  );

  // Split captions into source and external (opensubtitles)
  const sourceCaptions = useMemo(
    () => captions.filter((x) => !x.opensubtitles),
    [captions],
  );
  const externalCaptions = useMemo(
    () => captions.filter((x) => x.opensubtitles),
    [captions],
  );

  // Group captions by language
  const groupedCaptions = useMemo(() => {
    const allCaptions = [...sourceCaptions, ...externalCaptions];
    const groups: Record<string, typeof allCaptions> = {};

    allCaptions.forEach((caption) => {
      // Use display name if available, otherwise fall back to language code
      const lang =
        labelToLanguageCode(caption.display || "") ||
        caption.language ||
        "unknown";
      if (!groups[lang]) {
        groups[lang] = [];
      }
      groups[lang].push(caption);
    });

    // Sort languages
    const sortedGroups: Array<{
      language: string;
      captions: typeof allCaptions;
      languageName: string;
    }> = [];
    Object.entries(groups).forEach(([lang, captionsForLang]) => {
      const languageName =
        getPrettyLanguageNameFromLocale(lang) ||
        t("player.menus.subtitles.unknownLanguage");
      sortedGroups.push({
        language: lang,
        captions: captionsForLang,
        languageName,
      });
    });

    // Sort with app language first, then alphabetically
    return sortedGroups.sort((a, b) => {
      // App language always comes first
      if (a.language === appLanguage) return -1;
      if (b.language === appLanguage) return 1;

      // Then sort alphabetically
      return a.languageName.localeCompare(b.languageName);
    });
  }, [sourceCaptions, externalCaptions, t, appLanguage]);

  // Get current subtitle text preview
  const currentSubtitleText = useMemo(() => {
    if (!srtData || !selectedCaptionId) return null;
    const parsedCaptions = parseSubtitles(srtData, selectedLanguage);
    const visibleCaption = parsedCaptions.find(({ start, end }) =>
      captionIsVisible(start, end, delay, videoTime),
    );
    return visibleCaption?.content;
  }, [srtData, selectedLanguage, delay, videoTime, selectedCaptionId]);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    const firstFile = files[0];
    if (!files || !firstFile) return;

    const fileExtension = `.${firstFile.name.split(".").pop()?.toLowerCase()}`;
    if (!fileExtension || !subtitleTypeList.includes(fileExtension)) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", (e) => {
      if (!e.target || typeof e.target.result !== "string") {
        return;
      }

      try {
        const converted = convert(e.target.result, "srt");

        setCaption({
          language: "custom",
          srtData: converted,
          id: "custom-caption",
        });
        setCustomSubs();
      } catch (err) {
        // Silently fail on drop - user can use the upload button for better error feedback
      }
    });

    reader.addEventListener("error", () => {
      // Silently fail on drop - user can use the upload button for better error feedback
    });

    reader.readAsText(firstFile, "utf-8");
  }

  return (
    <>
      <div>
        <div
          className={classNames(
            "absolute inset-0 flex items-center justify-center text-white z-10 pointer-events-none transition-opacity duration-300",
            dragging ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="flex flex-col items-center">
            <Icon className="text-5xl mb-4" icon={Icons.UPLOAD} />
            <span className="text-xl weight font-medium">
              {t("player.menus.subtitles.dropSubtitleFile")}
            </span>
          </div>
        </div>

        {backLink ? (
          <Menu.BackLink
            onClick={() => router.navigate("/")}
            rightSide={
              <button
                type="button"
                onClick={() => router.navigate("/captions/settings")}
                className="-mr-2 -my-1 px-2 p-[0.4em] rounded tabbable hover:bg-video-context-light hover:bg-opacity-10"
              >
                {t("player.menus.subtitles.customizeLabel")}
              </button>
            }
          >
            {t("player.menus.subtitles.title")}
          </Menu.BackLink>
        ) : (
          <Menu.Title
            rightSide={
              <button
                type="button"
                onClick={() => router.navigate("/captions/settingsOverlay")}
                className="-mr-2 -my-1 px-2 p-[0.4em] rounded tabbable hover:bg-video-context-light hover:bg-opacity-10"
              >
                {t("player.menus.subtitles.customizeLabel")}
              </button>
            }
          >
            {t("player.menus.subtitles.title")}
          </Menu.Title>
        )}
      </div>
      <FileDropHandler
        className={`transition duration-300 ${dragging ? "opacity-20" : ""}`}
        onDraggingChange={(isDragging) => {
          setDragging(isDragging);
        }}
        onDrop={(event) => onDrop(event)}
      >
        {/* Current subtitle preview */}
        {selectedCaptionId && (
          <div className="mt-3 p-2 rounded-xl bg-video-context-light bg-opacity-10 text-center sm:hidden">
            <div className="text-sm text-video-context-type-secondary mb-1">
              {t("player.menus.subtitles.previewLabel")}
            </div>
            <div
              className="text-base font-medium min-h-[3rem] flex items-center justify-center"
              style={{ minHeight: "3rem" }}
            >
              {currentSubtitleText ? (
                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: currentSubtitleText.replaceAll(/\r?\n/g, "<br />"),
                  }}
                />
              ) : (
                <span className="text-video-context-type-secondary italic">
                  ...{" "}
                </span>
              )}
            </div>
          </div>
        )}

        <Menu.ScrollToActiveSection className="!pt-1 mt-2 pb-3">
          {/* Off button */}
          <CaptionOption
            onClick={() => disable()}
            selected={!selectedCaptionId}
          >
            {t("player.menus.subtitles.offChoice")}
          </CaptionOption>

          {/* Automatically select subtitles option */}
          {captions.length > 0 && (
            <CaptionOption
              onClick={() => handleRandomSelect()}
              selected={!!selectedCaptionId}
              loading={isRandomSelecting}
            >
              <div className="flex flex-col">
                {t("player.menus.subtitles.autoSelectChoice")}
                {selectedCaptionId && (
                  <span className="text-video-context-type-secondary text-xs">
                    {t("player.menus.subtitles.autoSelectDifferentChoice")}
                  </span>
                )}
              </div>
            </CaptionOption>
          )}

          {/* Custom upload option */}
          <CustomCaptionOption />

          {/* Paste subtitle option */}
          <PasteCaptionOption
            selected={selectedCaptionId === "pasted-caption"}
          />

          {selectedCaptionId && (
            <Menu.ChevronLink
              onClick={() => router.navigate("/captions/transcript")}
            >
              {t("player.menus.subtitles.transcriptChoice")}
            </Menu.ChevronLink>
          )}

          <div className="h-1" />

          {/* No subtitles available message */}
          {!isLoadingExternalSubtitles &&
            sourceCaptions.length === 0 &&
            externalCaptions.length === 0 && (
              <div className="p-4 pb-4 rounded-xl bg-video-context-light bg-opacity-10 text-center">
                <div className="text-video-context-type-secondary">
                  {t("player.menus.subtitles.empty")}
                </div>
              </div>
            )}

          {/* Loading external subtitles */}
          {isLoadingExternalSubtitles && (
            <div className="p-4 rounded-xl bg-video-context-light bg-opacity-10 text-center">
              <div className="text-video-context-type-secondary">
                {t("player.menus.subtitles.loadingExternal")}
              </div>
            </div>
          )}

          {/* Language selection */}
          {groupedCaptions.length > 0 &&
            groupedCaptions.map(
              ({ language, languageName, captions: captionsForLang }) => (
                <Menu.ChevronLink
                  key={language}
                  selected={
                    (!currentTranslateTask && selectedLanguage === language) ||
                    (!!currentTranslateTask &&
                      !currentTranslateTask.error &&
                      currentTranslateTask.targetCaption.language === language)
                  }
                  rightText={captionsForLang.length.toString()}
                  onClick={() => {
                    onChooseLanguage?.(language);
                    router.navigate(
                      backLink
                        ? "/captions/languages"
                        : "/captionsOverlay/languagesOverlay",
                    );
                  }}
                >
                  <span className="flex items-center">
                    <FlagIcon langCode={language} />
                    <span className="ml-3">{languageName}</span>
                  </span>
                </Menu.ChevronLink>
              ),
            )}
        </Menu.ScrollToActiveSection>
      </FileDropHandler>
    </>
  );
}

export default CaptionsView;
