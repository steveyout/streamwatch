import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { MwLink } from "@/components/text/Link";
import { Heading3 } from "@/components/utils/Text";
import { conf } from "@/setup/config";
import { useOverlayStack } from "@/stores/interface/overlayStack";

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function setCookie(name: string, value: string, expiryDays: number): void {
  const date = new Date();
  date.setTime(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

export function SupportBar() {
  const { t } = useTranslation();
  const { showModal } = useOverlayStack();
  const [isDescriptionDismissed, setIsDescriptionDismissed] = useState(() => {
    return getCookie("supportDescriptionDismissed") === "true";
  });

  const toggleDescription = useCallback(() => {
    const newState = !isDescriptionDismissed;
    setIsDescriptionDismissed(newState);
    setCookie("supportDescriptionDismissed", newState ? "true" : "false", 14); // Expires after 14 days
  }, [isDescriptionDismissed]);

  const openSupportModal = useCallback(() => {
    showModal("support-info");
  }, [showModal]);

  const supportValue = conf().SUPPORT_BAR_VALUE;
  if (!supportValue) return null;

  // Parse fraction like "100/300"
  const [currentStr, goalStr] = supportValue.split("/");
  const current = parseFloat(currentStr) || 0;
  const goal = parseFloat(goalStr) || 1;

  const percentage = Math.min((current / goal) * 100, 100);

  return (
    <div className="w-full px-4 py-2">
      <div className="flex flex-col items-center space-y-2">
        <SettingsCard className="max-w-md relative group">
          <button
            onClick={toggleDescription}
            type="button"
            className="absolute z-20 -top-2 -right-2 w-6 h-6 bg-mediaCard-hoverBackground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            aria-label={
              isDescriptionDismissed ? "Show description" : "Hide description"
            }
          >
            <Icon
              className="text-s font-semibold text-type-secondary"
              icon={
                isDescriptionDismissed ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN
              }
            />
          </button>
          <div
            className={`transition-all duration-300 ${
              isDescriptionDismissed
                ? "max-h-0 opacity-0 pb-0"
                : "max-h-36 opacity-100 pb-0"
            }`}
          >
            <Heading3 className="transition-opacity duration-300">
              {t("home.support.title")}
            </Heading3>
            <p className="text-type-secondary max-w-md pb-4 transition-opacity duration-300">
              {t("home.support.description")}
            </p>
          </div>
          <div className="flex flex-grow items-center text-sm text-type-dimmed w-full max-w-md pb-4">
            <span className="text-left">
              {t("home.support.label", {
                current: current.toLocaleString(),
                goal: goal.toLocaleString(),
              })}
            </span>
            <span className="ml-auto text-right flex-shrink-0 whitespace-nowrap">
              {percentage.toFixed(1)}% {t("home.support.complete")}
            </span>
          </div>
          <div className="w-full max-w-md">
            <div className="relative w-full h-2 bg-progress-background bg-opacity-25 rounded-full">
              {/* Progress bar */}
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-progress-filled transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
          <div className="flex flex-grow items-center text-sm text-type-dimmed w-full max-w-md pt-4">
            <span className="text-left">
              <button
                type="button"
                onClick={openSupportModal}
                className="group mt-1 cursor-pointer font-bold text-type-link hover:text-type-linkHover active:scale-95"
              >
                {t("home.support.moreInfo")}
              </button>
            </span>
            <span className="ml-auto text-right flex-shrink-0 whitespace-nowrap">
              <MwLink url="https://rentry.co/nnqtas3e">
                {t("home.support.donate")}
              </MwLink>
            </span>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
