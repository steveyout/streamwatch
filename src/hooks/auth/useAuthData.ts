import { useCallback } from "react";

import { LoginResponse, SessionResponse } from "@/backend/accounts/auth";
import { SettingsResponse } from "@/backend/accounts/settings";
import {
  BookmarkResponse,
  ProgressResponse,
  UserResponse,
  WatchHistoryResponse,
  bookmarkResponsesToEntries,
  progressResponsesToEntries,
  watchHistoryResponsesToEntries,
} from "@/backend/accounts/user";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { useLanguageStore } from "@/stores/language";
import { usePreferencesStore } from "@/stores/preferences";
import { useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { useThemeStore } from "@/stores/theme";
import { useWatchHistoryStore } from "@/stores/watchHistory";

export function useAuthData() {
  const loggedIn = !!useAuthStore((s) => s.account);
  const setAccount = useAuthStore((s) => s.setAccount);
  const removeAccount = useAuthStore((s) => s.removeAccount);
  const setProxySet = useAuthStore((s) => s.setProxySet);
  const clearBookmarks = useBookmarkStore((s) => s.clear);
  const clearProgress = useProgressStore((s) => s.clear);
  const clearWatchHistory = useWatchHistoryStore((s) => s.clear);
  const clearGroupOrder = useGroupOrderStore((s) => s.clear);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAppLanguage = useLanguageStore((s) => s.setLanguage);
  const importSubtitleLanguage = useSubtitleStore(
    (s) => s.importSubtitleLanguage,
  );
  const setFebboxKey = usePreferencesStore((s) => s.setFebboxKey);
  const setdebridToken = usePreferencesStore((s) => s.setdebridToken);
  const setdebridService = usePreferencesStore((s) => s.setdebridService);

  const replaceBookmarks = useBookmarkStore((s) => s.replaceBookmarks);
  const replaceItems = useProgressStore((s) => s.replaceItems);
  const replaceWatchHistory = useWatchHistoryStore((s) => s.replaceItems);

  const setEnableThumbnails = usePreferencesStore((s) => s.setEnableThumbnails);
  const setEnableAutoplay = usePreferencesStore((s) => s.setEnableAutoplay);
  const setEnableSkipCredits = usePreferencesStore(
    (s) => s.setEnableSkipCredits,
  );
  const setEnableDiscover = usePreferencesStore((s) => s.setEnableDiscover);
  const setEnableFeatured = usePreferencesStore((s) => s.setEnableFeatured);
  const setEnableDetailsModal = usePreferencesStore(
    (s) => s.setEnableDetailsModal,
  );
  const setEnableImageLogos = usePreferencesStore((s) => s.setEnableImageLogos);
  const setEnableCarouselView = usePreferencesStore(
    (s) => s.setEnableCarouselView,
  );
  const setForceCompactEpisodeView = usePreferencesStore(
    (s) => s.setForceCompactEpisodeView,
  );
  const setSourceOrder = usePreferencesStore((s) => s.setSourceOrder);
  const setEnableSourceOrder = usePreferencesStore(
    (s) => s.setEnableSourceOrder,
  );
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const setEnableLastSuccessfulSource = usePreferencesStore(
    (s) => s.setEnableLastSuccessfulSource,
  );
  const setEmbedOrder = usePreferencesStore((s) => s.setEmbedOrder);
  const setEnableEmbedOrder = usePreferencesStore((s) => s.setEnableEmbedOrder);

  const setProxyTmdb = usePreferencesStore((s) => s.setProxyTmdb);

  const setEnableLowPerformanceMode = usePreferencesStore(
    (s) => s.setEnableLowPerformanceMode,
  );
  const setEnableNativeSubtitles = usePreferencesStore(
    (s) => s.setEnableNativeSubtitles,
  );
  const setEnableHoldToBoost = usePreferencesStore(
    (s) => s.setEnableHoldToBoost,
  );
  const setHomeSectionOrder = usePreferencesStore((s) => s.setHomeSectionOrder);
  const setEnableDoubleClickToSeek = usePreferencesStore(
    (s) => s.setEnableDoubleClickToSeek,
  );
  const setManualSourceSelection = usePreferencesStore(
    (s) => s.setManualSourceSelection,
  );
  const setEnableAutoResumeOnPlaybackError = usePreferencesStore(
    (s) => s.setEnableAutoResumeOnPlaybackError,
  );
  const setKeyboardShortcuts = usePreferencesStore(
    (s) => s.setKeyboardShortcuts,
  );
  const setEnableMinimalCards = usePreferencesStore(
    (s) => s.setEnableMinimalCards,
  );

  const login = useCallback(
    async (
      loginResponse: LoginResponse,
      user: UserResponse,
      session: SessionResponse,
      seed: string,
    ) => {
      const account = {
        token: loginResponse.token,
        userId: user.id,
        sessionId: loginResponse.session.id,
        deviceName: session.device,
        profile: user.profile,
        nickname: user.nickname,
        seed,
      };
      setAccount(account);
      return account;
    },
    [setAccount],
  );

  const logout = useCallback(async () => {
    removeAccount();
    clearBookmarks();
    clearProgress();
    clearWatchHistory();
    clearGroupOrder();
    setFebboxKey(null);
  }, [
    removeAccount,
    clearBookmarks,
    clearProgress,
    clearWatchHistory,
    clearGroupOrder,
    setFebboxKey,
  ]);

  const syncData = useCallback(
    async (
      _user: UserResponse,
      _session: SessionResponse,
      progress: ProgressResponse[],
      bookmarks: BookmarkResponse[],
      watchHistory: WatchHistoryResponse[],
      settings: SettingsResponse,
      groupOrder: { groupOrder: string[] },
    ) => {
      replaceBookmarks(bookmarkResponsesToEntries(bookmarks));
      replaceItems(progressResponsesToEntries(progress));
      replaceWatchHistory(watchHistoryResponsesToEntries(watchHistory));

      if (groupOrder?.groupOrder) {
        useGroupOrderStore.getState().setGroupOrder(groupOrder.groupOrder);
      }

      if (settings.applicationLanguage) {
        setAppLanguage(settings.applicationLanguage);
      }

      if (settings.defaultSubtitleLanguage) {
        importSubtitleLanguage(settings.defaultSubtitleLanguage);
      }

      if (settings.applicationTheme) {
        setTheme(settings.applicationTheme);
      }

      if (settings.proxyUrls) {
        setProxySet(settings.proxyUrls);
      }

      if (settings.enableThumbnails !== undefined) {
        setEnableThumbnails(settings.enableThumbnails);
      }

      if (settings.enableAutoplay !== undefined) {
        setEnableAutoplay(settings.enableAutoplay);
      }

      if (settings.enableSkipCredits !== undefined) {
        setEnableSkipCredits(settings.enableSkipCredits);
      }

      if (settings.enableDiscover !== undefined) {
        setEnableDiscover(settings.enableDiscover);
      }

      if (settings.enableFeatured !== undefined) {
        setEnableFeatured(settings.enableFeatured);
      }

      if (settings.enableDetailsModal !== undefined) {
        setEnableDetailsModal(settings.enableDetailsModal);
      }

      if (settings.enableImageLogos !== undefined) {
        setEnableImageLogos(settings.enableImageLogos);
      }

      if (settings.enableCarouselView !== undefined) {
        setEnableCarouselView(settings.enableCarouselView);
      }

      if (settings.forceCompactEpisodeView !== undefined) {
        setForceCompactEpisodeView(settings.forceCompactEpisodeView);
      }

      if (settings.sourceOrder !== undefined) {
        setSourceOrder(settings.sourceOrder ?? []);
      }

      if (settings.enableSourceOrder !== undefined) {
        setEnableSourceOrder(settings.enableSourceOrder);
      }

      if (settings.lastSuccessfulSource !== undefined) {
        setLastSuccessfulSource(settings.lastSuccessfulSource);
      }

      if (settings.enableLastSuccessfulSource !== undefined) {
        setEnableLastSuccessfulSource(settings.enableLastSuccessfulSource);
      }

      if (settings.embedOrder !== undefined) {
        setEmbedOrder(settings.embedOrder ?? []);
      }

      if (settings.enableEmbedOrder !== undefined) {
        setEnableEmbedOrder(settings.enableEmbedOrder);
      }

      if (settings.proxyTmdb !== undefined) {
        setProxyTmdb(settings.proxyTmdb);
      }

      if (settings.febboxKey !== undefined) {
        setFebboxKey(settings.febboxKey);
      }

      if (settings.debridToken !== undefined) {
        setdebridToken(settings.debridToken);
      }

      if (settings.debridService !== undefined) {
        setdebridService(settings.debridService);
      }

      if (settings.enableLowPerformanceMode !== undefined) {
        setEnableLowPerformanceMode(settings.enableLowPerformanceMode);
      }

      if (settings.enableNativeSubtitles !== undefined) {
        setEnableNativeSubtitles(settings.enableNativeSubtitles);
      }

      if (settings.enableHoldToBoost !== undefined) {
        setEnableHoldToBoost(settings.enableHoldToBoost);
      }

      if (settings.homeSectionOrder !== undefined) {
        setHomeSectionOrder(
          settings.homeSectionOrder ?? ["watching", "bookmarks"],
        );
      }

      if (settings.manualSourceSelection !== undefined) {
        setManualSourceSelection(settings.manualSourceSelection);
      }

      if (settings.enableDoubleClickToSeek !== undefined) {
        setEnableDoubleClickToSeek(settings.enableDoubleClickToSeek);
      }

      if (settings.enableAutoResumeOnPlaybackError !== undefined) {
        setEnableAutoResumeOnPlaybackError(
          settings.enableAutoResumeOnPlaybackError,
        );
      }

      if (settings.keyboardShortcuts !== undefined) {
        setKeyboardShortcuts(settings.keyboardShortcuts);
      }

      if (settings.enableMinimalCards !== undefined) {
        setEnableMinimalCards(settings.enableMinimalCards);
      }
    },
    [
      replaceBookmarks,
      replaceItems,
      replaceWatchHistory,
      setAppLanguage,
      importSubtitleLanguage,
      setTheme,
      setProxySet,
      setEnableThumbnails,
      setEnableAutoplay,
      setEnableSkipCredits,
      setEnableDiscover,
      setEnableFeatured,
      setEnableDetailsModal,
      setEnableImageLogos,
      setEnableCarouselView,
      setForceCompactEpisodeView,
      setSourceOrder,
      setEnableSourceOrder,
      setLastSuccessfulSource,
      setEnableLastSuccessfulSource,
      setEmbedOrder,
      setEnableEmbedOrder,
      setProxyTmdb,
      setFebboxKey,
      setdebridToken,
      setdebridService,
      setEnableLowPerformanceMode,
      setEnableNativeSubtitles,
      setEnableHoldToBoost,
      setHomeSectionOrder,
      setManualSourceSelection,
      setEnableDoubleClickToSeek,
      setEnableAutoResumeOnPlaybackError,
      setKeyboardShortcuts,
      setEnableMinimalCards,
    ],
  );

  return {
    loggedIn,
    login,
    logout,
    syncData,
  };
}
