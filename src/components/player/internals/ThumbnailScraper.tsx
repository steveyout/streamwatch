import Hls from "hls.js";
import { useCallback, useEffect, useRef } from "react";

import { ThumbnailImage } from "@/stores/player/slices/thumbnails";
import { usePlayerStore } from "@/stores/player/store";
import {
  LoadableSource,
  SourceQuality,
  SourceSliceSource,
} from "@/stores/player/utils/qualities";
import { usePreferencesStore } from "@/stores/preferences";
import { processCdnLink } from "@/utils/cdn";
import { isSafari } from "@/utils/detectFeatures";

function makeQueue(thumbnails: number): number[] {
  // Create a shuffled array of indices to ensure even distribution
  const indices = Array.from({ length: thumbnails }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Convert shuffled indices to evenly distributed positions
  return indices.map((i) => i / (thumbnails - 1));
}

function selectLowestQuality(source: SourceSliceSource): LoadableSource {
  if (source.type === "hls") return source;

  if (source.type === "file") {
    const availableQualities = Object.entries(source.qualities)
      .filter((entry) => (entry[1].url.length ?? 0) > 0)
      .map((entry) => entry[0]) as SourceQuality[];

    // Quality sorting by priority (higher number = higher quality)
    const qualityPriority: Record<SourceQuality, number> = {
      "360": 10,
      "480": 20,
      "720": 30,
      "4k": 35,
      "1080": 40,
      unknown: 50, // unknown is typically the largest quality
    };

    // Find the lowest quality (smallest priority number) that's available
    let lowestQuality: SourceQuality | null = null;
    let lowestPriority = Infinity;

    for (const quality of availableQualities) {
      const priority = qualityPriority[quality] ?? 0;
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestQuality = quality;
      }
    }

    if (lowestQuality) {
      const stream = source.qualities[lowestQuality];
      if (stream) {
        return stream;
      }
    }
  }

  throw new Error("couldn't select lowest quality");
}

class ThumnbnailWorker {
  interrupted: boolean;

  videoEl: HTMLVideoElement | null = null;

  canvasEl: HTMLCanvasElement | null = null;

  hls: Hls | null = null;

  cb: (img: ThumbnailImage) => void;

  constructor(ops: { addImage: (img: ThumbnailImage) => void }) {
    this.cb = ops.addImage;
    this.interrupted = false;
  }

  start(source: LoadableSource) {
    // afari has extremely strict security policies around canvas operations with video content. When the thumbnail generation tries to:
    // Load cross-origin video content into an off-screen <video> element
    // Draw video frames to a <canvas> using drawImage()
    // Extract image data with canvas.toDataURL()
    // Safari marks the canvas as "tainted" and throws a security error, preventing the thumbnail generation entirely.
    // While still technically possible to generate thumbnails in Safari, it's not worth the effort to fight their strict CORS policies and we just don't support it.
    if (isSafari) return false;
    const el = document.createElement("video");
    el.setAttribute("muted", "true");
    const canvas = document.createElement("canvas");
    this.hls = new Hls();
    if (source.type === "mp4") {
      el.src = processCdnLink(source.url);
      el.crossOrigin = "anonymous";
    } else if (source.type === "hls") {
      this.hls.attachMedia(el);
      this.hls.loadSource(processCdnLink(source.url));
    } else throw new Error("Invalid loadable source type");
    this.videoEl = el;
    this.canvasEl = canvas;
    this.begin().catch((err) => console.error(err));
  }

  destroy() {
    this.interrupted = true;
    this.videoEl = null;
    this.canvasEl = null;
    this.hls?.detachMedia();
    this.hls?.destroy();
    this.hls = null;
  }

  private async initVideo() {
    if (!this.videoEl || !this.canvasEl) return;
    await new Promise((resolve, reject) => {
      this.videoEl?.addEventListener("loadedmetadata", resolve);
      this.videoEl?.addEventListener("error", reject);
    });
    if (!this.videoEl || !this.canvasEl) return;
    this.canvasEl.height = this.videoEl.videoHeight;
    this.canvasEl.width = this.videoEl.videoWidth;
  }

  private async takeSnapshot(at: number) {
    if (!this.videoEl || !this.canvasEl) return;
    this.videoEl.currentTime = at;
    await new Promise((resolve) => {
      const onSeeked = () => {
        this.videoEl?.removeEventListener("seeked", onSeeked);
        resolve(null);
      };
      this.videoEl?.addEventListener("seeked", onSeeked);
    });
    if (!this.videoEl || !this.canvasEl) return;
    const ctx = this.canvasEl.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      this.videoEl,
      0,
      0,
      this.canvasEl.width,
      this.canvasEl.height,
    );
    const imgUrl = this.canvasEl.toDataURL();

    if (this.interrupted) return;
    if (imgUrl === "data:," || !imgUrl) return; // failed image rendering

    this.cb({
      at,
      data: imgUrl,
    });
  }

  private async begin() {
    const vid = this.videoEl;
    if (!vid) return;
    await this.initVideo();

    const queue = makeQueue(127); // 127 thumbnails evenly distributed across the video
    for (let i = 0; i < queue.length; i += 1) {
      if (this.interrupted) return;
      await this.takeSnapshot(vid.duration * queue[i]);
    }
  }
}

export function ThumbnailScraper() {
  const addImage = usePlayerStore((s) => s.thumbnails.addImage);
  const resetImages = usePlayerStore((s) => s.thumbnails.resetImages);
  const meta = usePlayerStore((s) => s.meta);
  const source = usePlayerStore((s) => s.source);
  const hasPlayedOnce = usePlayerStore((s) => s.mediaPlaying.hasPlayedOnce);
  const duration = usePlayerStore((s) => s.progress.duration);
  const enableThumbnails = usePreferencesStore((s) => s.enableThumbnails);
  const workerRef = useRef<ThumnbnailWorker | null>(null);

  // object references dont always trigger changes, so we serialize it to detect *any* change
  const sourceSeralized = JSON.stringify(source);

  const start = useCallback(() => {
    let inputStream = null;
    if (source) inputStream = selectLowestQuality(source);
    // dont interrupt existing working
    if (workerRef.current) return;
    // Allow thumbnail generation when video is loaded and has duration
    if (!hasPlayedOnce || duration <= 0) return;
    if (!inputStream) return;
    resetImages();
    const ins = new ThumnbnailWorker({
      addImage,
    });
    workerRef.current = ins;
    ins.start(inputStream);
  }, [source, addImage, resetImages, hasPlayedOnce, duration]);

  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  }, [start]);

  // start worker with the stream
  useEffect(() => {
    if (enableThumbnails) startRef.current();
  }, [sourceSeralized, enableThumbnails, hasPlayedOnce, duration]);

  // destroy worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.destroy();
        workerRef.current = null;
      }
    };
  }, []);

  // if targeted meta changes, abort the scraper
  const serializedMeta = JSON.stringify({
    id: meta?.tmdbId,
    ep: meta?.episode?.tmdbId,
    se: meta?.season?.tmdbId,
  });
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.destroy();
      workerRef.current = null;
    }
    if (enableThumbnails) startRef.current();
  }, [
    serializedMeta,
    sourceSeralized,
    enableThumbnails,
    hasPlayedOnce,
    duration,
  ]);

  return null;
}
