import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useAsyncFn, useInterval } from "react-use";

import { sendPage } from "@/backend/extension/messaging";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Loading } from "@/components/layout/Loading";
import { Stepper } from "@/components/layout/Stepper";
import { CenterContainer } from "@/components/layout/ThinContainer";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import {
  useNavigateOnboarding,
  useRedirectBack,
} from "@/pages/onboarding/onboardingHooks";
import { Card, Link } from "@/pages/onboarding/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { conf } from "@/setup/config";
import {
  ExtensionDetectionResult,
  detectExtensionInstall,
} from "@/utils/detectFeatures";
import { getExtensionState } from "@/utils/extension";
import type { ExtensionStatus } from "@/utils/extension";

function RefreshBar() {
  const { t } = useTranslation();
  const reload = useCallback(() => {
    window.location.reload();
  }, []);
  return (
    <Card className="mt-4">
      <div className="flex items-center space-x-7">
        <p className="flex-1">{t("onboarding.extension.notDetecting")}</p>
        <Button theme="secondary" onClick={reload}>
          {t("onboarding.extension.notDetectingAction")}
        </Button>
      </div>
    </Card>
  );
}

export function ExtensionStatus(props: {
  status: ExtensionStatus;
  loading: boolean;
  showHelp?: boolean;
}) {
  const { t } = useTranslation();
  const [lastKnownStatus, setLastKnownStatus] = useState(props.status);
  useEffect(() => {
    if (!props.loading) setLastKnownStatus(props.status);
  }, [props.status, props.loading]);

  let content: ReactNode = null;
  if (props.loading || props.status === "unknown")
    content = (
      <>
        <Loading />
        <p>{t("onboarding.extension.status.loading")}</p>
      </>
    );
  if (props.status === "disallowed" || props.status === "noperms")
    content = (
      <>
        <p>{t("onboarding.extension.status.disallowed")}</p>
        <Button
          onClick={() => {
            sendPage({
              page: "PermissionGrant",
              redirectUrl: window.location.href,
            });
          }}
          theme="purple"
          padding="md:px-12 p-2.5"
          className="mt-6"
        >
          {t("onboarding.extension.status.disallowedAction")}
        </Button>
      </>
    );
  else if (props.status === "failed")
    content = <p>{t("onboarding.extension.status.failed")}</p>;
  else if (props.status === "outdated")
    content = <p>{t("onboarding.extension.status.outdated")}</p>;
  else if (props.status === "success")
    content = (
      <p className="flex items-center">
        <Icon icon={Icons.CHECKMARK} className="text-type-success mr-4" />
        {t("onboarding.extension.status.success")}
      </p>
    );
  return (
    <>
      <Card>
        <div className="flex py-6 flex-col space-y-2 items-center justify-center">
          {content}
        </div>
      </Card>
      {lastKnownStatus === "unknown" ? <RefreshBar /> : null}
      {props.showHelp && props.status !== "success" ? (
        <Card className="mt-4">
          <div className="flex items-center space-x-7">
            <Icon icon={Icons.WARNING} className="text-type-danger text-2xl" />
            <p className="flex-1">
              <Trans
                i18nKey="onboarding.extension.extensionHelp"
                components={{
                  bold: <span className="text-white" />,
                }}
              />
            </p>
          </div>
        </Card>
      ) : null}
    </>
  );
}

interface ExtensionPageProps {
  status: ExtensionStatus;
  loading: boolean;
}

function DefaultExtensionPage(props: ExtensionPageProps) {
  const { t } = useTranslation();
  const installChromeLink = conf().ONBOARDING_CHROME_EXTENSION_INSTALL_LINK;
  const installFirefoxLink = conf().ONBOARDING_FIREFOX_EXTENSION_INSTALL_LINK;

  const browser = useMemo(() => {
    return detectExtensionInstall();
  }, []);

  return (
    <>
      <Heading2 className="!mt-0 !text-3xl max-w-[435px]">
        {t("onboarding.extension.title")}
      </Heading2>
      <Paragraph className="max-w-[320px] mb-4">
        {t("onboarding.extension.explainer")}
      </Paragraph>

      {/* Main extension icons */}
      <div className="mb-4 flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0 justify-center items-center">
        {installChromeLink &&
        (browser === "chrome" || browser === "unknown") ? (
          <Link
            href={installChromeLink}
            target="_blank"
            className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-type-surface-hover transition-colors"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                width="100px"
                height="100px"
                fill="currentColor"
              >
                <path d="M64 320C64 273.4 76.5 229.6 98.3 191.1L208.1 382.3C230 421.5 271.9 448 320 448C334.3 448 347.1 445.7 360.8 441.4L284.5 573.6C159.9 556.3 64 449.3 64 320zM429.1 385.6C441.4 366.4 448 343.1 448 320C448 281.8 431.2 247.5 404.7 224L557.4 224C569.4 253.6 576 286.1 576 320C576 461.4 461.4 575.1 320 576L429.1 385.6zM541.8 192L320 192C257.1 192 206.3 236.1 194.5 294.7L118.2 162.5C165 102.5 238 64 320 64C414.8 64 497.5 115.5 541.8 192zM408 320C408 368.6 368.6 408 320 408C271.4 408 232 368.6 232 320C232 271.4 271.4 232 320 232C368.6 232 408 271.4 408 320z" />
              </svg>
            </span>
            <span className="font-medium text-center">
              {t("onboarding.extension.linkChrome")}
            </span>
          </Link>
        ) : null}
        {installFirefoxLink &&
        (browser === "firefox" || browser === "unknown") ? (
          <Link
            href={installFirefoxLink}
            target="_blank"
            className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-type-surface-hover transition-colors"
          >
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                width="100px"
                height="100px"
                fill="currentColor"
              >
                <path d="M567.5 305.5C567.4 303.9 567.3 302.4 567.3 300.8L567.3 300.7L566.9 296L566.9 295.9C565.6 282 563.2 268.2 559.6 254.7C559.6 254.6 559.6 254.6 559.5 254.5L558.4 250.5C558.3 250.3 558.3 250 558.2 249.9C557.8 248.7 557.5 247.4 557.1 246.2C557 246 557 245.6 556.9 245.4C556.5 244.2 556.2 243 555.8 241.9C555.7 241.5 555.6 241.3 555.4 240.9C555 239.7 554.7 238.6 554.2 237.4L553.8 236.3C553.4 235.2 553 234 552.6 232.9C552.5 232.6 552.4 232.2 552.2 231.9C551.7 230.8 551.4 229.6 550.9 228.5C550.8 228.3 550.7 227.9 550.5 227.7C550 226.5 549.5 225.4 549.1 224.2C549.1 224.1 549 224 549 223.8C547.4 220 545.8 216.1 544 212.4L543.6 211.7C543.1 210.7 542.8 209.9 542.3 209.1C542.1 208.6 541.8 208 541.6 207.5C541.2 206.7 540.8 205.9 540.4 205.1C540 204.5 539.8 203.9 539.4 203.3C539 202.7 538.6 201.9 538.2 201C537.8 200.4 537.5 199.7 537.1 199.1C536.7 198.5 536.3 197.7 535.9 196.9C535.5 196.2 535.1 195.5 534.7 194.9C534.3 194.2 533.9 193.6 533.5 192.9C533.1 192.2 532.7 191.6 532.3 190.9C531.9 190.2 531.5 189.6 531.1 189C530.7 188.4 530.3 187.6 529.8 186.8C529.4 186.2 529 185.6 528.6 185L527.2 182.9C526.8 182.3 526.4 181.7 526 181.1C525.5 180.4 524.9 179.5 524.4 178.8C524 178.3 523.7 177.7 523.3 177.2L521.5 174.7C521.1 174.2 520.9 173.9 520.5 173.4C519.5 172.1 518.7 170.9 517.7 169.7C510.5 160.3 502.7 151.4 494.2 143.1C488.5 137.1 482.4 131.6 475.9 126.4C471.9 122.9 467.7 119.7 463.4 116.6C455.7 110.8 447.4 105.8 438.8 101.5C436.4 100.2 434 99 431.6 97.8C413.9 89.2 395.3 82.6 376.2 78.2C374.3 77.8 372.4 77.4 370.6 77L370.5 77C369.5 76.9 368.7 76.6 367.7 76.5C355.2 74.1 342.5 72.8 329.7 72.5L319.1 72.5C303.8 72.7 288.6 74.4 273.6 77.5C240 84.6 210.4 98.7 190.7 116.5C189.6 117.5 188.8 118.2 188.3 118.7L187.8 119.2L187.9 119.2C187.9 119.2 188 119.2 188 119.2C188 119.2 188 119.1 188 119.1L187.9 119.2C188 119.1 188 119.1 188.1 119.1C202.7 110.3 223 103.1 237.5 99.5L243.4 98.1C243.8 98 244.2 98 244.6 97.9C246.3 97.5 248 97.2 249.8 96.8C250 96.8 250.4 96.7 250.6 96.7C314.8 85 383.2 104.2 430.8 149.7C441.1 159.5 450.1 170.5 457.7 182.5C488.1 231.7 485.2 293.6 461.5 330.1C427.1 383.1 350.1 401.4 302.5 354.9C286.5 339.4 277.3 318.2 276.9 295.9C276.7 285.2 278.9 274.7 283.1 264.9C284.8 261.1 296.2 239.2 301.3 240.3C288.2 237.5 263.8 242.9 246.6 268.5C231.2 291.4 232.1 326.7 241.6 351.8C235.6 339.4 231.5 326.2 229.5 312.6C217.3 230 272.8 159.6 323.8 142.1C296.3 118.1 227.3 119.8 176.1 157.5C146.2 179.5 124.9 210.7 113.6 247.9C115.3 227 123.2 195.8 139.4 164C122.2 172.9 100.4 201 89.6 226.9C74 264.3 68.6 309.1 73.5 351.7C73.9 354.9 74.2 358.1 74.6 361.3C94.5 478.4 196.6 567.7 319.4 567.7C456.5 567.7 567.7 456.5 567.7 319.3C567.6 314.8 567.5 310.2 567.2 305.8z" />
              </svg>
            </span>
            <span className="font-medium text-center">
              {t("onboarding.extension.linkFirefox")}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Secondary userscript option */}
      <div className="mb-6 text-left">
        <div className="flex flex-col items-center space-y-1">
          <Link
            href="https://raw.githubusercontent.com/p-stream/Userscript/main/p-stream.user.js"
            target="_blank"
            className="text-sm"
          >
            {t("onboarding.extension.linkUserscript")}
          </Link>
          <span className="text-type-dimmed text-xs">
            {t("onboarding.extension.userscriptNote")}
          </span>
        </div>
      </div>

      <ExtensionStatus status={props.status} loading={props.loading} showHelp />
      <Link
        href="https://github.com/p-stream/extension"
        target="_blank"
        className="pt-4 !text-type-dimmed"
      >
        See extension source code
      </Link>
    </>
  );
}

function IosExtensionPage(_props: ExtensionPageProps) {
  const { t } = useTranslation();
  return (
    <>
      <Heading2 className="!mt-0 !text-3xl max-w-[435px]">
        {t("onboarding.extension.title")}
      </Heading2>
      <Paragraph className="max-w-[320px] mb-4">
        <Trans
          i18nKey="onboarding.extension.explainerIos"
          components={{ bold: <span className="text-white font-bold" /> }}
        />
      </Paragraph>
    </>
  );
}

export function OnboardingExtensionPage() {
  const { t } = useTranslation();
  const navigate = useNavigateOnboarding();
  const { completeAndRedirect } = useRedirectBack();
  const extensionSupport = useMemo(() => detectExtensionInstall(), []);

  const [{ loading, value }, exec] = useAsyncFn(
    async (triggeredManually: boolean = false) => {
      const status = await getExtensionState();
      if (status === "success" && triggeredManually) completeAndRedirect();
      return status;
    },
    [completeAndRedirect],
  );
  useInterval(exec, 1000);

  const componentMap: Record<
    ExtensionDetectionResult,
    typeof DefaultExtensionPage
  > = {
    chrome: DefaultExtensionPage,
    firefox: DefaultExtensionPage,
    ios: IosExtensionPage,
    unknown: DefaultExtensionPage,
  };
  const PageContent = componentMap[extensionSupport];

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.onboarding" />
      <CenterContainer>
        <Stepper steps={2} current={2} className="mb-12" />
        <PageContent loading={loading} status={value ?? "unknown"} />
        <div className="flex justify-between items-center mt-8">
          <Button onClick={() => navigate("/onboarding")} theme="secondary">
            {t("onboarding.extension.back")}
          </Button>
          {value === "success" ? (
            <Button onClick={() => exec(true)} theme="purple">
              {t("onboarding.extension.submit")}
            </Button>
          ) : null}
        </div>
      </CenterContainer>
    </MinimalPageLayout>
  );
}
