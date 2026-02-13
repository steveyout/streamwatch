import { useState } from "react";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { MetaResponse } from "@/backend/accounts/meta";
import { Button } from "@/components/buttons/Button";
import { BackendSelector } from "@/components/form/BackendSelector";
import {
  LargeCard,
  LargeCardButtons,
  LargeCardText,
} from "@/components/layout/LargeCard";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import {
  AccountCreatePart,
  AccountProfile,
} from "@/pages/parts/auth/AccountCreatePart";
import { PassphraseGeneratePart } from "@/pages/parts/auth/PassphraseGeneratePart";
import { TrustBackendPart } from "@/pages/parts/auth/TrustBackendPart";
import { VerifyPassphrase } from "@/pages/parts/auth/VerifyPassphrasePart";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";

function CaptchaProvider(props: {
  siteKey: string | null;
  children: JSX.Element;
}) {
  if (!props.siteKey) return props.children;
  return (
    <GoogleReCaptchaProvider reCaptchaKey={props.siteKey}>
      {props.children}
    </GoogleReCaptchaProvider>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setBackendUrl = useAuthStore((s) => s.setBackendUrl);
  const currentBackendUrl = useAuthStore((s) => s.backendUrl);
  const config = conf();
  const availableBackends =
    config.BACKEND_URLS.length > 0
      ? config.BACKEND_URLS
      : config.BACKEND_URL
        ? [config.BACKEND_URL]
        : [];

  // If there's only one backend and user hasn't selected a custom one, auto-select it
  const defaultBackend =
    currentBackendUrl ??
    (availableBackends.length === 1 ? availableBackends[0] : null);

  const [step, setStep] = useState(
    availableBackends.length > 1 || !defaultBackend ? -1 : 0,
  );
  const [mnemonic, setMnemonic] = useState<null | string>(null);
  const [credentialId, setCredentialId] = useState<null | string>(null);
  const [authMethod, setAuthMethod] = useState<"mnemonic" | "passkey">(
    "mnemonic",
  );
  const [account, setAccount] = useState<null | AccountProfile>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [selectedBackendUrl, setSelectedBackendUrl] = useState<string | null>(
    currentBackendUrl ?? defaultBackend ?? null,
  );

  const handleBackendSelect = (url: string | null) => {
    setSelectedBackendUrl(url);
    if (url) {
      setBackendUrl(url);
    }
  };

  return (
    <CaptchaProvider siteKey={siteKey}>
      <SubPageLayout>
        <PageTitle subpage k="global.pages.register" />
        {step === -1 && (availableBackends.length > 1 || !defaultBackend) ? (
          <LargeCard>
            <LargeCardText title={t("auth.backendSelection.title")}>
              {t("auth.backendSelection.description")}
            </LargeCardText>
            <BackendSelector
              selectedUrl={selectedBackendUrl}
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
                onClick={() => {
                  if (selectedBackendUrl) {
                    setStep(0);
                  }
                }}
                disabled={!selectedBackendUrl}
              >
                {t("auth.register.information.next")}
              </Button>
            </LargeCardButtons>
          </LargeCard>
        ) : null}
        {step === 0 ? (
          <TrustBackendPart
            backendUrl={selectedBackendUrl}
            onNext={(meta: MetaResponse) => {
              setSiteKey(
                meta.hasCaptcha && meta.captchaClientKey
                  ? meta.captchaClientKey
                  : null,
              );
              setStep(1);
            }}
          />
        ) : null}
        {step === 1 ? (
          <PassphraseGeneratePart
            onNext={(m) => {
              setMnemonic(m);
              setAuthMethod("mnemonic");
              setStep(2);
            }}
            onPasskeyNext={(credId) => {
              setCredentialId(credId);
              setAuthMethod("passkey");
              setStep(2);
            }}
          />
        ) : null}
        {step === 2 ? (
          <AccountCreatePart
            onNext={(a) => {
              setAccount(a);
              setStep(3);
            }}
          />
        ) : null}
        {step === 3 ? (
          <VerifyPassphrase
            hasCaptcha={!!siteKey}
            mnemonic={mnemonic}
            credentialId={credentialId}
            authMethod={authMethod}
            userData={account}
            backendUrl={selectedBackendUrl}
            onNext={() => {
              navigate("/");
            }}
          />
        ) : null}
      </SubPageLayout>
    </CaptchaProvider>
  );
}
