import classNames from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAsyncFn } from "react-use";

import {
  base64ToBuffer,
  decryptData,
  encryptData,
} from "@/backend/accounts/crypto";
import { getSessions, updateSession } from "@/backend/accounts/sessions";
import { getSettings, updateSettings } from "@/backend/accounts/settings";
import { editUser } from "@/backend/accounts/user";
import { getAllProviders } from "@/backend/providers/providers";
import { Button } from "@/components/buttons/Button";
import { SearchBarInput } from "@/components/form/SearchBar";
import { ThinContainer } from "@/components/layout/ThinContainer";
import { WideContainer } from "@/components/layout/WideContainer";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { UserIcons } from "@/components/UserIcon";
import { Divider } from "@/components/utils/Divider";
import { Heading1, Heading2, Paragraph } from "@/components/utils/Text";
import { Transition } from "@/components/utils/Transition";
import { useAuth } from "@/hooks/auth/useAuth";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { useIsIOS, useIsMobile, useIsPWA } from "@/hooks/useIsMobile";
import { useSettingsState } from "@/hooks/useSettingsState";
import { AccountActionsPart } from "@/pages/parts/settings/AccountActionsPart";
import { AccountEditPart } from "@/pages/parts/settings/AccountEditPart";
import { AppearancePart } from "@/pages/parts/settings/AppearancePart";
import { CaptionsPart } from "@/pages/parts/settings/CaptionsPart";
import { ConnectionsPart } from "@/pages/parts/settings/ConnectionsPart";
import { DeviceListPart } from "@/pages/parts/settings/DeviceListPart";
import { RegisterCalloutPart } from "@/pages/parts/settings/RegisterCalloutPart";
import { SidebarPart } from "@/pages/parts/settings/SidebarPart";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { AccountWithToken, useAuthStore } from "@/stores/auth";
import { useBannerSize } from "@/stores/banner";
import { useLanguageStore } from "@/stores/language";
import { usePreferencesStore } from "@/stores/preferences";
import { useSubtitleStore } from "@/stores/subtitles";
import { usePreviewThemeStore, useThemeStore } from "@/stores/theme";
import { scrollToElement, scrollToHash } from "@/utils/scroll";

import { SubPageLayout } from "./layouts/SubPageLayout";
import { AppInfoPart } from "./parts/settings/AppInfoPart";
import { PreferencesPart } from "./parts/settings/PreferencesPart";

function SettingsLayout(props: {
  className?: string;
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (value: string, force: boolean) => void;
  onSearchUnFocus: (newSearch?: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}) {
  const { className } = props;
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();
  const searchRef = useRef<HTMLInputElement>(null);
  const bannerSize = useBannerSize();

  const isPWA = useIsPWA();
  const isIOS = useIsIOS();
  const isIOSPWA = isIOS && isPWA;

  // Navbar height is 80px (h-20)
  const navbarHeight = 80;
  // On desktop: inline with navbar (same top position + 14px adjustment)
  // On mobile: below navbar (navbar height + banner)
  const topOffset = isMobile
    ? navbarHeight + bannerSize + (isIOSPWA ? 34 : 0)
    : bannerSize + 14;

  return (
    <WideContainer ultraWide classNames="overflow-visible">
      {/* Floating Search Bar - starts in sticky state */}
      <div
        className="fixed left-0 right-0 z-50"
        style={{
          top: `${topOffset}px`,
        }}
      >
        <ThinContainer>
          <SearchBarInput
            ref={searchRef}
            onChange={props.onSearchChange}
            value={props.searchQuery}
            onUnFocus={props.onSearchUnFocus}
            placeholder={t("settings.search.placeholder")}
            isSticky
            hideTooltip
          />
        </ThinContainer>
      </div>

      <div
        className={classNames(
          "grid gap-12",
          isMobile ? "grid-cols-1" : "lg:grid-cols-[280px,1fr]",
        )}
        data-settings-content
      >
        <SidebarPart
          selectedCategory={props.selectedCategory}
          setSelectedCategory={props.setSelectedCategory}
          searchQuery={props.searchQuery}
        />
        <div className={className}>{props.children}</div>
        <div className="block lg:hidden">
          <Divider />
          <AppInfoPart />
        </div>
      </div>
    </WideContainer>
  );
}

export function AccountSettings(props: {
  account: AccountWithToken;
  deviceName: string;
  setDeviceName: (s: string) => void;
  nickname: string;
  setNickname: (s: string) => void;
  colorA: string;
  setColorA: (s: string) => void;
  colorB: string;
  setColorB: (s: string) => void;
  userIcon: UserIcons;
  setUserIcon: (s: UserIcons) => void;
}) {
  const url = useBackendUrl();
  const { account } = props;
  const [sessionsResult, execSessions] = useAsyncFn(() => {
    if (!url) return Promise.resolve([]);
    return getSessions(url, account);
  }, [account, url]);
  useEffect(() => {
    execSessions();
  }, [execSessions]);

  return (
    <>
      <AccountEditPart
        deviceName={props.deviceName}
        setDeviceName={props.setDeviceName}
        nickname={props.nickname}
        setNickname={props.setNickname}
        colorA={props.colorA}
        setColorA={props.setColorA}
        colorB={props.colorB}
        setColorB={props.setColorB}
        userIcon={props.userIcon}
        setUserIcon={props.setUserIcon}
      />
      <DeviceListPart
        error={!!sessionsResult.error}
        loading={sessionsResult.loading}
        sessions={sessionsResult.value ?? []}
        onChange={execSessions}
      />
      <AccountActionsPart />
    </>
  );
}

export function SettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const prevCategoryRef = useRef<string | null>(null);
  const backendChangeModal = useModal("settings-backend-change-confirmation");
  const [pendingBackendChange, setPendingBackendChange] = useState<
    string | null
  >(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashId = hash.substring(1); // Remove the # symbol
      // Check if it's a valid settings category
      const validCategories = [
        "settings-account",
        "settings-preferences",
        "settings-appearance",
        "settings-captions",
        "settings-connection",
      ];

      // Map sub-section hashes to their parent categories
      const subSectionToCategory: Record<string, string> = {
        "source-order": "settings-preferences",
      };

      // Check if it's a sub-section hash
      if (subSectionToCategory[hashId]) {
        const categoryId = subSectionToCategory[hashId];
        setSelectedCategory(categoryId);
        // Wait for the section to render, then scroll
        scrollToHash(hash, { delay: 100 });
      } else if (validCategories.includes(hashId)) {
        // It's a category hash
        setSelectedCategory(hashId);
        scrollToHash(hash);
      } else {
        // Try to find the element anyway (might be a sub-section)
        const element = document.querySelector(hash);
        if (element) {
          // Find which category this element belongs to
          const parentSection = element.closest('[id^="settings-"]');
          if (parentSection) {
            const categoryId = parentSection.id;
            if (validCategories.includes(categoryId)) {
              setSelectedCategory(categoryId);
              scrollToHash(hash, { delay: 100 });
            }
          } else {
            scrollToHash(hash);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle hash changes after initial load
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const hashId = hash.substring(1);
        const validCategories = [
          "settings-account",
          "settings-preferences",
          "settings-appearance",
          "settings-captions",
          "settings-connection",
        ];
        const subSectionToCategory: Record<string, string> = {
          "source-order": "settings-preferences",
        };

        if (subSectionToCategory[hashId]) {
          const categoryId = subSectionToCategory[hashId];
          setSelectedCategory(categoryId);
          scrollToHash(hash, { delay: 100 });
        } else if (validCategories.includes(hashId)) {
          setSelectedCategory(hashId);
          scrollToHash(hash, { delay: 100 });
        } else {
          const element = document.querySelector(hash);
          if (element) {
            const parentSection = element.closest('[id^="settings-"]');
            if (parentSection) {
              const categoryId = parentSection.id;
              if (validCategories.includes(categoryId)) {
                setSelectedCategory(categoryId);
                scrollToHash(hash, { delay: 100 });
              }
            } else {
              scrollToHash(hash);
            }
          }
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Scroll to top when category changes (but not on initial load or when searching)
  useEffect(() => {
    if (
      prevCategoryRef.current !== null &&
      prevCategoryRef.current !== selectedCategory &&
      !searchQuery.trim()
    ) {
      // Only scroll to top if we're actually switching categories (not initial load)
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    prevCategoryRef.current = selectedCategory;
  }, [selectedCategory, searchQuery]);

  const { t } = useTranslation();
  const activeTheme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const previewTheme = usePreviewThemeStore((s) => s.previewTheme);
  const setPreviewTheme = usePreviewThemeStore((s) => s.setPreviewTheme);

  // Simple text search with highlighting
  const handleSearchChange = useCallback((value: string, _force: boolean) => {
    setSearchQuery(value);
    // When searching, clear category selection to show all sections
    if (value.trim()) {
      setSelectedCategory(null);
    }

    // Remove existing highlights
    const existingHighlights = document.querySelectorAll(".search-highlight");
    existingHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });

    if (value.trim()) {
      // Find and highlight matching text
      const walker = document.createTreeWalker(
        document.querySelector("[data-settings-content]") || document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let node = walker.nextNode();

      while (node) {
        const text = node.textContent || "";
        const lowerText = text.toLowerCase();
        const lowerValue = value.toLowerCase();

        if (lowerText.includes(lowerValue)) {
          const regex = new RegExp(
            `(${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
            "gi",
          );
          const highlightedText = text.replace(
            regex,
            '<span class="search-highlight bg-yellow-200 text-black px-1 rounded">$1</span>',
          );

          if (highlightedText !== text) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = highlightedText;
            const parent = node.parentNode;
            if (parent) {
              while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, node);
              }
              parent.removeChild(node);
            }
          }
        }
        node = walker.nextNode();
      }

      // Scroll to first highlighted element
      scrollToElement(".search-highlight", {
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  const handleSearchUnFocus = useCallback((newSearch?: string) => {
    if (newSearch !== undefined) {
      setSearchQuery(newSearch);
    }
  }, []);

  const appLanguage = useLanguageStore((s) => s.language);
  const setAppLanguage = useLanguageStore((s) => s.setLanguage);

  const subStyling = useSubtitleStore((s) => s.styling);
  const setSubStyling = useSubtitleStore((s) => s.updateStyling);

  const proxySet = useAuthStore((s) => s.proxySet);
  const setProxySet = useAuthStore((s) => s.setProxySet);

  const backendUrlSetting = useAuthStore((s) => s.backendUrl);
  const setBackendUrl = useAuthStore((s) => s.setBackendUrl);

  const febboxKey = usePreferencesStore((s) => s.febboxKey);
  const setFebboxKey = usePreferencesStore((s) => s.setFebboxKey);

  const debridToken = usePreferencesStore((s) => s.debridToken);
  const setdebridToken = usePreferencesStore((s) => s.setdebridToken);
  const debridService = usePreferencesStore((s) => s.debridService);
  const setdebridService = usePreferencesStore((s) => s.setdebridService);

  const tidbKey = usePreferencesStore((s) => s.tidbKey);
  const setTIDBKey = usePreferencesStore((s) => s.setTIDBKey);

  const enableThumbnails = usePreferencesStore((s) => s.enableThumbnails);
  const setEnableThumbnails = usePreferencesStore((s) => s.setEnableThumbnails);

  const enableAutoplay = usePreferencesStore((s) => s.enableAutoplay);
  const setEnableAutoplay = usePreferencesStore((s) => s.setEnableAutoplay);

  const enableSkipCredits = usePreferencesStore((s) => s.enableSkipCredits);
  const setEnableSkipCredits = usePreferencesStore(
    (s) => s.setEnableSkipCredits,
  );

  const sourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const setSourceOrder = usePreferencesStore((s) => s.setSourceOrder);

  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const setEnableSourceOrder = usePreferencesStore(
    (s) => s.setEnableSourceOrder,
  );

  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );

  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const setEnableLastSuccessfulSource = usePreferencesStore(
    (s) => s.setEnableLastSuccessfulSource,
  );

  // These are commented because the EmbedOrderPart is on the admin page and not on the settings page.
  const embedOrder = usePreferencesStore((s) => s.embedOrder);
  // const setEmbedOrder = usePreferencesStore((s) => s.setEmbedOrder);

  const enableEmbedOrder = usePreferencesStore((s) => s.enableEmbedOrder);
  // const setEnableEmbedOrder = usePreferencesStore((s) => s.setEnableEmbedOrder);

  // const setDisabledEmbeds = usePreferencesStore((s) => s.setDisabledEmbeds);

  const enableDiscover = usePreferencesStore((s) => s.enableDiscover);
  const setEnableDiscover = usePreferencesStore((s) => s.setEnableDiscover);

  const enableFeatured = usePreferencesStore((s) => s.enableFeatured);
  const setEnableFeatured = usePreferencesStore((s) => s.setEnableFeatured);

  const enableDetailsModal = usePreferencesStore((s) => s.enableDetailsModal);
  const setEnableDetailsModal = usePreferencesStore(
    (s) => s.setEnableDetailsModal,
  );

  const enableImageLogos = usePreferencesStore((s) => s.enableImageLogos);
  const setEnableImageLogos = usePreferencesStore((s) => s.setEnableImageLogos);

  const proxyTmdb = usePreferencesStore((s) => s.proxyTmdb);
  const setProxyTmdb = usePreferencesStore((s) => s.setProxyTmdb);

  const enableCarouselView = usePreferencesStore((s) => s.enableCarouselView);
  const setEnableCarouselView = usePreferencesStore(
    (s) => s.setEnableCarouselView,
  );

  const enableMinimalCards = usePreferencesStore((s) => s.enableMinimalCards);
  const setEnableMinimalCards = usePreferencesStore(
    (s) => s.setEnableMinimalCards,
  );

  const forceCompactEpisodeView = usePreferencesStore(
    (s) => s.forceCompactEpisodeView,
  );
  const setForceCompactEpisodeView = usePreferencesStore(
    (s) => s.setForceCompactEpisodeView,
  );

  const enableLowPerformanceMode = usePreferencesStore(
    (s) => s.enableLowPerformanceMode,
  );
  const setEnableLowPerformanceMode = usePreferencesStore(
    (s) => s.setEnableLowPerformanceMode,
  );

  // These are commented because the NativeSubtitlesPart is accessable though the atoms caption style menu and not on the settings page.
  const enableNativeSubtitles = usePreferencesStore(
    (s) => s.enableNativeSubtitles,
  );
  // const setEnableNativeSubtitles = usePreferencesStore(
  //   (s) => s.setEnableNativeSubtitles,
  // );

  const enableHoldToBoost = usePreferencesStore((s) => s.enableHoldToBoost);
  const setEnableHoldToBoost = usePreferencesStore(
    (s) => s.setEnableHoldToBoost,
  );

  const homeSectionOrder = usePreferencesStore((s) => s.homeSectionOrder);
  const setHomeSectionOrder = usePreferencesStore((s) => s.setHomeSectionOrder);

  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );
  const setManualSourceSelection = usePreferencesStore(
    (s) => s.setManualSourceSelection,
  );

  const enableDoubleClickToSeek = usePreferencesStore(
    (s) => s.enableDoubleClickToSeek,
  );
  const setEnableDoubleClickToSeek = usePreferencesStore(
    (s) => s.setEnableDoubleClickToSeek,
  );

  const enableAutoResumeOnPlaybackError = usePreferencesStore(
    (s) => s.enableAutoResumeOnPlaybackError,
  );
  const setEnableAutoResumeOnPlaybackError = usePreferencesStore(
    (s) => s.setEnableAutoResumeOnPlaybackError,
  );

  const account = useAuthStore((s) => s.account);
  const updateProfile = useAuthStore((s) => s.setAccountProfile);
  const updateDeviceName = useAuthStore((s) => s.updateDeviceName);
  const updateNickname = useAuthStore((s) => s.setAccountNickname);
  const decryptedName = useMemo(() => {
    if (!account) return "";
    try {
      return decryptData(account.deviceName, base64ToBuffer(account.seed));
    } catch (error) {
      console.warn("Failed to decrypt device name, using fallback:", error);
      // Return a fallback device name if decryption fails
      return t("settings.account.devices.unknownDevice");
    }
  }, [account, t]);

  const backendUrl = useBackendUrl();

  const { logout } = useAuth();
  const user = useAuthStore();

  useEffect(() => {
    const loadSettings = async () => {
      if (account && backendUrl) {
        const settings = await getSettings(backendUrl, account);
        if (settings.febboxKey) {
          setFebboxKey(settings.febboxKey);
        }
        if (settings.debridToken) {
          setdebridToken(settings.debridToken);
        }
      }
    };
    loadSettings();
  }, [account, backendUrl, setFebboxKey, setdebridToken, setdebridService]);

  const state = useSettingsState(
    activeTheme,
    appLanguage,
    subStyling,
    decryptedName,
    account?.nickname || "",
    proxySet,
    backendUrlSetting,
    febboxKey,
    debridToken,
    debridService,
    tidbKey,
    account ? account.profile : undefined,
    enableThumbnails,
    enableAutoplay,
    enableDiscover,
    enableFeatured,
    enableDetailsModal,
    sourceOrder,
    enableSourceOrder,
    lastSuccessfulSource,
    enableLastSuccessfulSource,
    embedOrder,
    enableEmbedOrder,
    proxyTmdb,
    enableSkipCredits,
    enableImageLogos,
    enableCarouselView,
    enableMinimalCards,
    forceCompactEpisodeView,
    enableLowPerformanceMode,
    enableNativeSubtitles,
    enableHoldToBoost,
    homeSectionOrder,
    manualSourceSelection,
    enableDoubleClickToSeek,
    enableAutoResumeOnPlaybackError,
  );

  const availableSources = useMemo(() => {
    const sources = getAllProviders().listSources();
    const sourceIDs = sources.map((s) => s.id);
    const stateSources = state.sourceOrder.state || [];

    // Filter out sources that are not in `stateSources` and are in `sources`
    const updatedSources = stateSources.filter((ss) => sourceIDs.includes(ss));

    // Add sources from `sources` that are not in `stateSources`
    const missingSources = sources
      .filter((s) => !stateSources.includes(s.id))
      .map((s) => s.id);

    return [...updatedSources, ...missingSources];
  }, [state.sourceOrder.state]);

  useEffect(() => {
    setPreviewTheme(activeTheme ?? "default");
  }, [setPreviewTheme, activeTheme]);

  useEffect(() => {
    // Clear preview theme on unmount
    return () => {
      setPreviewTheme(null);
    };
  }, [setPreviewTheme]);

  const setThemeWithPreview = useCallback(
    (theme: string) => {
      state.theme.set(theme === "default" ? null : theme);
      setPreviewTheme(theme);
    },
    [state.theme, setPreviewTheme],
  );

  const saveChanges = useCallback(async () => {
    if (account && backendUrl) {
      if (
        state.appLanguage.changed ||
        state.theme.changed ||
        state.proxyUrls.changed ||
        state.febboxKey.changed ||
        state.debridToken.changed ||
        state.debridService.changed ||
        state.enableThumbnails.changed ||
        state.enableAutoplay.changed ||
        state.enableSkipCredits.changed ||
        state.enableDiscover.changed ||
        state.enableFeatured.changed ||
        state.enableDetailsModal.changed ||
        state.enableImageLogos.changed ||
        state.sourceOrder.changed ||
        state.enableSourceOrder.changed ||
        state.lastSuccessfulSource.changed ||
        state.enableLastSuccessfulSource.changed ||
        state.proxyTmdb.changed ||
        state.enableCarouselView.changed ||
        state.enableMinimalCards.changed ||
        state.forceCompactEpisodeView.changed ||
        state.enableLowPerformanceMode.changed ||
        state.enableHoldToBoost.changed ||
        state.homeSectionOrder.changed ||
        state.manualSourceSelection.changed ||
        state.enableDoubleClickToSeek.changed ||
        state.enableAutoResumeOnPlaybackError
      ) {
        await updateSettings(backendUrl, account, {
          applicationLanguage: state.appLanguage.state,
          applicationTheme: state.theme.state,
          proxyUrls: state.proxyUrls.state?.filter((v) => v !== "") ?? null,
          febboxKey: state.febboxKey.state,
          debridToken: state.debridToken.state,
          debridService: state.debridService.state,
          enableThumbnails: state.enableThumbnails.state,
          enableAutoplay: state.enableAutoplay.state,
          enableSkipCredits: state.enableSkipCredits.state,
          enableDiscover: state.enableDiscover.state,
          enableFeatured: state.enableFeatured.state,
          enableDetailsModal: state.enableDetailsModal.state,
          enableImageLogos: state.enableImageLogos.state,
          sourceOrder: state.sourceOrder.state,
          enableSourceOrder: state.enableSourceOrder.state,
          lastSuccessfulSource: state.lastSuccessfulSource.state,
          enableLastSuccessfulSource: state.enableLastSuccessfulSource.state,
          proxyTmdb: state.proxyTmdb.state,
          enableCarouselView: state.enableCarouselView.state,
          enableMinimalCards: state.enableMinimalCards.state,
          forceCompactEpisodeView: state.forceCompactEpisodeView.state,
          enableLowPerformanceMode: state.enableLowPerformanceMode.state,
          enableHoldToBoost: state.enableHoldToBoost.state,
          homeSectionOrder: state.homeSectionOrder.state,
          manualSourceSelection: state.manualSourceSelection.state,
          enableDoubleClickToSeek: state.enableDoubleClickToSeek.state,
          enableAutoResumeOnPlaybackError:
            state.enableAutoResumeOnPlaybackError.state,
        });
      }
      if (state.deviceName.changed) {
        const newDeviceName = await encryptData(
          state.deviceName.state,
          base64ToBuffer(account.seed),
        );
        await updateSession(backendUrl, account, {
          deviceName: newDeviceName,
        });
        updateDeviceName(newDeviceName);
      }
      if (state.nickname.changed) {
        await editUser(backendUrl, account, {
          nickname: state.nickname.state,
        });
        updateNickname(state.nickname.state);
      }
      if (state.profile.changed && state.profile.state) {
        await editUser(backendUrl, account, {
          profile: state.profile.state,
        });
        updateProfile(state.profile.state);
      }
    }

    setEnableThumbnails(state.enableThumbnails.state);
    setEnableAutoplay(state.enableAutoplay.state);
    setEnableSkipCredits(state.enableSkipCredits.state);
    setEnableDiscover(state.enableDiscover.state);
    setEnableFeatured(state.enableFeatured.state);
    setEnableDetailsModal(state.enableDetailsModal.state);
    setEnableImageLogos(state.enableImageLogos.state);
    setSourceOrder(state.sourceOrder.state);
    setEnableSourceOrder(state.enableSourceOrder.state);
    setLastSuccessfulSource(state.lastSuccessfulSource.state);
    setEnableLastSuccessfulSource(state.enableLastSuccessfulSource.state);
    setAppLanguage(state.appLanguage.state);
    setTheme(state.theme.state);
    setSubStyling(state.subtitleStyling.state);
    setProxySet(state.proxyUrls.state?.filter((v) => v !== "") ?? null);
    setEnableSourceOrder(state.enableSourceOrder.state);
    setFebboxKey(state.febboxKey.state);
    setdebridToken(state.debridToken.state);
    setdebridService(state.debridService.state);
    setTIDBKey(state.tidbKey.state);
    setProxyTmdb(state.proxyTmdb.state);
    setEnableCarouselView(state.enableCarouselView.state);
    setEnableMinimalCards(state.enableMinimalCards.state);
    setForceCompactEpisodeView(state.forceCompactEpisodeView.state);
    setEnableLowPerformanceMode(state.enableLowPerformanceMode.state);
    setEnableHoldToBoost(state.enableHoldToBoost.state);
    setHomeSectionOrder(state.homeSectionOrder.state);
    setManualSourceSelection(state.manualSourceSelection.state);
    setEnableDoubleClickToSeek(state.enableDoubleClickToSeek.state);
    setEnableAutoResumeOnPlaybackError(
      state.enableAutoResumeOnPlaybackError.state,
    );

    if (state.profile.state) {
      updateProfile(state.profile.state);
    }

    // when backend url gets changed, show confirmation and log the user out (only if logged in)
    if (state.backendUrl.changed) {
      let url = state.backendUrl.state;
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
      }
      if (account) {
        // User is logged in - show confirmation
        setPendingBackendChange(url);
        backendChangeModal.show();
        return;
      }
      // User is not logged in - just update without confirmation
      setBackendUrl(url);
    }
  }, [
    account,
    backendUrl,
    backendChangeModal,
    setPendingBackendChange,
    state,
    setBackendUrl,
    setEnableThumbnails,
    setFebboxKey,
    setdebridToken,
    setdebridService,
    setTIDBKey,
    setEnableAutoplay,
    setEnableSkipCredits,
    setEnableDiscover,
    setEnableFeatured,
    setEnableDetailsModal,
    setEnableImageLogos,
    setSourceOrder,
    setEnableSourceOrder,
    setLastSuccessfulSource,
    setEnableLastSuccessfulSource,
    setAppLanguage,
    setTheme,
    setSubStyling,
    setProxySet,
    updateDeviceName,
    updateProfile,
    updateNickname,
    setProxyTmdb,
    setEnableCarouselView,
    setEnableMinimalCards,
    setForceCompactEpisodeView,
    setEnableLowPerformanceMode,
    setEnableHoldToBoost,
    setHomeSectionOrder,
    setManualSourceSelection,
    setEnableDoubleClickToSeek,
    setEnableAutoResumeOnPlaybackError,
  ]);
  return (
    <SubPageLayout>
      <PageTitle subpage k="global.pages.settings" />
      <SettingsLayout
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchUnFocus={handleSearchUnFocus}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        className="space-y-28"
      >
        {(searchQuery.trim() ||
          !selectedCategory ||
          selectedCategory === "settings-account") && (
          <div id="settings-account">
            <Heading1 border className="!mb-0">
              {t("settings.account.title")}
            </Heading1>
            {user.account && state.profile.state ? (
              <AccountSettings
                account={user.account}
                deviceName={state.deviceName.state}
                setDeviceName={state.deviceName.set}
                nickname={state.nickname.state}
                setNickname={state.nickname.set}
                colorA={state.profile.state.colorA}
                setColorA={(v) => {
                  state.profile.set((s) =>
                    s ? { ...s, colorA: v } : undefined,
                  );
                }}
                colorB={state.profile.state.colorB}
                setColorB={(v) =>
                  state.profile.set((s) =>
                    s ? { ...s, colorB: v } : undefined,
                  )
                }
                userIcon={state.profile.state.icon as any}
                setUserIcon={(v) =>
                  state.profile.set((s) => (s ? { ...s, icon: v } : undefined))
                }
              />
            ) : (
              <RegisterCalloutPart />
            )}
          </div>
        )}
        {(searchQuery.trim() ||
          !selectedCategory ||
          selectedCategory === "settings-preferences") && (
          <div id="settings-preferences">
            <PreferencesPart
              language={state.appLanguage.state}
              setLanguage={state.appLanguage.set}
              enableThumbnails={state.enableThumbnails.state}
              setEnableThumbnails={state.enableThumbnails.set}
              enableAutoplay={state.enableAutoplay.state}
              setEnableAutoplay={state.enableAutoplay.set}
              enableSkipCredits={state.enableSkipCredits.state}
              setEnableSkipCredits={state.enableSkipCredits.set}
              sourceOrder={availableSources}
              setSourceOrder={state.sourceOrder.set}
              enableSourceOrder={state.enableSourceOrder.state}
              setenableSourceOrder={state.enableSourceOrder.set}
              enableLastSuccessfulSource={
                state.enableLastSuccessfulSource.state
              }
              setEnableLastSuccessfulSource={
                state.enableLastSuccessfulSource.set
              }
              enableLowPerformanceMode={state.enableLowPerformanceMode.state}
              setEnableLowPerformanceMode={state.enableLowPerformanceMode.set}
              enableHoldToBoost={state.enableHoldToBoost.state}
              setEnableHoldToBoost={state.enableHoldToBoost.set}
              manualSourceSelection={state.manualSourceSelection.state}
              setManualSourceSelection={state.manualSourceSelection.set}
              enableDoubleClickToSeek={state.enableDoubleClickToSeek.state}
              setEnableDoubleClickToSeek={state.enableDoubleClickToSeek.set}
              enableAutoResumeOnPlaybackError={
                state.enableAutoResumeOnPlaybackError.state
              }
              setEnableAutoResumeOnPlaybackError={
                state.enableAutoResumeOnPlaybackError.set
              }
            />
          </div>
        )}
        {(searchQuery.trim() ||
          !selectedCategory ||
          selectedCategory === "settings-appearance") && (
          <div id="settings-appearance">
            <AppearancePart
              active={previewTheme ?? "default"}
              inUse={activeTheme ?? "default"}
              setTheme={setThemeWithPreview}
              enableDiscover={state.enableDiscover.state}
              setEnableDiscover={state.enableDiscover.set}
              enableFeatured={state.enableFeatured.state}
              setEnableFeatured={state.enableFeatured.set}
              enableDetailsModal={state.enableDetailsModal.state}
              setEnableDetailsModal={state.enableDetailsModal.set}
              enableImageLogos={state.enableImageLogos.state}
              setEnableImageLogos={state.enableImageLogos.set}
              enableCarouselView={state.enableCarouselView.state}
              setEnableCarouselView={state.enableCarouselView.set}
              enableMinimalCards={state.enableMinimalCards.state}
              setEnableMinimalCards={state.enableMinimalCards.set}
              forceCompactEpisodeView={state.forceCompactEpisodeView.state}
              setForceCompactEpisodeView={state.forceCompactEpisodeView.set}
              homeSectionOrder={state.homeSectionOrder.state}
              setHomeSectionOrder={state.homeSectionOrder.set}
              enableLowPerformanceMode={state.enableLowPerformanceMode.state}
            />
          </div>
        )}
        {(searchQuery.trim() ||
          !selectedCategory ||
          selectedCategory === "settings-captions") && (
          <div id="settings-captions">
            <CaptionsPart
              styling={state.subtitleStyling.state}
              setStyling={state.subtitleStyling.set}
            />
          </div>
        )}
        {(searchQuery.trim() ||
          !selectedCategory ||
          selectedCategory === "settings-connection") && (
          <div id="settings-connection">
            <ConnectionsPart
              backendUrl={state.backendUrl.state}
              setBackendUrl={state.backendUrl.set}
              proxyUrls={state.proxyUrls.state}
              setProxyUrls={state.proxyUrls.set}
              febboxKey={state.febboxKey.state}
              setFebboxKey={state.febboxKey.set}
              debridToken={state.debridToken.state}
              setdebridToken={state.debridToken.set}
              debridService={state.debridService.state}
              setdebridService={state.debridService.set}
              tidbKey={state.tidbKey.state}
              setTIDBKey={state.tidbKey.set}
              proxyTmdb={state.proxyTmdb.state}
              setProxyTmdb={state.proxyTmdb.set}
            />
          </div>
        )}
      </SettingsLayout>
      <Transition
        animation="fade"
        show={state.changed}
        className="bg-settings-saveBar-background border-t border-settings-card-border/50 py-4 transition-opacity w-full fixed bottom-0 flex justify-between flex-col md:flex-row px-8 items-start md:items-center gap-3 z-[999]"
      >
        <p className="text-type-danger">{t("settings.unsaved")}</p>
        <div className="space-x-3 w-full md:w-auto flex">
          <Button
            className="w-full md:w-auto"
            theme="secondary"
            onClick={state.reset}
          >
            {t("settings.reset")}
          </Button>
          <Button
            className="w-full md:w-auto"
            theme="purple"
            onClick={saveChanges}
          >
            {t("settings.save")}
          </Button>
        </div>
      </Transition>
      {account && (
        <Modal id={backendChangeModal.id}>
          <ModalCard>
            <Heading2 className="!mt-0 !mb-4">
              {t("settings.connections.server.changeWarningTitle")}
            </Heading2>
            <Paragraph className="!mt-1 !mb-6">
              {t("settings.connections.server.changeWarning")}
            </Paragraph>
            <div className="flex justify-end gap-3">
              <Button
                theme="secondary"
                onClick={() => {
                  backendChangeModal.hide();
                  setPendingBackendChange(null);
                  state.backendUrl.set(backendUrlSetting);
                }}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                theme="purple"
                onClick={async () => {
                  backendChangeModal.hide();
                  if (pendingBackendChange !== null) {
                    await logout();
                    setBackendUrl(pendingBackendChange);
                    setPendingBackendChange(null);
                  }
                }}
              >
                {t("actions.confirm")}
              </Button>
            </div>
          </ModalCard>
        </Modal>
      )}
    </SubPageLayout>
  );
}

export default SettingsPage;
