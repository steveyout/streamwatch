import classNames from "classnames";
import { t } from "i18next";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { WideContainer } from "@/components/layout/WideContainer";
import { useDiscoverStore } from "@/stores/discover";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/mediaTypes";

import { DiscoverNavigation } from "./components/DiscoverNavigation";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import { LazyMediaCarousel } from "./components/LazyMediaCarousel";
import { PersonalRecommendationsCarousel } from "./components/PersonalRecommendationsCarousel";
import { ScrollToTopButton } from "./components/ScrollToTopButton";

export function DiscoverContent() {
  const { selectedCategory, setSelectedCategory } = useDiscoverStore();
  const navigate = useNavigate();
  const { showModal } = useOverlayStack();
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const progressItems = useProgressStore((state) => state.items);

  // Only load data for the active tab
  const isMoviesTab = selectedCategory === "movies";
  const isTVShowsTab = selectedCategory === "tvshows";
  const isEditorPicksTab = selectedCategory === "editorpicks";

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as "movies" | "tvshows" | "editorpicks");
  };

  const handleShowDetails = async (media: MediaItem | FeaturedMedia) => {
    showModal("discover-details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  const movieProgressItems = Object.entries(progressItems || {}).filter(
    ([_, item]) => item.type === "movie",
  );
  const tvProgressItems = Object.entries(progressItems || {}).filter(
    ([_, item]) => item.type === "show",
  );

  // Render Movies content with lazy loading
  const renderMoviesContent = () => {
    const carousels = [];

    // For You - personal recommendations from watch history, progress, and bookmarks
    carousels.push(
      <PersonalRecommendationsCarousel
        key="movie-for-you"
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
      />,
    );

    // Movie Recommendations - only show if there are movie progress items
    if (movieProgressItems.length > 0) {
      carousels.push(
        <LazyMediaCarousel
          key="movie-recommendations"
          content={{ type: "recommendations" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          showRecommendations
          priority={carousels.length < 2} // First 2 carousels load immediately
        />,
      );
    }

    // Latest Releases
    carousels.push(
      <LazyMediaCarousel
        key="movie-latest"
        content={{ type: "latest", fallback: "nowPlaying" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // 4K Releases
    carousels.push(
      <LazyMediaCarousel
        key="movie-4k"
        content={{ type: "latest4k", fallback: "popular" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Top Rated
    carousels.push(
      <LazyMediaCarousel
        key="movie-top-rated"
        content={{ type: "topRated" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Provider Movies
    carousels.push(
      <LazyMediaCarousel
        key="movie-providers"
        content={{ type: "provider" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        showProviders
        moreContent
      />,
    );

    // Genre Movies
    carousels.push(
      <LazyMediaCarousel
        key="movie-genres"
        content={{ type: "genre" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        showGenres
        moreContent
      />,
    );

    return carousels;
  };

  // Render TV Shows content with lazy loading
  const renderTVShowsContent = () => {
    const carousels = [];

    // For You - personal recommendations from watch history, progress, and bookmarks
    carousels.push(
      <PersonalRecommendationsCarousel
        key="tv-for-you"
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
      />,
    );

    // TV Show Recommendations - only show if there are TV show progress items
    if (tvProgressItems.length > 0) {
      carousels.push(
        <LazyMediaCarousel
          key="tv-recommendations"
          content={{ type: "recommendations" }}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          showRecommendations
          priority={carousels.length < 2} // First 2 carousels load immediately
        />,
      );
    }

    // On Air
    carousels.push(
      <LazyMediaCarousel
        key="tv-on-air"
        content={{ type: "latesttv", fallback: "onTheAir" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Top Rated
    carousels.push(
      <LazyMediaCarousel
        key="tv-top-rated"
        content={{ type: "topRated" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Popular
    carousels.push(
      <LazyMediaCarousel
        key="tv-popular"
        content={{ type: "popular" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Provider TV Shows
    carousels.push(
      <LazyMediaCarousel
        key="tv-providers"
        content={{ type: "provider" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        showProviders
        moreContent
      />,
    );

    // Genre TV Shows
    carousels.push(
      <LazyMediaCarousel
        key="tv-genres"
        content={{ type: "genre" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        showGenres
        moreContent
      />,
    );

    return carousels;
  };

  // Render Editor Picks content
  const renderEditorPicksContent = () => {
    return (
      <>
        <LazyMediaCarousel
          content={{ type: "editorPicks" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          priority // Editor picks load immediately since they're the main content
        />
        <LazyMediaCarousel
          content={{ type: "editorPicks" }}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          priority // Editor picks load immediately since they're the main content
        />
      </>
    );
  };

  return (
    <div className="relative min-h-screen">
      <DiscoverNavigation
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <WideContainer ultraWide classNames="!px-0">
        {/* Movies Tab */}
        <div style={{ display: isMoviesTab ? "block" : "none" }}>
          {renderMoviesContent()}
        </div>

        {/* TV Shows Tab */}
        <div style={{ display: isTVShowsTab ? "block" : "none" }}>
          {renderTVShowsContent()}
        </div>

        {/* Editor Picks Tab */}
        <div style={{ display: isEditorPicksTab ? "block" : "none" }}>
          {renderEditorPicksContent()}
        </div>
      </WideContainer>

      {/* View All Button */}
      <div
        className={classNames(
          "flex justify-center mt-8 mb-12",
          isMoviesTab ? "block" : "hidden",
        )}
      >
        <Button theme="purple" onClick={() => navigate("/discover/all")}>
          {t("discover.viewLists")}
        </Button>
      </div>

      <ScrollToTopButton />

      {/* DetailsModal is now managed by overlayStack */}
    </div>
  );
}

export default DiscoverContent;
