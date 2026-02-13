import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Item, SortableList } from "@/components/form/SortableList";
import { Modal, ModalCard } from "@/components/overlays/Modal";
import { UserIcons } from "@/components/UserIcon";
import { Heading2, Paragraph } from "@/components/utils/Text";
import { useBookmarkStore } from "@/stores/bookmarks";
import { useGroupOrderStore } from "@/stores/groupOrder";

function parseGroupString(group: string): { icon: UserIcons; name: string } {
  const match = group.match(/^\[([a-zA-Z0-9_]+)\](.*)$/);
  if (match) {
    const iconKey = match[1].toUpperCase() as keyof typeof UserIcons;
    const icon = UserIcons[iconKey] || UserIcons.BOOKMARK;
    const name = match[2].trim();
    return { icon, name };
  }
  return { icon: UserIcons.BOOKMARK, name: group };
}

interface EditGroupOrderModalProps {
  id: string;
  isShown: boolean;
  onCancel: () => void;
  onSave: (newOrder: string[]) => void;
}

export function EditGroupOrderModal({
  id,
  isShown,
  onCancel,
  onSave,
}: EditGroupOrderModalProps) {
  const { t } = useTranslation();
  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const groupOrder = useGroupOrderStore((s) => s.groupOrder);
  const [tempGroupOrder, setTempGroupOrder] = useState<string[]>([]);

  // group sorting
  const allGroups = useMemo(() => {
    const groups = new Set<string>();

    Object.values(bookmarks).forEach((bookmark) => {
      if (Array.isArray(bookmark.group)) {
        bookmark.group.forEach((group) => groups.add(group));
      }
    });

    groups.add("bookmarks");

    return Array.from(groups);
  }, [bookmarks]);

  const sortableItems = useMemo(() => {
    const currentOrder = isShown ? tempGroupOrder : groupOrder;

    if (currentOrder.length === 0) {
      return allGroups.map((group) => {
        const { name } = parseGroupString(group);
        return {
          id: group,
          name: group === "bookmarks" ? t("home.bookmarks.sectionTitle") : name,
        } as Item;
      });
    }

    const orderMap = new Map(
      currentOrder.map((group, index) => [group, index]),
    );
    const sortedGroups = allGroups.sort((groupA, groupB) => {
      const orderA = orderMap.has(groupA)
        ? orderMap.get(groupA)!
        : Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.has(groupB)
        ? orderMap.get(groupB)!
        : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return sortedGroups.map((group) => {
      const { name } = parseGroupString(group);
      return {
        id: group,
        name: group === "bookmarks" ? t("home.bookmarks.sectionTitle") : name,
      } as Item;
    });
  }, [allGroups, t, isShown, tempGroupOrder, groupOrder]);

  // Initialize tempGroupOrder when modal opens
  useEffect(() => {
    if (isShown) {
      if (groupOrder.length === 0) {
        const defaultOrder = allGroups.map((group) => group);
        setTempGroupOrder(defaultOrder);
      } else {
        setTempGroupOrder([...groupOrder]);
      }
    }
  }, [isShown, groupOrder, allGroups]);

  const handleItemsChange = (newItems: Item[]) => {
    const newOrder = newItems.map((item) => item.id);
    setTempGroupOrder(newOrder);
  };

  const handleSave = () => {
    onSave(tempGroupOrder);
  };

  if (!isShown) return null;

  return (
    <Modal id={id}>
      <ModalCard>
        <Heading2 className="!my-0">
          {t("home.bookmarks.groups.reorder.title")}
        </Heading2>
        <Paragraph className="mt-4">
          {t("home.bookmarks.groups.reorder.description")}
        </Paragraph>
        <div className="max-h-[50vh] overflow-y-auto">
          <SortableList items={sortableItems} setItems={handleItemsChange} />
        </div>
        <div className="flex gap-4 mt-6 justify-end">
          <Button theme="secondary" onClick={onCancel}>
            {t("home.bookmarks.groups.reorder.cancel")}
          </Button>
          <Button theme="purple" onClick={handleSave}>
            {t("home.bookmarks.groups.reorder.save")}
          </Button>
        </div>
      </ModalCard>
    </Modal>
  );
}
