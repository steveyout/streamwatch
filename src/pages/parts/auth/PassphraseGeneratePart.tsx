import { useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useAsyncFn } from "react-use";

import {
  createPasskey,
  genMnemonic,
  isPasskeySupported,
} from "@/backend/accounts/crypto";
import { Button } from "@/components/buttons/Button";
import { PassphraseDisplay } from "@/components/form/PassphraseDisplay";
import { Icon, Icons } from "@/components/Icon";
import {
  LargeCard,
  LargeCardButtons,
  LargeCardText,
} from "@/components/layout/LargeCard";

interface PassphraseGeneratePartProps {
  onNext?: (mnemonic: string) => void;
  onPasskeyNext?: (credentialId: string) => void;
}

export function PassphraseGeneratePart(props: PassphraseGeneratePartProps) {
  const [mnemonic, setMnemonic] = useState(() => genMnemonic());
  const { t } = useTranslation();

  const handleCustomPassphrase = useCallback((customPassphrase: string) => {
    setMnemonic(customPassphrase);
  }, []);

  const [passkeyResult, createPasskeyFn] = useAsyncFn(async () => {
    if (!isPasskeySupported()) {
      throw new Error("Passkeys are not supported in this browser");
    }

    const credential = await createPasskey(
      `user-${Date.now()}`,
      "P-Stream User",
    );
    return credential.id;
  }, []);

  const handlePasskeyClick = useCallback(async () => {
    try {
      const credentialId = await createPasskeyFn();
      if (credentialId) {
        props.onPasskeyNext?.(credentialId);
      }
    } catch (error) {
      // Error is handled by passkeyResult.error
    }
  }, [createPasskeyFn, props]);

  return (
    <LargeCard>
      <LargeCardText
        title={t("auth.generate.title")}
        icon={<Icon icon={Icons.USER} />}
      >
        <Trans
          i18nKey="auth.generate.description"
          components={{
            bold: <span className="font-bold" style={{ color: "#cfcfcf" }} />,
          }}
        />
      </LargeCardText>
      <PassphraseDisplay
        mnemonic={mnemonic}
        onCustomPassphrase={handleCustomPassphrase}
      />

      <LargeCardButtons>
        {isPasskeySupported() && (
          <div className="mt-4">
            <Button
              theme="purple"
              onClick={handlePasskeyClick}
              loading={passkeyResult.loading}
              disabled={passkeyResult.loading}
              className="w-full"
            >
              <Icon icon={Icons.LOCK} className="mr-2" />
              {t("auth.generate.usePasskeyInstead")}
            </Button>
            {passkeyResult.error && (
              <p className="mt-2 text-authentication-errorText text-sm text-center">
                {passkeyResult.error.message}
              </p>
            )}
          </div>
        )}
        <Button theme="purple" onClick={() => props.onNext?.(mnemonic)}>
          {t("auth.generate.next")}
        </Button>
      </LargeCardButtons>
    </LargeCard>
  );
}
