/* eslint-disable no-console */
import { type SubtitleData, searchSubtitles } from "wyzie-lib";

import { CaptionListItem } from "@/stores/player/slices/source";

export async function scrapeWyzieCaptions(
  tmdbId: string | number,
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const searchParams: any = {
      encoding: "utf-8",
      source: "all",
      imdb_id: imdbId,
    };

    if (tmdbId && !imdbId) {
      searchParams.tmdb_id =
        typeof tmdbId === "string" ? parseInt(tmdbId, 10) : tmdbId;
    }

    if (season && episode) {
      searchParams.season = season;
      searchParams.episode = episode;
    }

    console.log("Searching Wyzie subtitles with params:", searchParams);
    const wyzieSubtitles: SubtitleData[] = await searchSubtitles(searchParams);

    const wyzieCaptions: CaptionListItem[] = wyzieSubtitles.map((subtitle) => ({
      id: subtitle.id,
      language: subtitle.language || "unknown",
      url: subtitle.url,
      type:
        subtitle.format === "srt" || subtitle.format === "vtt"
          ? subtitle.format
          : "srt",
      needsProxy: false,
      opensubtitles: true,
      // Additional metadata from Wyzie
      display: subtitle.display,
      media: subtitle.media,
      isHearingImpaired: subtitle.isHearingImpaired,
      source: `wyzie ${subtitle.source?.toString() === "opensubtitles" ? "opensubs" : subtitle.source}`,
      encoding: subtitle.encoding,
    }));

    return wyzieCaptions;
  } catch (error) {
    console.error("Error fetching Wyzie subtitles:", error);
    return [];
  }
}
