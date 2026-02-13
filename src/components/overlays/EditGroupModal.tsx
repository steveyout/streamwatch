import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Modal, ModalCard } from "@/components/overlays/Modal";
import { UserIcon, UserIcons } from "@/components/UserIcon";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { useBookmarkStore } from "@/stores/bookmarks";
import {
  createGroupString,
  findBookmarksByGroup,
  parseGroupString,
} from "@/utils/bookmarkModifications";

const userIconList = Object.values(UserIcons);

interface EditGroupModalProps {
  id: string;
  isShown: boolean;
  groupName: string | null;
  onCancel: () => void;
  onSave: (oldGroupName: string, newGroupName: string) => void;
}

export function EditGroupModal({
  id,
  isShown,
  groupName,
  onCancel,
  onSave,
}: EditGroupModalProps) {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIcon, setNewGroupIcon] = useState<UserIcons>(
    UserIcons.BOOKMARK,
  );
  const [affectedBookmarks, setAffectedBookmarks] = useState<string[]>([]);

  const getIconFromKey = (iconKey: string): UserIcons => {
    const key = iconKey.toUpperCase() as keyof typeof UserIcons;
    return UserIcons[key] || UserIcons.BOOKMARK;
  };

  const getIconKey = (icon: UserIcons): string => {
    const entry = Object.entries(UserIcons).find(([, value]) => value === icon);
    return entry ? entry[0] : "BOOKMARK";
  };

  useEffect(() => {
    if (groupName) {
      const { icon, name } = parseGroupString(groupName);
      setNewGroupName(name);
      setNewGroupIcon(getIconFromKey(icon || "BOOKMARK"));
      setAffectedBookmarks(findBookmarksByGroup(bookmarks, groupName));
    } else {
      setNewGroupName("");
      setNewGroupIcon(UserIcons.BOOKMARK);
      setAffectedBookmarks([]);
    }
  }, [groupName, bookmarks]);

  const handleSave = () => {
    if (!groupName || !newGroupName.trim()) return;

    const iconKey = getIconKey(newGroupIcon);
    const newGroupString = createGroupString(iconKey, newGroupName.trim());

    if (newGroupString !== groupName) {
      onSave(groupName, newGroupString);
    }

    onCancel();
  };

  if (!isShown || !groupName) return null;

  const { icon: currentIcon, name: currentName } = parseGroupString(groupName);
  const currentIconKey = currentIcon.toUpperCase() as keyof typeof UserIcons;
  const currentIconComponent = UserIcons[currentIconKey] || UserIcons.BOOKMARK;

  return (
    <Modal id={id}>
      <ModalCard>
        <Heading2 className="!my-0">
          {t("home.bookmarks.groups.editGroup.title")}
        </Heading2>
        <Paragraph className="mt-4">
          {t("home.bookmarks.groups.editGroup.description")}
        </Paragraph>

        {/* Current Group Info */}
        <div className="mt-4 p-3 bg-background-main rounded">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon icon={currentIconComponent} className="w-5 h-5" />
            <span className="font-medium">{currentName}</span>
          </div>
          <p className="text-sm text-type-secondary">
            {t("home.bookmarks.groups.editGroup.affectsBookmarks", {
              count: affectedBookmarks.length,
            })}
          </p>
        </div>

        <div className="space-y-4 mt-6">
          {/* New Group Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("home.bookmarks.groups.editGroup.nameLabel")}
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t("home.bookmarks.groups.editGroup.namePlaceholder")}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              className="w-full px-3 py-2 bg-background-main outline-none rounded text-sm text-white"
              autoFocus
            />
            {newGroupName.trim().length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-4 w-full justify-center">
                {userIconList.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    className={`rounded p-1 border-2 ${
                      newGroupIcon === icon
                        ? "border-type-link bg-mediaCard-hoverBackground"
                        : "border-transparent hover:border-background-secondary"
                    }`}
                    onClick={() => setNewGroupIcon(icon)}
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      <UserIcon
                        icon={icon}
                        className={`w-full h-full ${
                          newGroupIcon === icon ? "text-type-link" : ""
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-6 justify-end">
          <Button theme="secondary" onClick={onCancel}>
            {t("home.bookmarks.groups.editGroup.cancel")}
          </Button>
          <Button
            theme="purple"
            onClick={handleSave}
            disabled={
              !newGroupName.trim() ||
              createGroupString(
                getIconKey(newGroupIcon),
                newGroupName.trim(),
              ) === groupName
            }
          >
            {t("home.bookmarks.groups.editGroup.save")}
          </Button>
        </div>
      </ModalCard>
    </Modal>
  );
}
