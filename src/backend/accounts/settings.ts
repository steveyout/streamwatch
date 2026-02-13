import { ofetch } from "ofetch";

import { getAuthHeaders } from "@/backend/accounts/auth";
import { AccountWithToken } from "@/stores/auth";
import { KeyboardShortcuts } from "@/utils/keyboardShortcuts";

export interface SettingsInput {
  applicationLanguage?: string;
  applicationTheme?: string | null;
  defaultSubtitleLanguage?: string;
  proxyUrls?: string[] | null;
  febboxKey?: string | null;
  debridToken?: string | null;
  debridService?: string;
  enableThumbnails?: boolean;
  enableAutoplay?: boolean;
  enableSkipCredits?: boolean;
  enableDiscover?: boolean;
  enableFeatured?: boolean;
  enableDetailsModal?: boolean;
  enableImageLogos?: boolean;
  enableCarouselView?: boolean;
  enableMinimalCards?: boolean;
  forceCompactEpisodeView?: boolean;
  sourceOrder?: string[] | null;
  enableSourceOrder?: boolean;
  lastSuccessfulSource?: string | null;
  enableLastSuccessfulSource?: boolean;
  embedOrder?: string[] | null;
  enableEmbedOrder?: boolean;
  proxyTmdb?: boolean;
  enableLowPerformanceMode?: boolean;
  enableNativeSubtitles?: boolean;
  enableHoldToBoost?: boolean;
  homeSectionOrder?: string[] | null;
  manualSourceSelection?: boolean;
  enableDoubleClickToSeek?: boolean;
  enableAutoResumeOnPlaybackError?: boolean;
  keyboardShortcuts?: KeyboardShortcuts;
}

export interface SettingsResponse {
  applicationTheme?: string | null;
  applicationLanguage?: string | null;
  defaultSubtitleLanguage?: string | null;
  proxyUrls?: string[] | null;
  febboxKey?: string | null;
  debridToken?: string | null;
  debridService?: string;
  enableThumbnails?: boolean;
  enableAutoplay?: boolean;
  enableSkipCredits?: boolean;
  enableDiscover?: boolean;
  enableFeatured?: boolean;
  enableDetailsModal?: boolean;
  enableImageLogos?: boolean;
  enableCarouselView?: boolean;
  enableMinimalCards?: boolean;
  forceCompactEpisodeView?: boolean;
  sourceOrder?: string[] | null;
  enableSourceOrder?: boolean;
  lastSuccessfulSource?: string | null;
  enableLastSuccessfulSource?: boolean;
  embedOrder?: string[] | null;
  enableEmbedOrder?: boolean;
  proxyTmdb?: boolean;
  enableLowPerformanceMode?: boolean;
  enableNativeSubtitles?: boolean;
  enableHoldToBoost?: boolean;
  homeSectionOrder?: string[] | null;
  manualSourceSelection?: boolean;
  enableDoubleClickToSeek?: boolean;
  enableAutoResumeOnPlaybackError?: boolean;
  keyboardShortcuts?: KeyboardShortcuts;
}

export function updateSettings(
  url: string,
  account: AccountWithToken,
  settings: SettingsInput,
) {
  return ofetch<SettingsResponse>(`/users/${account.userId}/settings`, {
    method: "PUT",
    body: settings,
    baseURL: url,
    headers: getAuthHeaders(account.token),
  });
}

export function getSettings(url: string, account: AccountWithToken) {
  return ofetch<SettingsResponse>(`/users/${account.userId}/settings`, {
    method: "GET",
    baseURL: url,
    headers: getAuthHeaders(account.token),
  });
}
