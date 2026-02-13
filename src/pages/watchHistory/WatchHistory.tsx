import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { EditButton } from "@/components/buttons/EditButton";
import { Icon, Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { WideContainer } from "@/components/layout/WideContainer";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaGrid } from "@/components/media/MediaGrid";
import { Heading1 } from "@/components/utils/Text";
import { useRandomTranslation } from "@/hooks/useRandomTranslation";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { WatchHistoryItem, useWatchHistoryStore } from "@/stores/watchHistory";
import { MediaItem } from "@/utils/mediaTypes";

interface WatchHistoryProps {
  onShowDetails?: (media: MediaItem) => void;
}

function formatWatchHistorySeries(historyItem: WatchHistoryItem) {
  if (
    !historyItem.episodeId ||
    !historyItem.seasonId ||
    !historyItem.episodeNumber
  )
    return undefined;
  return {
    episode: historyItem.episodeNumber,
    season: historyItem.seasonNumber,
    episodeId: historyItem.episodeId,
    seasonId: historyItem.seasonId,
  };
}

function getWatchHistoryPercentage(
  historyItem: WatchHistoryItem,
): number | undefined {
  const { progress } = historyItem;
  if (!progress.duration || progress.duration <= 0) return undefined;
  if (!progress.watched || progress.watched < 0) return undefined;

  const percentage = Math.min(
    (progress.watched / progress.duration) * 100,
    100,
  );
  return percentage;
}

export function WatchHistory({ onShowDetails }: WatchHistoryProps) {
  const { t } = useTranslation();
  const { t: randomT } = useRandomTranslation();
  const emptyText = randomT(`home.search.empty`);
  const navigate = useNavigate();
  const watchHistory = useWatchHistoryStore((s) => s.items);
  const removeItem = useWatchHistoryStore((s) => s.removeItem);
  const [editing, setEditing] = useState(false);
  const [gridRef] = useAutoAnimate<HTMLDivElement>();
  const { showModal } = useOverlayStack();

  const handleShowDetails = async (media: MediaItem) => {
    if (onShowDetails) {
      onShowDetails(media);
    } else {
      showModal("details", {
        id: Number(media.id),
        type: media.type === "movie" ? "movie" : "show",
      });
    }
  };

  const items = useMemo(() => {
    // Group items by show/movie
    const groupedItems: Record<string, WatchHistoryItem[]> = {};

    Object.entries(watchHistory).forEach(([key, historyItem]) => {
      // For shows, group by the base show ID (remove episode/season suffix)
      // For movies, use the full key
      const groupKey =
        historyItem.type === "show"
          ? key.split("-")[0] // Remove episode ID suffix for shows
          : key;

      if (!groupedItems[groupKey]) {
        groupedItems[groupKey] = [];
      }
      groupedItems[groupKey].push(historyItem);
    });

    // For each group, get the most recent item
    const output: Array<{ media: MediaItem; historyItem: WatchHistoryItem }> =
      [];
    Object.entries(groupedItems).forEach(([groupKey, groupItems]) => {
      // Sort group by most recent watchedAt
      const sortedGroup = groupItems.sort((a, b) => b.watchedAt - a.watchedAt);
      const mostRecentItem = sortedGroup[0];

      output.push({
        media: {
          id: groupKey,
          title: mostRecentItem.title,
          year: mostRecentItem.year,
          poster: mostRecentItem.poster,
          type: mostRecentItem.type,
        },
        historyItem: mostRecentItem,
      });
    });

    // Sort by most recently watched
    output.sort((a, b) => b.historyItem.watchedAt - a.historyItem.watchedAt);

    return output;
  }, [watchHistory]);

  if (items.length === 0) {
    return (
      <SubPageLayout>
        <WideContainer>
          <div className="flex flex-col items-center justify-center translate-y-1/2">
            <p className="text-[18.5px] pb-3">{emptyText}</p>
            <Button
              theme="purple"
              onClick={() => navigate("/")}
              className="mt-4"
            >
              {t("notFound.goHome")}
            </Button>
          </div>
        </WideContainer>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout>
      <WideContainer>
        <div className="flex items-center justify-between gap-8">
          <Heading1 className="text-2xl font-bold text-white">
            {t("home.watchHistory.sectionTitle")}
          </Heading1>
        </div>

        <div className="flex items-center gap-4 pb-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center text-white hover:text-gray-300 transition-colors"
          >
            <Icon icon={Icons.ARROW_LEFT} className="text-xl" />
            <span className="ml-2">{t("discover.page.back")}</span>
          </button>
        </div>

        <SectionHeading
          title={t("home.watchHistory.recentlyWatched")}
          icon={Icons.CLOCK}
        >
          <div className="flex items-center gap-2">
            <EditButton
              editing={editing}
              onEdit={setEditing}
              id="edit-button-watch-history"
            />
          </div>
        </SectionHeading>

        <MediaGrid ref={gridRef}>
          {items.map(({ media, historyItem }) => (
            <div
              key={media.id}
              style={{ userSelect: "none" }}
              onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
                e.preventDefault()
              }
            >
              <MediaCard
                media={media}
                series={formatWatchHistorySeries(historyItem)}
                linkable
                percentage={getWatchHistoryPercentage(historyItem)}
                onClose={
                  editing
                    ? () => {
                        // Remove all watch history items for this show/movie
                        Object.keys(watchHistory).forEach((key) => {
                          const item = watchHistory[key];
                          const groupKey =
                            item.type === "show" ? key.split("-")[0] : key;
                          if (groupKey === media.id) {
                            removeItem(key);
                          }
                        });
                      }
                    : undefined
                }
                closable={editing}
                onShowDetails={handleShowDetails}
              />
            </div>
          ))}
        </MediaGrid>
      </WideContainer>
    </SubPageLayout>
  );
}
