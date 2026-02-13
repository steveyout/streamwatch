import {
  EmbedOutput,
  NotFoundError,
  SourcererOutput,
} from "@p-stream/providers";
import { useAsyncFn } from "react-use";

import { isExtensionActiveCached } from "@/backend/extension/messaging";
import { prepareStream } from "@/backend/extension/streams";
import {
  scrapeSourceOutputToProviderMetric,
  useReportProviders,
} from "@/backend/helpers/report";
import { getProviders } from "@/backend/providers/providers";
import { convertProviderCaption } from "@/components/player/utils/captions";
import { convertRunoutputToSource } from "@/components/player/utils/convertRunoutputToSource";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { metaToScrapeMedia } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { usePreferencesStore } from "@/stores/preferences";
import { useProgressStore } from "@/stores/progress";

function getSavedProgress(items: Record<string, any>, meta: any): number {
  const item = items[meta?.tmdbId ?? ""];
  if (!item || !meta) return 0;
  if (meta.type === "movie") {
    if (!item.progress) return 0;
    return item.progress.watched;
  }

  const ep = item.episodes[meta.episode?.tmdbId ?? ""];
  if (!ep) return 0;
  return ep.progress.watched;
}

export function useEmbedScraping(
  routerId: string,
  sourceId: string,
  url: string,
  embedId: string,
) {
  const setSource = usePlayerStore((s) => s.setSource);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const setEmbedId = usePlayerStore((s) => (s as any).setEmbedId);
  const meta = usePlayerStore((s) => s.meta);
  const progressItems = useProgressStore((s) => s.items);
  const router = useOverlayRouter(routerId);
  const { report } = useReportProviders();
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );

  const [request, run] = useAsyncFn(async () => {
    let result: EmbedOutput | undefined;
    if (!meta) return;
    try {
      result = await getProviders().runEmbedScraper({
        id: embedId,
        url,
      });
    } catch (err) {
      console.error(`Failed to scrape ${embedId}`, err);
      const notFound = err instanceof NotFoundError;
      const status = notFound ? "notfound" : "failed";
      report([
        scrapeSourceOutputToProviderMetric(
          meta,
          sourceId,
          embedId,
          status,
          err,
        ),
      ]);
      throw err;
    }
    report([
      scrapeSourceOutputToProviderMetric(meta, sourceId, null, "success", null),
    ]);
    if (isExtensionActiveCached()) await prepareStream(result.stream[0]);
    setSourceId(sourceId);
    setEmbedId(embedId);
    setCaption(null);
    setSource(
      convertRunoutputToSource({ stream: result.stream[0] }),
      convertProviderCaption(result.stream[0].captions),
      getSavedProgress(progressItems, meta),
    );
    // Save the last successful source when manually selected
    if (enableLastSuccessfulSource) {
      setLastSuccessfulSource(sourceId);
    }
    router.close();
  }, [
    embedId,
    sourceId,
    meta,
    router,
    report,
    setCaption,
    enableLastSuccessfulSource,
    setLastSuccessfulSource,
  ]);

  return {
    run,
    loading: request.loading,
    errored: !!request.error,
    notFound: request.error instanceof NotFoundError,
  };
}

export function useSourceScraping(sourceId: string | null, routerId: string) {
  const meta = usePlayerStore((s) => s.meta);
  const setSource = usePlayerStore((s) => s.setSource);
  const setCaption = usePlayerStore((s) => s.setCaption);
  const setSourceId = usePlayerStore((s) => s.setSourceId);
  const setEmbedId = usePlayerStore((s) => (s as any).setEmbedId);
  const progressItems = useProgressStore((s) => s.items);
  const router = useOverlayRouter(routerId);
  const { report } = useReportProviders();
  const setLastSuccessfulSource = usePreferencesStore(
    (s) => s.setLastSuccessfulSource,
  );
  const enableLastSuccessfulSource = usePreferencesStore(
    (s) => s.enableLastSuccessfulSource,
  );

  const [request, run] = useAsyncFn(async () => {
    if (!sourceId || !meta) return null;
    setEmbedId(null);
    const scrapeMedia = metaToScrapeMedia(meta);

    let result: SourcererOutput | undefined;
    try {
      result = await getProviders().runSourceScraper({
        id: sourceId,
        media: scrapeMedia,
      });
    } catch (err) {
      console.error(`Failed to scrape ${sourceId}`, err);
      const notFound = err instanceof NotFoundError;
      const status = notFound ? "notfound" : "failed";
      report([
        scrapeSourceOutputToProviderMetric(meta, sourceId, null, status, err),
      ]);
      throw err;
    }
    report([
      scrapeSourceOutputToProviderMetric(meta, sourceId, null, "success", null),
    ]);

    if (result.stream) {
      if (isExtensionActiveCached()) await prepareStream(result.stream[0]);
      setEmbedId(null);
      setCaption(null);
      setSource(
        convertRunoutputToSource({ stream: result.stream[0] }),
        convertProviderCaption(result.stream[0].captions),
        getSavedProgress(progressItems, meta),
      );
      setSourceId(sourceId);
      // Save the last successful source when manually selected
      if (enableLastSuccessfulSource) {
        setLastSuccessfulSource(sourceId);
      }
      router.close();
      return null;
    }
    if (result.embeds.length === 1) {
      let embedResult: EmbedOutput | undefined;
      if (!meta) return;
      try {
        embedResult = await getProviders().runEmbedScraper({
          id: result.embeds[0].embedId,
          url: result.embeds[0].url,
        });
      } catch (err) {
        console.error(`Failed to scrape ${result.embeds[0].embedId}`, err);
        const notFound = err instanceof NotFoundError;
        const status = notFound ? "notfound" : "failed";
        report([
          scrapeSourceOutputToProviderMetric(
            meta,
            sourceId,
            result.embeds[0].embedId,
            status,
            err,
          ),
        ]);
        throw err;
      }
      report([
        scrapeSourceOutputToProviderMetric(
          meta,
          sourceId,
          result.embeds[0].embedId,
          "success",
          null,
        ),
      ]);
      setSourceId(sourceId);
      setEmbedId(result.embeds[0].embedId);
      setCaption(null);
      if (isExtensionActiveCached()) await prepareStream(embedResult.stream[0]);
      setSource(
        convertRunoutputToSource({ stream: embedResult.stream[0] }),
        convertProviderCaption(embedResult.stream[0].captions),
        getSavedProgress(progressItems, meta),
      );
      // Save the last successful source when manually selected
      if (enableLastSuccessfulSource) {
        setLastSuccessfulSource(sourceId);
      }
      router.close();
    }
    return result.embeds;
  }, [
    sourceId,
    meta,
    router,
    setCaption,
    enableLastSuccessfulSource,
    setLastSuccessfulSource,
  ]);

  return {
    run,
    watching: (request.value ?? null) === null,
    loading: request.loading,
    items: request.value,
    notfound: !!(request.error instanceof NotFoundError),
    errored: !!request.error,
  };
}
