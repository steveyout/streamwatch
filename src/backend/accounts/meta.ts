import { ofetch } from "ofetch";

export interface MetaResponse {
  version: string;
  name: string;
  description?: string;
  hasCaptcha: boolean;
  captchaClientKey?: string;
}

export async function getBackendMeta(url: string): Promise<MetaResponse> {
  const meta = await ofetch<MetaResponse>("/meta", {
    baseURL: url,
  });

  // Remove escaped backslashes before apostrophes (e.g., \' becomes ')
  return {
    ...meta,
    name: meta.name.replace(/\\'/g, "'"),
    description: meta.description?.replace(/\\'/g, "'"),
  };
}
