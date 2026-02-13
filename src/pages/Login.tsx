import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { BackendSelector } from "@/components/form/BackendSelector";
import {
  LargeCard,
  LargeCardButtons,
  LargeCardText,
} from "@/components/layout/LargeCard";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { LoginFormPart } from "@/pages/parts/auth/LoginFormPart";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setBackendUrl = useAuthStore((s) => s.setBackendUrl);
  const config = conf();
  const availableBackends =
    config.BACKEND_URLS.length > 0
      ? config.BACKEND_URLS
      : config.BACKEND_URL
        ? [config.BACKEND_URL]
        : [];

  // If there's only one backend and user hasn't selected a custom one, auto-select it
  const currentBackendUrl = useAuthStore((s) => s.backendUrl);
  const defaultBackend =
    currentBackendUrl ??
    (availableBackends.length === 1 ? availableBackends[0] : null);

  const [showBackendSelection, setShowBackendSelection] = useState(true);
  const [selectedBackendUrl, setSelectedBackendUrl] = useState<string | null>(
    currentBackendUrl ?? null,
  );

  const handleBackendSelect = (url: string | null) => {
    setSelectedBackendUrl(url);
    if (url) {
      setBackendUrl(url);
    }
  };

  const handleContinue = () => {
    if (selectedBackendUrl || defaultBackend) {
      if (selectedBackendUrl) {
        setBackendUrl(selectedBackendUrl);
      } else if (defaultBackend) {
        setBackendUrl(defaultBackend);
      }
      setShowBackendSelection(false);
    }
  };

  return (
    <SubPageLayout>
      <PageTitle subpage k="global.pages.login" />
      {showBackendSelection &&
      (availableBackends.length > 1 || !defaultBackend) ? (
        <LargeCard>
          <LargeCardText title={t("auth.backendSelection.title")}>
            {t("auth.backendSelection.description")}
          </LargeCardText>
          <BackendSelector
            selectedUrl={selectedBackendUrl ?? defaultBackend}
            onSelect={handleBackendSelect}
            availableUrls={availableBackends}
            showCustom
          />
          <LargeCardButtons>
            <span className="text-type-danger font-medium text-center">
              {t("settings.connections.server.notice")}
            </span>
            <Button
              theme="purple"
              onClick={handleContinue}
              disabled={!selectedBackendUrl && !defaultBackend}
            >
              {t("auth.register.information.next")}
            </Button>
          </LargeCardButtons>
        </LargeCard>
      ) : (
        <LoginFormPart
          onLogin={() => {
            navigate("/");
          }}
        />
      )}
    </SubPageLayout>
  );
}
