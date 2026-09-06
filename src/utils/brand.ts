type BrandEntry = {
  name: string;
  description: string;
};

const BRAND_BY_HOSTNAME: Record<string, BrandEntry> = {
  "streamwatch.online": {
    name: "StreamWatch",
    description:
      "StreamWatch – Watch movies and TV shows online in HD with multi-server support. Stream free, no account needed.",
  },
  "pstream.site": {
    name: "PStream",
    description:
      "PStream – Stream movies and TV shows online free in HD with multiple server options for smooth playback.",
  },
  "zstream.site": {
    name: "ZStream",
    description:
      "ZStream – Watch movies and TV shows online in HD. Fast, reliable streaming with multi-server support.",
  },
};

const FALLBACK_BRAND: BrandEntry = {
  name: "StreamWatch",
  description:
    "StreamWatch – Watch movies and TV shows online in HD with multi-server support. Stream free, no account needed.",
};

function baseDomain(host: string): string {
  const normalized = host.replace(/^www\./i, "").toLowerCase();
  const parts = normalized.split(".");
  return parts.length >= 3 ? parts.slice(-2).join(".") : normalized;
}

function resolveBrand(): BrandEntry {
  const host = window.location.hostname;
  return (
    BRAND_BY_HOSTNAME[host] ??
    BRAND_BY_HOSTNAME[baseDomain(host)] ??
    FALLBACK_BRAND
  );
}

export function getBrandName(): string {
  return resolveBrand().name;
}

export function getBrandDescription(): string {
  return resolveBrand().description;
}
