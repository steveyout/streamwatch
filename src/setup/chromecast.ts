/// <reference types="chromecast-caf-sender" />

const CHROMECAST_SENDER_SDK =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

const callbacks: ((available: boolean) => void)[] = [];
let _available: boolean | null = null;
let _initialized = false;

function init(available: boolean) {
  _available = available;
  callbacks.forEach((cb) => cb(available));
  callbacks.length = 0;
}

export function isChromecastAvailable(cb: (available: boolean) => void) {
  if (_available !== null) {
    setTimeout(() => cb(_available!), 0);
    return;
  }
  callbacks.push(cb);
}

export function initializeChromecast() {
  if (_initialized) return;
  _initialized = true;

  if (!(window as any).__onGCastApiAvailable) {
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      try {
        if (isAvailable && (window as any).cast?.framework) {
          const context = (
            window as any
          ).cast.framework.CastContext.getInstance();
          const options: any = {
            receiverApplicationId: (window as any).chrome?.cast?.media
              ?.DEFAULT_MEDIA_RECEIVER_APP_ID,
          };

          // Only set autoJoinPolicy if AutoJoinPolicy exists
          if ((window as any).cast.framework.AutoJoinPolicy?.ORIGIN_SCOPED) {
            options.autoJoinPolicy = (
              window as any
            ).cast.framework.AutoJoinPolicy.ORIGIN_SCOPED;
          }

          context.setOptions(options);
        }
      } catch (e) {
        console.warn("Chromecast initialization error:", e);
      } finally {
        init(!!isAvailable);
      }
    };
  }

  if (!document.getElementById("chromecast-script")) {
    const script = document.createElement("script");
    script.src = CHROMECAST_SENDER_SDK;
    script.id = "chromecast-script";
    script.onerror = () => console.warn("Failed to load Chromecast SDK");
    document.body.appendChild(script);
  }
}
