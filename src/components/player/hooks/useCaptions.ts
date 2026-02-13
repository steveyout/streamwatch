import { useCallback, useEffect, useMemo } from "react";
import subsrt from "subsrt-ts";

import { downloadCaption, downloadWebVTT } from "@/backend/helpers/subs";
import { Caption, CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useSubtitleStore } from "@/stores/subtitles";

import {
  filterDuplicateCaptionCues,
  parseVttSubtitles,
} from "../utils/captions";

export function useCaptions() {
  const setLanguage = useSubtitleStore((s) => s.setLanguage);
  const enabled = useSubtitleStore((s) => s.enabled);
  const resetSubtitleSpecificSettings = useSubtitleStore(
    (s) => s.resetSubtitleSpecificSettings,
  );
  const setCaption = usePlayerStore((s) => s.setCaption);
  const currentTranslateTask = usePlayerStore((s) => s.caption.translateTask);
  const lastSelectedLanguage = useSubtitleStore((s) => s.lastSelectedLanguage);
  const setIsOpenSubtitles = useSubtitleStore((s) => s.setIsOpenSubtitles);

  const captionList = usePlayerStore((s) => s.captionList);
  const getHlsCaptionList = usePlayerStore((s) => s.display?.getCaptionList);
  const source = usePlayerStore((s) => s.source);
  const selectedCaption = usePlayerStore((s) => s.caption.selected);

  const getSubtitleTracks = usePlayerStore((s) => s.display?.getSubtitleTracks);
  const setSubtitlePreference = usePlayerStore(
    (s) => s.display?.setSubtitlePreference,
  );
  const setCaptionAsTrack = usePlayerStore((s) => s.setCaptionAsTrack);
  const enableNativeSubtitles = usePreferencesStore(
    (s) => s.enableNativeSubtitles,
  );

  const captions = useMemo(
    () =>
      captionList.length !== 0 ? captionList : (getHlsCaptionList?.() ?? []),
    [captionList, getHlsCaptionList],
  );

  const setDirectCaption = useCallback(
    (caption: Caption, listItem: CaptionListItem) => {
      setIsOpenSubtitles(!!listItem.opensubtitles);
      setCaption(caption);

      // Only reset subtitle settings if selecting a different caption
      if (selectedCaption?.id !== caption.id) {
        resetSubtitleSpecificSettings();
      }

      setLanguage(caption.language);

      // Use native tracks for MP4 streams instead of custom rendering
      if (source?.type === "file" && enableNativeSubtitles) {
        setCaptionAsTrack(true);
      } else {
        // For HLS sources or when native subtitles are disabled, use custom rendering
        setCaptionAsTrack(false);
      }
    },
    [
      setIsOpenSubtitles,
      setLanguage,
      setCaption,
      resetSubtitleSpecificSettings,
      source,
      setCaptionAsTrack,
      enableNativeSubtitles,
      selectedCaption,
    ],
  );

  const selectCaptionById = useCallback(
    async (captionId: string) => {
      const caption = captions.find((v) => v.id === captionId);
      if (!caption) return;

      const captionToSet: Caption = {
        id: caption.id,
        language: caption.language,
        url: caption.url,
        srtData: "",
      };

      if (!caption.hls) {
        const srtData = await downloadCaption(caption);
        captionToSet.srtData = srtData;
      } else {
        // request a language change to hls, so it can load the subtitles
        await setSubtitlePreference?.(caption.language);
        const track = getSubtitleTracks?.().find(
          (t) => t.id.toString() === caption.id && t.details !== undefined,
        );
        if (!track) return;

        const fragments =
          track.details?.fragments?.filter(
            (frag) => frag !== null && frag.url !== null,
          ) ?? [];

        const vttCaptions = (
          await Promise.all(
            fragments.map(async (frag) => {
              const vtt = await downloadWebVTT(frag.url);
              return parseVttSubtitles(vtt);
            }),
          )
        ).flat();

        const filtered = filterDuplicateCaptionCues(vttCaptions);

        const srtData = subsrt.build(filtered, { format: "srt" });
        captionToSet.srtData = srtData;
      }

      setDirectCaption(captionToSet, caption);
    },
    [captions, getSubtitleTracks, setSubtitlePreference, setDirectCaption],
  );

  const selectLanguage = useCallback(
    async (language: string) => {
      const caption = captions.find((v) => v.language === language);
      if (!caption) return;
      return selectCaptionById(caption.id);
    },
    [captions, selectCaptionById],
  );

  const disable = useCallback(async () => {
    setIsOpenSubtitles(false);
    setCaption(null);
    setLanguage(null);
  }, [setCaption, setLanguage, setIsOpenSubtitles]);

  const selectLastUsedLanguage = useCallback(async () => {
    const language = lastSelectedLanguage ?? "en";
    await selectLanguage(language);
    return true;
  }, [lastSelectedLanguage, selectLanguage]);

  const toggleLastUsed = useCallback(async () => {
    if (enabled) disable();
    else await selectLastUsedLanguage();
  }, [selectLastUsedLanguage, disable, enabled]);

  const selectLastUsedLanguageIfEnabled = useCallback(async () => {
    if (enabled) await selectLastUsedLanguage();
  }, [selectLastUsedLanguage, enabled]);

  const selectRandomCaptionFromLastUsedLanguage = useCallback(async () => {
    const language = lastSelectedLanguage ?? "en";

    // Filter captions by language
    const languageCaptions = captions.filter(
      (caption) => caption.language === language,
    );

    // If no captions exist for that language, return early
    if (languageCaptions.length === 0) return;

    // Filter out the currently selected caption if possible
    const availableCaptions = languageCaptions.filter(
      (caption) => caption.id !== selectedCaption?.id,
    );

    // If we filtered out all captions (only one caption available), use all captions
    const captionsToChooseFrom =
      availableCaptions.length > 0 ? availableCaptions : languageCaptions;

    // Pick a random caption
    const randomIndex = Math.floor(Math.random() * captionsToChooseFrom.length);
    const randomCaption = captionsToChooseFrom[randomIndex];

    // Select the random caption
    await selectCaptionById(randomCaption.id);
  }, [lastSelectedLanguage, captions, selectedCaption, selectCaptionById]);

  // Validate selected caption when caption list changes
  useEffect(() => {
    if (!selectedCaption) return;

    // Skip validation for custom/pasted captions that aren't in the caption list
    const isCustomCaption =
      selectedCaption.id === "custom-caption" ||
      selectedCaption.id === "pasted-caption";

    if (isCustomCaption) return;

    const isSelectedCaptionStillAvailable = captions.some(
      (caption) =>
        caption.id ===
        (currentTranslateTask
          ? currentTranslateTask.targetCaption
          : selectedCaption
        ).id,
    );

    if (!isSelectedCaptionStillAvailable) {
      // Try to find a caption with the same language
      const sameLanguageCaption = captions.find(
        (caption) =>
          caption.language ===
          (currentTranslateTask
            ? currentTranslateTask.targetCaption
            : selectedCaption
          ).language,
      );

      if (sameLanguageCaption) {
        // Automatically select the first caption with the same language
        selectCaptionById(sameLanguageCaption.id);
      } else {
        // No caption with the same language found, clear the selection
        setCaption(null);
      }
    }
  }, [
    captions,
    selectedCaption,
    setCaption,
    selectCaptionById,
    currentTranslateTask,
  ]);

  return {
    selectLanguage,
    disable,
    selectLastUsedLanguage,
    toggleLastUsed,
    selectLastUsedLanguageIfEnabled,
    setDirectCaption,
    selectCaptionById,
    selectRandomCaptionFromLastUsedLanguage,
  };
}
