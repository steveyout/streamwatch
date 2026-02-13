import { useCallback, useEffect, useMemo, useState } from "react";

import { updateSettings } from "@/backend/accounts/settings";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";

export function useEmbedOrderState() {
  const account = useAuthStore((s) => s.account);
  const backendUrl = useBackendUrl();

  // Get current values from store
  const embedOrder = usePreferencesStore((s) => s.embedOrder);
  const enableEmbedOrder = usePreferencesStore((s) => s.enableEmbedOrder);

  // Local state for tracking changes
  const [localEmbedOrder, setLocalEmbedOrder] = useState(embedOrder);
  const [localEnableEmbedOrder, setLocalEnableEmbedOrder] =
    useState(enableEmbedOrder);

  // Store setters
  const setEmbedOrder = usePreferencesStore((s) => s.setEmbedOrder);
  const setEnableEmbedOrder = usePreferencesStore((s) => s.setEnableEmbedOrder);

  // Check if any changes have been made
  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(localEmbedOrder) !== JSON.stringify(embedOrder) ||
      localEnableEmbedOrder !== enableEmbedOrder
    );
  }, [localEmbedOrder, embedOrder, localEnableEmbedOrder, enableEmbedOrder]);

  // Reset local state to match store
  const reset = useCallback(() => {
    setLocalEmbedOrder(embedOrder);
    setLocalEnableEmbedOrder(enableEmbedOrder);
  }, [embedOrder, enableEmbedOrder]);

  // Save changes to backend and update store
  const saveChanges = useCallback(async () => {
    if (!account || !backendUrl) return;

    try {
      await updateSettings(backendUrl, account, {
        embedOrder: localEmbedOrder,
        enableEmbedOrder: localEnableEmbedOrder,
      });

      // Update the store with the new values
      setEmbedOrder(localEmbedOrder);
      setEnableEmbedOrder(localEnableEmbedOrder);
    } catch (error) {
      console.error("Failed to save embed order settings:", error);
      throw error;
    }
  }, [
    account,
    backendUrl,
    localEmbedOrder,
    localEnableEmbedOrder,
    setEmbedOrder,
    setEnableEmbedOrder,
  ]);

  // Update local state when store changes
  useEffect(() => {
    setLocalEmbedOrder(embedOrder);
    setLocalEnableEmbedOrder(enableEmbedOrder);
  }, [embedOrder, enableEmbedOrder]);

  return {
    // Current values
    embedOrder: localEmbedOrder,
    enableEmbedOrder: localEnableEmbedOrder,

    // Setters
    setEmbedOrder: setLocalEmbedOrder,
    setEnableEmbedOrder: setLocalEnableEmbedOrder,

    // State management
    hasChanges,
    reset,
    saveChanges,
  };
}
