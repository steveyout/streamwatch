import React from "react";

import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { MediaItem } from "@/utils/mediaTypes";

import { MediaCarousel } from "./MediaCarousel";
import { DiscoverContentType } from "../types/discover";

interface ContentConfig {
  type: DiscoverContentType;
  fallback?: DiscoverContentType;
}

interface LazyMediaCarouselProps {
  content: ContentConfig;
  isTVShow: boolean;
  carouselRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  onShowDetails?: (media: MediaItem) => void;
  moreContent?: boolean;
  moreLink?: string;
  showProviders?: boolean;
  showGenres?: boolean;
  showRecommendations?: boolean;
  priority?: boolean; // For carousels that should load immediately (e.g., first few)
}

export function LazyMediaCarousel({
  content,
  isTVShow,
  carouselRefs,
  onShowDetails,
  moreContent,
  moreLink,
  showProviders = false,
  showGenres = false,
  showRecommendations = false,
  priority = false,
}: LazyMediaCarouselProps) {
  const { ref, hasIntersected } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: "50px", // Start loading when carousel is 50px from viewport
  });

  // Always render if priority is true (for top carousels)
  // Otherwise, only render when intersected
  const shouldRender = priority || hasIntersected;

  return (
    <div ref={ref}>
      {shouldRender ? (
        <MediaCarousel
          content={content}
          isTVShow={isTVShow}
          carouselRefs={carouselRefs}
          onShowDetails={onShowDetails}
          moreContent={moreContent}
          moreLink={moreLink}
          showProviders={showProviders}
          showGenres={showGenres}
          showRecommendations={showRecommendations}
        />
      ) : (
        // Placeholder with similar height to prevent layout shift
        <div className="h-[20rem]" />
      )}
    </div>
  );
}
