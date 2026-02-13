import { useEffect, useRef } from "react";
import { useInterval } from "react-use";

import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { ProgressItem, useProgressStore } from "@/stores/progress";

function progressIsNotStarted(duration: number, watched: number): boolean {
  // too short watch time
  if (watched < 20) return true;
  return false;
}

function progressIsCompleted(duration: number, watched: number): boolean {
  const timeFromEnd = duration - watched;
  // too close to the end, is completed
  if (timeFromEnd < 60 * 2) return true;
  return false;
}

function shouldSaveProgress(
  meta: any,
  progress: ProgressItem,
  existingItems: Record<string, any>,
): boolean {
  const { duration, watched } = progress;

  // Check if progress is acceptable
  const isNotStarted = progressIsNotStarted(duration, watched);
  const isCompleted = progressIsCompleted(duration, watched);
  const isAcceptable = !isNotStarted && !isCompleted;

  // For movies, only save if acceptable
  if (meta.type === "movie") {
    return isAcceptable;
  }

  // For shows, save if acceptable OR if season has other watched episodes
  if (isAcceptable) return true;

  // Check if this season has other episodes with progress
  const showItem = existingItems[meta.tmdbId];
  if (!showItem || !meta.season) return false;

  const seasonEpisodes = Object.values(showItem.episodes).filter(
    (episode: any) => episode.seasonId === meta.season.tmdbId,
  );

  // Check if any other episode in this season has acceptable progress
  return seasonEpisodes.some((episode: any) => {
    const epProgress = episode.progress;
    return (
      !progressIsNotStarted(epProgress.duration, epProgress.watched) &&
      !progressIsCompleted(epProgress.duration, epProgress.watched)
    );
  });
}

export function ProgressSaver() {
  const meta = usePlayerStore((s) => s.meta);
  const progress = usePlayerStore((s) => s.progress);
  const updateItem = useProgressStore((s) => s.updateItem);
  const progressItems = useProgressStore((s) => s.items);
  const status = usePlayerStore((s) => s.status);
  const hasPlayedOnce = usePlayerStore((s) => s.mediaPlaying.hasPlayedOnce);

  const lastSavedRef = useRef<ProgressItem | null>(null);

  const dataRef = useRef({
    updateItem,
    progressItems,
    meta,
    progress,
    status,
    hasPlayedOnce,
  });
  useEffect(() => {
    dataRef.current.updateItem = updateItem;
    dataRef.current.progressItems = progressItems;
    dataRef.current.meta = meta;
    dataRef.current.progress = progress;
    dataRef.current.status = status;
    dataRef.current.hasPlayedOnce = hasPlayedOnce;
  }, [updateItem, progressItems, progress, meta, status, hasPlayedOnce]);

  useInterval(() => {
    const d = dataRef.current;
    if (!d.progress || !d.meta || !d.updateItem) return;
    if (d.status !== playerStatus.PLAYING) return;
    if (!hasPlayedOnce) return;

    let isDifferent = false;
    if (!lastSavedRef.current) isDifferent = true;
    else if (
      lastSavedRef.current?.duration !== progress.duration ||
      lastSavedRef.current?.watched !== progress.time
    )
      isDifferent = true;

    lastSavedRef.current = {
      duration: progress.duration,
      watched: progress.time,
    };
    if (
      isDifferent &&
      shouldSaveProgress(d.meta, lastSavedRef.current, d.progressItems)
    )
      d.updateItem({
        meta: d.meta,
        progress: lastSavedRef.current,
      });
  }, 3000);

  return null;
}
