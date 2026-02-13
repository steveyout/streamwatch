import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Modal, ModalCard } from "@/components/overlays/Modal";
import { Heading2 } from "@/components/utils/Text";
import { usePreferencesStore } from "@/stores/preferences";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardShortcutConfig,
  ShortcutId,
  getKeyDisplayName,
  getModifierSymbol,
} from "@/utils/keyboardShortcuts";

interface KeyboardShortcut {
  key: string;
  description: string;
  condition?: string;
  config?: KeyboardShortcutConfig;
}

interface ShortcutGroup {
  title: string;
  shortcuts: KeyboardShortcut[];
}

function KeyBadge({
  config,
  children,
}: {
  config?: KeyboardShortcutConfig;
  children: ReactNode;
}) {
  const modifier = config?.modifier;

  return (
    <kbd className="relative inline-flex items-center justify-center min-w-[2rem] h-8 px-2 text-sm font-mono bg-gray-800 text-gray-200 rounded border border-gray-600 shadow-sm">
      {children}
      {modifier && (
        <span className="absolute -top-1 -right-1 text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
          {getModifierSymbol(modifier)}
        </span>
      )}
    </kbd>
  );
}

const getShortcutGroups = (
  t: (key: string) => string,
  shortcuts: Record<string, KeyboardShortcutConfig>,
): ShortcutGroup[] => {
  // Merge user shortcuts with defaults (user shortcuts take precedence)
  const mergedShortcuts = {
    ...DEFAULT_KEYBOARD_SHORTCUTS,
    ...shortcuts,
  };

  const getDisplayKey = (shortcutId: ShortcutId): string => {
    const config = mergedShortcuts[shortcutId];
    if (!config?.key) return "";
    return getKeyDisplayName(config.key);
  };

  const getConfig = (
    shortcutId: ShortcutId,
  ): KeyboardShortcutConfig | undefined => {
    return mergedShortcuts[shortcutId];
  };

  return [
    {
      title: t("global.keyboardShortcuts.groups.videoPlayback"),
      shortcuts: [
        {
          key: "Space",
          description: t("global.keyboardShortcuts.shortcuts.playPause"),
        },
        {
          key: "K",
          description: t("global.keyboardShortcuts.shortcuts.playPauseAlt"),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_FORWARD_5) || "→",
          description: t("global.keyboardShortcuts.shortcuts.skipForward5"),
          config: getConfig(ShortcutId.SKIP_FORWARD_5),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_BACKWARD_5) || "←",
          description: t("global.keyboardShortcuts.shortcuts.skipBackward5"),
          config: getConfig(ShortcutId.SKIP_BACKWARD_5),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_BACKWARD_10) || "J",
          description: t("global.keyboardShortcuts.shortcuts.skipBackward10"),
          config: getConfig(ShortcutId.SKIP_BACKWARD_10),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_FORWARD_10) || "L",
          description: t("global.keyboardShortcuts.shortcuts.skipForward10"),
          config: getConfig(ShortcutId.SKIP_FORWARD_10),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_FORWARD_1) || ".",
          description: t("global.keyboardShortcuts.shortcuts.skipForward1"),
          config: getConfig(ShortcutId.SKIP_FORWARD_1),
        },
        {
          key: getDisplayKey(ShortcutId.SKIP_BACKWARD_1) || ",",
          description: t("global.keyboardShortcuts.shortcuts.skipBackward1"),
          config: getConfig(ShortcutId.SKIP_BACKWARD_1),
        },
        {
          key: getDisplayKey(ShortcutId.NEXT_EPISODE) || "P",
          description: t("global.keyboardShortcuts.shortcuts.nextEpisode"),
          condition: t("global.keyboardShortcuts.conditions.showsOnly"),
          config: getConfig(ShortcutId.NEXT_EPISODE),
        },
        {
          key: getDisplayKey(ShortcutId.PREVIOUS_EPISODE) || "O",
          description: t("global.keyboardShortcuts.shortcuts.previousEpisode"),
          condition: t("global.keyboardShortcuts.conditions.showsOnly"),
          config: getConfig(ShortcutId.PREVIOUS_EPISODE),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.jumpToPosition"),
      shortcuts: [
        {
          key: getDisplayKey(ShortcutId.JUMP_TO_0) || "0",
          description: t("global.keyboardShortcuts.shortcuts.jumpTo0"),
          config: getConfig(ShortcutId.JUMP_TO_0),
        },
        {
          key: getDisplayKey(ShortcutId.JUMP_TO_9) || "9",
          description: t("global.keyboardShortcuts.shortcuts.jumpTo9"),
          config: getConfig(ShortcutId.JUMP_TO_9),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.audioVideo"),
      shortcuts: [
        {
          key: "↑",
          description: t("global.keyboardShortcuts.shortcuts.increaseVolume"),
        },
        {
          key: "↓",
          description: t("global.keyboardShortcuts.shortcuts.decreaseVolume"),
        },
        {
          key: getDisplayKey(ShortcutId.MUTE) || "M",
          description: t("global.keyboardShortcuts.shortcuts.mute"),
          config: getConfig(ShortcutId.MUTE),
        },
        {
          key: getDisplayKey(ShortcutId.TOGGLE_FULLSCREEN) || "F",
          description: t("global.keyboardShortcuts.shortcuts.toggleFullscreen"),
          config: getConfig(ShortcutId.TOGGLE_FULLSCREEN),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.subtitlesAccessibility"),
      shortcuts: [
        {
          key: getDisplayKey(ShortcutId.TOGGLE_CAPTIONS) || "C",
          description: t("global.keyboardShortcuts.shortcuts.toggleCaptions"),
          config: getConfig(ShortcutId.TOGGLE_CAPTIONS),
        },
        {
          key: getDisplayKey(ShortcutId.RANDOM_CAPTION) || "Shift+C",
          description: t("global.keyboardShortcuts.shortcuts.randomCaption"),
          config: getConfig(ShortcutId.RANDOM_CAPTION),
        },
        {
          key: getDisplayKey(ShortcutId.SYNC_SUBTITLES_EARLIER) || "[",
          description: t(
            "global.keyboardShortcuts.shortcuts.syncSubtitlesEarlier",
          ),
          config: getConfig(ShortcutId.SYNC_SUBTITLES_EARLIER),
        },
        {
          key: getDisplayKey(ShortcutId.SYNC_SUBTITLES_LATER) || "]",
          description: t(
            "global.keyboardShortcuts.shortcuts.syncSubtitlesLater",
          ),
          config: getConfig(ShortcutId.SYNC_SUBTITLES_LATER),
        },
        {
          key: getDisplayKey(ShortcutId.TOGGLE_NATIVE_SUBTITLES) || "S",
          description: t(
            "global.keyboardShortcuts.shortcuts.toggleNativeSubtitles",
          ),
          config: getConfig(ShortcutId.TOGGLE_NATIVE_SUBTITLES),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.interface"),
      shortcuts: [
        {
          key: getDisplayKey(ShortcutId.BARREL_ROLL) || "R",
          description: t("global.keyboardShortcuts.shortcuts.barrelRoll"),
          config: getConfig(ShortcutId.BARREL_ROLL),
        },
        {
          key: "Escape",
          description: t("global.keyboardShortcuts.shortcuts.closeOverlay"),
        },
      ],
    },
  ];
};

interface KeyboardCommandsModalProps {
  id: string;
}

export function KeyboardCommandsModal({ id }: KeyboardCommandsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const keyboardShortcuts = usePreferencesStore((s) => s.keyboardShortcuts);
  const shortcutGroups = getShortcutGroups(t, keyboardShortcuts);

  return (
    <Modal id={id}>
      <ModalCard>
        <div className="space-y-6">
          <div className="text-center">
            <Heading2 className="!mt-0 !mb-2">
              {t("global.keyboardShortcuts.title")}
            </Heading2>
            <p className="text-type-secondary text-lg">
              {(() => {
                const subtitle = t("global.keyboardShortcuts.subtitle");
                const [before, after] = subtitle.split("`");
                return (
                  <>
                    {before}
                    <KeyBadge config={undefined}>`</KeyBadge>
                    {after}
                  </>
                );
              })()}
            </p>
            <p className="text-type-secondary text-sm mt-2">
              <button
                type="button"
                onClick={() => {
                  navigate("/settings?category=settings-preferences");
                }}
                className="text-type-link hover:text-type-linkHover"
              >
                {t("global.keyboardShortcuts.editInSettings")}
              </button>
            </p>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {shortcutGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts
                    .filter((shortcut) => shortcut.key) // Only show shortcuts that have a key configured
                    .map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-3">
                          <KeyBadge config={shortcut.config}>
                            {shortcut.key}
                          </KeyBadge>
                          <span className="text-type-secondary">
                            {shortcut.description}
                          </span>
                        </div>
                        {shortcut.condition && (
                          <span className="text-xs text-gray-400 italic">
                            {shortcut.condition}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ModalCard>
    </Modal>
  );
}
