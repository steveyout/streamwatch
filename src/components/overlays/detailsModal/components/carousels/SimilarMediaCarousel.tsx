import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getMediaPoster, getRelatedMedia } from "@/backend/metadata/tmdb";
import { TMDBContentTypes } from "@/backend/metadata/types/tmdb";
import { MediaCard, MediaCardSkeleton } from "@/components/media/MediaCard";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CarouselNavButtons } from "@/pages/discover/components/CarouselNavButtons";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { MediaItem } from "@/utils/mediaTypes";

interface SimilarMediaCarouselProps {
  mediaId: string;
  mediaType: TMDBContentTypes;
}

export function SimilarMediaCarousel({
  mediaId,
  mediaType,
}: SimilarMediaCarouselProps) {
  const { t } = useTranslation();
  const { isMobile } = useIsMobile();
  const { showModal } = useOverlayStack();
  const [similarMedia, setSimilarMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({
    similar: null,
  });

  useEffect(() => {
    const loadSimilarMedia = async () => {
      setIsLoading(true);
      try {
        const results = await getRelatedMedia(mediaId, mediaType, 12);
        const mediaItems: MediaItem[] = results.map((result) => {
          const isMovie = "title" in result;
          return {
            id: result.id.toString(),
            title: isMovie ? result.title : result.name,
            poster: getMediaPoster(result.poster_path) || "/placeholder.png",
            type: mediaType === TMDBContentTypes.MOVIE ? "movie" : "show",
            year: isMovie
              ? result.release_date
                ? new Date(result.release_date).getFullYear()
                : 0
              : result.first_air_date
                ? new Date(result.first_air_date).getFullYear()
                : 0,
            release_date: isMovie
              ? result.release_date
                ? new Date(result.release_date)
                : undefined
              : result.first_air_date
                ? new Date(result.first_air_date)
                : undefined,
          };
        });
        setSimilarMedia(mediaItems);
      } catch (err) {
        console.error("Failed to load similar media:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSimilarMedia();
  }, [mediaId, mediaType]);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRefs.current.similar = carouselRef.current;
    }
  }, []);

  const handleShowDetails = (media: MediaItem) => {
    showModal("details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  if (!isLoading && similarMedia.length === 0) return null;

  return (
    <div className="space-y-4 pt-8">
      <h3 className="text-lg font-semibold text-white/90">
        {t("details.similar")}
      </h3>

      <div className="relative">
        {/* Carousel Container */}
        <div
          ref={carouselRef}
          className="grid grid-flow-col auto-cols-max gap-4 pt-0 overflow-x-scroll scrollbar-none rounded-xl overflow-y-hidden md:pl-8 md:pr-8"
          style={{
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
          }}
        >
          <div className="md:w-12" />

          {isLoading
            ? // Show skeleton cards while loading
              Array.from({ length: 12 }, (_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <MediaCardSkeleton />
                </div>
              ))
            : // Show actual media cards when loaded
              similarMedia.map((media) => (
                <div
                  key={media.id}
                  className="relative mt-4 group cursor-pointer user-select-none rounded-xl p-2 bg-transparent transition-colors duration-300 w-[10rem] md:w-[11.5rem] h-auto"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <MediaCard
                    media={media}
                    linkable
                    onShowDetails={handleShowDetails}
                  />
                </div>
              ))}

          <div className="md:w-12" />
        </div>

        {/* Navigation Buttons */}
        {!isMobile && (
          <CarouselNavButtons
            categorySlug="similar"
            carouselRefs={carouselRefs}
          />
        )}
      </div>
    </div>
  );
}
