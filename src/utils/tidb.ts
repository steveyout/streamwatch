export type SegmentType = "intro" | "recap" | "credits" | "preview";

export interface SubmissionRequest {
  tmdb_id: number;
  type: "movie" | "tv";
  segment: SegmentType;
  season?: number;
  episode?: number;
  start_sec?: number | null;
  end_sec?: number | null;
  start_ms?: number | null;
  end_ms?: number | null;
  tvdb_id?: number;
  imdb_id?: string;
}

export interface SubmissionResponse {
  ok: boolean;
  submission?: {
    id: string;
    tmdbId: number;
    type: "movie" | "tv";
    segment: SegmentType;
    season?: number;
    episode?: number;
    startMs?: number | null;
    endMs?: number | null;
    status: "pending" | "accepted" | "rejected";
    weight: number;
  };
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export class TIDBError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string,
  ) {
    super(message);
    this.name = "TIDBError";
  }
}

/**
 * Submit segment timestamps to TheIntroDB API
 */
export async function submitIntro(
  submission: SubmissionRequest,
  apiKey: string,
): Promise<SubmissionResponse> {
  const response = await fetch("https://api.theintrodb.org/v1/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let details: string | undefined;

    try {
      const errorData: ErrorResponse = await response.json();
      errorMessage = errorData.error;
      details = errorData.details;
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new TIDBError(errorMessage, response.status, details);
  }

  const data: SubmissionResponse = await response.json();
  return data;
}
