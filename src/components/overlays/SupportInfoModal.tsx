import { useTranslation } from "react-i18next";

import { FancyModal } from "./Modal";
import { Button } from "../buttons/Button";
import { MwLink } from "../text/Link";

export function SupportInfoModal({ id }: { id: string }) {
  const { t } = useTranslation();

  return (
    <FancyModal id={id} title={t("home.support.title")} size="md">
      <div className="space-y-4">
        <p className="text-type-secondary">{t("home.support.explanation")}</p>
        <p className="text-type-secondary">
          {t("home.support.explanation2")}{" "}
          <MwLink url="https://discord.gg/7z6znYgrTG">
            {t("home.support.discord")}
          </MwLink>
        </p>

        <div className="space-y-3">
          <span className="text-center flex justify-center whitespace-nowrap items-center">
            <Button
              theme="purple"
              onClick={() =>
                window.open("https://rentry.co/nnqtas3e", "_blank")
              }
            >
              {t("home.support.donate")}
            </Button>
          </span>
        </div>

        <div className="text-xs text-type-dimmed text-center">
          {t("home.support.thankYou")}
        </div>
      </div>
    </FancyModal>
  );
}
