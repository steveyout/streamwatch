/* eslint-disable no-console */
import { labelToLanguageCode } from "@p-stream/providers";

import { CaptionListItem } from "@/stores/player/slices/source";

export async function scrapeVdrkCaptions(
  tmdbId: string | number,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    const tmdbIdNum =
      typeof tmdbId === "string" ? parseInt(tmdbId, 10) : tmdbId;

    let url: string;
    if (season && episode) {
      // For TV shows: https://sub.vdrk.site/v1/tv/{tmdb_id}/{season}/{episode}
      url = `https://sub.vdrk.site/v1/tv/${tmdbIdNum}/${season}/${episode}`;
    } else {
      // For movies: https://sub.vdrk.site/v1/movie/{tmdb_id}
      url = `https://sub.vdrk.site/v1/movie/${tmdbIdNum}`;
    }

    console.log("Searching VDRK subtitles with URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`VDRK API returned ${response.status}`);
    }

    const data = await response.json();

    // Check if response is an array
    if (!Array.isArray(data)) {
      console.log("Invalid VDRK response format");
      return [];
    }

    const vdrkCaptions: CaptionListItem[] = [];

    for (const subtitle of data) {
      if (subtitle.file && subtitle.label) {
        // Parse label to extract language and hearing impaired info
        const label = subtitle.label;
        const isHearingImpaired = label.includes(" Hi") || label.includes("Hi");
        const languageName = label
          .replace(/\s*Hi\d*$/, "")
          .replace(/\s*Hi$/, "")
          .replace(/\d+$/, "");
        const language = labelToLanguageCode(languageName) || "";

        if (!language) continue;

        vdrkCaptions.push({
          id: subtitle.file,
          language,
          url: subtitle.file,
          type: "vtt", // VDRK provides VTT files
          needsProxy: false,
          opensubtitles: true,
          display: subtitle.label,
          isHearingImpaired,
          source: "granite",
        });
      }
    }

    console.log(`Found ${vdrkCaptions.length} VDRK subtitles`);
    return vdrkCaptions;
  } catch (error) {
    console.error("Error fetching VDRK subtitles:", error);
    return [];
  }
}
