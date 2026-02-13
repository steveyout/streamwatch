import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";

export function useBackendUrl(): string | null {
  const backendUrl = useAuthStore((s) => s.backendUrl);
  const config = conf();
  return (
    backendUrl ??
    config.BACKEND_URL ??
    (config.BACKEND_URLS.length > 0 ? config.BACKEND_URLS[0] : null)
  );
}
