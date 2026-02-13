import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SubtitleStyling } from "@/stores/subtitles";
import { usePreviewThemeStore } from "@/stores/theme";

export function useDerived<T>(
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void, boolean] {
  const [overwrite, setOverwrite] = useState<T | undefined>(undefined);
  useEffect(() => {
    setOverwrite(undefined);
  }, [initial]);
  const changed = useMemo(
    () =>
      JSON.stringify(overwrite) !== JSON.stringify(initial) &&
      overwrite !== undefined,
    [overwrite, initial],
  );
  const setter = useCallback<Dispatch<SetStateAction<T>>>(
    (inp) => {
      if (!(inp instanceof Function)) setOverwrite(inp);
      else setOverwrite((s) => inp(s !== undefined ? s : initial));
    },
    [initial, setOverwrite],
  );
  const data = overwrite === undefined ? initial : overwrite;

  const reset = useCallback(() => setOverwrite(undefined), [setOverwrite]);

  return [data, setter, reset, changed];
}

export function useSettingsState(
  theme: string | null,
  appLanguage: string,
  subtitleStyling: SubtitleStyling,
  deviceName: string,
  nickname: string,
  proxyUrls: string[] | null,
  backendUrl: string | null,
  febboxKey: string | null,
  debridToken: string | null,
  debridService: string,
  tidbKey: string | null,
  profile:
    | {
        colorA: string;
        colorB: string;
        icon: string;
      }
    | undefined,
  enableThumbnails: boolean,
  enableAutoplay: boolean,
  enableDiscover: boolean,
  enableFeatured: boolean,
  enableDetailsModal: boolean,
  sourceOrder: string[],
  enableSourceOrder: boolean,
  lastSuccessfulSource: string | null,
  enableLastSuccessfulSource: boolean,
  embedOrder: string[],
  enableEmbedOrder: boolean,
  proxyTmdb: boolean,
  enableSkipCredits: boolean,
  enableImageLogos: boolean,
  enableCarouselView: boolean,
  enableMinimalCards: boolean,
  forceCompactEpisodeView: boolean,
  enableLowPerformanceMode: boolean,
  enableNativeSubtitles: boolean,
  enableHoldToBoost: boolean,
  homeSectionOrder: string[],
  manualSourceSelection: boolean,
  enableDoubleClickToSeek: boolean,
  enableAutoResumeOnPlaybackError: boolean,
) {
  const [proxyUrlsState, setProxyUrls, resetProxyUrls, proxyUrlsChanged] =
    useDerived(proxyUrls);
  const [backendUrlState, setBackendUrl, resetBackendUrl, backendUrlChanged] =
    useDerived(backendUrl);
  const [febboxKeyState, setFebboxKey, resetFebboxKey, febboxKeyChanged] =
    useDerived(febboxKey);
  const [
    debridTokenState,
    setdebridToken,
    resetdebridToken,
    debridTokenChanged,
  ] = useDerived(debridToken);
  const [
    debridServiceState,
    setdebridService,
    _resetdebridService,
    debridServiceChanged,
  ] = useDerived(debridService);
  const [tidbKeyState, setTIDBKey, resetTIDBKey, tidbKeyChanged] =
    useDerived(tidbKey);
  const [themeState, setTheme, resetTheme, themeChanged] = useDerived(theme);
  const setPreviewTheme = usePreviewThemeStore((s) => s.setPreviewTheme);
  const resetPreviewTheme = useCallback(
    () => setPreviewTheme(theme),
    [setPreviewTheme, theme],
  );
  const [
    appLanguageState,
    setAppLanguage,
    resetAppLanguage,
    appLanguageChanged,
  ] = useDerived(appLanguage);
  const [subStylingState, setSubStyling, resetSubStyling, subStylingChanged] =
    useDerived(subtitleStyling);
  const [
    deviceNameState,
    setDeviceNameState,
    resetDeviceName,
    deviceNameChanged,
  ] = useDerived(deviceName);
  const [nicknameState, setNicknameState, resetNickname, nicknameChanged] =
    useDerived(nickname);
  const [profileState, setProfileState, resetProfile, profileChanged] =
    useDerived(profile);
  const [
    enableThumbnailsState,
    setEnableThumbnailsState,
    resetEnableThumbnails,
    enableThumbnailsChanged,
  ] = useDerived(enableThumbnails);
  const [
    enableAutoplayState,
    setEnableAutoplayState,
    resetEnableAutoplay,
    enableAutoplayChanged,
  ] = useDerived(enableAutoplay);
  const [
    enableSkipCreditsState,
    setEnableSkipCreditsState,
    resetEnableSkipCredits,
    enableSkipCreditsChanged,
  ] = useDerived(enableSkipCredits);
  const [
    enableDiscoverState,
    setEnableDiscoverState,
    resetEnableDiscover,
    enableDiscoverChanged,
  ] = useDerived(enableDiscover);
  const [
    enableFeaturedState,
    setEnableFeaturedState,
    resetEnableFeatured,
    enableFeaturedChanged,
  ] = useDerived(enableFeatured);
  const [
    enableDetailsModalState,
    setEnableDetailsModalState,
    resetEnableDetailsModal,
    enableDetailsModalChanged,
  ] = useDerived(enableDetailsModal);
  const [
    enableImageLogosState,
    setEnableImageLogosState,
    resetEnableImageLogos,
    enableImageLogosChanged,
  ] = useDerived(enableImageLogos);
  const [
    sourceOrderState,
    setSourceOrderState,
    resetSourceOrder,
    sourceOrderChanged,
  ] = useDerived(sourceOrder);
  const [
    enableSourceOrderState,
    setEnableSourceOrderState,
    resetEnableSourceOrder,
    enableSourceOrderChanged,
  ] = useDerived(enableSourceOrder);
  const [
    lastSuccessfulSourceState,
    setLastSuccessfulSourceState,
    resetLastSuccessfulSource,
    lastSuccessfulSourceChanged,
  ] = useDerived(lastSuccessfulSource);
  const [
    enableLastSuccessfulSourceState,
    setEnableLastSuccessfulSourceState,
    resetEnableLastSuccessfulSource,
    enableLastSuccessfulSourceChanged,
  ] = useDerived(enableLastSuccessfulSource);
  const [
    embedOrderState,
    setEmbedOrderState,
    resetEmbedOrder,
    embedOrderChanged,
  ] = useDerived(embedOrder);
  const [
    enableEmbedOrderState,
    setEnableEmbedOrderState,
    resetEnableEmbedOrder,
    enableEmbedOrderChanged,
  ] = useDerived(enableEmbedOrder);
  const [proxyTmdbState, setProxyTmdbState, resetProxyTmdb, proxyTmdbChanged] =
    useDerived(proxyTmdb);
  const [
    enableCarouselViewState,
    setEnableCarouselViewState,
    resetEnableCarouselView,
    enableCarouselViewChanged,
  ] = useDerived(enableCarouselView);
  const [
    enableMinimalCardsState,
    setEnableMinimalCardsState,
    resetEnableMinimalCards,
    enableMinimalCardsChanged,
  ] = useDerived(enableMinimalCards);
  const [
    forceCompactEpisodeViewState,
    setForceCompactEpisodeViewState,
    resetForceCompactEpisodeView,
    forceCompactEpisodeViewChanged,
  ] = useDerived(forceCompactEpisodeView);
  const [
    enableLowPerformanceModeState,
    setEnableLowPerformanceModeState,
    resetEnableLowPerformanceMode,
    enableLowPerformanceModeChanged,
  ] = useDerived(enableLowPerformanceMode);
  const [
    enableNativeSubtitlesState,
    setEnableNativeSubtitlesState,
    resetEnableNativeSubtitles,
    enableNativeSubtitlesChanged,
  ] = useDerived(enableNativeSubtitles);
  const [
    enableHoldToBoostState,
    setEnableHoldToBoostState,
    resetEnableHoldToBoost,
    enableHoldToBoostChanged,
  ] = useDerived(enableHoldToBoost);
  const [
    homeSectionOrderState,
    setHomeSectionOrderState,
    resetHomeSectionOrder,
    homeSectionOrderChanged,
  ] = useDerived(homeSectionOrder);
  const [
    manualSourceSelectionState,
    setManualSourceSelectionState,
    resetManualSourceSelection,
    manualSourceSelectionChanged,
  ] = useDerived(manualSourceSelection);
  const [
    enableDoubleClickToSeekState,
    setEnableDoubleClickToSeekState,
    resetEnableDoubleClickToSeek,
    enableDoubleClickToSeekChanged,
  ] = useDerived(enableDoubleClickToSeek);
  const [
    enableAutoResumeOnPlaybackErrorState,
    setEnableAutoResumeOnPlaybackErrorState,
    resetEnableAutoResumeOnPlaybackError,
    enableAutoResumeOnPlaybackErrorChanged,
  ] = useDerived(enableAutoResumeOnPlaybackError);

  function reset() {
    resetTheme();
    resetPreviewTheme();
    resetAppLanguage();
    resetSubStyling();
    resetProxyUrls();
    resetBackendUrl();
    resetFebboxKey();
    resetdebridToken();
    resetTIDBKey();
    resetDeviceName();
    resetNickname();
    resetProfile();
    resetEnableThumbnails();
    resetEnableAutoplay();
    resetEnableSkipCredits();
    resetEnableDiscover();
    resetEnableFeatured();
    resetEnableDetailsModal();
    resetEnableImageLogos();
    resetSourceOrder();
    resetEnableSourceOrder();
    resetLastSuccessfulSource();
    resetEnableLastSuccessfulSource();
    resetEmbedOrder();
    resetEnableEmbedOrder();
    resetProxyTmdb();
    resetEnableCarouselView();
    resetEnableMinimalCards();
    resetForceCompactEpisodeView();
    resetEnableLowPerformanceMode();
    resetEnableNativeSubtitles();
    resetEnableHoldToBoost();
    resetHomeSectionOrder();
    resetManualSourceSelection();
    resetEnableDoubleClickToSeek();
    resetEnableAutoResumeOnPlaybackError();
  }

  const changed =
    themeChanged ||
    appLanguageChanged ||
    subStylingChanged ||
    deviceNameChanged ||
    nicknameChanged ||
    backendUrlChanged ||
    proxyUrlsChanged ||
    febboxKeyChanged ||
    debridTokenChanged ||
    debridServiceChanged ||
    tidbKeyChanged ||
    profileChanged ||
    enableThumbnailsChanged ||
    enableAutoplayChanged ||
    enableSkipCreditsChanged ||
    enableDiscoverChanged ||
    enableFeaturedChanged ||
    enableDetailsModalChanged ||
    enableImageLogosChanged ||
    sourceOrderChanged ||
    enableSourceOrderChanged ||
    lastSuccessfulSourceChanged ||
    enableLastSuccessfulSourceChanged ||
    embedOrderChanged ||
    enableEmbedOrderChanged ||
    proxyTmdbChanged ||
    enableCarouselViewChanged ||
    enableMinimalCardsChanged ||
    forceCompactEpisodeViewChanged ||
    enableLowPerformanceModeChanged ||
    enableNativeSubtitlesChanged ||
    enableHoldToBoostChanged ||
    homeSectionOrderChanged ||
    manualSourceSelectionChanged ||
    enableDoubleClickToSeekChanged ||
    enableAutoResumeOnPlaybackErrorChanged;

  return {
    reset,
    changed,
    theme: {
      state: themeState,
      set: setTheme,
      changed: themeChanged,
    },
    appLanguage: {
      state: appLanguageState,
      set: setAppLanguage,
      changed: appLanguageChanged,
    },
    subtitleStyling: {
      state: subStylingState,
      set: setSubStyling,
      changed: subStylingChanged,
    },
    deviceName: {
      state: deviceNameState,
      set: setDeviceNameState,
      changed: deviceNameChanged,
    },
    nickname: {
      state: nicknameState,
      set: setNicknameState,
      changed: nicknameChanged,
    },
    proxyUrls: {
      state: proxyUrlsState,
      set: setProxyUrls,
      changed: proxyUrlsChanged,
    },
    backendUrl: {
      state: backendUrlState,
      set: setBackendUrl,
      changed: backendUrlChanged,
    },
    febboxKey: {
      state: febboxKeyState,
      set: setFebboxKey,
      changed: febboxKeyChanged,
    },
    debridToken: {
      state: debridTokenState,
      set: setdebridToken,
      changed: debridTokenChanged,
    },
    debridService: {
      state: debridServiceState,
      set: setdebridService,
      changed: debridServiceChanged,
    },
    tidbKey: {
      state: tidbKeyState,
      set: setTIDBKey,
      changed: tidbKeyChanged,
    },
    profile: {
      state: profileState,
      set: setProfileState,
      changed: profileChanged,
    },
    enableThumbnails: {
      state: enableThumbnailsState,
      set: setEnableThumbnailsState,
      changed: enableThumbnailsChanged,
    },
    enableAutoplay: {
      state: enableAutoplayState,
      set: setEnableAutoplayState,
      changed: enableAutoplayChanged,
    },
    enableSkipCredits: {
      state: enableSkipCreditsState,
      set: setEnableSkipCreditsState,
      changed: enableSkipCreditsChanged,
    },
    enableDiscover: {
      state: enableDiscoverState,
      set: setEnableDiscoverState,
      changed: enableDiscoverChanged,
    },
    enableFeatured: {
      state: enableFeaturedState,
      set: setEnableFeaturedState,
      changed: enableFeaturedChanged,
    },
    enableDetailsModal: {
      state: enableDetailsModalState,
      set: setEnableDetailsModalState,
      changed: enableDetailsModalChanged,
    },
    enableImageLogos: {
      state: enableImageLogosState,
      set: setEnableImageLogosState,
      changed: enableImageLogosChanged,
    },
    sourceOrder: {
      state: sourceOrderState,
      set: setSourceOrderState,
      changed: sourceOrderChanged,
    },
    enableSourceOrder: {
      state: enableSourceOrderState,
      set: setEnableSourceOrderState,
      changed: enableSourceOrderChanged,
    },
    lastSuccessfulSource: {
      state: lastSuccessfulSourceState,
      set: setLastSuccessfulSourceState,
      changed: lastSuccessfulSourceChanged,
    },
    enableLastSuccessfulSource: {
      state: enableLastSuccessfulSourceState,
      set: setEnableLastSuccessfulSourceState,
      changed: enableLastSuccessfulSourceChanged,
    },
    proxyTmdb: {
      state: proxyTmdbState,
      set: setProxyTmdbState,
      changed: proxyTmdbChanged,
    },
    embedOrder: {
      state: embedOrderState,
      set: setEmbedOrderState,
      changed: embedOrderChanged,
    },
    enableEmbedOrder: {
      state: enableEmbedOrderState,
      set: setEnableEmbedOrderState,
      changed: enableEmbedOrderChanged,
    },
    enableCarouselView: {
      state: enableCarouselViewState,
      set: setEnableCarouselViewState,
      changed: enableCarouselViewChanged,
    },
    enableMinimalCards: {
      state: enableMinimalCardsState,
      set: setEnableMinimalCardsState,
      changed: enableMinimalCardsChanged,
    },
    forceCompactEpisodeView: {
      state: forceCompactEpisodeViewState,
      set: setForceCompactEpisodeViewState,
      changed: forceCompactEpisodeViewChanged,
    },
    enableLowPerformanceMode: {
      state: enableLowPerformanceModeState,
      set: setEnableLowPerformanceModeState,
      changed: enableLowPerformanceModeChanged,
    },
    enableNativeSubtitles: {
      state: enableNativeSubtitlesState,
      set: setEnableNativeSubtitlesState,
      changed: enableNativeSubtitlesChanged,
    },
    enableHoldToBoost: {
      state: enableHoldToBoostState,
      set: setEnableHoldToBoostState,
      changed: enableHoldToBoostChanged,
    },
    homeSectionOrder: {
      state: homeSectionOrderState,
      set: setHomeSectionOrderState,
      changed: homeSectionOrderChanged,
    },
    manualSourceSelection: {
      state: manualSourceSelectionState,
      set: setManualSourceSelectionState,
      changed: manualSourceSelectionChanged,
    },
    enableDoubleClickToSeek: {
      state: enableDoubleClickToSeekState,
      set: setEnableDoubleClickToSeekState,
      changed: enableDoubleClickToSeekChanged,
    },
    enableAutoResumeOnPlaybackError: {
      state: enableAutoResumeOnPlaybackErrorState,
      set: setEnableAutoResumeOnPlaybackErrorState,
      changed: enableAutoResumeOnPlaybackErrorChanged,
    },
  };
}
