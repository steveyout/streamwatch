import classNames from "classnames";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { MetaResponse, getBackendMeta } from "@/backend/accounts/meta";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Loading } from "@/components/layout/Loading";
import { TextInputControl } from "@/components/text-inputs/TextInputControl";

interface BackendOption {
  url: string;
  meta: MetaResponse | null;
  loading: boolean;
  error: boolean;
}

interface BackendSelectorProps {
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  availableUrls: string[];
  showCustom?: boolean;
}

function BackendOptionItem({
  option,
  isSelected,
  onClick,
}: {
  option: BackendOption;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const hostname = option.url ? new URL(option.url).hostname : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "w-full p-4 rounded-lg border-2 transition-colors text-left tabbable",
        isSelected
          ? "border-buttons-purple bg-buttons-purple/10"
          : "border-transparent bg-authentication-inputBg hover:bg-authentication-inputBg/80",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={classNames(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
            isSelected
              ? "border-buttons-purple bg-buttons-purple"
              : "border-type-secondary",
          )}
        >
          {isSelected ? (
            <Icon icon={Icons.CHECKMARK} className="text-white text-xs" />
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          {option.loading ? (
            <div className="flex items-center gap-2">
              <Loading />
            </div>
          ) : option.error ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <p className="text-white font-medium">{hostname}</p>
                <p className="text-type-secondary text-sm">{option.url}</p>
              </div>
              <Icon icon={Icons.WARNING} className="text-type-danger text-sm" />
              <span className="text-type-danger text-sm">
                {t("settings.connections.server.error")}
              </span>
            </div>
          ) : option.meta ? (
            <div>
              <p className="text-white font-medium">{option.meta.name}</p>
              <p className="text-type-secondary text-sm">
                {option.meta.description}
              </p>
              <p className="text-type-secondary text-sm">{hostname}</p>
            </div>
          ) : (
            <div>
              <p className="text-white font-medium">{hostname}</p>
              <p className="text-type-secondary text-sm">{option.url}</p>
            </div>
          )}
        </div>
        {isSelected ? (
          <span className="text-buttons-purple text-sm font-medium">
            {t("auth.backendSelection.active")}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function BackendSelector({
  selectedUrl,
  onSelect,
  availableUrls,
  showCustom = true,
}: BackendSelectorProps) {
  const { t } = useTranslation();
  // Helper to strip protocol from URL for display
  const stripProtocol = (url: string | null): string => {
    if (!url) return "";
    return url.replace(/^https?:\/\//, "");
  };

  // Initialize customUrl from selectedUrl if it's a custom URL (not in availableUrls)
  const isCustomUrl = selectedUrl && !availableUrls.includes(selectedUrl);
  const [customUrl, setCustomUrl] = useState(
    isCustomUrl ? stripProtocol(selectedUrl) : "",
  );
  const [backendOptions, setBackendOptions] = useState<BackendOption[]>([]);

  // Update customUrl when selectedUrl changes and it's a custom URL
  useEffect(() => {
    if (selectedUrl && !availableUrls.includes(selectedUrl)) {
      setCustomUrl(stripProtocol(selectedUrl));
    }
  }, [selectedUrl, availableUrls]);

  // Initialize and fetch meta for backend options
  useEffect(() => {
    const fetchMetas = async () => {
      const options: BackendOption[] = availableUrls.map((url) => ({
        url,
        meta: null,
        loading: true,
        error: false,
      }));
      setBackendOptions(options);

      // Fetch each backend's meta independently and update state as each completes
      // This prevents one slow/down backend from blocking the others
      options.forEach(async (option) => {
        try {
          const meta = await getBackendMeta(option.url);
          setBackendOptions((prev) =>
            prev.map((opt) =>
              opt.url === option.url
                ? { ...opt, meta, loading: false, error: false }
                : opt,
            ),
          );
        } catch {
          setBackendOptions((prev) =>
            prev.map((opt) =>
              opt.url === option.url
                ? { ...opt, meta: null, loading: false, error: true }
                : opt,
            ),
          );
        }
      });
    };

    if (availableUrls.length > 0) {
      fetchMetas();
    }
  }, [availableUrls]);

  const handleCustomUrlSelect = () => {
    if (customUrl.trim()) {
      let url = customUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
      }
      onSelect(url);
    }
  };

  const isCustomUrlSelected =
    selectedUrl !== null && !availableUrls.includes(selectedUrl);

  return (
    <div className="space-y-4">
      {backendOptions.length > 0 ? (
        <div className="space-y-3">
          {backendOptions.map((option) => (
            <BackendOptionItem
              key={option.url}
              option={option}
              isSelected={selectedUrl === option.url}
              onClick={() => onSelect(option.url)}
            />
          ))}
        </div>
      ) : null}

      {showCustom && (
        <div
          className={classNames(
            "w-full p-4 rounded-lg border-2 transition-colors",
            isCustomUrlSelected
              ? "border-buttons-purple bg-buttons-purple/10"
              : "border-transparent bg-authentication-inputBg",
          )}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={classNames(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  isCustomUrlSelected
                    ? "border-buttons-purple bg-buttons-purple"
                    : "border-type-secondary",
                )}
              >
                {isCustomUrlSelected ? (
                  <Icon icon={Icons.CHECKMARK} className="text-white text-xs" />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">
                  {t("auth.backendSelection.customBackend")}
                </p>
              </div>
              {isCustomUrlSelected ? (
                <span className="text-buttons-purple text-sm font-medium">
                  {t("auth.backendSelection.active")}
                </span>
              ) : null}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr,auto] items-center gap-2">
                <TextInputControl
                  value={customUrl}
                  onChange={setCustomUrl}
                  placeholder={
                    t("auth.backendSelection.customBackendPlaceholder") ??
                    undefined
                  }
                  className="w-full flex-1 bg-authentication-inputBg border-2 border-type-secondary/40 px-4 py-3 text-search-text focus:outline-none rounded-lg placeholder:text-gray-700"
                />
                <Button
                  theme="purple"
                  onClick={handleCustomUrlSelect}
                  disabled={!customUrl.trim()}
                >
                  {t("auth.backendSelection.confirm")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
