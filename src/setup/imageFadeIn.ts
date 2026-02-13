/**
 * Global image fade-in handler
 * Automatically adds 'loaded' class to images when they finish loading
 */
export function initializeImageFadeIn() {
  // Handle images that are already loaded (cached)
  const handleExistingImages = () => {
    const images = document.querySelectorAll(`img:not(.no-fade):not([src=""]`);
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
        htmlImg.classList.add("loaded");
      }
    });
  };

  // Handle images that load after DOM is ready
  const handleImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img.tagName === "IMG") {
      img.classList.add("loaded");
    }
  };

  // Use event delegation for all images (including dynamically added ones)
  document.addEventListener("load", handleImageLoad, true);

  // Handle existing images on initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleExistingImages);
  } else {
    handleExistingImages();
  }

  // Also check periodically for images that might have loaded
  // This handles edge cases where the load event might not fire
  const checkInterval = setInterval(() => {
    const images = document.querySelectorAll(`img:not(.no-fade):not([src=""]`);
    if (images.length === 0) {
      clearInterval(checkInterval);
      return;
    }
    images.forEach((img) => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
        htmlImg.classList.add("loaded");
      }
    });
  }, 100);

  // Clean up interval after 10 seconds to avoid memory leaks
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
}
