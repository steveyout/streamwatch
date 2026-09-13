import {
  type GetMediaParams,
  type MediaRecord,
  type SubmissionResponse,
  type SubmitMediaTimestampInput,
  TheIntroDbApiError,
  createIntroDbClient,
} from "theintrodb";

export { TheIntroDbApiError };
export type {
  GetMediaParams,
  MediaRecord,
  SubmissionResponse,
  SubmitMediaTimestampInput,
};

const introDbClient = createIntroDbClient();

export function getIntroDbMedia(
  params: GetMediaParams,
  apiKey?: string | null,
): Promise<MediaRecord> {
  return introDbClient.getMedia(params, apiKey ? { apiKey } : undefined);
}

export function submitIntro(
  submission: SubmitMediaTimestampInput,
  apiKey: string,
): Promise<SubmissionResponse> {
  return introDbClient.submitMediaTimestamp(submission, { apiKey });
}
