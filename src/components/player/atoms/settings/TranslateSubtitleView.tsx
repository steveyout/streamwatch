import { useTranslation } from "react-i18next";

import { FlagIcon } from "@/components/FlagIcon";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { getPrettyLanguageNameFromLocale } from "@/utils/language";

import { CaptionOption } from "./CaptionsView";
import { useCaptions } from "../../hooks/useCaptions";

// https://developers.google.com/workspace/admin/directory/v1/languages
const availableLanguages: string[] = [
  "am",
  "ar",
  "eu",
  "bn",
  "en-GB",
  "pt-BR",
  "bg",
  "ca",
  "chr",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fil",
  "fi",
  "fr",
  "de",
  "el",
  "gu",
  "iw",
  "hi",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "kn",
  "ko",
  "lv",
  "lt",
  "ms",
  "ml",
  "mr",
  "no",
  "pl",
  "pt-PT",
  "ro",
  "ru",
  "sr",
  "zh-CN",
  "sk",
  "sl",
  "es",
  "sw",
  "sv",
  "ta",
  "te",
  "th",
  "zh-TW",
  "tr",
  "ur",
  "uk",
  "vi",
  "cy",
];

export interface TranslateSubtitlesViewProps {
  id: string;
  caption: CaptionListItem;
  overlayBackLink?: boolean;
}

export function TranslateSubtitleView({
  id,
  caption,
  overlayBackLink,
}: TranslateSubtitlesViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const { disable: disableCaptions } = useCaptions();
  const translateTask = usePlayerStore((s) => s.caption.translateTask);
  const translateCaption = usePlayerStore((s) => s.translateCaption);
  const clearTranslateTask = usePlayerStore((s) => s.clearTranslateTask);

  function renderTargetLang(langCode: string) {
    const friendlyName = getPrettyLanguageNameFromLocale(langCode);

    async function onClick() {
      clearTranslateTask();
      disableCaptions();
      await translateCaption(caption, langCode);
    }

    return (
      <CaptionOption
        key={langCode}
        countryCode={langCode}
        disabled={
          !!translateTask && !translateTask.done && !translateTask.error
        }
        loading={
          !!translateTask &&
          translateTask.targetCaption.id === caption.id &&
          !translateTask.done &&
          !translateTask.error &&
          translateTask.targetLanguage === langCode
        }
        error={
          !!translateTask &&
          translateTask.targetCaption.id === caption.id &&
          translateTask.error &&
          translateTask.targetLanguage === langCode
        }
        selected={
          !!translateTask &&
          translateTask.targetCaption.id === caption.id &&
          translateTask.done &&
          translateTask.targetLanguage === langCode
        }
        onClick={() =>
          !translateTask || translateTask.done || translateTask.error
            ? onClick()
            : undefined
        }
        flag
      >
        {friendlyName}
      </CaptionOption>
    );
  }

  return (
    <>
      <Menu.BackLink
        onClick={() =>
          router.navigate(
            overlayBackLink
              ? "/captionsOverlay/languagesOverlay"
              : "/captions/languages",
          )
        }
      >
        <span className="flex items-center">
          <FlagIcon langCode={caption.language} />
          <span className="ml-3">
            {t("player.menus.subtitles.translate.title", {
              replace: {
                language:
                  getPrettyLanguageNameFromLocale(caption.language) ??
                  caption.language,
              },
            })}
          </span>
        </span>
      </Menu.BackLink>

      <div className="!pt-1 mt-2 pb-3">
        {availableLanguages
          .filter(
            (lang) =>
              lang !== caption.language &&
              !lang.includes(caption.language) &&
              !caption.language.includes(lang),
          )
          .map(renderTargetLang)}
      </div>
    </>
  );
}
