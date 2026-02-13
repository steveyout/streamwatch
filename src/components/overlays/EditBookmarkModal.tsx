import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { GroupDropdown } from "@/components/form/GroupDropdown";
import { Modal, ModalCard } from "@/components/overlays/Modal";
import { UserIcons } from "@/components/UserIcon";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { BookmarkMediaItem, useBookmarkStore } from "@/stores/bookmarks";

interface EditBookmarkModalProps {
  id: string;
  isShown: boolean;
  bookmarkId: string | null;
  onCancel: () => void;
  onSave: (bookmarkId: string, changes: Partial<BookmarkMediaItem>) => void;
}

export function EditBookmarkModal({
  id,
  isShown,
  bookmarkId,
  onCancel,
  onSave,
}: EditBookmarkModalProps) {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | undefined>();
  const [groups, setGroups] = useState<string[]>([]);

  // Get all available groups from all bookmarks
  const allGroups = useMemo(() => {
    const groupSet = new Set<string>();
    Object.values(bookmarks).forEach((bookmark) => {
      if (bookmark.group) {
        bookmark.group.forEach((group) => groupSet.add(group));
      }
    });
    return Array.from(groupSet);
  }, [bookmarks]);

  useEffect(() => {
    if (bookmarkId && bookmarks[bookmarkId]) {
      const bookmark = bookmarks[bookmarkId];
      setTitle(bookmark.title);
      setYear(bookmark.year);
      setGroups(bookmark.group || []);
    } else {
      setTitle("");
      setYear(undefined);
      setGroups([]);
    }
  }, [bookmarkId, bookmarks]);

  const handleSave = () => {
    if (!bookmarkId) return;

    const changes: Partial<BookmarkMediaItem> = {};

    if (title !== bookmarks[bookmarkId]?.title) {
      changes.title = title;
    }

    if (year !== bookmarks[bookmarkId]?.year) {
      changes.year = year;
    }

    const currentGroups = bookmarks[bookmarkId]?.group || [];
    if (
      JSON.stringify(groups.sort()) !== JSON.stringify(currentGroups.sort())
    ) {
      changes.group = groups;
    }

    if (Object.keys(changes).length > 0) {
      onSave(bookmarkId, changes);
    }

    onCancel();
  };

  const handleCreateGroup = (groupString: string, _icon: UserIcons) => {
    if (!groups.includes(groupString)) {
      setGroups([...groups, groupString]);
    }
  };

  const handleRemoveGroup = (groupToRemove?: string) => {
    if (groupToRemove) {
      setGroups(groups.filter((group) => group !== groupToRemove));
    } else {
      setGroups([]);
    }
  };

  if (!isShown || !bookmarkId) return null;

  return (
    <Modal id={id}>
      <ModalCard>
        <Heading2 className="!my-0">{t("home.bookmarks.edit.title")}</Heading2>
        <Paragraph className="mt-4">
          {t("home.bookmarks.edit.description")}
        </Paragraph>

        <div className="space-y-4 mt-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("home.bookmarks.edit.titleLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("home.bookmarks.edit.titlePlaceholder")}
              className="w-full px-3 py-2 bg-background-main outline-none rounded text-sm text-white"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("home.bookmarks.edit.yearLabel")}
            </label>
            <input
              type="number"
              value={year || ""}
              onChange={(e) =>
                setYear(
                  e.target.value ? parseInt(e.target.value, 10) : undefined,
                )
              }
              placeholder={t("home.bookmarks.edit.yearPlaceholder")}
              className="w-full px-3 py-2 bg-background-main outline-none rounded text-sm text-white"
            />
          </div>

          {/* Groups */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("home.bookmarks.edit.groupsLabel")}
            </label>
            <GroupDropdown
              groups={allGroups}
              currentGroups={groups}
              onSelectGroups={setGroups}
              onCreateGroup={handleCreateGroup}
              onRemoveGroup={handleRemoveGroup}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6 justify-end">
          <Button theme="secondary" onClick={onCancel}>
            {t("home.bookmarks.edit.cancel")}
          </Button>
          <Button theme="purple" onClick={handleSave}>
            {t("home.bookmarks.edit.save")}
          </Button>
        </div>
      </ModalCard>
    </Modal>
  );
}
