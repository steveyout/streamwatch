import { ReactNode, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { getCachedMetadata } from "@/backend/helpers/providerApi";
import { Loading } from "@/components/layout/Loading";
import {
  useEmbedScraping,
  useSourceScraping,
} from "@/components/player/hooks/useSourceSelection";
import { Menu } from "@/components/player/internals/ContextMenu";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";

export interface SourceSelectionViewProps {
  id: string;
  onChoose?: (id: string) => void;
}

export interface EmbedSelectionViewProps {
  id: string;
  sourceId: string | null;
}

export function EmbedOption(props: {
  embedId: string;
  url: string;
  sourceId: string;
  routerId: string;
}) {
  const { t } = useTranslation();
  const currentEmbedId = usePlayerStore((s) => s.embedId);
  const unknownEmbedName = t("player.menus.sources.unknownOption");

  const embedName = useMemo(() => {
    if (!props.embedId) return unknownEmbedName;
    const sourceMeta = getCachedMetadata().find((s) => s.id === props.embedId);
    return sourceMeta?.name ?? unknownEmbedName;
  }, [props.embedId, unknownEmbedName]);

  const { run, errored, loading, notFound } = useEmbedScraping(
    props.routerId,
    props.sourceId,
    props.url,
    props.embedId,
  );

  let rightSide;
  if (loading) {
    rightSide = undefined; // Let SelectableLink handle loading
  } else if (notFound) {
    rightSide = (
      <div className="flex items-center text-video-scraping-noresult">
        <div className="w-4 h-4 rounded-full border-2 border-current bg-current flex items-center justify-center">
          <div className="w-2 h-0.5 bg-background-main rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <SelectableLink
      loading={loading}
      error={errored && !notFound}
      onClick={run}
      selected={props.embedId === currentEmbedId}
      rightSide={rightSide}
    >
      <span className="flex flex-col">
        <span>{embedName}</span>
      </span>
    </SelectableLink>
  );
}

export function EmbedSelectionView({ sourceId, id }: EmbedSelectionViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const { run, watching, notfound, loading, items, errored } =
    useSourceScraping(sourceId, id);

  const sourceName = useMemo(() => {
    if (!sourceId) return "...";
    const sourceMeta = getCachedMetadata().find((s) => s.id === sourceId);
    return sourceMeta?.name ?? "...";
  }, [sourceId]);

  const lastSourceId = useRef<string | null>(null);
  useEffect(() => {
    if (lastSourceId.current === sourceId) return;
    lastSourceId.current = sourceId;
    if (!sourceId) return;
    run();
  }, [run, sourceId]);

  let content: ReactNode = null;
  if (loading)
    content = (
      <Menu.TextDisplay noIcon>
        <Loading />
      </Menu.TextDisplay>
    );
  else if (notfound)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.noStream.title") ?? undefined}
      >
        {t("player.menus.sources.noStream.text")}
      </Menu.TextDisplay>
    );
  else if (items?.length === 0)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.noEmbeds.title") ?? undefined}
      >
        {t("player.menus.sources.noEmbeds.text")}
      </Menu.TextDisplay>
    );
  else if (errored)
    content = (
      <Menu.TextDisplay
        title={t("player.menus.sources.failed.title") ?? undefined}
      >
        {t("player.menus.sources.failed.text")}
      </Menu.TextDisplay>
    );
  else if (watching)
    content = null; // when it starts watching, empty the display
  else if (items && sourceId)
    content = items.map((v) => (
      <EmbedOption
        key={`${v.embedId}-${v.url}`}
        embedId={v.embedId}
        url={v.url}
        routerId={id}
        sourceId={sourceId}
      />
    ));

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/source")}>
        {sourceName}
      </Menu.BackLink>
      <Menu.Section>{content}</Menu.Section>
    </>
  );
}

export function SourceSelectionView({
  id,
  onChoose,
}: SourceSelectionViewProps) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const metaType = usePlayerStore((s) => s.meta?.type);
  const currentSourceId = usePlayerStore((s) => s.sourceId);
  const setResumeFromSourceId = usePlayerStore((s) => s.setResumeFromSourceId);
  const setStatus = usePlayerStore((s) => s.setStatus);
  const preferredSourceOrder = usePreferencesStore((s) => s.sourceOrder);
  const enableSourceOrder = usePreferencesStore((s) => s.enableSourceOrder);
  const lastSuccessfulSource = usePreferencesStore(
    (s) => s.lastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );
  const manualSourceSelection = usePreferencesStore(
    (s) => s.manualSourceSelection,
  );

  const sources = useMemo(() => {
    if (!metaType) return [];
    const allSources = getCachedMetadata()
      .filter((v) => v.type === "source")
      .filter((v) => v.mediaTypes?.includes(metaType));

    if (!enableSourceOrder || preferredSourceOrder.length === 0) {
      // Even without custom source order, prioritize last successful source if enabled
      if (enableLastSuccessfulSource && lastSuccessfulSource) {
        const lastSourceIndex = allSources.findIndex(
          (s) => s.id === lastSuccessfulSource,
        );
        if (lastSourceIndex !== -1) {
          const lastSource = allSources.splice(lastSourceIndex, 1)[0];
          return [lastSource, ...allSources];
        }
      }
      return allSources;
    }

    // Sort sources according to preferred order, but prioritize last successful source
    const orderedSources = [];
    const remainingSources = [...allSources];

    // First, add the last successful source if it exists, is available, and the feature is enabled
    if (enableLastSuccessfulSource && lastSuccessfulSource) {
      const lastSourceIndex = remainingSources.findIndex(
        (s) => s.id === lastSuccessfulSource,
      );
      if (lastSourceIndex !== -1) {
        orderedSources.push(remainingSources[lastSourceIndex]);
        remainingSources.splice(lastSourceIndex, 1);
      }
    }

    // Add sources in preferred order
    for (const sourceId of preferredSourceOrder) {
      const sourceIndex = remainingSources.findIndex((s) => s.id === sourceId);
      if (sourceIndex !== -1) {
        orderedSources.push(remainingSources[sourceIndex]);
        remainingSources.splice(sourceIndex, 1);
      }
    }

    // Add remaining sources that weren't in the preferred order
    orderedSources.push(...remainingSources);

    return orderedSources;
  }, [
    metaType,
    preferredSourceOrder,
    enableSourceOrder,
    lastSuccessfulSource,
    enableLastSuccessfulSource,
  ]);

  const handleFindNextSource = () => {
    if (!currentSourceId) return;
    // Set the resume source ID in the store
    setResumeFromSourceId(currentSourceId);
    // Close the settings overlay
    router.close();
    // Set status to SCRAPING to trigger scraping from next source
    setStatus(playerStatus.SCRAPING);
  };

  return (
    <>
      <Menu.BackLink
        onClick={() => router.navigate("/")}
        rightSide={
          <div className="flex items-center gap-2">
            {currentSourceId && !manualSourceSelection && (
              <button
                type="button"
                onClick={handleFindNextSource}
                className="-mr-2 -my-1 px-2 p-[0.4em] rounded tabbable hover:bg-video-context-light hover:bg-opacity-10"
              >
                {t("player.menus.sources.findNextSource")}
              </button>
            )}
          </div>
        }
      >
        {t("player.menus.sources.title")}
      </Menu.BackLink>
      <Menu.Section className="pb-4">
        {sources.map((v) => (
          <SelectableLink
            key={v.id}
            onClick={() => {
              onChoose?.(v.id);
              router.navigate("/source/embeds");
            }}
            selected={v.id === currentSourceId}
          >
            {v.name}
          </SelectableLink>
        ))}
      </Menu.Section>
    </>
  );
}
