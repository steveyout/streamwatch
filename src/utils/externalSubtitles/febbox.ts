/* eslint-disable no-console */
import { labelToLanguageCode } from "@p-stream/providers";

import { CaptionListItem } from "@/stores/player/slices/source";

export async function scrapeFebboxCaptions(
  imdbId: string,
  season?: number,
  episode?: number,
): Promise<CaptionListItem[]> {
  try {
    let url: string;
    if (season && episode) {
      url = `https://fed-subs.pstream.mov/tv/${imdbId}/${season}/${episode}`;
    } else {
      url = `https://fed-subs.pstream.mov/movie/${imdbId}`;
    }

    // console.log("Searching Febbox subtitles with URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Febbox API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for error response
    if (data.error) {
      console.log("Febbox API error:", data.error);
      return [];
    }

    // Check if subtitles exist
    if (!data.subtitles || typeof data.subtitles !== "object") {
      console.log("No subtitles found in Febbox response");
      return [];
    }

    const febboxCaptions: CaptionListItem[] = [];

    // Iterate through all available languages
    for (const [languageName, subtitleData] of Object.entries(data.subtitles)) {
      if (typeof subtitleData === "object" && subtitleData !== null) {
        const subtitle = subtitleData as {
          subtitle_link: string;
          subtitle_name: string;
        };

        if (subtitle.subtitle_link) {
          const language = labelToLanguageCode(languageName) || "";
          const fileExtension = subtitle.subtitle_link
            .split(".")
            .pop()
            ?.toLowerCase();

          // Determine subtitle type based on file extension
          let type: string = "srt";
          if (fileExtension === "vtt") {
            type = "vtt";
          } else if (fileExtension === "sub") {
            type = "sub";
          }

          febboxCaptions.push({
            id: subtitle.subtitle_link,
            language,
            url: subtitle.subtitle_link,
            type,
            needsProxy: false,
            opensubtitles: true,
            display: subtitle.subtitle_name,
            source: "febbox",
          });
        }
      }
    }

    console.log(`Found ${febboxCaptions.length} Febbox subtitles`);
    return febboxCaptions;
  } catch (error) {
    console.error("Error fetching Febbox subtitles:", error);
    return [];
  }
}
