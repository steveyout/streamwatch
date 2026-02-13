/**
 * Cloudflare Turnstile utility for handling invisible CAPTCHA verification
 */

/**
 * Loads the Cloudflare Turnstile script if not already loaded
 */
function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if Turnstile is already loaded
    if ((window as any).turnstile) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (
      document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]',
      )
    ) {
      // Wait for it to load
      const checkLoaded = () => {
        if ((window as any).turnstile) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile script"));

    document.head.appendChild(script);
  });
}

/**
 * Creates an invisible Turnstile widget and returns a promise that resolves with the token
 * @param sitekey The Turnstile site key
 * @param timeout Optional timeout in milliseconds (default: 30000)
 * @returns Promise that resolves with the Turnstile token
 */
export async function getTurnstileToken(
  sitekey: string,
  timeout: number = 30000,
): Promise<string> {
  // Only run in browser environment
  if (typeof window === "undefined") {
    throw new Error("Turnstile verification requires browser environment");
  }

  try {
    // Load Turnstile script
    await loadTurnstileScript();

    // Create a hidden container for the Turnstile widget
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "1px";
    container.style.height = "1px";
    container.style.overflow = "hidden";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";

    document.body.appendChild(container);

    return new Promise<string>((resolve, reject) => {
      let widgetId: string | undefined;
      let timeoutId: any;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (widgetId && (window as any).turnstile) {
          try {
            (window as any).turnstile.remove(widgetId);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };

      // Set up timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Turnstile verification timed out"));
      }, timeout);

      try {
        // Render the Turnstile widget
        widgetId = (window as any).turnstile.render(container, {
          sitekey,
          callback: (token: string) => {
            cleanup();
            resolve(token);
          },
          "error-callback": (error: string) => {
            cleanup();
            reject(new Error(`Turnstile error: ${error}`));
          },
          "expired-callback": () => {
            cleanup();
            reject(new Error("Turnstile token expired"));
          },
        });
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to render Turnstile widget: ${error}`));
      }
    });
  } catch (error) {
    throw new Error(`Turnstile verification failed: ${error}`);
  }
}

/**
 * Validates a Turnstile token by making a request to Cloudflare's verification endpoint
 * @param token The Turnstile token to validate
 * @param secret The Turnstile secret key (server-side only)
 * @returns Promise that resolves with validation result
 */
export async function validateTurnstileToken(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
      },
    );

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("Turnstile validation error:", error);
    return false;
  }
}
