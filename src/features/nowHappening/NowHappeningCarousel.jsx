import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getNowHappeningPosts } from "../../services/nowHappeningService";

const slideDurationMs = 5000;

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 72 : -72,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -72 : 72,
    opacity: 0,
  }),
};

function NowHappeningCarousel({ className = "", fillHeight = false }) {
  const loadPosts = useCallback(
    () => getNowHappeningPosts({ limit: 10, includeUnpublished: false }),
    [],
  );
  const { data: posts, loading, error } = useAsyncData(loadPosts, []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const progressPercentage = Math.min((elapsedMs / slideDurationMs) * 100, 100);

  useEffect(() => {
    if (!posts.length) {
      setActiveIndex(0);
      setElapsedMs(0);
      return;
    }

    setActiveIndex((currentIndex) => {
      if (currentIndex >= posts.length) {
        return 0;
      }

      return currentIndex;
    });
  }, [posts]);

  useEffect(() => {
    if (posts.length <= 1) {
      setElapsedMs(0);
      return undefined;
    }

    if (isPaused) {
      return undefined;
    }

    let animationFrameId;
    let lastTimestamp;

    function tick(timestamp) {
      if (lastTimestamp === undefined) {
        lastTimestamp = timestamp;
      }

      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      setElapsedMs((currentValue) => {
        const nextValue = currentValue + delta;

        if (nextValue >= slideDurationMs) {
          setDirection(1);
          setActiveIndex((currentIndex) => {
            if (!posts.length) {
              return 0;
            }

            return (currentIndex + 1) % posts.length;
          });
          return 0;
        }

        return nextValue;
      });

      animationFrameId = window.requestAnimationFrame(tick);
    }

    animationFrameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isPaused, posts.length]);

  useEffect(() => {
    setElapsedMs(0);
  }, [activeIndex]);

  const activePost = useMemo(
    () => posts[activeIndex] ?? null,
    [activeIndex, posts],
  );

  const captionLength = activePost?.caption?.trim().length ?? 0;
  const mediaContainerClassName = fillHeight
    ? captionLength <= 90
      ? "relative min-h-[18.5rem] flex-1 bg-theme-overlay"
      : captionLength <= 220
        ? "relative min-h-[17rem] flex-1 bg-theme-overlay"
        : captionLength <= 320
          ? "relative min-h-[15.75rem] flex-1 bg-theme-overlay"
          : "relative min-h-[14.75rem] flex-1 bg-theme-overlay"
    : "relative aspect-[16/9] bg-theme-overlay";

  function goToPreviousSlide() {
    setDirection(-1);
    setElapsedMs(0);
    setActiveIndex((currentIndex) => {
      if (!posts.length) {
        return 0;
      }

      return currentIndex === 0 ? posts.length - 1 : currentIndex - 1;
    });
  }

  function goToNextSlide() {
    setDirection(1);
    setElapsedMs(0);
    setActiveIndex((currentIndex) => {
      if (!posts.length) {
        return 0;
      }

      return (currentIndex + 1) % posts.length;
    });
  }

  if (loading) {
    return <p className="text-sm text-theme-muted">Loading live updates...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load the Now Happening posts right now.
      </p>
    );
  }

  if (!activePost) {
    return (
      <div className="rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
        There are no live updates yet.
      </div>
    );
  }

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border border-theme-border bg-theme-surface shadow-panel ${className}`.trim()}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={mediaContainerClassName}
      >
        {posts.length > 1 ? (
          <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3">
            {posts.map((post, index) => {
              const isCompleted = index < activeIndex;
              const isActive = index === activeIndex;

              return (
                <div
                  key={post.id ?? `progress-${index}`}
                  className="relative h-1 flex-1 overflow-hidden rounded-full bg-black/30"
                >
                  {isCompleted ? (
                    <span className="absolute inset-0 rounded-full bg-brand-neon" />
                  ) : null}
                  {isActive ? (
                    <motion.span
                      key={`${activeIndex}-${isPaused ? "paused" : "playing"}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-neon"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.12, ease: "linear" }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={activePost.id ?? activeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {activePost.image_url ? (
              <motion.img
                src={activePost.image_url}
                alt={activePost.caption || "Now Happening update"}
                className="h-full w-full object-cover"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.06] }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear",
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-theme-subtle">
                <ImageIcon className="h-12 w-12" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {posts.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPreviousSlide}
              className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-white/20 group-hover:opacity-100"
              aria-label="Previous post"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNextSlide}
              className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-white/20 group-hover:opacity-100"
              aria-label="Next post"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex flex-none flex-col border-t border-theme-border/70 bg-gradient-to-b from-white to-theme-surface px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444]/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-blue sm:text-xs sm:tracking-[0.24em]">
            Now Happening (ADNULS3 Live Updates)
          </p>
        </div>

        <div className="mt-3 lg:max-h-[11rem] lg:overflow-y-auto lg:pr-1">
          <p className="text-sm leading-6 text-theme-text sm:text-base sm:leading-7">
            {activePost.caption}
          </p>
        </div>
      </div>
    </article>
  );
}

export default NowHappeningCarousel;
