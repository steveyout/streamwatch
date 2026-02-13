import { useTranslation } from "react-i18next";

import { Icon, Icons } from "@/components/Icon";
import { usePlayerStore } from "@/stores/player/store";

export function CastingNotification() {
  const { t } = useTranslation();
  const isLoading = usePlayerStore((s) => s.mediaPlaying.isLoading);
  const display = usePlayerStore((s) => s.display);
  const isCasting = display?.getType() === "casting";
  const remotePlayer = usePlayerStore((s) => s.casting.player);

  if (isLoading || !isCasting) return null;

  let deviceName = remotePlayer?.displayName || t("player.casting.device");
  if (deviceName === "Default Media Receiver") {
    deviceName = t("player.casting.device"); // e.g., "your TV"
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-opacity-10 bg-video-buttonBackground p-3 brightness-100 grayscale">
        <Icon icon={Icons.CASTING} />
      </div>
      <p className="text-center">
        {t("player.casting.to", { device: deviceName })}
      </p>
    </div>
  );
}
