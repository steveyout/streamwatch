import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { ThinContainer } from "@/components/layout/ThinContainer";
import { Heading1, Paragraph } from "@/components/utils/Text";
import { Transition } from "@/components/utils/Transition";
import { useEmbedOrderState } from "@/hooks/useEmbedOrderState";
import { SubPageLayout } from "@/pages/layouts/SubPageLayout";
import { ConfigValuesPart } from "@/pages/parts/admin/ConfigValuesPart";
import { M3U8TestPart } from "@/pages/parts/admin/M3U8TestPart";
import { TMDBTestPart } from "@/pages/parts/admin/TMDBTestPart";
import { WorkerTestPart } from "@/pages/parts/admin/WorkerTestPart";

import { BackendTestPart } from "../parts/admin/BackendTestPart";
import { EmbedOrderPart } from "../parts/admin/EmbedOrderPart";

export function AdminPage() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const embedOrderState = useEmbedOrderState();

  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      await embedOrderState.saveChanges();
    } catch (error) {
      console.error("Failed to save embed order changes:", error);
    } finally {
      setIsSaving(false);
    }
  }, [embedOrderState]);

  return (
    <SubPageLayout>
      <ThinContainer>
        <Heading1>Admin tools</Heading1>
        <Paragraph>Silly tools used test StreamWatch! ૮₍´˶• . • ⑅ ₎ა</Paragraph>

        <ConfigValuesPart />
        <BackendTestPart />
        <WorkerTestPart />
        <TMDBTestPart />
        <M3U8TestPart />
        <EmbedOrderPart
          embedOrder={embedOrderState.embedOrder}
          setEmbedOrder={embedOrderState.setEmbedOrder}
          enableEmbedOrder={embedOrderState.enableEmbedOrder}
          setEnableEmbedOrder={embedOrderState.setEnableEmbedOrder}
        />
        {/* <ProgressCleanupPart /> */}
      </ThinContainer>

      <Transition
        animation="fade"
        show={embedOrderState.hasChanges}
        className="bg-settings-saveBar-background border-t border-settings-card-border/50 py-4 transition-opacity w-full fixed bottom-0 flex justify-between flex-col md:flex-row px-8 items-start md:items-center gap-3 z-[999]"
      >
        <p className="text-type-danger">{t("settings.unsaved")}</p>
        <div className="space-x-3 w-full md:w-auto flex">
          <Button
            className="w-full md:w-auto"
            theme="secondary"
            onClick={embedOrderState.reset}
          >
            {t("settings.reset")}
          </Button>
          <Button
            className="w-full md:w-auto"
            theme="purple"
            loading={isSaving}
            onClick={handleSaveChanges}
          >
            {t("settings.save")}
          </Button>
        </div>
      </Transition>
    </SubPageLayout>
  );
}
