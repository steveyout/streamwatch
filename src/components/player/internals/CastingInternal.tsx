import { useCallback, useEffect, useRef } from "react";

import { mediaItemTypeToMediaType } from "@/backend/metadata/tmdb";
import { makeVideoElementDisplayInterface } from "@/components/player/display/base";
import { makeChromecastDisplayInterface } from "@/components/player/display/chromecast";
import { useChromecastAvailable } from "@/hooks/useChromecastAvailable";
import { usePlayerStore } from "@/stores/player/store";

export function CastingInternal() {
  const setInstance = usePlayerStore((s) => s.casting.setInstance);
  const setController = usePlayerStore((s) => s.casting.setController);
  const setPlayer = usePlayerStore((s) => s.casting.setPlayer);
  const setIsCasting = usePlayerStore((s) => s.casting.setIsCasting);
  const isCasting = usePlayerStore((s) => s.interface.isCasting);
  const caption = usePlayerStore((s) => s.caption?.selected);
  const setDisplay = usePlayerStore((s) => s.setDisplay);
  const redisplaySource = usePlayerStore((s) => s.redisplaySource);
  const available = useChromecastAvailable();
  const display = usePlayerStore((s) => s.display);

  const controller = usePlayerStore((s) => s.casting.controller);
  const player = usePlayerStore((s) => s.casting.player);
  const instance = usePlayerStore((s) => s.casting.instance);
  const time = usePlayerStore((s) => s.progress.time);
  const metaTitle = usePlayerStore((s) => s.meta?.title);
  const metaType = usePlayerStore((s) => s.meta?.type);

  const dataRef = useRef({
    controller,
    player,
    instance,
    time,
    metaTitle,
    metaType,
    caption,
  });
  useEffect(() => {
    dataRef.current = {
      controller,
      player,
      instance,
      time,
      metaTitle,
      metaType,
      caption,
    };
  }, [controller, player, instance, time, metaTitle, metaType, caption]);

  useEffect(() => {
    if (isCasting) {
      if (
        dataRef.current.controller &&
        dataRef.current.instance &&
        dataRef.current.player
      ) {
        const newDisplay = makeChromecastDisplayInterface({
          controller: dataRef.current.controller,
          instance: dataRef.current.instance,
          player: dataRef.current.player,
        });
        newDisplay.setMeta({
          title: dataRef.current.metaTitle ?? "",
          type: mediaItemTypeToMediaType(dataRef.current.metaType ?? "movie"),
        });
        newDisplay.setCaption(dataRef.current.caption);
        setDisplay(newDisplay);
        redisplaySource(dataRef.current.time ?? 0);
      }
    } else {
      const newDisplay = makeVideoElementDisplayInterface();
      setDisplay(newDisplay);
      redisplaySource(dataRef.current.time ?? 0);
    }
  }, [isCasting, setDisplay, redisplaySource]);

  useEffect(() => {
    display?.setMeta({
      title: dataRef.current.metaTitle ?? "",
      type: mediaItemTypeToMediaType(dataRef.current.metaType ?? "movie"),
    });
  }, [metaTitle, metaType, display]);

  const connectionChanged = useCallback(
    (e: cast.framework.RemotePlayerChangedEvent) => {
      if (e.field === "isConnected") {
        setIsCasting(e.value);
      }
    },
    [setIsCasting],
  );

  useEffect(() => {
    if (
      !available ||
      !window.cast?.framework ||
      !window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ||
      !window.chrome.cast.AutoJoinPolicy
    ) {
      return;
    }

    let newPlayer: cast.framework.RemotePlayer | null = null;
    let newController: cast.framework.RemotePlayerController | null = null;

    try {
      const ins = cast.framework.CastContext.getInstance();
      setInstance(ins);

      const receiverAppId = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
      const autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;

      ins.setOptions({
        receiverApplicationId: receiverAppId,
        autoJoinPolicy,
        androidReceiverCompatible: false,
        resumeSavedSession: false,
      });

      newPlayer = new cast.framework.RemotePlayer();
      newController = new cast.framework.RemotePlayerController(newPlayer);
      setPlayer(newPlayer);
      setController(newController);

      newController.addEventListener(
        cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
        connectionChanged,
      );
    } catch (error) {
      console.error("Error initializing Chromecast:", error);
      return;
    }

    return () => {
      if (newController) {
        newController.removeEventListener(
          cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
          connectionChanged,
        );
      }
    };
  }, [available, setPlayer, setController, setInstance, connectionChanged]);

  return null;
}
