import { Helmet } from "react-helmet-async";

import { useOverlayStack } from "@/stores/interface/overlayStack";

import { SubPageLayout } from "../layouts/SubPageLayout";
import { FeaturedCarousel } from "./components/FeaturedCarousel";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import DiscoverContent from "./discoverContent";
import { PageTitle } from "../parts/util/PageTitle";

export function Discover() {
  const { showModal } = useOverlayStack();

  const handleShowDetails = (media: FeaturedMedia) => {
    showModal("discover-details", {
      id: Number(media.id),
      type: media.type,
    });
  };

  return (
    <SubPageLayout>
      <Helmet>
        {/* Hide scrollbar */}
        <style type="text/css">{`
            html, body {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
          `}</style>
      </Helmet>

      <PageTitle subpage k="global.pages.discover" />

      <div className="!mt-[-170px]">
        {/* Featured Carousel */}
        <FeaturedCarousel onShowDetails={handleShowDetails} />
      </div>

      {/* Main Content */}
      <div className="relative z-20 px-4 md:px-10">
        <DiscoverContent />
      </div>
    </SubPageLayout>
  );
}
