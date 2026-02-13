import { useCallback } from "react";

// import { SessionResponse } from "@/backend/accounts/auth";
import { bookmarkMediaToInput } from "@/backend/accounts/bookmarks";
import {
  base64ToBuffer,
  bytesToBase64,
  bytesToBase64Url,
  encryptData,
  // keysFromMnemonic,
  keysFromSeed,
  signChallenge,
} from "@/backend/accounts/crypto";
import {
  importBookmarks,
  importGroupOrder,
  importProgress,
  importSettings,
  importWatchHistory,
} from "@/backend/accounts/import";
// import { getLoginChallengeToken, loginAccount } from "@/backend/accounts/login";
import { progressMediaItemToInputs } from "@/backend/accounts/progress";
import {
  getRegisterChallengeToken,
  registerAccount,
} from "@/backend/accounts/register";
import { watchHistoryItemsToInputs } from "@/backend/accounts/watchHistory";
// import { removeSession } from "@/backend/accounts/sessions";
// import { getSettings } from "@/backend/accounts/settings";
// import {
//   UserResponse,
//   getBookmarks,
//   getProgress,
//   getUser,
// } from "@/backend/accounts/user";
import { useAuthData } from "@/hooks/auth/useAuthData";
// import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import { BookmarkMediaItem, useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { usePreferencesStore } from "@/stores/preferences";
import { ProgressMediaItem, useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { WatchHistoryItem, useWatchHistoryStore } from "@/stores/watchHistory";

export interface RegistrationData {
  recaptchaToken?: string;
  mnemonic: string;
  userData: {
    device: string;
    profile: {
      colorA: string;
      colorB: string;
      icon: string;
    };
  };
}

export interface LoginData {
  mnemonic: string;
  userData: {
    device: string;
  };
}

export function useMigration() {
  const currentAccount = useAuthStore((s) => s.account);
  const progress = useProgressStore((s) => s.items);
  const watchHistory = useWatchHistoryStore((s) => s.items);
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const groupOrder = useGroupOrderStore((s) => s.groupOrder);
  const preferences = usePreferencesStore.getState();
  const subtitleLanguage = useSubtitleStore((s) => s.lastSelectedLanguage);
  const { login: userDataLogin } = useAuthData();

  const migrate = useCallback(
    async (backendUrl: string, recaptchaToken?: string) => {
      if (!currentAccount) return;

      const importData = async (
        backendUrlInner: string,
        account: AccountWithToken,
        progressItems: Record<string, ProgressMediaItem>,
        watchHistoryItems: Record<string, WatchHistoryItem>,
        bookmarkItems: Record<string, BookmarkMediaItem>,
        groupOrderItems: string[],
      ) => {
        if (
          Object.keys(progressItems).length === 0 &&
          Object.keys(watchHistoryItems).length === 0 &&
          Object.keys(bookmarkItems).length === 0 &&
          groupOrderItems.length === 0
        ) {
          return;
        }

        const progressInputs = Object.entries(progressItems).flatMap(
          ([tmdbId, item]) => progressMediaItemToInputs(tmdbId, item),
        );

        const watchHistoryInputs = watchHistoryItemsToInputs(watchHistoryItems);

        const bookmarkInputs = Object.entries(bookmarkItems).map(
          ([tmdbId, item]) => bookmarkMediaToInput(tmdbId, item),
        );

        const importPromises = [
          importProgress(backendUrlInner, account, progressInputs),
          importWatchHistory(backendUrlInner, account, watchHistoryInputs),
          importBookmarks(backendUrlInner, account, bookmarkInputs),
        ];

        // Import group order if it exists
        if (groupOrderItems.length > 0) {
          importPromises.push(
            importGroupOrder(backendUrlInner, account, groupOrderItems),
          );
        }

        // Import settings/preferences
        importPromises.push(
          importSettings(backendUrlInner, account, {
            defaultSubtitleLanguage: subtitleLanguage || undefined,
            febboxKey: preferences.febboxKey,
            debridToken: preferences.debridToken,
            debridService: preferences.debridService,
            enableThumbnails: preferences.enableThumbnails,
            enableAutoplay: preferences.enableAutoplay,
            enableSkipCredits: preferences.enableSkipCredits,
            enableDiscover: preferences.enableDiscover,
            enableFeatured: preferences.enableFeatured,
            enableDetailsModal: preferences.enableDetailsModal,
            enableImageLogos: preferences.enableImageLogos,
            enableCarouselView: preferences.enableCarouselView,
            forceCompactEpisodeView: preferences.forceCompactEpisodeView,
            sourceOrder:
              preferences.sourceOrder.length > 0
                ? preferences.sourceOrder
                : undefined,
            enableSourceOrder: preferences.enableSourceOrder,
            lastSuccessfulSource: preferences.lastSuccessfulSource,
            enableLastSuccessfulSource: preferences.enableLastSuccessfulSource,
            embedOrder:
              preferences.embedOrder.length > 0
                ? preferences.embedOrder
                : undefined,
            enableEmbedOrder: preferences.enableEmbedOrder,
            proxyTmdb: preferences.proxyTmdb,
            enableLowPerformanceMode: preferences.enableLowPerformanceMode,
            enableNativeSubtitles: preferences.enableNativeSubtitles,
            enableHoldToBoost: preferences.enableHoldToBoost,
            homeSectionOrder:
              preferences.homeSectionOrder.length > 0
                ? preferences.homeSectionOrder
                : undefined,
            manualSourceSelection: preferences.manualSourceSelection,
            enableDoubleClickToSeek: preferences.enableDoubleClickToSeek,
            enableAutoResumeOnPlaybackError:
              preferences.enableAutoResumeOnPlaybackError,
          }),
        );

        await Promise.all(importPromises);
      };

      const { challenge } = await getRegisterChallengeToken(
        backendUrl,
        recaptchaToken || undefined, // Pass undefined if token is not provided
      );
      const keys = await keysFromSeed(base64ToBuffer(currentAccount.seed));
      const signature = await signChallenge(keys, challenge);
      const registerResult = await registerAccount(backendUrl, {
        challenge: {
          code: challenge,
          signature,
        },
        publicKey: bytesToBase64Url(keys.publicKey),
        device: await encryptData(currentAccount.deviceName, keys.seed),
        profile: currentAccount.profile,
      });

      const account = await userDataLogin(
        registerResult,
        registerResult.user,
        registerResult.session,
        bytesToBase64(keys.seed),
      );

      await importData(
        backendUrl,
        account,
        progress,
        watchHistory,
        bookmarks,
        groupOrder,
      );

      return account;
    },
    [
      currentAccount,
      userDataLogin,
      bookmarks,
      progress,
      watchHistory,
      groupOrder,
      preferences,
      subtitleLanguage,
    ],
  );

  return {
    migrate,
  };
}
