/* eslint-disable no-console */
import { ScrapeMedia } from "@p-stream/providers";

import { downloadCaption } from "@/backend/helpers/subs";
import { MakeSlice } from "@/stores/player/slices/types";
import {
  SourceQuality,
  SourceSliceSource,
  selectQuality,
} from "@/stores/player/utils/qualities";
import { useQualityStore } from "@/stores/quality";
import googletranslate from "@/utils/translation/googletranslate";
import { translate } from "@/utils/translation/index";
import { ValuesOf } from "@/utils/typeguard";

export const playerStatus = {
  IDLE: "idle",
  RESUME: "resume",
  SCRAPING: "scraping",
  PLAYING: "playing",
  SCRAPE_NOT_FOUND: "scrapeNotFound",
  PLAYBACK_ERROR: "playbackError",
} as const;

export type PlayerStatus = ValuesOf<typeof playerStatus>;

export interface PlayerMetaEpisode {
  number: number;
  tmdbId: string;
  title: string;
  air_date?: string;
}

export interface PlayerMeta {
  type: "movie" | "show";
  title: string;
  tmdbId: string;
  imdbId?: string;
  releaseYear: number;
  poster?: string;
  episodes?: PlayerMetaEpisode[];
  episode?: PlayerMetaEpisode;
  season?: {
    number: number;
    tmdbId: string;
    title: string;
  };
}

export interface Caption {
  id: string;
  language: string;
  url?: string;
  srtData: string;
}

export interface CaptionListItem {
  id: string;
  language: string;
  url: string;
  type?: string;
  needsProxy: boolean;
  hls?: boolean;
  opensubtitles?: boolean;
  // subtitle details from wyzie
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
}

export interface AudioTrack {
  id: string;
  label: string;
  language: string;
}

export interface TranslateTask {
  targetCaption: CaptionListItem;
  fetchedTargetCaption?: Caption;
  targetLanguage: string;
  translatedCaption?: Caption;
  done: boolean;
  error: boolean;
  cancel: () => void;
}

export interface SourceSlice {
  status: PlayerStatus;
  source: SourceSliceSource | null;
  sourceId: string | null;
  embedId: string | null;
  qualities: SourceQuality[];
  audioTracks: AudioTrack[];
  currentQuality: SourceQuality | null;
  currentAudioTrack: AudioTrack | null;
  captionList: CaptionListItem[];
  isLoadingExternalSubtitles: boolean;
  caption: {
    selected: Caption | null;
    asTrack: boolean;
    translateTask: TranslateTask | null;
  };
  meta: PlayerMeta | null;
  failedSourcesPerMedia: Record<string, string[]>; // mediaKey -> array of failed sourceIds
  failedEmbedsPerMedia: Record<string, Record<string, string[]>>; // mediaKey -> sourceId -> array of failed embedIds
  resumeFromSourceId: string | null;
  setStatus(status: PlayerStatus): void;
  setSource(
    stream: SourceSliceSource,
    captions: CaptionListItem[],
    startAt: number,
  ): void;
  switchQuality(quality: SourceQuality): void;
  setMeta(meta: PlayerMeta, status?: PlayerStatus): void;
  setCaption(caption: Caption | null): void;
  setSourceId(id: string | null): void;
  setEmbedId(id: string | null): void;
  enableAutomaticQuality(): void;
  redisplaySource(startAt: number): void;
  setCaptionAsTrack(asTrack: boolean): void;
  addExternalSubtitles(): Promise<void>;
  translateCaption(
    targetCaption: CaptionListItem,
    targetLanguage: string,
  ): Promise<void>;
  clearTranslateTask(): void;
  addFailedSource(sourceId: string): void;
  addFailedEmbed(sourceId: string, embedId: string): void;
  clearFailedSources(mediaKey?: string): void;
  clearFailedEmbeds(mediaKey?: string): void;
  setResumeFromSourceId(sourceId: string | null): void;
  reset(): void;
}

/**
 * Generates a unique media key for tracking failed sources per media.
 * For movies: `${type}-${tmdbId}`
 * For shows: `${type}-${tmdbId}-${season.tmdbId}-${episode.tmdbId}`
 */
export function getMediaKey(meta: PlayerMeta | null): string | null {
  if (!meta) return null;

  if (meta.type === "movie") {
    return `${meta.type}-${meta.tmdbId}`;
  }

  // For shows, include season and episode IDs for per-episode tracking
  if (meta.type === "show" && meta.season && meta.episode) {
    return `${meta.type}-${meta.tmdbId}-${meta.season.tmdbId}-${meta.episode.tmdbId}`;
  }

  // Fallback if show data is incomplete
  return `${meta.type}-${meta.tmdbId}`;
}

export function metaToScrapeMedia(meta: PlayerMeta): ScrapeMedia {
  if (meta.type === "show") {
    if (!meta.episode || !meta.season) throw new Error("missing show data");
    return {
      title: meta.title,
      releaseYear: meta.releaseYear,
      tmdbId: meta.tmdbId,
      type: "show",
      imdbId: meta.imdbId,
      episode: meta.episode,
      season: meta.season,
    };
  }

  return {
    title: meta.title,
    releaseYear: meta.releaseYear,
    tmdbId: meta.tmdbId,
    type: "movie",
    imdbId: meta.imdbId,
  };
}

export const createSourceSlice: MakeSlice<SourceSlice> = (set, get) => ({
  source: null,
  sourceId: null,
  embedId: null,
  qualities: [],
  audioTracks: [],
  captionList: [],
  isLoadingExternalSubtitles: false,
  currentQuality: null,
  currentAudioTrack: null,
  status: playerStatus.IDLE,
  meta: null,
  failedSourcesPerMedia: {},
  failedEmbedsPerMedia: {},
  resumeFromSourceId: null,
  caption: {
    selected: null,
    asTrack: false,
    translateTask: null,
  },
  setSourceId(id) {
    set((s) => {
      s.status = playerStatus.PLAYING;
      s.sourceId = id;
      s.embedId = null;
    });
  },
  setEmbedId(id) {
    set((s) => {
      s.embedId = id;
    });
  },
  setStatus(status: PlayerStatus) {
    set((s) => {
      s.status = status;
    });
  },
  setMeta(meta, newStatus) {
    const store = get();
    const oldMediaKey = getMediaKey(store.meta);
    const newMediaKey = getMediaKey(meta);

    set((s) => {
      s.meta = meta;
      s.embedId = null;
      s.sourceId = null;
      s.interface.hideNextEpisodeBtn = false;
      if (newStatus) s.status = newStatus;

      // Clear failed sources/embeds for the new media when media changes
      // Since we're doing per-episode tracking, we clear whenever media key changes
      // Only clear if we're actually switching to different media (not just setting meta for the first time)
      if (newMediaKey && oldMediaKey && oldMediaKey !== newMediaKey) {
        // Clear failed sources/embeds for the new media (if any exist from previous session)
        // This ensures a fresh start for each media/episode
        delete s.failedSourcesPerMedia[newMediaKey];
        delete s.failedEmbedsPerMedia[newMediaKey];
      }
    });
  },
  setCaption(caption) {
    const store = get();
    store.display?.setCaption(caption);
    if (
      !caption ||
      (store.caption.translateTask &&
        store.caption.translateTask.targetCaption.id !== caption?.id &&
        store.caption.translateTask.translatedCaption?.id !== caption?.id)
    ) {
      store.clearTranslateTask();
    }
    set((s) => {
      s.caption.selected = caption;
    });
  },
  setSource(
    stream: SourceSliceSource,
    captions: CaptionListItem[],
    startAt: number,
  ) {
    let qualities: string[] = [];
    if (stream.type === "file") qualities = Object.keys(stream.qualities);
    const qualityPreferences = useQualityStore.getState();
    const loadableStream = selectQuality(stream, qualityPreferences.quality);

    set((s) => {
      s.source = stream;
      s.qualities = qualities as SourceQuality[];
      s.currentQuality = loadableStream.quality;
      s.captionList = captions;
      s.interface.error = undefined;
      s.status = playerStatus.PLAYING;
      s.audioTracks = [];
      s.currentAudioTrack = null;
    });
    const store = get();
    store.redisplaySource(startAt);

    // Trigger external subtitle scraping after stream is loaded
    // This runs asynchronously so it doesn't block the stream loading
    setTimeout(() => {
      store.addExternalSubtitles();
    }, 100);
  },
  redisplaySource(startAt: number) {
    const store = get();
    if (!store.source) return;
    const qualityPreferences = useQualityStore.getState();
    const loadableStream = selectQuality(store.source, {
      automaticQuality: qualityPreferences.quality.automaticQuality,
      lastChosenQuality: qualityPreferences.quality.lastChosenQuality,
    });
    set((s) => {
      s.interface.error = undefined;
      s.status = playerStatus.PLAYING;
    });
    store.display?.load({
      source: loadableStream.stream,
      startAt,
      automaticQuality: qualityPreferences.quality.automaticQuality,
      preferredQuality: qualityPreferences.quality.lastChosenQuality,
    });
  },
  switchQuality(quality) {
    const store = get();
    if (!store.source) return;
    if (store.source.type === "file") {
      const selectedQuality = store.source.qualities[quality];
      if (!selectedQuality) return;
      set((s) => {
        s.currentQuality = quality;
        s.status = playerStatus.PLAYING;
        s.interface.error = undefined;
      });
      store.display?.load({
        source: selectedQuality,
        startAt: store.progress.time,
        automaticQuality: false,
        preferredQuality: quality,
      });
    } else if (store.source.type === "hls") {
      store.display?.changeQuality(false, quality);
    }
  },
  enableAutomaticQuality() {
    const store = get();
    store.display?.changeQuality(true, null);
  },
  setCaptionAsTrack(asTrack: boolean) {
    set((s) => {
      s.caption.asTrack = asTrack;
    });
  },
  addFailedSource(sourceId: string) {
    const store = get();
    const mediaKey = getMediaKey(store.meta);
    if (!mediaKey) return; // Skip tracking if no media is set

    set((s) => {
      if (!s.failedSourcesPerMedia[mediaKey]) {
        s.failedSourcesPerMedia[mediaKey] = [];
      }
      if (!s.failedSourcesPerMedia[mediaKey].includes(sourceId)) {
        s.failedSourcesPerMedia[mediaKey] = [
          ...s.failedSourcesPerMedia[mediaKey],
          sourceId,
        ];
      }
    });
  },
  addFailedEmbed(sourceId: string, embedId: string) {
    const store = get();
    const mediaKey = getMediaKey(store.meta);
    if (!mediaKey) return; // Skip tracking if no media is set

    set((s) => {
      if (!s.failedEmbedsPerMedia[mediaKey]) {
        s.failedEmbedsPerMedia[mediaKey] = {};
      }
      if (!s.failedEmbedsPerMedia[mediaKey][sourceId]) {
        s.failedEmbedsPerMedia[mediaKey][sourceId] = [];
      }
      if (!s.failedEmbedsPerMedia[mediaKey][sourceId].includes(embedId)) {
        s.failedEmbedsPerMedia[mediaKey][sourceId] = [
          ...s.failedEmbedsPerMedia[mediaKey][sourceId],
          embedId,
        ];
      }
    });
  },
  clearFailedSources(mediaKey?: string) {
    set((s) => {
      if (mediaKey) {
        // Clear for specific media
        delete s.failedSourcesPerMedia[mediaKey];
      } else {
        // Clear all
        s.failedSourcesPerMedia = {};
      }
    });
  },
  clearFailedEmbeds(mediaKey?: string) {
    set((s) => {
      if (mediaKey) {
        // Clear for specific media
        delete s.failedEmbedsPerMedia[mediaKey];
      } else {
        // Clear all
        s.failedEmbedsPerMedia = {};
      }
    });
  },
  setResumeFromSourceId(sourceId: string | null) {
    set((s) => {
      s.resumeFromSourceId = sourceId;
    });
  },
  reset() {
    get().clearSkipSegments?.();
    set((s) => {
      s.source = null;
      s.sourceId = null;
      s.embedId = null;
      s.qualities = [];
      s.audioTracks = [];
      s.captionList = [];
      s.isLoadingExternalSubtitles = false;
      s.currentQuality = null;
      s.currentAudioTrack = null;
      s.status = playerStatus.IDLE;
      s.meta = null;
      s.failedSourcesPerMedia = {};
      s.failedEmbedsPerMedia = {};
      s.resumeFromSourceId = null;
      this.clearTranslateTask();
      s.caption = {
        selected: null,
        asTrack: false,
        translateTask: null,
      };
    });
  },
  async addExternalSubtitles() {
    const store = get();
    if (!store.meta) return;

    set((s) => {
      s.isLoadingExternalSubtitles = true;
    });

    try {
      const { scrapeExternalSubtitles } = await import(
        "@/utils/externalSubtitles"
      );
      const externalCaptions = await scrapeExternalSubtitles(store.meta);

      if (externalCaptions.length > 0) {
        set((s) => {
          // Add external captions to the existing list, avoiding duplicates
          const existingIds = new Set(s.captionList.map((c) => c.id));
          const newCaptions = externalCaptions.filter(
            (c) => !existingIds.has(c.id),
          );
          s.captionList = [...s.captionList, ...newCaptions];
        });
        console.log(`Added ${externalCaptions.length} external captions`);
      }
    } catch (error) {
      console.error("Failed to scrape external subtitles:", error);
    } finally {
      set((s) => {
        s.isLoadingExternalSubtitles = false;
      });
    }
  },

  clearTranslateTask() {
    set((s) => {
      if (s.caption.translateTask) {
        s.caption.translateTask.cancel();
      }
      s.caption.translateTask = null;
    });
  },

  async translateCaption(
    targetCaption: CaptionListItem,
    targetLanguage: string,
  ) {
    let store = get();

    if (store.caption.translateTask) {
      console.warn("A translation task is already in progress");
      return;
    }

    const abortController = new AbortController();

    set((s) => {
      s.caption.translateTask = {
        targetCaption,
        targetLanguage,
        done: false,
        error: false,
        cancel() {
          if (!this.done && !this.error) {
            console.log("Translation task was cancelled");
          }
          abortController.abort();
        },
      };
    });

    function handleError(err: any) {
      if (abortController.signal.aborted) {
        return;
      }
      console.error("Translation task ran into an error", err);
      set((s) => {
        if (!s.caption.translateTask) return;
        s.caption.translateTask.error = true;
      });
    }

    try {
      const srtData = await downloadCaption(targetCaption);
      if (abortController.signal.aborted) {
        return;
      }
      if (!srtData) {
        throw new Error("Fetching failed");
      }
      set((s) => {
        if (!s.caption.translateTask) return;
        s.caption.translateTask.fetchedTargetCaption = {
          id: targetCaption.id,
          language: targetCaption.language,
          srtData,
        };
      });
      store = get();
    } catch (err) {
      handleError(err);
      return;
    }

    try {
      const result = await translate(
        store.caption.translateTask!.fetchedTargetCaption!,
        targetLanguage,
        googletranslate,
        abortController.signal,
      );
      if (abortController.signal.aborted) {
        return;
      }
      if (!result) {
        throw new Error("Translation failed");
      }
      set((s) => {
        if (!s.caption.translateTask) return;
        const translatedCaption: Caption = {
          id: `${targetCaption.id}-translated-${targetLanguage}`,
          language: targetLanguage,
          srtData: result,
        };
        s.caption.translateTask.done = true;
        s.caption.translateTask.translatedCaption = translatedCaption;
      });
    } catch (err) {
      handleError(err);
    }
  },
});
