import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAsync } from "react-use";

import { getBackendMeta } from "@/backend/accounts/meta";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { SidebarSection } from "@/components/layout/Sidebar";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";

function SecureBadge(props: { url: string | null }) {
  const { t } = useTranslation();
  const secure = props.url ? props.url.startsWith("https://") : false;
  return (
    <div className="flex items-center gap-1 -mx-1 ml-3 px-1 rounded bg-largeCard-background font-bold">
      <Icon icon={secure ? Icons.LOCK : Icons.UNLOCK} />
      {t(
        secure
          ? "settings.sidebar.info.secure"
          : "settings.sidebar.info.insecure",
      )}
    </div>
  );
}

export function AppInfoPart() {
  const { t } = useTranslation();
  const { account } = useAuthStore();
  // eslint-disable-next-line no-restricted-globals
  const hostname = location.hostname;
  const navigate = useNavigate();

  const backendUrl = useBackendUrl();

  const backendMeta = useAsync(async () => {
    if (!backendUrl) return;
    return getBackendMeta(backendUrl);
  }, [backendUrl]);

  return (
    <SidebarSection
      className="text-sm"
      title={t("settings.sidebar.info.title")}
    >
      <div className="px-3 py-3.5 rounded-lg bg-largeCard-background bg-opacity-50 grid grid-cols-2 gap-4">
        {/* Hostname */}
        <div className="col-span-2 space-y-1">
          <p className="text-type-dimmed font-medium">
            {t("settings.sidebar.info.hostname")}
          </p>
          <p className="text-white">{hostname}</p>
        </div>

        {/* Backend URL */}
        <div className="col-span-2 space-y-1">
          <div className="text-type-dimmed font-medium flex items-center">
            <p>{t("settings.sidebar.info.backendUrl")}</p>
            <SecureBadge url={backendUrl} />
          </div>
          <p className="text-white">
            {backendUrl?.replace(/https?:\/\//, "") ?? "—"}
          </p>
        </div>

        {/* User ID */}
        <div className="col-span-2 space-y-1">
          <p className="text-type-dimmed font-medium">
            {t("settings.sidebar.info.userId")}
          </p>
          <p className="text-white">
            {account?.userId ?? t("settings.sidebar.info.notLoggedIn")}
          </p>
        </div>

        {/* App version */}
        <div className="col-span-1 space-y-1">
          <p className="text-type-dimmed font-medium">
            {t("settings.sidebar.info.appVersion")}
          </p>
          <p className="text-type-dimmed px-2 py-1 rounded bg-settings-sidebar-badge inline-block">
            {conf().APP_VERSION}
          </p>
        </div>

        {/* Backend version */}
        <div className="col-span-1 space-y-1">
          <p className="text-type-dimmed font-medium">
            {t("settings.sidebar.info.backendVersion")}
          </p>
          <p className="text-type-dimmed px-2 py-1 rounded bg-settings-sidebar-badge inline-flex items-center gap-1">
            {backendMeta.error ? (
              <Icon
                icon={Icons.WARNING}
                className="text-type-danger text-base"
              />
            ) : null}
            {backendMeta.loading ? (
              <span className="block h-4 w-12 bg-type-dimmed/20 rounded" />
            ) : (
              backendMeta?.value?.version ||
              t("settings.sidebar.info.unknownVersion")
            )}
          </p>
        </div>

        <div className="col-span-2 space-y-1">
          <p className="text-type-dimmed font-medium">
            {t("settings.account.admin.title")}
          </p>
          <Button
            theme="secondary"
            onClick={() => navigate("/admin")}
            className="w-full !p-2 text-xs"
          >
            {t("settings.account.admin.text")}
          </Button>
        </div>
      </div>
    </SidebarSection>
  );
}
