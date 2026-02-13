import classNames from "classnames";
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Menu } from "@/components/player/internals/ContextMenu";
import { Input } from "@/components/player/internals/ContextMenu/Input";
import { Link } from "@/components/player/internals/ContextMenu/Links";
import {
  captionIsVisible,
  makeQueId,
  parseSubtitles,
  sanitize,
} from "@/components/player/utils/captions";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { usePlayerStore } from "@/stores/player/store";
import { useSubtitleStore } from "@/stores/subtitles";
import { durationExceedsHour, formatSeconds } from "@/utils/formatSeconds";

import { wordOverrides } from "../../Player";

export function TranscriptView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const display = usePlayerStore((s) => s.display);
  const srtData = usePlayerStore((s) => s.caption.selected?.srtData);
  const language = usePlayerStore((s) => s.caption.selected?.language);
  const delay = useSubtitleStore((s) => s.delay);
  const { duration: timeDuration, time } = usePlayerStore((s) => s.progress);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const parsedCaptions = useMemo(
    () => (srtData ? parseSubtitles(srtData, language) : []),
    [srtData, language],
  );

  const showHours = useMemo(() => {
    return durationExceedsHour(timeDuration);
  }, [timeDuration]);

  const transcriptItems = useMemo(
    () =>
      parsedCaptions.map(({ start, end, content: raw }, i) => {
        const delayedStart = start / 1000 + delay;
        const delayedEnd = end / 1000 + delay;

        const textWithNewlines = (raw || "")
          .split(" ")
          .map((word) => wordOverrides[word] ?? word)
          .join(" ")
          .replaceAll(/ i'/g, " I'")
          .replaceAll(/\r?\n/g, " ");

        return {
          key: makeQueId(i, start, end),
          startMs: start,
          endMs: end,
          start: delayedStart,
          end: delayedEnd,
          raw: textWithNewlines,
        };
      }),
    [parsedCaptions, delay],
  );

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return transcriptItems;
    const fuse = new Fuse(transcriptItems, {
      includeScore: true,
      isCaseSensitive: false,
      shouldSort: false,
      threshold: 0.2,
      keys: ["raw"],
    });
    return fuse.search(searchQuery).map((r) => r.item);
  }, [transcriptItems, searchQuery]);

  // Determine currently visible caption to highlight
  const { activeKey, nextKey } = useMemo(() => {
    if (parsedCaptions.length === 0)
      return {
        activeKey: null as string | null,
        nextKey: null as string | null,
      };

    const visibleIdx = parsedCaptions.findIndex(({ start, end }) =>
      captionIsVisible(start, end, delay, time),
    );

    // Next upcoming caption (first with start > now)
    const startsSec = parsedCaptions.map((c) => c.start / 1000 + delay);
    const nextIdx = startsSec.findIndex((s) => s > time);

    const key =
      visibleIdx !== -1
        ? makeQueId(
            visibleIdx,
            parsedCaptions[visibleIdx]!.start,
            parsedCaptions[visibleIdx]!.end,
          )
        : null; // Show nothing during gaps

    let nextKeyLocal: string | null = null;
    if (nextIdx !== -1) {
      const n = parsedCaptions[nextIdx]!;
      nextKeyLocal = makeQueId(nextIdx, n.start, n.end);
    }

    return { activeKey: key, nextKey: nextKeyLocal };
  }, [parsedCaptions, delay, time]);

  const scrollTargetKey = useMemo(() => {
    if (searchQuery.trim()) {
      const nextFiltered = filteredItems.find((it) => it.start > time);
      if (nextFiltered) return nextFiltered.key;

      const hasActive = filteredItems.some((it) => it.key === activeKey);
      if (hasActive) return activeKey;
      return null;
    }
    return nextKey ?? activeKey;
  }, [filteredItems, searchQuery, time, nextKey, activeKey]);

  const checkScrollPosition = () => {
    const container = carouselRef.current;
    if (!container) return;

    setIsAtTop(container.scrollTop <= 0);
    setIsAtBottom(
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight,
      ) < 2,
    );
  };

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition(); // Check initial position

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
    };
  }, []);

  // Autoscroll with delay to prevent clashing with menu animation
  const [didFirstScroll, setDidFirstScroll] = useState(false);
  useEffect(() => {
    if (!scrollTargetKey) return;
    const scrollToStablePoint = (target: HTMLElement) => {
      const container = carouselRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const containerHeight = container.clientHeight || 288; // 18rem = 288px
      const desiredOffsetFromTop = Math.floor(containerHeight * 0.6); // half of the container height

      // Current absolute position of target center within container's scroll space
      const targetCenterAbs =
        container.scrollTop +
        (targetRect.top - containerRect.top) +
        targetRect.height / 2;

      // Desired scrollTop so that the target center sits at desired offset
      let nextScrollTop = targetCenterAbs - desiredOffsetFromTop;

      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - containerHeight,
      );
      nextScrollTop = Math.max(0, Math.min(nextScrollTop, maxScrollTop));

      container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
    };

    const doScroll = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-que-id="${scrollTargetKey}"]`,
      );
      if (el) scrollToStablePoint(el);
    };

    if (!didFirstScroll) {
      const timeout = setTimeout(() => {
        doScroll();
        setDidFirstScroll(true);
      }, 100);
      return () => clearTimeout(timeout);
    }
    doScroll();
  }, [scrollTargetKey, didFirstScroll]);

  const handleSeek = (seconds: number) => {
    display?.setTime(seconds);
  };

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/captions")}>
        {t("player.menus.subtitles.transcriptChoice")}
      </Menu.BackLink>
      <Menu.Section>
        <Input value={searchQuery} onInput={setSearchQuery} />
      </Menu.Section>
      <div
        ref={carouselRef}
        className={classNames(
          "max-h-[18rem] overflow-y-auto",
          "vertical-carousel-container",
          {
            "hide-top-gradient": isAtTop,
            "hide-bottom-gradient": isAtBottom,
          },
        )}
      >
        <div className="flex flex-col gap-1 pb-4">
          {filteredItems.map((item) => {
            const html = sanitize(item.raw.replaceAll(/\r?\n/g, "<br />"), {
              ALLOWED_TAGS: ["c", "b", "i", "u", "span", "ruby", "rt", "br"],
              ADD_TAGS: ["v", "lang"],
              ALLOWED_ATTR: ["title", "lang"],
            });

            const isActive = activeKey === item.key;

            return (
              <div key={item.key} data-que-id={item.key}>
                <Link
                  onClick={() => handleSeek(item.start)}
                  clickable
                  className="items-start"
                  active={isActive}
                >
                  <span className="mr-3 flex-none w-[4.5rem] h-[1.75rem] flex items-center justify-center px-0 leading-tight rounded-md bg-video-context-light bg-opacity-20 text-video-context-type-main font-normal whitespace-nowrap overflow-hidden text-sm">
                    {item.start < 0 || item.start > timeDuration
                      ? "N/A"
                      : formatSeconds(item.start, showHours)}
                  </span>
                  <span
                    className={
                      isActive
                        ? "flex-1 text-white font-semibold text-sm"
                        : "flex-1 text-video-context-type-main text-sm"
                    }
                  >
                    <span
                      dangerouslySetInnerHTML={{ __html: html }} // eslint-disable-line react/no-danger
                      dir="ltr"
                    />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
