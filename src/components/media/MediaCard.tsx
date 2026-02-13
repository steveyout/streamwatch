// I'm sorry this is so confusing 😭

import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { mediaItemToId } from "@/backend/metadata/tmdb";
import { DotList } from "@/components/text/DotList";
import { Flare } from "@/components/utils/Flare";
import { useSearchQuery } from "@/hooks/useSearchQuery";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { usePreferencesStore } from "@/stores/preferences";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaBookmarkButton } from "./MediaBookmark";
import { IconPatch } from "../buttons/IconPatch";
import { Icon, Icons } from "../Icon";

// Simple Intersection Observer Hook
function useIntersectionObserver(options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<Element | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        ...options,
        rootMargin: options.rootMargin || "300px",
      },
    );

    const currentTarget = targetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [options]);

  return { targetRef, isIntersecting };
}

// Skeleton Component
export function MediaCardSkeleton() {
  const enableMinimalCards = usePreferencesStore((s) => s.enableMinimalCards);

  return (
    <Flare.Base className="group -m-[0.705em] rounded-xl bg-background-main transition-colors duration-300">
      <Flare.Light
        flareSize={300}
        cssColorVar="--colors-mediaCard-hoverAccent"
        backgroundClass="bg-mediaCard-hoverBackground duration-100"
        className="rounded-xl bg-background-main group-hover:opacity-100"
      />
      <Flare.Child className="pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300 opacity-60">
        <div className="animate-pulse">
          {/* Poster skeleton - matches MediaCard poster dimensions exactly */}
          <div
            className={classNames(
              "relative pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground",
              enableMinimalCards ? "" : "mb-4",
            )}
          />

          {!enableMinimalCards && (
            <>
              {/* Title skeleton - matches MediaCard title dimensions */}
              <div className="mb-1">
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-full mb-1" />
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-3/4 mb-1" />
                <div className="h-4 bg-mediaCard-hoverBackground rounded w-1/2" />
              </div>

              {/* Dot list skeleton - matches MediaCard dot list */}
              <div className="flex items-center gap-1">
                <div className="h-3 bg-mediaCard-hoverBackground rounded w-12" />
                <div className="h-1 w-1 bg-mediaCard-hoverBackground rounded-full" />
                <div className="h-3 bg-mediaCard-hoverBackground rounded w-8" />
              </div>
            </>
          )}
        </div>
      </Flare.Child>
    </Flare.Base>
  );
}

export interface MediaCardProps {
  media: MediaItem;
  linkable?: boolean;
  series?: {
    episode: number;
    season?: number;
    episodeId: string;
    seasonId: string;
  };
  percentage?: number;
  closable?: boolean;
  onClose?: () => void;
  onShowDetails?: (media: MediaItem) => void;
  forceSkeleton?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}

function checkReleased(media: MediaItem): boolean {
  const isReleasedYear = Boolean(
    media.year && media.year <= new Date().getFullYear(),
  );
  const isReleasedDate = Boolean(
    media.release_date && media.release_date <= new Date(),
  );

  // If the media has a release date, use that, otherwise use the year
  const isReleased = media.release_date ? isReleasedDate : isReleasedYear;

  return isReleased;
}

function MediaCardContent({
  media,
  linkable,
  series,
  percentage,
  closable,
  onClose,
  onShowDetails,
  forceSkeleton,
  editable,
  onEdit,
}: MediaCardProps) {
  const { t } = useTranslation();
  const percentageString = `${Math.round(percentage ?? 0).toFixed(0)}%`;

  const isReleased = useCallback(() => checkReleased(media), [media]);

  const canLink = linkable && !closable && isReleased();

  const dotListContent = [t(`media.types.${media.type}`)];

  const [searchQuery] = useSearchQuery();
  const enableMinimalCards = usePreferencesStore((s) => s.enableMinimalCards);

  // Simple intersection observer for lazy loading images
  const { targetRef, isIntersecting } = useIntersectionObserver({
    rootMargin: "300px",
  });

  // Show skeleton if forced or if media hasn't loaded yet (empty title/poster)
  const shouldShowSkeleton = forceSkeleton || (!media.title && !media.poster);

  if (shouldShowSkeleton) {
    return (
      <div ref={targetRef as React.RefObject<HTMLDivElement>}>
        <MediaCardSkeleton />
      </div>
    );
  }

  if (isReleased() && media.year) {
    dotListContent.push(media.year.toFixed());
  }

  if (!isReleased()) {
    dotListContent.push(t("media.unreleased"));
  }

  return (
    <div ref={targetRef as React.RefObject<HTMLDivElement>}>
      <Flare.Base
        className={`group -m-[0.705em] rounded-xl bg-background-main transition-colors duration-300 focus:relative focus:z-10 ${
          canLink ? "hover:bg-mediaCard-hoverBackground tabbable" : ""
        } ${closable ? "jiggle" : ""}`}
        tabIndex={canLink ? 0 : -1}
        onKeyUp={(e) => e.key === "Enter" && e.currentTarget.click()}
      >
        <Flare.Light
          flareSize={300}
          cssColorVar="--colors-mediaCard-hoverAccent"
          backgroundClass="bg-mediaCard-hoverBackground duration-100"
          className={classNames({
            "rounded-xl bg-background-main group-hover:opacity-100": canLink,
          })}
        />
        <Flare.Child
          className={`pointer-events-auto relative mb-2 p-[0.4em] transition-transform duration-300 ${
            canLink ? "group-hover:scale-95" : "opacity-60"
          }`}
        >
          <div
            className={classNames(
              "relative pb-[150%] w-full overflow-hidden rounded-xl bg-mediaCard-hoverBackground bg-cover bg-center transition-[border-radius] duration-300",
              {
                "group-hover:rounded-lg": canLink,
              },
              enableMinimalCards ? "" : "mb-4",
            )}
            style={{
              backgroundImage: isIntersecting
                ? media.poster
                  ? `url(${media.poster})`
                  : "url(/placeholder.png)"
                : "",
            }}
          >
            {series ? (
              <div
                className={[
                  "absolute right-2 top-2 rounded-md bg-mediaCard-badge px-2 py-1 transition-colors",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-center text-xs font-bold text-mediaCard-badgeText transition-colors",
                    closable ? "" : "group-hover:text-white",
                  ].join(" ")}
                >
                  {t("media.episodeDisplay", {
                    season: series.season || 1,
                    episode: series.episode,
                  })}
                </p>
              </div>
            ) : null}

            {percentage !== undefined ? (
              <>
                <div
                  className={`absolute inset-x-0 -bottom-px pb-1 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                    canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                  }`}
                />
                <div
                  className={`absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-mediaCard-shadow to-transparent transition-colors ${
                    canLink ? "group-hover:from-mediaCard-hoverShadow" : ""
                  }`}
                />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="relative h-1 overflow-hidden rounded-full bg-mediaCard-barColor">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-mediaCard-barFillColor"
                      style={{
                        width: percentageString,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {!closable && (
              <div
                className="absolute bookmark-button"
                onClick={(e) => e.preventDefault()}
              >
                <MediaBookmarkButton media={media} />
              </div>
            )}

            {searchQuery.length > 0 && !closable ? (
              <div className="absolute" onClick={(e) => e.preventDefault()}>
                <MediaBookmarkButton media={media} />
              </div>
            ) : null}

            <div
              className={`absolute inset-0 flex items-center justify-center bg-mediaCard-badge bg-opacity-80 transition-opacity duration-500 ${
                closable ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <IconPatch
                clickable
                className="text-2xl text-mediaCard-badgeText transition-transform hover:scale-110 duration-500"
                onClick={() => closable && onClose?.()}
                icon={Icons.X}
              />
            </div>
          </div>

          {!enableMinimalCards && (
            <>
              <h1 className="mb-1 line-clamp-3 max-h-[4.5rem] text-ellipsis break-words font-bold text-white">
                <span>{media.title}</span>
              </h1>
              <div className="media-info-container justify-content-center flex flex-wrap">
                <DotList className="text-xs" content={dotListContent} />
              </div>

              {!closable && (
                <div className="absolute bottom-0 translate-y-1 right-1">
                  <button
                    className="media-more-button p-2"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onShowDetails?.(media);
                    }}
                  >
                    <Icon
                      className="text-xs font-semibold text-type-secondary"
                      icon={Icons.ELLIPSIS}
                    />
                  </button>
                </div>
              )}
              {editable && closable && (
                <div className="absolute bottom-0 translate-y-1 right-1">
                  <button
                    className="media-more-button p-2"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEdit?.();
                    }}
                  >
                    <Icon
                      className="text-xs font-semibold text-type-secondary"
                      icon={Icons.EDIT}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </Flare.Child>
      </Flare.Base>
    </div>
  );
}

export function MediaCard(props: MediaCardProps) {
  const { media, onShowDetails, forceSkeleton } = props;
  const { showModal } = useOverlayStack();
  const enableDetailsModal = usePreferencesStore(
    (state) => state.enableDetailsModal,
  );

  const isReleased = useCallback(
    () => checkReleased(props.media),
    [props.media],
  );

  const canLink = props.linkable && !props.closable && isReleased();

  let link = canLink
    ? `/media/${encodeURIComponent(mediaItemToId(props.media))}`
    : "#";
  if (canLink && props.series) {
    if (props.series.season === 0 && !props.series.episodeId) {
      link += `/${encodeURIComponent(props.series.seasonId)}`;
    } else {
      link += `/${encodeURIComponent(
        props.series.seasonId,
      )}/${encodeURIComponent(props.series.episodeId)}`;
    }
  }

  const handleShowDetails = useCallback(async () => {
    if (onShowDetails) {
      onShowDetails(media);
      return;
    }

    // Show modal with data through overlayStack
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  }, [media, showModal, onShowDetails]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (enableDetailsModal && canLink) {
      e.preventDefault();
      handleShowDetails();
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handleShowDetails();
  };

  const content = (
    <MediaCardContent
      {...props}
      onShowDetails={handleShowDetails}
      forceSkeleton={forceSkeleton}
    />
  );

  if (!canLink) {
    return (
      <span
        className="relative"
        onClick={(e) => {
          if (e.defaultPrevented) {
            e.preventDefault();
          }
        }}
        onContextMenu={handleCardContextMenu}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={link}
      tabIndex={-1}
      className={classNames(
        "tabbable",
        props.closable ? "hover:cursor-default" : "",
      )}
      onClick={handleCardClick}
      onContextMenu={handleCardContextMenu}
    >
      {content}
    </Link>
  );
}
