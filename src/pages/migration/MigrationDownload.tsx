import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { Stepper } from "@/components/layout/Stepper";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { Divider } from "@/components/utils/Divider";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { useAuthStore } from "@/stores/auth";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";
import { useProgressStore } from "@/stores/progress";
import { useSubtitleStore } from "@/stores/subtitles";
import { useWatchHistoryStore } from "@/stores/watchHistory";

export function MigrationDownloadPage() {
  const { t } = useTranslation();
  const user = useAuthStore();
  const navigate = useNavigate();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const progress = useProgressStore((s) => s.items);
  const watchHistory = useWatchHistoryStore((s) => s.items);
  const groupOrder = useGroupOrderStore((s) => s.groupOrder);

  // Get data from localStorage directly to ensure we have the persisted data
  const getPersistedData = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored).state : {};
    } catch {
      return {};
    }
  };

  const persistedBookmarks = getPersistedData("__MW::bookmarks");
  const persistedProgress = getPersistedData("__MW::progress");
  const persistedWatchHistory = getPersistedData("__MW::watchHistory");
  const persistedGroupOrder = getPersistedData("__MW::groupOrder");
  const persistedPreferences = getPersistedData("__MW::preferences");
  const persistedSubtitles = getPersistedData("__MW::subtitles");
  const persistedTheme = getPersistedData("__MW::theme");
  const persistedLocale = getPersistedData("__MW::locale");

  const subtitleLanguage = useSubtitleStore((s) => s.lastSelectedLanguage);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDownload = useCallback(() => {
    try {
      const exportData = {
        account: {
          profile: user.account?.profile,
          deviceName: user.account?.deviceName,
        },
        bookmarks: persistedBookmarks.bookmarks || bookmarks,
        progress: persistedProgress.items || progress,
        watchHistory: persistedWatchHistory.items || watchHistory,
        groupOrder: persistedGroupOrder.groupOrder || groupOrder,
        settings: {
          ...persistedPreferences,
          defaultSubtitleLanguage:
            persistedSubtitles.lastSelectedLanguage || subtitleLanguage,
        },
        theme: persistedTheme.theme || null,
        language: persistedLocale.language || null,
        exportDate: new Date().toISOString(),
      };

      // Convert to JSON and create a downloadable link
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], {
        type: "application/json;charset=utf-8",
      });

      // Create filename with current date
      const exportFileDefaultName = `mw-account-data-${new Date().toISOString().split("T")[0]}.json`;

      // Create download link using Blob URL
      const url = URL.createObjectURL(blob);
      const linkElement = document.createElement("a");
      linkElement.href = url;
      linkElement.download = exportFileDefaultName;

      try {
        // Add link to DOM temporarily and trigger download
        document.body.appendChild(linkElement);
        linkElement.click();

        // Small delay to ensure download is initiated before cleanup
        setTimeout(() => {
          document.body.removeChild(linkElement);
          URL.revokeObjectURL(url);
        }, 100);

        // Set success status (download is initiated)
        setStatus("success");
      } catch (downloadError) {
        // Clean up on error
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
        throw downloadError;
      }
    } catch (error) {
      console.error("Error during data download:", error);
      setStatus("error");
    }
  }, [
    bookmarks,
    progress,
    watchHistory,
    user.account,
    groupOrder,
    persistedBookmarks,
    persistedProgress,
    persistedWatchHistory,
    persistedGroupOrder,
    persistedPreferences,
    persistedSubtitles,
    persistedTheme,
    persistedLocale,
    subtitleLanguage,
  ]);

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.migration" />
      <CenterContainer>
        <div>
          <Stepper steps={2} current={2} className="mb-12" />
          <Heading2 className="!text-4xl">
            {t("migration.download.title")}
          </Heading2>
          <div className="space-y-6 max-w-3xl mx-auto">
            <Paragraph className="text-lg max-w-md">
              {t("migration.download.description")}
            </Paragraph>

            <SettingsCard>
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg">
                  {t("migration.preview.downloadDescription")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon icon={Icons.CLOCK} className="text-xl" />
                      <span className="font-medium">
                        {t("migration.preview.items.progress")}
                      </span>
                    </div>
                    <div className="text-xl font-bold mt-2">
                      {Object.keys(persistedProgress.items || progress).length}
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
                      {
                        Object.keys(persistedBookmarks.bookmarks || bookmarks)
                          .length
                      }
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
                      {
                        Object.keys(persistedWatchHistory.items || watchHistory)
                          .length
                      }
                    </div>
                  </div>

                  <div className="p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <Icon icon={Icons.SETTINGS} className="text-xl" />
                      <span className="font-medium">
                        {t("migration.preview.items.settings")}
                      </span>
                    </div>
                    <div className="text-xl font-bold mt-2">✓</div>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
          <Divider />
          <div className="flex justify-between">
            <Button theme="secondary" onClick={() => navigate("/migration")}>
              {t("migration.back")}
            </Button>
            {status !== "success" && (
              <Button theme="purple" onClick={handleDownload}>
                {t("migration.download.button.download")}
              </Button>
            )}

            {status === "success" && (
              <div>
                <Button theme="purple" onClick={() => navigate("/")}>
                  {t("migration.download.button.home")}
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-center pt-4">
            {status === "success" && (
              <p className="text-green-600 mt-4">
                {t("migration.download.status.success")}
              </p>
            )}
            {status === "error" && (
              <p className="text-red-600 mt-4">
                {t("migration.download.status.error")}
              </p>
            )}
          </div>
        </div>
      </CenterContainer>
    </MinimalPageLayout>
  );
}
