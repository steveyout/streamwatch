import { ReactNode, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { updateSettings } from "@/backend/accounts/settings";
import { Button } from "@/components/buttons/Button";
import { Dropdown } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { Heading2 } from "@/components/utils/Text";
import { useBackendUrl } from "@/hooks/auth/useBackendUrl";
import { useAuthStore } from "@/stores/auth";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KeyboardModifier,
  KeyboardShortcutConfig,
  KeyboardShortcuts,
  LOCKED_SHORTCUT_IDS,
  ShortcutId,
  findConflicts,
  getKeyDisplayName,
  getModifierSymbol,
  isNumberKey,
} from "@/utils/keyboardShortcuts";

interface KeyboardShortcut {
  id: ShortcutId;
  config: KeyboardShortcutConfig;
  description: string;
  condition?: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: KeyboardShortcut[];
}

function KeyBadge({
  config,
  children,
  onClick,
  editing,
  hasConflict,
}: {
  config?: KeyboardShortcutConfig;
  children: ReactNode;
  onClick?: () => void;
  editing?: boolean;
  hasConflict?: boolean;
}) {
  const modifier = config?.modifier;

  return (
    <kbd
      className={`
        relative inline-flex items-center justify-center min-w-[2rem] h-8 px-2 text-sm font-mono bg-gray-800 text-gray-200 rounded border shadow-sm
        ${onClick ? "cursor-pointer hover:bg-gray-700" : ""}
        ${editing ? "ring-2 ring-blue-500" : ""}
        ${hasConflict ? "border-red-500 bg-red-900/20" : "border-gray-600"}
      `}
      onClick={onClick}
    >
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
  shortcuts: KeyboardShortcuts,
): ShortcutGroup[] => {
  return [
    {
      title: t("global.keyboardShortcuts.groups.videoPlayback"),
      shortcuts: [
        {
          id: ShortcutId.SKIP_FORWARD_5,
          config: shortcuts[ShortcutId.SKIP_FORWARD_5],
          description: t("global.keyboardShortcuts.shortcuts.skipForward5"),
        },
        {
          id: ShortcutId.SKIP_BACKWARD_5,
          config: shortcuts[ShortcutId.SKIP_BACKWARD_5],
          description: t("global.keyboardShortcuts.shortcuts.skipBackward5"),
        },
        {
          id: ShortcutId.SKIP_FORWARD_10,
          config: shortcuts[ShortcutId.SKIP_FORWARD_10],
          description: t("global.keyboardShortcuts.shortcuts.skipForward10"),
        },
        {
          id: ShortcutId.SKIP_BACKWARD_10,
          config: shortcuts[ShortcutId.SKIP_BACKWARD_10],
          description: t("global.keyboardShortcuts.shortcuts.skipBackward10"),
        },
        {
          id: ShortcutId.SKIP_FORWARD_1,
          config: shortcuts[ShortcutId.SKIP_FORWARD_1],
          description: t("global.keyboardShortcuts.shortcuts.skipForward1"),
        },
        {
          id: ShortcutId.SKIP_BACKWARD_1,
          config: shortcuts[ShortcutId.SKIP_BACKWARD_1],
          description: t("global.keyboardShortcuts.shortcuts.skipBackward1"),
        },
        {
          id: ShortcutId.NEXT_EPISODE,
          config: shortcuts[ShortcutId.NEXT_EPISODE],
          description: t("global.keyboardShortcuts.shortcuts.nextEpisode"),
          condition: t("global.keyboardShortcuts.conditions.showsOnly"),
        },
        {
          id: ShortcutId.PREVIOUS_EPISODE,
          config: shortcuts[ShortcutId.PREVIOUS_EPISODE],
          description: t("global.keyboardShortcuts.shortcuts.previousEpisode"),
          condition: t("global.keyboardShortcuts.conditions.showsOnly"),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.audioVideo"),
      shortcuts: [
        {
          id: ShortcutId.MUTE,
          config: shortcuts[ShortcutId.MUTE],
          description: t("global.keyboardShortcuts.shortcuts.mute"),
        },
        {
          id: ShortcutId.TOGGLE_FULLSCREEN,
          config: shortcuts[ShortcutId.TOGGLE_FULLSCREEN],
          description: t("global.keyboardShortcuts.shortcuts.toggleFullscreen"),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.subtitlesAccessibility"),
      shortcuts: [
        {
          id: ShortcutId.TOGGLE_CAPTIONS,
          config: shortcuts[ShortcutId.TOGGLE_CAPTIONS],
          description: t("global.keyboardShortcuts.shortcuts.toggleCaptions"),
        },
        {
          id: ShortcutId.RANDOM_CAPTION,
          config: shortcuts[ShortcutId.RANDOM_CAPTION],
          description: t("global.keyboardShortcuts.shortcuts.randomCaption"),
        },
        {
          id: ShortcutId.SYNC_SUBTITLES_EARLIER,
          config: shortcuts[ShortcutId.SYNC_SUBTITLES_EARLIER],
          description: t(
            "global.keyboardShortcuts.shortcuts.syncSubtitlesEarlier",
          ),
        },
        {
          id: ShortcutId.SYNC_SUBTITLES_LATER,
          config: shortcuts[ShortcutId.SYNC_SUBTITLES_LATER],
          description: t(
            "global.keyboardShortcuts.shortcuts.syncSubtitlesLater",
          ),
        },
        {
          id: ShortcutId.TOGGLE_NATIVE_SUBTITLES,
          config: shortcuts[ShortcutId.TOGGLE_NATIVE_SUBTITLES],
          description: t(
            "global.keyboardShortcuts.shortcuts.toggleNativeSubtitles",
          ),
        },
      ],
    },
    {
      title: t("global.keyboardShortcuts.groups.interface"),
      shortcuts: [
        {
          id: ShortcutId.BARREL_ROLL,
          config: shortcuts[ShortcutId.BARREL_ROLL],
          description: t("global.keyboardShortcuts.shortcuts.barrelRoll"),
        },
      ],
    },
  ];
};

interface KeyboardCommandsEditModalProps {
  id: string;
}

export function KeyboardCommandsEditModal({
  id,
}: KeyboardCommandsEditModalProps) {
  const { t } = useTranslation();
  const account = useAuthStore((s) => s.account);
  const backendUrl = useBackendUrl();
  const { hideModal } = useOverlayStack();
  const modal = useModal(id);
  const keyboardShortcuts = usePreferencesStore((s) => s.keyboardShortcuts);
  const setKeyboardShortcuts = usePreferencesStore(
    (s) => s.setKeyboardShortcuts,
  );

  const [editingShortcuts, setEditingShortcuts] =
    useState<KeyboardShortcuts>(keyboardShortcuts);
  const [editingId, setEditingId] = useState<ShortcutId | null>(null);
  const [editingModifier, setEditingModifier] = useState<KeyboardModifier | "">(
    "",
  );
  const [editingKey, setEditingKey] = useState<string>("");
  const [isCapturingKey, setIsCapturingKey] = useState(false);

  // Cancel any active editing when modal closes
  useEffect(() => {
    if (!modal.isShown) {
      setEditingId(null);
      setEditingModifier("");
      setEditingKey("");
      setIsCapturingKey(false);
    }
  }, [modal.isShown]);

  const shortcutGroups = getShortcutGroups(t, editingShortcuts).map(
    (group) => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        (s) => !LOCKED_SHORTCUT_IDS.includes(s.id),
      ),
    }),
  );
  const conflicts = findConflicts(editingShortcuts);
  const conflictIds = new Set<string>();
  conflicts.forEach((conflict: { id1: string; id2: string }) => {
    conflictIds.add(conflict.id1);
    conflictIds.add(conflict.id2);
  });

  const modifierOptions = [
    { id: "", name: "None" },
    { id: "Shift", name: "Shift" },
    { id: "Alt", name: "Alt" },
  ];

  const handleStartEdit = useCallback(
    (shortcutId: ShortcutId) => {
      const config = editingShortcuts[shortcutId];
      setEditingId(shortcutId);
      setEditingModifier(config?.modifier || "");
      setEditingKey(config?.key || "");
      setIsCapturingKey(true);
    },
    [editingShortcuts],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingModifier("");
    setEditingKey("");
    setIsCapturingKey(false);
  }, []);

  const handleKeyCapture = useCallback(
    (event: KeyboardEvent) => {
      if (!isCapturingKey || !editingId) return;

      // Don't capture modifier keys alone
      if (
        event.key === "Shift" ||
        event.key === "Alt" ||
        event.key === "Control" ||
        event.key === "Meta" ||
        event.key === "Escape"
      ) {
        return;
      }

      // Block number keys (0-9) - they're reserved for progress skipping
      if (isNumberKey(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        setIsCapturingKey(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setEditingKey(event.key);
      setIsCapturingKey(false);
    },
    [isCapturingKey, editingId],
  );

  useEffect(() => {
    if (isCapturingKey) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          handleCancelEdit();
        }
      };
      window.addEventListener("keydown", handleKeyCapture);
      window.addEventListener("keydown", handleEscape);
      return () => {
        window.removeEventListener("keydown", handleKeyCapture);
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isCapturingKey, handleKeyCapture, handleCancelEdit]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;

    const newConfig: KeyboardShortcutConfig = {
      modifier: editingModifier || undefined,
      key: editingKey || undefined,
    };

    setEditingShortcuts((prev: KeyboardShortcuts) => ({
      ...prev,
      [editingId]: newConfig,
    }));

    handleCancelEdit();
  }, [editingId, editingModifier, editingKey, handleCancelEdit]);

  const handleResetShortcut = useCallback((shortcutId: ShortcutId) => {
    setEditingShortcuts((prev: KeyboardShortcuts) => ({
      ...prev,
      [shortcutId]: DEFAULT_KEYBOARD_SHORTCUTS[shortcutId],
    }));
  }, []);

  const handleResetAll = useCallback(() => {
    setEditingShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
  }, []);

  const handleSave = useCallback(async () => {
    setKeyboardShortcuts(editingShortcuts);

    if (account && backendUrl) {
      try {
        await updateSettings(backendUrl, account, {
          keyboardShortcuts: editingShortcuts,
        });
      } catch (error) {
        console.error("Failed to save keyboard shortcuts:", error);
      }
    }

    hideModal(id);
  }, [
    editingShortcuts,
    account,
    backendUrl,
    setKeyboardShortcuts,
    hideModal,
    id,
  ]);

  const handleCancel = useCallback(() => {
    hideModal(id);
  }, [hideModal, id]);

  return (
    <Modal id={id}>
      <ModalCard className="!max-w-2xl">
        <div className="space-y-6">
          <div className="text-center">
            <Heading2 className="!mt-0 !mb-2">
              {t("global.keyboardShortcuts.title")}
            </Heading2>
            <p className="text-type-secondary text-sm">
              {t("global.keyboardShortcuts.clickToEdit")}
            </p>
          </div>

          <div className="flex flex-grow justify-between items-center gap-2">
            {conflicts.length > 0 ? (
              <p className="text-red-400 text-sm">
                {conflicts.length}{" "}
                {conflicts.length > 1
                  ? t("global.keyboardShortcuts.conflicts")
                  : t("global.keyboardShortcuts.conflict")}{" "}
                {t("global.keyboardShortcuts.detected")}
              </p>
            ) : (
              <div /> // Empty div to take up space
            )}
            <Button theme="secondary" onClick={handleResetAll}>
              <Icon icon={Icons.RELOAD} className="mr-2" />
              {t("global.keyboardShortcuts.resetAllToDefault")}
            </Button>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            {shortcutGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => {
                    const isEditing = editingId === shortcut.id;
                    const hasConflict = conflictIds.has(shortcut.id);
                    const config = editingShortcuts[shortcut.id];

                    return (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isEditing ? (
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2">
                                <Dropdown
                                  selectedItem={
                                    modifierOptions.find(
                                      (opt) => opt.id === editingModifier,
                                    ) || modifierOptions[0]
                                  }
                                  setSelectedItem={(item) =>
                                    setEditingModifier(
                                      item.id as KeyboardModifier | "",
                                    )
                                  }
                                  options={modifierOptions}
                                  className="w-32 !my-1"
                                />
                                <KeyBadge
                                  config={
                                    editingKey
                                      ? {
                                          modifier:
                                            editingModifier || undefined,
                                          key: editingKey,
                                        }
                                      : undefined
                                  }
                                  editing
                                >
                                  {isCapturingKey
                                    ? t("global.keyboardShortcuts.pressKey")
                                    : editingKey
                                      ? getKeyDisplayName(editingKey)
                                      : t("global.keyboardShortcuts.none")}
                                </KeyBadge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  theme="secondary"
                                  onClick={handleSaveEdit}
                                  className="px-2 py-1 text-xs"
                                >
                                  {t("global.keyboardShortcuts.save")}
                                </Button>
                                <Button
                                  theme="secondary"
                                  onClick={handleCancelEdit}
                                  className="px-2 py-1 text-xs"
                                >
                                  {t("global.keyboardShortcuts.cancel")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <KeyBadge
                                config={config}
                                onClick={() => handleStartEdit(shortcut.id)}
                                hasConflict={hasConflict}
                              >
                                {config?.key
                                  ? getKeyDisplayName(config.key)
                                  : t("global.keyboardShortcuts.none")}
                              </KeyBadge>
                              <span className="text-type-secondary">
                                {shortcut.description}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {shortcut.condition && !isEditing && (
                            <span className="text-xs text-gray-400 italic">
                              {shortcut.condition}
                            </span>
                          )}
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleResetShortcut(shortcut.id)}
                              className="text-type-secondary hover:text-white transition-colors"
                              title={t(
                                "global.keyboardShortcuts.resetToDefault",
                              )}
                            >
                              <Icon icon={Icons.RELOAD} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button theme="secondary" onClick={handleCancel}>
              {t("global.keyboardShortcuts.cancel")}
            </Button>
            <Button theme="purple" onClick={handleSave}>
              {t("global.keyboardShortcuts.saveChanges")}
            </Button>
          </div>
        </div>
      </ModalCard>
    </Modal>
  );
}
