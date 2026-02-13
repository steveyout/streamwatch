import { useEffect, useState } from "react";

import { Icons } from "@/components/Icon";
import { OverlayAnchor } from "@/components/overlays/OverlayAnchor";
import { Overlay } from "@/components/overlays/OverlayDisplay";
import { OverlayPage } from "@/components/overlays/OverlayPage";
import { OverlayRouter } from "@/components/overlays/OverlayRouter";
import {
  EmbedSelectionView,
  SourceSelectionView,
} from "@/components/player/atoms/settings/SourceSelectingView";
import { VideoPlayerButton } from "@/components/player/internals/Button";
import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { CaptionListItem } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";

import { AudioView } from "./settings/AudioView";
import { CaptionSettingsView } from "./settings/CaptionSettingsView";
import { CaptionsView } from "./settings/CaptionsView";
import { DownloadRoutes } from "./settings/Downloads";
import { LanguageSubtitlesView } from "./settings/LanguageSubtitlesView";
import { PlaybackSettingsView } from "./settings/PlaybackSettingsView";
import { QualityView } from "./settings/QualityView";
import { SettingsMenu } from "./settings/SettingsMenu";
import { SkipSegmentsView } from "./settings/SkipSegmentsView";
import { TranscriptView } from "./settings/TranscriptView";
import { TranslateSubtitleView } from "./settings/TranslateSubtitleView";
import { WatchPartyView } from "./settings/WatchPartyView";

function SettingsOverlay({ id }: { id: string }) {
  const [chosenSourceId, setChosenSourceId] = useState<string | null>(null);
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);
  const [captionToTranslate, setCaptionToTranslate] =
    useState<CaptionListItem | null>(null);
  const router = useOverlayRouter(id);

  // reset source id and language when going to home or closing overlay
  useEffect(() => {
    if (!router.isRouterActive) {
      setChosenSourceId(null);
      setChosenLanguage(null);
    }
    if (router.route === "/") {
      setChosenSourceId(null);
      setChosenLanguage(null);
    }
  }, [router.isRouterActive, router.route]);

  return (
    <Overlay id={id}>
      <OverlayRouter id={id}>
        <OverlayPage id={id} path="/" width={343} height={496}>
          <SettingsMenu id={id} />
        </OverlayPage>
        <OverlayPage id={id} path="/quality" width={343} height={496}>
          <Menu.Card>
            <QualityView id={id} />
          </Menu.Card>
        </OverlayPage>
        <OverlayPage id={id} path="/audio" width={343} height={496}>
          <Menu.Card>
            <AudioView id={id} />
          </Menu.Card>
        </OverlayPage>
        <OverlayPage id={id} path="/captions" width={343} height={496}>
          <Menu.CardWithScrollable>
            <CaptionsView
              id={id}
              backLink
              onChooseLanguage={setChosenLanguage}
            />
          </Menu.CardWithScrollable>
        </OverlayPage>
        {/* This is used by the captions shortcut in bottomControls of player */}
        <OverlayPage id={id} path="/captionsOverlay" width={343} height={496}>
          <Menu.CardWithScrollable>
            <CaptionsView id={id} onChooseLanguage={setChosenLanguage} />
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/captionsOverlay/languagesOverlay"
          width={443}
          height={496}
        >
          <Menu.CardWithScrollable>
            {chosenLanguage && (
              <LanguageSubtitlesView
                id={id}
                language={chosenLanguage}
                onTranslateSubtitle={setCaptionToTranslate}
                overlayBackLink
              />
            )}
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/captionsOverlay/languagesOverlay/translateSubtitleOverlay"
          width={443}
          height={496}
        >
          <Menu.CardWithScrollable>
            {captionToTranslate && (
              <TranslateSubtitleView
                id={id}
                caption={captionToTranslate}
                overlayBackLink
              />
            )}
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage id={id} path="/captions/settings" width={343} height={496}>
          <Menu.Card>
            <CaptionSettingsView id={id} />
          </Menu.Card>
        </OverlayPage>
        {/* This is used by the captions shortcut in bottomControls of player */}
        <OverlayPage
          id={id}
          path="/captions/settingsOverlay"
          width={343}
          height={496}
        >
          <Menu.Card>
            <CaptionSettingsView id={id} overlayBackLink />
          </Menu.Card>
        </OverlayPage>
        <OverlayPage id={id} path="/source" width={343} height={496}>
          <Menu.CardWithScrollable>
            <SourceSelectionView id={id} onChoose={setChosenSourceId} />
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage id={id} path="/source/embeds" width={343} height={496}>
          <Menu.CardWithScrollable>
            <EmbedSelectionView id={id} sourceId={chosenSourceId} />
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage id={id} path="/playback" width={343} height={330}>
          <Menu.Card>
            <PlaybackSettingsView id={id} />
          </Menu.Card>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/playback/skip-segments"
          width={343}
          height={446}
        >
          <Menu.Card>
            <SkipSegmentsView id={id} />
          </Menu.Card>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/captions/transcript"
          width={343}
          height={496}
        >
          <Menu.CardWithScrollable>
            <TranscriptView id={id} />
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/captions/languages"
          width={443}
          height={496}
        >
          <Menu.CardWithScrollable>
            {chosenLanguage && (
              <LanguageSubtitlesView
                id={id}
                language={chosenLanguage}
                onTranslateSubtitle={setCaptionToTranslate}
              />
            )}
          </Menu.CardWithScrollable>
        </OverlayPage>
        <OverlayPage
          id={id}
          path="/captions/languages/translateSubtitleOverlay"
          width={443}
          height={496}
        >
          <Menu.CardWithScrollable>
            {captionToTranslate && (
              <TranslateSubtitleView id={id} caption={captionToTranslate} />
            )}
          </Menu.CardWithScrollable>
        </OverlayPage>
        <DownloadRoutes id={id} />
        <OverlayPage id={id} path="/watchparty" width={343} height={496}>
          <Menu.CardWithScrollable>
            <WatchPartyView id={id} />
          </Menu.CardWithScrollable>
        </OverlayPage>
      </OverlayRouter>
    </Overlay>
  );
}

export function SettingsRouter() {
  return <SettingsOverlay id="settings" />;
}

export function Settings() {
  const router = useOverlayRouter("settings");
  const setHasOpenOverlay = usePlayerStore((s) => s.setHasOpenOverlay);

  useEffect(() => {
    setHasOpenOverlay(router.isRouterActive);
  }, [setHasOpenOverlay, router.isRouterActive]);

  return (
    <OverlayAnchor id={router.id}>
      <VideoPlayerButton onClick={() => router.open()} icon={Icons.GEAR} />
    </OverlayAnchor>
  );
}
