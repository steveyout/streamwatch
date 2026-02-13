import { useCallback, useEffect, useRef } from "react";

import { usePlayerStore } from "@/stores/player/store";

import { usePlayerMeta } from "../hooks/usePlayerMeta";

export function MediaSession() {
  const { setDirectMeta } = usePlayerMeta();
  const setShouldStartFromBeginning = usePlayerStore(
    (s) => s.setShouldStartFromBeginning,
  );

  const mediaPlaying = usePlayerStore((s) => s.mediaPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const meta = usePlayerStore((s) => s.meta);
  const display = usePlayerStore((s) => s.display);

  const shouldUpdatePositionState = useRef(false);
  const lastPlaybackPosition = useRef(0);

  const changeEpisode = useCallback(
    (change: number) => {
      const nextEp = meta?.episodes?.find(
        (v) => v.number === (meta?.episode?.number ?? 0) + change,
      );

      if (!meta || !nextEp) return;
      const metaCopy = { ...meta };
      metaCopy.episode = nextEp;
      setShouldStartFromBeginning(true);
      setDirectMeta(metaCopy);
    },
    [meta, setDirectMeta, setShouldStartFromBeginning],
  );

  const updatePositionState = useCallback(
    (position: number) => {
      if (typeof navigator.mediaSession.setPositionState !== "function") return;

      const { duration, buffered } = progress;
      const { playbackRate } = mediaPlaying;

      if (
        typeof duration !== "number" ||
        Number.isNaN(duration) ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        return;
      }

      if (
        typeof position !== "number" ||
        Number.isNaN(position) ||
        position < 0
      ) {
        position = 0;
      }

      if (position > buffered) {
        shouldUpdatePositionState.current = true;
      }

      if (position > duration) {
        position = duration;
      }

      lastPlaybackPosition.current = progress.time;

      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
        position,
      });
    },
    [mediaPlaying, progress],
  );

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = mediaPlaying.isPaused
      ? "paused"
      : "playing";
  }, [mediaPlaying.isPaused]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (
      typeof progress.duration !== "number" ||
      Number.isNaN(progress.duration) ||
      progress.duration <= 0
    ) {
      return;
    }
    updatePositionState(progress.time);
  }, [
    progress.time,
    mediaPlaying.playbackRate,
    progress.duration,
    updatePositionState,
  ]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const { time, duration } = progress;
    const { isLoading } = mediaPlaying;

    if (
      typeof duration !== "number" ||
      Number.isNaN(duration) ||
      duration <= 0
    ) {
      return;
    }

    if (!shouldUpdatePositionState.current && isLoading) {
      shouldUpdatePositionState.current = true;
    }

    if (
      !isLoading &&
      !shouldUpdatePositionState.current &&
      Math.abs(time - lastPlaybackPosition.current) >= 5
    ) {
      shouldUpdatePositionState.current = true;
    }

    if (shouldUpdatePositionState.current && !isLoading) {
      shouldUpdatePositionState.current = false;
      updatePositionState(time);
    }

    lastPlaybackPosition.current = time;
  }, [mediaPlaying, progress, updatePositionState]);

  useEffect(() => {
    if (
      !("mediaSession" in navigator) ||
      (!mediaPlaying.isLoading && mediaPlaying.isPlaying && !display)
    ) {
      return;
    }

    let title: string | undefined;
    let artist: string | undefined;

    if (meta?.type === "movie") {
      title = meta.title;
    } else if (meta?.type === "show") {
      artist = meta.title;
      title = `S${meta.season?.number} E${meta.episode?.number}: ${meta.episode?.title}`;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      artwork: [
        { src: meta?.poster ?? "", sizes: "342x513", type: "image/png" },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      if (mediaPlaying.isLoading) return;
      display?.play();
      updatePositionState(progress.time);
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      if (mediaPlaying.isLoading) return;
      display?.pause();
      updatePositionState(progress.time);
    });

    navigator.mediaSession.setActionHandler("seekto", (e) => {
      if (e.seekTime == null) return;
      display?.setTime(e.seekTime);
      updatePositionState(e.seekTime);
    });

    if ((meta?.episode?.number ?? 1) > 1) {
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        changeEpisode(-1),
      );
    } else {
      navigator.mediaSession.setActionHandler("previoustrack", null);
    }

    const totalEpisodes = meta?.episodes?.length ?? 0;
    const currentEpisodeNumber = meta?.episode?.number ?? 0;
    if (currentEpisodeNumber > 0 && currentEpisodeNumber < totalEpisodes) {
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        changeEpisode(1),
      );
    } else {
      navigator.mediaSession.setActionHandler("nexttrack", null);
    }
  }, [
    changeEpisode,
    updatePositionState,
    mediaPlaying.isLoading,
    mediaPlaying.isPlaying,
    display,
    progress.duration,
    progress.time,
    meta?.episode?.number,
    meta?.episodes?.length,
    meta?.episode?.title,
    meta?.title,
    meta?.type,
    meta?.poster,
    meta?.season?.number,
  ]);

  return null;
}

// what did we learn today? never use isNaN instead of Number.isNaN !!!
