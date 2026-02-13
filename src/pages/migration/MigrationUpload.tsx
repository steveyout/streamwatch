import { ChangeEvent, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { bookmarkMediaToInput } from "@/backend/accounts/bookmarks";
import {
  importBookmarks,
  importGroupOrder,
  importProgress,
  importSettings,
  importWatchHistory,
} from "@/backend/accounts/import";
import { progressMediaItemToInputs } from "@/backend/accounts/progress";
import { watchHistoryItemsToInputs } from "@/backend/accounts/watchHistory";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { Stepper } from "@/components/layout/Stepper";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { Divider } from "@/components/utils/Divider";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { useAuthStore } from "@/stores/auth";
import { BookmarkMediaItem, useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { useLanguageStore } from "@/stores/language";
import { usePreferencesStore } from "@/stores/preferences";
import { ProgressMediaItem, useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { useThemeStore } from "@/stores/theme";
import { WatchHistoryItem, useWatchHistoryStore } from "@/stores/watchHistory";

interface UploadedData {
  account?: {
    profile?: {
      icon: string;
      colorA: string;
      colorB: string;
    };
    deviceName?: string;
  };
  bookmarks?: Record<string, BookmarkMediaItem>;
  progress?: Record<string, ProgressMediaItem>;
  watchHistory?: Record<string, WatchHistoryItem>;
  groupOrder?: string[];
  settings?: any;
  theme?: string | null;
  language?: string;
  exportDate?: string;
}

export function MigrationUploadPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore();
  const backendUrl = useBackendUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceBookmarks = useBookmarkStore((s) => s.replaceBookmarks);
  const replaceProgress = useProgressStore((s) => s.replaceItems);
  const replaceWatchHistory = useWatchHistoryStore((s) => s.replaceItems);
  const setGroupOrder = useGroupOrderStore((s) => s.setGroupOrder);
  const preferencesStore = usePreferencesStore();
  const subtitleStore = useSubtitleStore();
  const setTheme = useThemeStore((s) => s.setTheme);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "processing"
  >("idle");
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const readFile = async (file: File) => {
    try {
      setStatus("processing");
      const fileContent = await file.text();
      const parsedData = JSON.parse(fileContent);

      // Validate and ensure types match what we expect
      const validatedData: UploadedData = {
        ...parsedData,
        bookmarks: parsedData.bookmarks
          ? Object.entries(parsedData.bookmarks).reduce(
              (acc, [id, item]: [string, any]) => {
                // Ensure type is either "show" or "movie"
                if (
                  typeof item.type === "string" &&
                  (item.type === "show" || item.type === "movie")
                ) {
                  acc[id] = {
                    title: item.title || "",
                    year: typeof item.year === "number" ? item.year : undefined,
                    poster: item.poster,
                    type: item.type as "show" | "movie",
                    updatedAt:
                      typeof item.updatedAt === "number"
                        ? item.updatedAt
                        : Date.now(),
                  };
                }
                return acc;
              },
              {} as Record<string, BookmarkMediaItem>,
            )
          : undefined,

        progress: parsedData.progress
          ? Object.entries(parsedData.progress).reduce(
              (acc, [id, item]: [string, any]) => {
                // Ensure type is either "show" or "movie"
                if (
                  typeof item.type === "string" &&
                  (item.type === "show" || item.type === "movie")
                ) {
                  acc[id] = {
                    title: item.title || "",
                    poster: item.poster,
                    type: item.type as "show" | "movie",
                    updatedAt:
                      typeof item.updatedAt === "number"
                        ? item.updatedAt
                        : Date.now(),
                    year: typeof item.year === "number" ? item.year : undefined,
                    progress: item.progress,
                    episodes: item.episodes || {},
                    seasons: item.seasons || {},
                  };
                }
                return acc;
              },
              {} as Record<string, ProgressMediaItem>,
            )
          : undefined,

        watchHistory: parsedData.watchHistory
          ? Object.entries(parsedData.watchHistory).reduce(
              (acc, [id, item]: [string, any]) => {
                // Ensure type is either "show" or "movie"
                if (
                  typeof item.type === "string" &&
                  (item.type === "show" || item.type === "movie")
                ) {
                  acc[id] = {
                    title: item.title || "",
                    poster: item.poster,
                    type: item.type as "show" | "movie",
                    year: typeof item.year === "number" ? item.year : undefined,
                    progress: item.progress,
                    watchedAt:
                      typeof item.watchedAt === "number"
                        ? item.watchedAt
                        : Date.now(),
                    completed:
                      typeof item.completed === "boolean"
                        ? item.completed
                        : false,
                    episodeId: item.episodeId,
                    seasonId: item.seasonId,
                    seasonNumber: item.seasonNumber,
                    episodeNumber: item.episodeNumber,
                  };
                }
                return acc;
              },
              {} as Record<string, WatchHistoryItem>,
            )
          : undefined,
      };

      setUploadedData(validatedData);
      setStatus("idle");
    } catch (error) {
      console.error("Error parsing JSON file:", error);
      setStatus("error");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStatus("idle");
      setUploadedData(null);

      // Auto-read the file when selected
      const file = e.target.files[0];
      readFile(file);
    }
  };

  const handleBackendImport = useCallback(async () => {
    if (!uploadedData || !user.account || !backendUrl) return;

    const importPromises = [];

    // Import progress
    if (
      uploadedData.progress &&
      Object.keys(uploadedData.progress).length > 0
    ) {
      const progressInputs = Object.entries(uploadedData.progress).flatMap(
        ([tmdbId, item]) => progressMediaItemToInputs(tmdbId, item),
      );
      importPromises.push(
        importProgress(backendUrl, user.account, progressInputs),
      );
    }

    // Import watch history
    if (
      uploadedData.watchHistory &&
      Object.keys(uploadedData.watchHistory).length > 0
    ) {
      const watchHistoryInputs = watchHistoryItemsToInputs(
        uploadedData.watchHistory,
      );
      importPromises.push(
        importWatchHistory(backendUrl, user.account, watchHistoryInputs),
      );
    }

    // Import bookmarks
    if (
      uploadedData.bookmarks &&
      Object.keys(uploadedData.bookmarks).length > 0
    ) {
      const bookmarkInputs = Object.entries(uploadedData.bookmarks).map(
        ([tmdbId, item]) => bookmarkMediaToInput(tmdbId, item),
      );
      importPromises.push(
        importBookmarks(backendUrl, user.account, bookmarkInputs),
      );
    }

    // Import group order
    let groupOrderToImport = uploadedData.groupOrder;
    if (!groupOrderToImport || groupOrderToImport.length === 0) {
      // Create group order from bookmarks if not provided
      const allGroups = new Set<string>();
      if (uploadedData.bookmarks) {
        Object.values(uploadedData.bookmarks).forEach((bookmark: any) => {
          if (Array.isArray(bookmark.group)) {
            bookmark.group.forEach((group: string) => allGroups.add(group));
          }
        });
      }
      groupOrderToImport = Array.from(allGroups);
    }

    if (groupOrderToImport && groupOrderToImport.length > 0) {
      importPromises.push(
        importGroupOrder(backendUrl, user.account, groupOrderToImport),
      );
    }

    // Import settings
    if (uploadedData.settings) {
      importPromises.push(
        importSettings(backendUrl, user.account, uploadedData.settings),
      );
    }

    return Promise.all(importPromises);
  }, [uploadedData, user.account, backendUrl]);

  const handleImport = useCallback(async () => {
    if (status === "processing") {
      return;
    }

    if (!uploadedData || !user.account) return;

    setStatus("processing");

    if (uploadedData.bookmarks) {
      replaceBookmarks(uploadedData.bookmarks);
    }

    if (uploadedData.progress) {
      replaceProgress(uploadedData.progress);
    }

    if (uploadedData.watchHistory) {
      replaceWatchHistory(uploadedData.watchHistory);
    }

    // Import all data types to backend
    try {
      await handleBackendImport();
      setStatus("success");
    } catch (error) {
      console.error("Error importing data:", error);
      setStatus("error");
    }
  }, [
    replaceBookmarks,
    replaceProgress,
    replaceWatchHistory,
    uploadedData,
    user.account,
    handleBackendImport,
    status,
  ]);

  const handleLocalSave = useCallback(() => {
    if (!uploadedData) return;
    setStatus("processing");
    try {
      if (uploadedData.bookmarks) {
        localStorage.setItem(
          "__MW::bookmarks",
          JSON.stringify({ state: { bookmarks: uploadedData.bookmarks } }),
        );
        replaceBookmarks(uploadedData.bookmarks);
      }
      if (uploadedData.progress) {
        localStorage.setItem(
          "__MW::progress",
          JSON.stringify({ state: { items: uploadedData.progress } }),
        );
        replaceProgress(uploadedData.progress);
      }
      if (uploadedData.watchHistory) {
        localStorage.setItem(
          "__MW::watchHistory",
          JSON.stringify({ state: { items: uploadedData.watchHistory } }),
        );
        replaceWatchHistory(uploadedData.watchHistory);
      }
      if (uploadedData.groupOrder) {
        localStorage.setItem(
          "__MW::groupOrder",
          JSON.stringify({ state: { groupOrder: uploadedData.groupOrder } }),
        );
        setGroupOrder(uploadedData.groupOrder);
      } else {
        // If no groupOrder in upload, create one from all groups found in bookmarks
        const allGroups = new Set<string>();
        if (uploadedData.bookmarks) {
          Object.values(uploadedData.bookmarks).forEach((bookmark: any) => {
            if (Array.isArray(bookmark.group)) {
              bookmark.group.forEach((group: string) => allGroups.add(group));
            }
          });
        }
        const groupOrderArray = Array.from(allGroups);
        if (groupOrderArray.length > 0) {
          localStorage.setItem(
            "__MW::groupOrder",
            JSON.stringify({ state: { groupOrder: groupOrderArray } }),
          );
          setGroupOrder(groupOrderArray);
        }
      }
      if (uploadedData.settings) {
        // Apply subtitle settings
        if (uploadedData.settings.defaultSubtitleLanguage) {
          subtitleStore.setLanguage(
            uploadedData.settings.defaultSubtitleLanguage,
          );
        }
        if (uploadedData.settings.febboxKey !== undefined) {
          preferencesStore.setFebboxKey(uploadedData.settings.febboxKey);
        }
        if (uploadedData.settings.debridToken !== undefined) {
          preferencesStore.setdebridToken(uploadedData.settings.debridToken);
        }
        if (uploadedData.settings.debridService !== undefined) {
          preferencesStore.setdebridService(
            uploadedData.settings.debridService,
          );
        }
        if (uploadedData.settings.enableThumbnails !== undefined) {
          preferencesStore.setEnableThumbnails(
            uploadedData.settings.enableThumbnails,
          );
        }
        if (uploadedData.settings.enableAutoplay !== undefined) {
          preferencesStore.setEnableAutoplay(
            uploadedData.settings.enableAutoplay,
          );
        }
        if (uploadedData.settings.enableSkipCredits !== undefined) {
          preferencesStore.setEnableSkipCredits(
            uploadedData.settings.enableSkipCredits,
          );
        }
        if (uploadedData.settings.enableDiscover !== undefined) {
          preferencesStore.setEnableDiscover(
            uploadedData.settings.enableDiscover,
          );
        }
        if (uploadedData.settings.enableFeatured !== undefined) {
          preferencesStore.setEnableFeatured(
            uploadedData.settings.enableFeatured,
          );
        }
        if (uploadedData.settings.enableDetailsModal !== undefined) {
          preferencesStore.setEnableDetailsModal(
            uploadedData.settings.enableDetailsModal,
          );
        }
        if (uploadedData.settings.enableImageLogos !== undefined) {
          preferencesStore.setEnableImageLogos(
            uploadedData.settings.enableImageLogos,
          );
        }
        if (uploadedData.settings.enableCarouselView !== undefined) {
          preferencesStore.setEnableCarouselView(
            uploadedData.settings.enableCarouselView,
          );
        }
        if (uploadedData.settings.forceCompactEpisodeView !== undefined) {
          preferencesStore.setForceCompactEpisodeView(
            uploadedData.settings.forceCompactEpisodeView,
          );
        }
        if (uploadedData.settings.sourceOrder !== undefined) {
          preferencesStore.setSourceOrder(uploadedData.settings.sourceOrder);
        }
        if (uploadedData.settings.enableSourceOrder !== undefined) {
          preferencesStore.setEnableSourceOrder(
            uploadedData.settings.enableSourceOrder,
          );
        }
        if (uploadedData.settings.lastSuccessfulSource !== undefined) {
          preferencesStore.setLastSuccessfulSource(
            uploadedData.settings.lastSuccessfulSource,
          );
        }
        if (uploadedData.settings.enableLastSuccessfulSource !== undefined) {
          preferencesStore.setEnableLastSuccessfulSource(
            uploadedData.settings.enableLastSuccessfulSource,
          );
        }
        if (uploadedData.settings.embedOrder !== undefined) {
          preferencesStore.setEmbedOrder(uploadedData.settings.embedOrder);
        }
        if (uploadedData.settings.enableEmbedOrder !== undefined) {
          preferencesStore.setEnableEmbedOrder(
            uploadedData.settings.enableEmbedOrder,
          );
        }
        if (uploadedData.settings.proxyTmdb !== undefined) {
          preferencesStore.setProxyTmdb(uploadedData.settings.proxyTmdb);
        }
        if (uploadedData.settings.enableLowPerformanceMode !== undefined) {
          preferencesStore.setEnableLowPerformanceMode(
            uploadedData.settings.enableLowPerformanceMode,
          );
        }
        if (uploadedData.settings.enableNativeSubtitles !== undefined) {
          preferencesStore.setEnableNativeSubtitles(
            uploadedData.settings.enableNativeSubtitles,
          );
        }
        if (uploadedData.settings.enableHoldToBoost !== undefined) {
          preferencesStore.setEnableHoldToBoost(
            uploadedData.settings.enableHoldToBoost,
          );
        }
        if (uploadedData.settings.homeSectionOrder !== undefined) {
          preferencesStore.setHomeSectionOrder(
            uploadedData.settings.homeSectionOrder,
          );
        }
        if (uploadedData.settings.manualSourceSelection !== undefined) {
          preferencesStore.setManualSourceSelection(
            uploadedData.settings.manualSourceSelection,
          );
        }
        if (uploadedData.settings.enableDoubleClickToSeek !== undefined) {
          preferencesStore.setEnableDoubleClickToSeek(
            uploadedData.settings.enableDoubleClickToSeek,
          );
        }
      }

      // Apply theme
      if (uploadedData.theme !== undefined) {
        setTheme(uploadedData.theme);
      }

      // Apply language
      if (uploadedData.language) {
        setLanguage(uploadedData.language);
      }

      setStatus("success");
    } catch (e) {
      setStatus("error");
    }
  }, [
    uploadedData,
    replaceBookmarks,
    replaceProgress,
    replaceWatchHistory,
    setGroupOrder,
    preferencesStore,
    subtitleStore,
    setTheme,
    setLanguage,
  ]);

  return (
    <MinimalPageLayout>
      <PageTitle k="migration.upload.title" subpage />
      <CenterContainer>
        <div>
          <Stepper current={2} steps={2} className="mb-12" />
          <Heading2 className="!text-4xl !mt-0">
            {t("migration.upload.title")}
          </Heading2>
          <Paragraph className="text-lg max-w-md mb-6">
            {t("migration.upload.description")}
          </Paragraph>

          <SettingsCard className="mb-6">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-lg">
                {t("migration.preview.uploadDescription")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-lg">
                  <Icon icon={Icons.CLOCK} className="text-2xl mb-2" />
                  <span className="font-medium">
                    {t("migration.preview.items.progress")}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-lg">
                  <Icon icon={Icons.BOOKMARK} className="text-2xl mb-2" />
                  <span className="font-medium">
                    {t("migration.preview.items.bookmarks")}
                  </span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-background rounded-lg">
                  <Icon icon={Icons.SETTINGS} className="text-2xl mb-2" />
                  <span className="font-medium">
                    {t("migration.preview.items.settings")}
                  </span>
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard>
            <div className="flex py-6 flex-col space-y-4 items-center justify-center">
              <div className="flex flex-col space-y-2 w-full items-center">
                <p className="text-sm">
                  {t("migration.upload.file.description")}:
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />

              <Button
                onClick={handleFileButtonClick}
                theme="purple"
                className="w-full max-w-xs"
                padding="md:px-12 p-2.5"
              >
                <Icon icon={Icons.FILE} className="pr-2" />
                {selectedFile
                  ? t("migration.upload.file.change")
                  : t("migration.upload.file.select")}
              </Button>

              {selectedFile && (
                <div className="text-center mt-2 w-full">
                  <span className="text-sm font-medium">
                    {selectedFile.name}
                    {uploadedData?.exportDate && (
                      <div className="text-sm pb-2">
                        {t("migration.upload.exportedOn")}:{" "}
                        {new Date(
                          uploadedData?.exportDate || "",
                        ).toLocaleDateString()}
                      </div>
                    )}
                  </span>
                </div>
              )}

              {status === "processing" && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Icon icon={Icons.CLOCK} className="pr-2" />
                  {t("migration.upload.status.processing")}
                </div>
              )}

              {status === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <Icon icon={Icons.WARNING} className="pr-2" />
                  {t("migration.upload.status.error")}
                </div>
              )}
            </div>
          </SettingsCard>

          {uploadedData && (
            <SettingsCard className="mt-6">
              <Heading2 className="!my-0 !text-type-secondary">
                {t("migration.upload.previewTitle")}
              </Heading2>
              <Divider marginClass="my-6 px-8 box-content -mx-8" />

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon icon={Icons.CLOCK} className="text-xl" />
                    <span className="font-medium">
                      {t("migration.preview.items.progress")}
                    </span>
                  </div>
                  <div className="text-xl font-bold mt-2">
                    {uploadedData.progress
                      ? Object.keys(uploadedData.progress).length
                      : 0}
                  </div>
                </div>

                <div className="p-4 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon icon={Icons.BOOKMARK} className="text-xl" />
                    <span className="font-medium">
                      {t("migration.preview.items.bookmarks")}
                    </span>
                  </div>
                  <div className="text-xl font-bold mt-2">
                    {uploadedData.bookmarks
                      ? Object.keys(uploadedData.bookmarks).length
                      : 0}
                  </div>
                </div>

                <div className="p-4 bg-background rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon icon={Icons.CLOCK} className="text-xl" />
                    <span className="font-medium">
                      {t("migration.preview.items.progress")}
                    </span>
                  </div>
                  <div className="text-xl font-bold mt-2">
                    {uploadedData.watchHistory
                      ? Object.keys(uploadedData.watchHistory).length
                      : 0}
                  </div>
                </div>
              </div>

              <div className="flex py-6 flex-col space-y-2 items-center justify-center">
                {status === "success" ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Icon icon={Icons.CHECKMARK} className="pr-2" />
                    {user.account
                      ? t("migration.upload.status.success")
                      : t("migration.upload.status.successLocal")}
                  </div>
                ) : user.account ? (
                  <Button
                    onClick={handleImport}
                    className="w-full max-w-xs"
                    theme="purple"
                    padding="md:px-12 p-2.5"
                    disabled={status === "processing"}
                  >
                    <Icon icon={Icons.CLOUD_ARROW_UP} className="pr-2" />
                    {status === "processing"
                      ? t("migration.upload.button.processing")
                      : t("migration.upload.button.import")}
                  </Button>
                ) : (
                  <Button
                    onClick={handleLocalSave}
                    className="w-full max-w-xs"
                    theme="purple"
                    padding="md:px-12 p-2.5"
                    disabled={status === "processing"}
                  >
                    <Icon icon={Icons.CLOUD_ARROW_UP} className="pr-2" />
                    {status === "processing"
                      ? t("migration.upload.button.processing")
                      : t("migration.upload.button.saveLocal")}
                  </Button>
                )}
              </div>
            </SettingsCard>
          )}

          <div className="flex justify-between mt-6">
            <Button theme="secondary" onClick={() => navigate("/migration")}>
              {t("migration.back")}
            </Button>

            {status === "success" && (
              <Button onClick={() => navigate("/")} theme="purple">
                {t("migration.upload.button.home")}
              </Button>
            )}
          </div>
        </div>
      </CenterContainer>
    </MinimalPageLayout>
  );
}
