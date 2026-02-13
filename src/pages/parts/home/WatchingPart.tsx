import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Listbox } from "@headlessui/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EditButton } from "@/components/buttons/EditButton";
import { Dropdown, OptionItem } from "@/components/form/Dropdown";
import { Icon, Icons } from "@/components/Icon";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { MediaGrid } from "@/components/media/MediaGrid";
import { WatchedMediaCard } from "@/components/media/WatchedMediaCard";
import { useProgressStore } from "@/stores/progress";
import { shouldShowProgress } from "@/stores/progress/utils";
import { SortOption, sortMediaItems } from "@/utils/mediaSorting";
import { MediaItem } from "@/utils/mediaTypes";

export function WatchingPart({
  onItemsChange,
  onShowDetails,
}: {
  onItemsChange: (hasItems: boolean) => void;
  onShowDetails?: (media: MediaItem) => void;
}) {
  const { t } = useTranslation();
  const progressItems = useProgressStore((s) => s.items);
  const removeItem = useProgressStore((s) => s.removeItem);
  const [editing, setEditing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem("__MW::watchingSort");
    return (saved as SortOption) || "date";
  });
  const [gridRef] = useAutoAnimate<HTMLDivElement>();

  useEffect(() => {
    localStorage.setItem("__MW::watchingSort", sortBy);
  }, [sortBy]);

  const sortedProgressItems = useMemo(() => {
    const output: MediaItem[] = [];
    Object.entries(progressItems)
      .filter((entry) => shouldShowProgress(entry[1]).show)
      .forEach((entry) => {
        output.push({
          id: entry[0],
          ...entry[1],
        });
      });

    return sortMediaItems(output, sortBy, undefined, progressItems);
  }, [progressItems, sortBy]);

  useEffect(() => {
    onItemsChange(sortedProgressItems.length > 0);
  }, [sortedProgressItems, onItemsChange]);

  const sortOptions: OptionItem[] = [
    { id: "date", name: t("home.continueWatching.sorting.options.date") },
    {
      id: "title-asc",
      name: t("home.continueWatching.sorting.options.titleAsc"),
    },
    {
      id: "title-desc",
      name: t("home.continueWatching.sorting.options.titleDesc"),
    },
    {
      id: "year-asc",
      name: t("home.continueWatching.sorting.options.yearAsc"),
    },
    {
      id: "year-desc",
      name: t("home.continueWatching.sorting.options.yearDesc"),
    },
  ];

  const selectedSortOption =
    sortOptions.find((opt) => opt.id === sortBy) || sortOptions[0];

  if (sortedProgressItems.length === 0) return null;

  return (
    <div className="relative">
      <SectionHeading
        title={t("home.continueWatching.sectionTitle")}
        icon={Icons.CLOCK}
      >
        <EditButton
          editing={editing}
          onEdit={setEditing}
          id="edit-button-watching"
        />
      </SectionHeading>
      {editing && (
        <div className="mb-6 -mt-4">
          <Dropdown
            selectedItem={selectedSortOption}
            setSelectedItem={(item) => {
              const newSort = item.id as SortOption;
              setSortBy(newSort);
              localStorage.setItem("__MW::watchingSort", newSort);
            }}
            options={sortOptions}
            customButton={
              <button
                type="button"
                className="px-2 py-1 text-sm bg-mediaCard-hoverBackground rounded-full hover:bg-mediaCard-background transition-colors flex items-center gap-1"
              >
                <span>{selectedSortOption.name}</span>
                <Icon
                  icon={Icons.UP_DOWN_ARROW}
                  className="text-xs text-dropdown-secondary"
                />
              </button>
            }
            side="left"
            customMenu={
              <Listbox.Options static className="py-1">
                {sortOptions.map((opt) => (
                  <Listbox.Option
                    className={({ active }) =>
                      `cursor-pointer min-w-60 flex gap-4 items-center relative select-none py-2 px-4 mx-1 rounded-lg ${
                        active
                          ? "bg-background-secondaryHover text-type-link"
                          : "text-type-secondary"
                      }`
                    }
                    key={opt.id}
                    value={opt}
                  >
                    {({ selected }) => (
                      <>
                        <span
                          className={`block ${selected ? "font-medium" : "font-normal"}`}
                        >
                          {opt.name}
                        </span>
                        {selected && (
                          <Icon
                            icon={Icons.CHECKMARK}
                            className="text-xs text-type-link"
                          />
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            }
          />
        </div>
      )}
      <MediaGrid ref={gridRef}>
        {sortedProgressItems.map((v) => (
          <div
            key={v.id}
            onContextMenu={(e: React.MouseEvent<HTMLDivElement>) =>
              e.preventDefault()
            }
          >
            <WatchedMediaCard
              media={v}
              closable={editing}
              onClose={() => removeItem(v.id)}
              onShowDetails={onShowDetails}
            />
          </div>
        ))}
      </MediaGrid>
    </div>
  );
}
