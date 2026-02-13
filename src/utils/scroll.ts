/**
 * Scrolls an element into view with configurable options
 * @param selector - CSS selector string, Element, or null
 * @param options - Scroll options
 * @returns void (always returns, even if element not found)
 */
export function scrollToElement(
  selector: string | Element | null,
  options?: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number; // Additional offset in pixels (positive = scroll down more)
    delay?: number; // Delay in milliseconds before scrolling (useful when element needs to render)
  },
): void {
  const {
    behavior = "smooth",
    block = "start",
    inline = "nearest",
    offset = 0,
    delay = 0,
  } = options || {};

  const scroll = (): void => {
    let element: Element | null = null;

    if (selector === null) {
      return;
    }

    if (typeof selector === "string") {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (!element) {
      return;
    }

    if (offset === 0) {
      // Use native scrollIntoView when no offset is needed
      element.scrollIntoView({ behavior, block, inline });
      return;
    }

    // Custom scroll with offset
    const elementRect = element.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const offsetPosition = absoluteElementTop - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior,
    });
  };

  if (delay > 0) {
    setTimeout(() => {
      scroll();
    }, delay);
    return;
  }

  scroll();
}

/**
 * Scrolls to an element by hash (useful for hash navigation)
 * @param hash - Hash string (with or without #)
 * @param options - Scroll options
 * @returns void (always returns, even if element not found)
 */
export function scrollToHash(
  hash: string,
  options?: {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
    offset?: number;
    delay?: number;
  },
): void {
  const normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
  scrollToElement(normalizedHash, options);
}
