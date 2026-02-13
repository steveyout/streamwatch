import { ofetch } from "ofetch";
import { useState } from "react";
import { useAsyncFn } from "react-use";

import { getAuthHeaders } from "@/backend/accounts/auth";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Box } from "@/components/layout/Box";
import { Heading2 } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { AccountWithToken, useAuthStore } from "@/stores/auth";

interface CleanupResponse {
  deletedCount: number;
  message: string;
}

async function cleanupProgressItems(
  backendUrl: string,
  account: AccountWithToken,
) {
  return ofetch<CleanupResponse>(`/users/${account.userId}/progress/cleanup`, {
    method: "DELETE",
    headers: getAuthHeaders(account.token),
    baseURL: backendUrl,
  });
}

export function ProgressCleanupPart() {
  const backendUrl = useBackendUrl();
  const account = useAuthStore((s) => s.account);

  const [status, setStatus] = useState<{
    hasRun: boolean;
    success: boolean;
    errorText: string;
    result: CleanupResponse | null;
  }>({
    hasRun: false,
    success: false,
    errorText: "",
    result: null,
  });

  const [cleanupState, runCleanup] = useAsyncFn(async () => {
    setStatus({
      hasRun: false,
      success: false,
      errorText: "",
      result: null,
    });

    if (!backendUrl || !account) {
      return setStatus({
        hasRun: true,
        success: false,
        errorText: "Backend URL or account not available",
        result: null,
      });
    }

    try {
      const result = await cleanupProgressItems(backendUrl, account);
      return setStatus({
        hasRun: true,
        success: true,
        errorText: "",
        result,
      });
    } catch (err) {
      console.error("Progress cleanup failed:", err);
      return setStatus({
        hasRun: true,
        success: false,
        errorText:
          "Failed to clean up progress items. Check console for details.",
        result: null,
      });
    }
  }, [backendUrl, account]);

  return (
    <>
      <Heading2>Progress Cleanup</Heading2>
      <Box>
        <div className="w-full flex gap-6 justify-between items-center">
          {!status.hasRun ? (
            <p>Remove unwanted progress items from the database</p>
          ) : status.success ? (
            <p className="flex items-center text-md">
              <Icon
                icon={Icons.CIRCLE_CHECK}
                className="text-video-scraping-success mr-2"
              />
              Cleanup completed
            </p>
          ) : (
            <div>
              <p className="text-white font-bold w-full mb-3 flex items-center gap-1">
                <Icon
                  icon={Icons.CIRCLE_EXCLAMATION}
                  className="text-video-scraping-error mr-2"
                />
                Cleanup failed
              </p>
              <p>{status.errorText}</p>
            </div>
          )}
          <Button
            theme="danger"
            loading={cleanupState.loading}
            className="whitespace-nowrap"
            onClick={runCleanup}
            disabled={cleanupState.loading}
          >
            Clean Up Progress
          </Button>
        </div>
      </Box>
    </>
  );
}
