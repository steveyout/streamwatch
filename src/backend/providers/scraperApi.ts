import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { iso6393 } from "iso-639-3";

export const SCRAPER_API_BASE = (
  import.meta.env.VITE_SCRAPER_API_URL || "https://api.youplex.site"
).replace(/\/+$/, "");

export const SCRAPER_SECRET =
  import.meta.env.VITE_SCRAPER_SECRET ||
  "yp_sw_v6_9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c";

const INTERNAL_API_KEY = import.meta.env.VITE_INTERNAL_API_KEY || "";

function computeHmacHex(secret: string, message: string): string {
  return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(message)));
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  }
  const NodeBuffer = (
    globalThis as { Buffer?: { from: (s: string, enc: string) => Uint8Array } }
  ).Buffer;
  if (NodeBuffer) {
    return new Uint8Array(NodeBuffer.from(b64, "base64"));
  }
  throw new Error("Base64 decoding unavailable in this runtime");
}

function signScraperRequest(type: string, id: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = computeHmacHex(SCRAPER_SECRET, `${type}:${id}:${ts}`).slice(
    0,
    32,
  );
  return {
    ts,
    sig,
    token: `${ts}.${sig}`,
  };
}

function getScraperAuthHeaders(
  type: string,
  id: string,
): Record<string, string> {
  if (typeof window !== "undefined") {
    return {};
  }
  const { token } = signScraperRequest(type, id);
  const headers: Record<string, string> = {
    "X-Scraper-Token": token,
  };
  if (INTERNAL_API_KEY) {
    headers["X-Internal-Key"] = INTERNAL_API_KEY;
  }
  return headers;
}

function deriveKeystreamBytes(
  secret: string,
  ivHex: string,
  length: number,
): Uint8Array {
  const out = new Uint8Array(length);
  let offset = 0;
  let counter = 0;
  while (offset < length) {
    const block = sha256(utf8ToBytes(`${secret}:${ivHex}:${counter}`));
    const copyLen = Math.min(block.length, length - offset);
    out.set(block.subarray(0, copyLen), offset);
    offset += copyLen;
    counter += 1;
  }
  return out;
}

export function decryptScraperPayload<T extends Record<string, any>>(
  payload: T,
): T {
  if (
    !payload ||
    typeof payload !== "object" ||
    !payload.encrypted ||
    !payload.enc
  ) {
    return payload;
  }

  const { iv, data, tag } = payload.enc as {
    iv?: string;
    data?: string;
    tag?: string;
  };
  if (!iv || !data || !tag) {
    throw new Error("Malformed encrypted scraper payload");
  }

  const expectedTag = computeHmacHex(SCRAPER_SECRET, `${iv}.${data}`).slice(
    0,
    32,
  );
  if (expectedTag !== tag) {
    throw new Error("Encrypted payload integrity check failed");
  }

  const cipherBytes = base64ToBytes(data);
  const keystream = deriveKeystreamBytes(
    SCRAPER_SECRET,
    iv,
    cipherBytes.length,
  );
  const plainBytes = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i += 1) {
    // eslint-disable-next-line no-bitwise
    plainBytes[i] = cipherBytes[i] ^ keystream[i];
  }

  const jsonStr = new TextDecoder().decode(plainBytes);
  const sensitive = JSON.parse(jsonStr);

  const restored = { ...payload, ...sensitive } as Record<string, any>;
  delete restored.encrypted;
  delete restored.enc;
  return restored as T;
}

// ----------------------------------------------------------------------
// Types & Constants (drop-in replacement for @p-stream/providers)
// ----------------------------------------------------------------------

export const flags = {
  CORS_ALLOWED: "cors-allowed",
  IP_LOCKED: "ip-locked",
  CF_BLOCKED: "cf-blocked",
  PROXY_BLOCKED: "proxy-blocked",
  MKV_REQUIRED: "mkv-required",
} as const;

export type Flags = (typeof flags)[keyof typeof flags];

export const targets = {
  BROWSER: "browser",
  BROWSER_EXTENSION: "browser-extension",
  NATIVE: "native",
  ANY: "any",
} as const;

export type Targets = (typeof targets)[keyof typeof targets];

export type Qualities = "unknown" | "360" | "480" | "720" | "1080" | "4k";
export type MediaTypes = "show" | "movie";
export type CaptionType = "srt" | "vtt";

export type Caption = {
  type: CaptionType;
  id: string;
  opensubtitles?: boolean;
  url: string;
  hasCorsRestrictions: boolean;
  language: string;
  flagUrl?: string;
  display?: string;
  media?: string;
  isHearingImpaired?: boolean;
  source?: string;
  encoding?: string;
};

export type ThumbnailTrack = {
  type: "vtt";
  url: string;
};

export type StreamFile = {
  type: "mp4";
  url: string;
};

type StreamCommon = {
  id: string;
  flags: Flags[];
  captions: Caption[];
  thumbnailTrack?: ThumbnailTrack;
  headers?: Record<string, string>;
  preferredHeaders?: Record<string, string>;
  skipValidation?: boolean;
  client?: boolean;
};

export type FileBasedStream = StreamCommon & {
  type: "file";
  qualities: Partial<Record<Qualities, StreamFile>>;
};

export type HlsBasedStream = StreamCommon & {
  type: "hls";
  playlist: string;
  proxyDepth?: 0 | 1 | 2;
};

export type Stream = FileBasedStream | HlsBasedStream;

export type CommonMedia = {
  title: string;
  releaseYear: number;
  imdbId?: string;
  tmdbId: string;
};

export type MovieMedia = CommonMedia & {
  type: "movie";
};

export type ShowMedia = CommonMedia & {
  type: "show";
  episode: {
    number: number;
    tmdbId: string;
  };
  season: {
    number: number;
    tmdbId: string;
    title: string;
    episodeCount?: number;
  };
};

export type ScrapeMedia = ShowMedia | MovieMedia;

export type MetaOutput = {
  type: "embed" | "source";
  id: string;
  rank: number;
  name: string;
  flags?: string[];
  mediaTypes?: Array<MediaTypes>;
};

export type RunOutput = {
  sourceId: string;
  embedId?: string;
  stream: Stream;
};

export type SourcererEmbed = {
  embedId: string;
  url: string;
};

export type SourcererOutput = {
  embeds: SourcererEmbed[];
  stream?: Stream[];
};

export type EmbedOutput = {
  stream: Stream[];
};

export type UpdateEventStatus = "success" | "failure" | "notfound" | "pending";

export type UpdateEvent = {
  id: string;
  percentage: number;
  status: UpdateEventStatus;
  error?: unknown;
  reason?: string;
};

export type InitEvent = {
  sourceIds: string[];
};

export type DiscoverEmbedsEvent = {
  sourceId: string;
  embeds: Array<{
    id: string;
    embedScraperId: string;
  }>;
};

export type FullScraperEvents = {
  update?: (evt: UpdateEvent) => void;
  init?: (evt: InitEvent) => void;
  discoverEmbeds?: (evt: DiscoverEmbedsEvent) => void;
  start?: (id: string) => void;
};

export type IndividualScraperEvents = {
  update?: (evt: UpdateEvent) => void;
};

export interface RunnerOptions {
  sourceOrder?: string[];
  embedOrder?: string[];
  events?: FullScraperEvents;
  media: ScrapeMedia;
  disableOpensubtitles?: boolean;
}

export interface SourceRunnerOptions {
  events?: IndividualScraperEvents;
  media: ScrapeMedia;
  id: string;
  disableOpensubtitles?: boolean;
}

export interface EmbedRunnerOptions {
  events?: IndividualScraperEvents;
  url: string;
  id: string;
  disableOpensubtitles?: boolean;
}

export interface ProviderControls {
  runAll(runnerOps: RunnerOptions): Promise<RunOutput | null>;
  runSourceScraper(runnerOps: SourceRunnerOptions): Promise<SourcererOutput>;
  runEmbedScraper(runnerOps: EmbedRunnerOptions): Promise<EmbedOutput>;
  getMetadata(id: string): MetaOutput | null;
  listSources(): MetaOutput[];
  listEmbeds(): MetaOutput[];
}

export type DefaultedFetcherOptions = {
  baseUrl?: string;
  body?: Record<string, any> | string | FormData;
  headers: Record<string, string>;
  query: Record<string, string>;
  readHeaders: string[];
  method: "HEAD" | "GET" | "POST";
  credentials?: "include" | "same-origin" | "omit";
};

export type FetcherOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  method?: "HEAD" | "GET" | "POST";
  readHeaders?: string[];
  body?: Record<string, any> | string | FormData | URLSearchParams;
  credentials?: "include" | "same-origin" | "omit";
};

export type FetcherResponse<T = any> = {
  statusCode: number;
  headers: Headers;
  finalUrl: string;
  body: T;
};

export type Fetcher = {
  <T = any>(
    url: string,
    ops: DefaultedFetcherOptions,
  ): Promise<FetcherResponse<T>>;
};

export interface ProviderMakerOptions {
  fetcher: Fetcher;
  proxiedFetcher?: Fetcher;
  target: Targets;
  consistentIpForRequests?: boolean;
  externalSources?: "all" | string[];
  proxyStreams?: boolean;
}

export class NotFoundError extends Error {
  constructor(reason?: string) {
    super(reason || "Not found");
    this.name = "NotFoundError";
  }
}

// ----------------------------------------------------------------------
// M3U8 Proxy URL State & Fetcher Helpers
// ----------------------------------------------------------------------

let configuredM3U8ProxyUrl = "";

export function setM3U8ProxyUrl(proxyUrl: string): void {
  configuredM3U8ProxyUrl = proxyUrl;
}

export function getM3U8ProxyUrl(): string {
  return configuredM3U8ProxyUrl;
}

type FetchOps = {
  headers: Record<string, string>;
  method: string;
  body: any;
  credentials?: "include" | "same-origin" | "omit";
  signal?: any;
};

type FetchLike = (url: string, ops?: FetchOps) => Promise<Response>;

function buildRequestUrl(
  url: string,
  baseUrl?: string,
  query?: Record<string, string>,
): string {
  const full = baseUrl
    ? `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`
    : url;
  if (!query || Object.keys(query).length === 0) return full;
  const parsed = new URL(full);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined) parsed.searchParams.set(k, v);
  });
  return parsed.toString();
}

export function makeStandardFetcher(f: FetchLike): Fetcher {
  return async <T = any>(
    url: string,
    ops: DefaultedFetcherOptions,
  ): Promise<FetcherResponse<T>> => {
    const finalRequestUrl = buildRequestUrl(url, ops.baseUrl, ops.query);
    const res = await f(finalRequestUrl, {
      method: ops.method || "GET",
      headers: ops.headers || {},
      body: ops.body as any,
      credentials: ops.credentials,
    });
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await res.json()
      : await res.text();
    return {
      statusCode: res.status,
      headers: res.headers,
      finalUrl: res.url || finalRequestUrl,
      body: body as T,
    };
  };
}

export function makeSimpleProxyFetcher(
  proxyUrl: string,
  f: FetchLike,
): Fetcher {
  const standard = makeStandardFetcher(f);
  return async <T = any>(
    url: string,
    ops: DefaultedFetcherOptions,
  ): Promise<FetcherResponse<T>> => {
    const targetUrl = buildRequestUrl(url, ops.baseUrl, ops.query);
    const cleanProxy = proxyUrl.replace(/\/+$/, "");
    return standard<T>(`${cleanProxy}/`, {
      ...ops,
      baseUrl: undefined,
      query: { destination: targetUrl },
    });
  };
}

// ----------------------------------------------------------------------
// Language Mapping
// ----------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
  "chinese - hong kong": "zh",
  "chinese - traditional": "zh",
  czech: "cs",
  danish: "da",
  dutch: "nl",
  english: "en",
  "english - sdh": "en",
  finnish: "fi",
  french: "fr",
  german: "de",
  greek: "el",
  hungarian: "hu",
  italian: "it",
  korean: "ko",
  norwegian: "no",
  polish: "pl",
  portuguese: "pt",
  "portuguese - brazilian": "pt",
  "protuguese (br)": "pt-br",
  romanian: "ro",
  "spanish - european": "es",
  "spanish - latin american": "es",
  spanish: "es",
  swedish: "sv",
  turkish: "tr",
  arabic: "ar",
  bosnian: "bs",
  bulgarian: "bg",
  croatian: "hr",
  estonian: "et",
  hebrew: "he",
  indonesian: "id",
  indonesia: "id",
  persian: "fa",
  "farsi/persian": "fa",
  russian: "ru",
  serbian: "sr",
  slovenian: "sl",
  thai: "th",
  filipino: "tl",
  urdu: "ur",
  ng: "en",
  re: "fr",
  pa: "es",
};

const isoNameToCode = new Map<string, string>();
iso6393.forEach((entry) => {
  if (entry.iso6391) {
    isoNameToCode.set(entry.name.toLowerCase(), entry.iso6391);
  }
});

export function labelToLanguageCode(label: string): string | null {
  if (!label || typeof label !== "string") return null;
  const trimmed = label.trim().toLowerCase();
  if (!trimmed) return null;
  if (LANGUAGE_MAP[trimmed]) return LANGUAGE_MAP[trimmed];
  if (/^[a-z]{2}(-[a-z]{2})?$/.test(trimmed)) return trimmed;
  const clean = trimmed.replace(/\[.*?\]|\(.*?\)/g, "").trim();
  if (LANGUAGE_MAP[clean]) return LANGUAGE_MAP[clean];
  if (isoNameToCode.has(clean)) return isoNameToCode.get(clean) || null;
  return null;
}

// ----------------------------------------------------------------------
// Active Providers Discovery (synced from api.youplex.site/providers)
// ----------------------------------------------------------------------

const FALLBACK_PROVIDERS: MetaOutput[] = [
  {
    type: "source",
    id: "movi47",
    name: "🎬 Movi47",
    rank: 500,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "netmirror",
    name: "🪞 NetMirror",
    rank: 495,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "oneshows",
    name: "💫 Nova",
    rank: 490,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "arrowtv",
    name: "🏹 Apex",
    rank: 480,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "zoechip",
    name: "💎 Zoechip",
    rank: 475,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "rivestream",
    name: "🌊 Nebula",
    rank: 470,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "vidcore",
    name: "🔋 Quasar",
    rank: 465,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "bingebang",
    name: "💥 BingeBang",
    rank: 460,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "taroflix",
    name: "⭐ Starkio",
    rank: 455,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "cinemaos",
    name: "📽️ Screenscape",
    rank: 450,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "aether",
    name: "⚡ Aether",
    rank: 445,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "vidlink",
    name: "🔗 VidLink",
    rank: 440,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "cno",
    name: "🪐 Titan",
    rank: 435,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "cinejoy",
    name: "🎆 Aurora",
    rank: 430,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "cinecat",
    name: "🐱 Shadow",
    rank: 425,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "zetmoon",
    name: "🌙 Eclipse",
    rank: 420,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "pressplayz",
    name: "▶️ Midnight",
    rank: 415,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "kaizoku",
    name: "🏴‍☠️ Vortex",
    rank: 410,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
  {
    type: "source",
    id: "chillflix",
    name: "❄️ Frost",
    rank: 405,
    flags: [flags.CORS_ALLOWED],
    mediaTypes: ["movie", "show"],
  },
];

let activeProvidersList: MetaOutput[] = [...FALLBACK_PROVIDERS];
let providersFetchedAt = 0;
let inflightProvidersFetch: Promise<MetaOutput[]> | null = null;
const PROVIDERS_CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeMediaTypes(raw?: unknown): MediaTypes[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["movie", "show"];
  const mapped = new Set<MediaTypes>();
  raw.forEach((entry) => {
    if (entry === "movie") mapped.add("movie");
    if (entry === "show" || entry === "tv" || entry === "series")
      mapped.add("show");
  });
  return mapped.size > 0 ? Array.from(mapped) : ["movie", "show"];
}

function mergeProvidersIntoCache(rawList: any[]): MetaOutput[] {
  const mapped: MetaOutput[] = rawList
    .filter((p) => Boolean(p?.id))
    .map((p, idx) => ({
      type: "source",
      id: String(p.id),
      name: String(p.label || p.name || p.providerName || p.id),
      rank: typeof p.rank === "number" ? p.rank : Math.max(100, 500 - idx * 10),
      flags: Array.isArray(p.flags) ? p.flags : [flags.CORS_ALLOWED],
      mediaTypes: normalizeMediaTypes(p.mediaTypes || p.supportedContent),
    }));

  if (mapped.length > 0) {
    activeProvidersList = mapped;
  }
  return activeProvidersList;
}

export async function ensureProvidersLoaded(
  forceRefresh = false,
): Promise<MetaOutput[]> {
  const now = Date.now();
  if (
    !forceRefresh &&
    providersFetchedAt > 0 &&
    now - providersFetchedAt < PROVIDERS_CACHE_TTL_MS
  ) {
    return activeProvidersList;
  }

  if (!forceRefresh && inflightProvidersFetch) {
    return inflightProvidersFetch;
  }

  inflightProvidersFetch = (async () => {
    try {
      const { ts, sig } = signScraperRequest("providers", "list");
      const url = `${SCRAPER_API_BASE}/providers?_ts=${encodeURIComponent(
        ts,
      )}&_sig=${encodeURIComponent(sig)}`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          ...getScraperAuthHeaders("providers", "list"),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data?.providers) && data.providers.length > 0) {
        providersFetchedAt = Date.now();
        return mergeProvidersIntoCache(data.providers);
      }
    } catch (err) {
      console.warn(
        "[ScraperAPI] Failed to fetch active providers, using fallback list:",
        err,
      );
    } finally {
      inflightProvidersFetch = null;
    }
    return activeProvidersList;
  })();

  return inflightProvidersFetch;
}

// Kick off background refresh on load so settings/menus get live providers quickly
if (typeof window !== "undefined") {
  ensureProvidersLoaded().catch(() => {});
}

// ----------------------------------------------------------------------
// Response Normalization -> Stream / RunOutput
// ----------------------------------------------------------------------

function parseQualityRank(
  rawQuality?: string,
  rawName?: string,
  isHls = false,
): number {
  const combined = `${rawQuality || ""} ${rawName || ""}`.toLowerCase();
  if (/2160|4k|uhd/.test(combined)) return 2160;
  if (/1440|2k|qhd/.test(combined)) return 1440;
  if (/1080|fhd/.test(combined)) return 1080;
  if (/720|\bhd\b/.test(combined)) return 720;
  if (/480|\bsd\b/.test(combined)) return 480;
  if (/360/.test(combined)) return 360;
  if (/\b(auto|master|default)\b/.test(combined)) {
    return isHls ? 1050 : 1000;
  }
  return isHls ? 1050 : 900;
}

function formatQualityDisplay(rawQuality?: string, isHls = false): string {
  const lower = String(rawQuality || "").toLowerCase();
  if (/2160|4k|uhd/.test(lower)) return "4K";
  if (/1440|2k|qhd/.test(lower)) return "1440p";
  if (/1080|fhd/.test(lower)) return "1080p";
  if (/720|\bhd\b/.test(lower)) return "720p";
  if (/480|\bsd\b/.test(lower)) return "480p";
  if (/360/.test(lower)) return "360p";
  if (isHls) return "Auto";
  return rawQuality || "1080p";
}

function mapQualityKey(rawQuality?: string): Qualities {
  if (!rawQuality || typeof rawQuality !== "string") return "unknown";
  const q = rawQuality.toLowerCase();
  if (q.includes("4k") || q.includes("2160") || q.includes("uhd")) return "4k";
  if (q.includes("1080") || q.includes("fhd")) return "1080";
  if (q.includes("720") || q.includes("hd")) return "720";
  if (q.includes("480")) return "480";
  if (q.includes("360")) return "360";
  return "unknown";
}

function normalizeCaptions(payload: any): Caption[] {
  const rawList = [
    ...(Array.isArray(payload?.subtitles) ? payload.subtitles : []),
    ...(Array.isArray(payload?.captions) ? payload.captions : []),
  ];
  const seen = new Set<string>();
  const captions: Caption[] = [];

  rawList.forEach((sub) => {
    const subUrl = sub?.url || sub?.file;
    if (!subUrl || seen.has(subUrl)) return;
    seen.add(subUrl);

    const displayLabel =
      sub.display || sub.label || sub.lang || sub.language || "English";
    const langCode =
      (sub.language && /^[a-z]{2}(-[a-z]{2})?$/i.test(sub.language)
        ? sub.language.toLowerCase()
        : null) ||
      labelToLanguageCode(displayLabel) ||
      "en";
    const type: CaptionType =
      sub.type === "srt" || subUrl.toLowerCase().includes(".srt")
        ? "srt"
        : "vtt";

    captions.push({
      id: sub.id || subUrl,
      type,
      url: subUrl,
      hasCorsRestrictions: Boolean(sub.hasCorsRestrictions),
      language: langCode,
      display: displayLabel,
    });
  });

  return captions;
}

const childEmbedRegistry = new Map<
  string,
  { meta: MetaOutput; stream: Stream }
>();

function isHlsSourceItem(s: any): boolean {
  return (
    s?.type === "hls" ||
    Boolean(s?.isM3U8) ||
    String(s?.url || "").includes(".m3u8") ||
    String(s?.rawUrl || "").includes(".m3u8")
  );
}

function buildSingleSourceStream(
  s: any,
  payload: any,
  captions: Caption[],
): Stream {
  const isHls = isHlsSourceItem(s);
  const streamHeaders = s.headers || payload.headers || undefined;
  const clientFlag =
    s.client !== undefined
      ? Boolean(s.client)
      : Boolean(payload.client ?? true);
  const streamFlags = Array.isArray(s.flags) ? s.flags : [flags.CORS_ALLOWED];

  if (isHls) {
    return {
      id: s.id || "primary",
      type: "hls",
      playlist: s.url,
      flags: streamFlags,
      captions,
      headers: streamHeaders,
      preferredHeaders: streamHeaders,
      skipValidation: true,
      client: clientFlag,
    };
  }

  const qKey = mapQualityKey(s.quality);
  return {
    id: s.id || "primary",
    type: "file",
    qualities: {
      [qKey]: {
        type: "mp4",
        url: s.url,
      },
    },
    flags: streamFlags,
    captions,
    headers: streamHeaders,
    preferredHeaders: streamHeaders,
    skipValidation: true,
    client: clientFlag,
  };
}

function buildFileQualitiesStream(
  fileSources: any[],
  payload: any,
  captions: Caption[],
): Stream {
  const qualities: Partial<Record<Qualities, StreamFile>> = {};
  fileSources.forEach((s) => {
    const qKey = mapQualityKey(s.quality);
    if (!qualities[qKey]) {
      qualities[qKey] = {
        type: "mp4",
        url: s.url,
      };
    }
  });

  if (Object.keys(qualities).length === 0 && fileSources[0]) {
    qualities.unknown = {
      type: "mp4",
      url: fileSources[0].url,
    };
  }

  const primary = fileSources[0];
  const streamHeaders = primary.headers || payload.headers || undefined;
  return {
    id: primary.id || "primary",
    type: "file",
    qualities,
    flags: Array.isArray(primary.flags) ? primary.flags : [flags.CORS_ALLOWED],
    captions,
    headers: streamHeaders,
    preferredHeaders: streamHeaders,
    skipValidation: true,
    client:
      primary.client !== undefined
        ? Boolean(primary.client)
        : Boolean(payload.client ?? true),
  };
}

function getSortedValidSources(payload: any): any[] {
  const rawSources: any[] =
    Array.isArray(payload?.sources) && payload.sources.length > 0
      ? payload.sources
      : payload?.url || payload?.stream
        ? [
            {
              id: "primary",
              url: payload.url || payload.stream,
              quality: payload.quality || "1080p",
              type: payload.type,
              isM3U8: (payload.url || payload.stream)?.includes(".m3u8"),
              headers: payload.headers,
              client: payload.client ?? true,
              directClient: Boolean(payload.directClient),
            },
          ]
        : [];

  return rawSources
    .filter((s) => Boolean(s?.url))
    .map((s) => ({
      ...s,
      qualityRank:
        typeof s.qualityRank === "number"
          ? s.qualityRank
          : parseQualityRank(s.quality, s.name, isHlsSourceItem(s)),
    }))
    .sort((a, b) => {
      const scoreA = (a.directClient ? 2 : 0) + (a.client ? 1 : 0);
      const scoreB = (b.directClient ? 2 : 0) + (b.client ? 1 : 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.qualityRank || 0) - (a.qualityRank || 0);
    });
}

function buildChildEmbedsForPayload(
  providerId: string,
  payload: any,
): Array<{ embedId: string; url: string }> {
  const validSources = getSortedValidSources(payload);
  if (validSources.length <= 1) return [];

  const captions = normalizeCaptions(payload);
  const embeds: Array<{ embedId: string; url: string }> = [];

  const fileSources = validSources.filter((s) => !isHlsSourceItem(s));
  const distinctFileQualities = new Set(
    fileSources.map((s) => mapQualityKey(s.quality)),
  );
  if (fileSources.length >= 2 && distinctFileQualities.size >= 2) {
    const combinedId = `${providerId}::all-qualities`;
    const combinedStream = buildFileQualitiesStream(
      fileSources,
      payload,
      captions,
    );
    childEmbedRegistry.set(combinedId, {
      meta: {
        type: "embed",
        id: combinedId,
        name: `Auto Quality Select (${Array.from(distinctFileQualities).join(" / ")})`,
        rank: 600,
      },
      stream: combinedStream,
    });
    embeds.push({ embedId: combinedId, url: fileSources[0].url });
  }

  validSources.forEach((s, idx) => {
    const isHls = isHlsSourceItem(s);
    const qualityLabel = formatQualityDisplay(s.quality, isHls);
    const streamTypeTag = isHls ? "HLS" : "MP4";
    const serverLabel =
      s.server && s.server !== payload.providerName
        ? String(s.server)
        : s.name || `Server ${idx + 1}`;
    const label =
      s.optionLabel || `${serverLabel} • ${qualityLabel} (${streamTypeTag})`;
    const embedId = `${providerId}::child::${idx}::${encodeURIComponent(
      String(s.id || qualityLabel),
    )}`;
    const childStream = buildSingleSourceStream(s, payload, captions);

    childEmbedRegistry.set(embedId, {
      meta: {
        type: "embed",
        id: embedId,
        name: label,
        rank: 500 - idx,
      },
      stream: childStream,
    });
    embeds.push({ embedId, url: s.url });
  });

  return embeds;
}

function convertApiPayloadToStream(payload: any): Stream | null {
  if (!payload) return null;

  const validSources = getSortedValidSources(payload);
  if (validSources.length === 0) return null;

  const captions = normalizeCaptions(payload);

  const fileSources = validSources.filter((s) => !isHlsSourceItem(s));
  const fileQualitiesCount = new Set(
    fileSources.map((s) => mapQualityKey(s.quality)),
  ).size;

  const hlsCandidate = validSources.find((s) => isHlsSourceItem(s));
  const topSource = validSources[0];
  const topScore =
    (topSource.directClient ? 2 : 0) + (topSource.client ? 1 : 0);
  const hlsScore = hlsCandidate
    ? (hlsCandidate.directClient ? 2 : 0) + (hlsCandidate.client ? 1 : 0)
    : -1;
  const highestFileRank = fileSources[0]?.qualityRank || 0;
  const hlsRank = hlsCandidate?.qualityRank || 0;

  if (
    fileQualitiesCount > 1 &&
    (!hlsCandidate || highestFileRank > hlsRank || topScore > hlsScore)
  ) {
    return buildFileQualitiesStream(fileSources, payload, captions);
  }

  if (hlsCandidate && hlsScore >= topScore) {
    return buildSingleSourceStream(hlsCandidate, payload, captions);
  }

  return buildFileQualitiesStream(validSources, payload, captions);
}

function buildScrapeQueryParams(
  media: ScrapeMedia,
  extra: {
    provider?: string;
    sourceOrder?: string[];
    strictOrder?: boolean;
    stream?: boolean;
  } = {},
): URLSearchParams {
  const isTv = media.type === "show";
  const mediaType = isTv ? "tv" : "movie";
  const mediaId = String(media.tmdbId);
  const { ts, sig } = signScraperRequest(mediaType, mediaId);
  const params = new URLSearchParams({
    type: mediaType,
    id: mediaId,
    _ts: ts,
    _sig: sig,
    _enc: "1",
  });

  if (isTv) {
    const s = String(media.season?.number || 1);
    const e = String(media.episode?.number || 1);
    params.set("season", s);
    params.set("episode", e);
    params.set("s", s);
    params.set("e", e);
  }
  if (media.title) params.set("title", media.title);
  if (media.releaseYear) params.set("year", String(media.releaseYear));
  if (media.imdbId) params.set("imdb_id", media.imdbId);
  if (extra.provider) params.set("provider", extra.provider);
  if (extra.sourceOrder && extra.sourceOrder.length > 0) {
    params.set("sourceOrder", extra.sourceOrder.join(","));
  }
  if (extra.strictOrder) params.set("strictOrder", "true");
  if (extra.stream) params.set("stream", "true");

  return params;
}

// ----------------------------------------------------------------------
// ProviderControls Implementation
// ----------------------------------------------------------------------

async function runAllViaSse(
  media: ScrapeMedia,
  sourceOrder: string[] | undefined,
  events: FullScraperEvents | undefined,
  strictOrder = false,
): Promise<{ output: RunOutput | null; completed: boolean }> {
  const params = buildScrapeQueryParams(media, {
    sourceOrder,
    strictOrder,
    stream: true,
  });

  const mediaType = media.type === "show" ? "tv" : "movie";
  const response = await fetch(
    `${SCRAPER_API_BASE}/scrape?${params.toString()}`,
    {
      headers: {
        Accept: "text/event-stream",
        ...getScraperAuthHeaders(mediaType, String(media.tmdbId)),
      },
    },
  );

  if (!response.ok || !response.body) {
    throw new Error(`SSE HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output: RunOutput | null = null;
  let completed = false;

  const handleEventLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) return;
    try {
      const rawEvt = JSON.parse(trimmed.slice(5).trim());
      const evt =
        rawEvt?.type === "success" ? decryptScraperPayload(rawEvt) : rawEvt;
      if (evt.type === "init") {
        if (Array.isArray(evt.providers) && evt.providers.length > 0) {
          mergeProvidersIntoCache(evt.providers);
        }
        if (Array.isArray(evt.sourceIds)) {
          events?.init?.({ sourceIds: evt.sourceIds });
        }
      } else if (evt.type === "start") {
        const sid = evt.sourceId || evt.provider || evt.id;
        if (sid) events?.start?.(sid);
      } else if (evt.type === "update") {
        const sid = evt.sourceId || evt.provider || evt.id;
        if (sid) {
          events?.update?.({
            id: sid,
            percentage:
              typeof evt.percentage === "number" ? evt.percentage : 50,
            status: evt.status || "pending",
            reason: evt.reason,
            error: evt.error,
          });
        }
      } else if (evt.type === "success") {
        const stream = convertApiPayloadToStream(evt);
        const sid = evt.provider || evt.sourceId || "movies-scrapper";
        if (stream) {
          output = {
            sourceId: sid,
            stream,
          };
          completed = true;
        }
      } else if (evt.type === "failure") {
        completed = true;
      }
    } catch {
      // Ignore malformed SSE JSON chunks
    }
  };

  const readNextChunk = async (): Promise<void> => {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        handleEventLine(buffer);
      }
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(handleEventLine);
    await readNextChunk();
  };

  await readNextChunk();

  return { output, completed };
}

async function runAllViaJsonFallback(
  media: ScrapeMedia,
  targetOrder: string[],
  events: FullScraperEvents | undefined,
): Promise<RunOutput | null> {
  events?.init?.({ sourceIds: targetOrder });

  for (const sourceId of targetOrder) {
    events?.start?.(sourceId);
    events?.update?.({
      id: sourceId,
      percentage: 40,
      status: "pending",
    });

    try {
      const params = buildScrapeQueryParams(media, { provider: sourceId });
      const mediaType = media.type === "show" ? "tv" : "movie";
      const res = await fetch(
        `${SCRAPER_API_BASE}/scrape?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            ...getScraperAuthHeaders(mediaType, String(media.tmdbId)),
          },
        },
      );
      const rawData = await res.json().catch(() => null);
      const data =
        rawData && rawData.encrypted ? decryptScraperPayload(rawData) : rawData;
      if (res.ok && data?.success) {
        const stream = convertApiPayloadToStream(data);
        if (stream) {
          events?.update?.({
            id: sourceId,
            percentage: 100,
            status: "success",
          });
          return {
            sourceId: data.provider || sourceId,
            stream,
          };
        }
      }

      events?.update?.({
        id: sourceId,
        percentage: 100,
        status: res.status === 404 ? "notfound" : "failure",
        reason: data?.error || "No streams found",
      });
    } catch (err) {
      events?.update?.({
        id: sourceId,
        percentage: 100,
        status: "failure",
        error: err,
        reason: err instanceof Error ? err.message : "Request failed",
      });
    }
  }

  return null;
}

export function makeProviders(_ops?: ProviderMakerOptions): ProviderControls {
  return {
    listSources(): MetaOutput[] {
      return [...activeProvidersList];
    },

    listEmbeds(): MetaOutput[] {
      return Array.from(childEmbedRegistry.values()).map((entry) => entry.meta);
    },

    getMetadata(id: string): MetaOutput | null {
      const childMeta = childEmbedRegistry.get(id)?.meta;
      if (childMeta) return childMeta;
      const cleanId = String(id || "")
        .trim()
        .toLowerCase()
        .replace(/^yp-/, "")
        .replace(/-\d+$/, "");
      return (
        activeProvidersList.find((p) => p.id === id || p.id === cleanId) || null
      );
    },

    async runAll(runnerOps: RunnerOptions): Promise<RunOutput | null> {
      await ensureProvidersLoaded();

      const { media, sourceOrder, events } = runnerOps;
      const targetOrder =
        Array.isArray(sourceOrder) && sourceOrder.length > 0
          ? sourceOrder
          : activeProvidersList.map((p) => p.id);

      if (targetOrder.length === 0) {
        events?.init?.({ sourceIds: [] });
        return null;
      }

      try {
        const isSubsetOrder = Boolean(
          Array.isArray(sourceOrder) &&
          sourceOrder.length > 0 &&
          sourceOrder.length < activeProvidersList.length,
        );
        const sseResult = await runAllViaSse(
          media,
          targetOrder,
          events,
          isSubsetOrder,
        );
        if (sseResult.completed || sseResult.output) {
          return sseResult.output;
        }
      } catch (err) {
        console.warn(
          "[ScraperAPI] SSE runAll failed, falling back to sequential JSON requests:",
          err,
        );
      }

      return runAllViaJsonFallback(media, targetOrder, events);
    },

    async runSourceScraper(
      runnerOps: SourceRunnerOptions,
    ): Promise<SourcererOutput> {
      const { id, media, events } = runnerOps;
      events?.update?.({
        id,
        percentage: 25,
        status: "pending",
      });

      const params = buildScrapeQueryParams(media, { provider: id });
      const mediaType = media.type === "show" ? "tv" : "movie";
      const res = await fetch(
        `${SCRAPER_API_BASE}/scrape?${params.toString()}`,
        {
          headers: {
            Accept: "application/json",
            ...getScraperAuthHeaders(mediaType, String(media.tmdbId)),
          },
        },
      );
      const rawData = await res.json().catch(() => null);
      const data =
        rawData && rawData.encrypted ? decryptScraperPayload(rawData) : rawData;

      if (!res.ok || !data?.success) {
        const notFound = res.status === 404;
        events?.update?.({
          id,
          percentage: 100,
          status: notFound ? "notfound" : "failure",
          reason: data?.error || "No streams found",
        });
        if (notFound) {
          throw new NotFoundError(data?.error || "No streams found");
        }
        throw new Error(data?.error || `Scraper failed (HTTP ${res.status})`);
      }

      const stream = convertApiPayloadToStream(data);
      if (!stream) {
        events?.update?.({
          id,
          percentage: 100,
          status: "notfound",
          reason: "No playable streams returned",
        });
        throw new NotFoundError("No playable streams returned");
      }

      const childEmbeds = buildChildEmbedsForPayload(id, data);

      events?.update?.({
        id,
        percentage: 100,
        status: "success",
      });

      return {
        embeds: childEmbeds,
        stream: [stream],
      };
    },

    async runEmbedScraper(runnerOps: EmbedRunnerOptions): Promise<EmbedOutput> {
      const { id, url } = runnerOps;
      const cached =
        (id && childEmbedRegistry.get(id)) ||
        (url && childEmbedRegistry.get(url));
      if (cached) {
        return {
          stream: [cached.stream],
        };
      }

      if (!url) throw new NotFoundError("Missing embed stream URL");
      const isHls = url.includes(".m3u8");
      if (!isHls) {
        return {
          stream: [
            {
              id: id || "primary",
              type: "file",
              qualities: {
                unknown: {
                  type: "mp4",
                  url,
                },
              },
              flags: [flags.CORS_ALLOWED],
              captions: [],
              skipValidation: true,
              client: true,
            },
          ],
        };
      }
      return {
        stream: [
          {
            id: id || "primary",
            type: "hls",
            playlist: url,
            flags: [flags.CORS_ALLOWED],
            captions: [],
            skipValidation: true,
            client: true,
          },
        ],
      };
    },
  };
}
