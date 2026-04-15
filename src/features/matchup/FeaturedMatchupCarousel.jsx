import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getFeaturedMatchupEntries } from "../../services/featuredMatchupService";
import { getTeamLogo } from "./matchupConfig";

const slideDurationMs = 5500;

function parseGameOrder(value) {
  if (value === null || value === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  const parsedNumber = Number.parseInt(String(value).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(parsedNumber)
    ? Number.POSITIVE_INFINITY
    : parsedNumber;
}

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
    scale: 0.92,
  }),
};

function MatchupTeam({ teamName, align = "center" }) {
  const logo = getTeamLogo(teamName);
  const alignmentClassName =
    align === "left"
      ? "items-start text-left"
      : align === "right"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <div className={`flex min-w-0 flex-col ${alignmentClassName}`}>
      {logo ? (
        <img
          src={logo}
          alt={`${teamName} logo`}
          className="aspect-square h-14 w-14 rounded-2xl object-cover shadow-sm sm:h-16 sm:w-16 lg:h-24 lg:w-24"
          loading="lazy"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-theme-border-soft bg-theme-bg text-[10px] font-semibold uppercase tracking-[0.2em] text-theme-subtle sm:h-16 sm:w-16 sm:text-xs lg:h-24 lg:w-24">
          {String(teamName ?? "TBD").slice(0, 3)}
        </div>
      )}
      <h3 className="mt-2 text-sm font-black uppercase leading-tight text-theme-text sm:mt-3 sm:text-lg lg:text-3xl">
        {teamName}
      </h3>
    </div>
  );
}

function FeaturedMatchupCarousel() {
  const loadEntries = useCallback(
    () => getFeaturedMatchupEntries({ limit: 10, includeUnpublished: false }),
    [],
  );
  const { data: entries, loading, error } = useAsyncData(loadEntries, []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const containerRef = useRef(null);
  const swipePower = (offset, velocity) => Math.abs(offset) * velocity;
  const swipeThreshold = 7000;
  const isPaused = isHoverPaused || isDragging || !isInView;

  useEffect(() => {
    const containerElement = containerRef.current;

    if (!containerElement) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible =
          entry.isIntersecting && entry.intersectionRatio >= 0.1;
        setIsInView(isVisible);
      },
      {
        threshold: [0, 0.1],
      },
    );

    observer.observe(containerElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!entries.length) {
      setActiveIndex(0);
      setElapsedMs(0);
      return;
    }

    setActiveIndex((currentIndex) => {
      if (currentIndex >= entries.length) {
        return 0;
      }

      return currentIndex;
    });
  }, [entries]);

  useEffect(() => {
    if (entries.length <= 1) {
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
            if (!entries.length) {
              return 0;
            }

            return (currentIndex + 1) % entries.length;
          });
          return 0;
        }

        return nextValue;
      });

      animationFrameId = window.requestAnimationFrame(tick);
    }

    animationFrameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [entries.length, isPaused]);

  useEffect(() => {
    setElapsedMs(0);
  }, [activeIndex]);

  const activeEntry = useMemo(
    () => entries[activeIndex] ?? null,
    [activeIndex, entries],
  );
  const activeEntryMatches = useMemo(() => {
    if (!activeEntry) return [];
    if (!Array.isArray(activeEntry.selected_matches)) return [];

    return activeEntry.selected_matches
      .map((match, index) => ({ match, index }))
      .sort((a, b) => {
        const gameOrderA = parseGameOrder(
          a.match.game_number ?? a.match.game_label,
        );
        const gameOrderB = parseGameOrder(
          b.match.game_number ?? b.match.game_label,
        );

        if (gameOrderA !== gameOrderB) {
          return gameOrderA - gameOrderB;
        }

        const displayOrderA = Number(a.match.display_order);
        const displayOrderB = Number(b.match.display_order);

        if (
          Number.isFinite(displayOrderA) &&
          Number.isFinite(displayOrderB) &&
          displayOrderA !== displayOrderB
        ) {
          return displayOrderA - displayOrderB;
        }

        return a.index - b.index;
      })
      .map(({ match }) => match);
  }, [activeEntry]);

  function goToPreviousSlide() {
    setDirection(-1);
    setElapsedMs(0);
    setActiveIndex((currentIndex) => {
      if (!entries.length) {
        return 0;
      }

      return currentIndex === 0 ? entries.length - 1 : currentIndex - 1;
    });
  }

  function goToNextSlide() {
    setDirection(1);
    setElapsedMs(0);
    setActiveIndex((currentIndex) => {
      if (!entries.length) {
        return 0;
      }

      return (currentIndex + 1) % entries.length;
    });
  }

  function handleDragStart() {
    if (entries.length <= 1) {
      return;
    }

    setIsDragging(true);
  }

  function handleDragEnd(_, info) {
    if (entries.length <= 1) {
      setIsDragging(false);
      return;
    }

    setIsDragging(false);

    const swipe = swipePower(info.offset.x, info.velocity.x);

    if (swipe < -swipeThreshold) {
      goToNextSlide();
      return;
    }

    if (swipe > swipeThreshold) {
      goToPreviousSlide();
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-theme-muted">Loading upcoming games...</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load the upcoming games carousel right now.
      </p>
    );
  }

  if (!activeEntry) {
    return (
      <div className="rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
        No upcoming featured games have been published yet.
      </div>
    );
  }

  return (
    <article
      ref={containerRef}
      className="group relative w-full overflow-hidden rounded-3xl border border-theme-border bg-theme-surface shadow-panel"
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
    >
      <div className="relative min-h-[16.75rem] bg-gradient-to-br from-theme-surface via-theme-surface to-theme-surface-soft p-3 sm:min-h-[18rem] sm:p-4 md:p-5 md:pt-6 lg:min-h-[18.5rem] lg:p-6">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={activeEntry.id ?? activeIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 28, mass: 1 },
              opacity: { duration: 0.35, ease: "easeOut" },
              scale: { duration: 0.35, ease: "easeOut" },
            }}
            drag={entries.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            dragMomentum={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[0.3fr_0.7fr] md:items-center md:gap-5 lg:gap-6"
          >
            <div className="w-full md:max-w-[21rem] md:justify-self-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-gold sm:text-base lg:text-lg">
                Upcoming Games
              </p>
              <h2 className="mt-1.5 text-xl font-black text-theme-text sm:mt-2 sm:text-2xl lg:text-3xl">
                {activeEntry.sport_label}
              </h2>
              <p className="mt-2 inline-flex rounded-full bg-brand-gold-soft px-3 py-1.5 text-sm font-semibold text-brand-gold sm:mt-3 sm:px-4 sm:py-2 sm:text-base">
                {activeEntry.timing_label}
              </p>

              <div className="mt-4 grid grid-cols-3 items-stretch gap-2 sm:mt-5 sm:gap-3">
                <div className="flex h-full flex-col rounded-2xl border border-theme-border-soft bg-theme-bg px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-theme-subtle sm:gap-2 sm:text-[10px] sm:tracking-[0.2em]">
                    <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Day
                  </div>
                  <p className="mt-1 text-sm font-bold leading-tight text-theme-text sm:mt-1.5 sm:text-base">
                    {activeEntry.day_label}
                  </p>
                </div>
                <div className="flex h-full flex-col rounded-2xl border border-theme-border-soft bg-theme-bg px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-theme-subtle sm:gap-2 sm:text-[10px] sm:tracking-[0.2em]">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Venue
                  </div>
                  <p className="mt-1 text-sm font-bold leading-tight text-theme-text sm:mt-1.5 sm:text-base">
                    {activeEntry.venue}
                  </p>
                </div>
                <div className="flex h-full flex-col rounded-2xl border border-theme-border-soft bg-theme-bg px-3 py-2 sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-theme-subtle sm:gap-2 sm:text-[10px] sm:tracking-[0.2em]">
                    
                    Category
                  </div>
                  <p className="mt-1 text-sm font-bold leading-tight text-theme-text sm:mt-1.5 sm:text-base">
                    {activeEntry.category_label}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-theme-border-soft bg-theme-surface-soft p-3 sm:rounded-[2rem] sm:p-4 md:flex md:h-full md:flex-col md:justify-center lg:p-5">
              <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-theme-subtle sm:text-xs sm:tracking-[0.24em]">
                <span>Featured Matchup</span>
                <span>Next up</span>
              </div>

              {activeEntryMatches.length ? (
                <div className="mt-4 space-y-2 sm:mt-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2 md:space-y-0">
                  {activeEntryMatches.map((match, index) => {
                    const teamA =
                      match.team_a_id || match.home_team_name || "TBA";
                    const teamB =
                      match.team_b_id || match.away_team_name || "TBA";
                    const teamALogo = getTeamLogo(teamA);
                    const teamBLogo = getTeamLogo(teamB);

                    return (
                      <div
                        key={`${activeEntry.id}-slide-match-${index}`}
                        className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-theme-border-soft bg-theme-bg px-2.5 py-2"
                      >
                        <span className="rounded-full bg-theme-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                          {match.bracket_label || "A"}
                        </span>
                        <span className="rounded-full bg-theme-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                          {match.game_label || `G${index + 1}`}
                        </span>

                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-theme-text">
                          {teamALogo ? (
                            <img
                              src={teamALogo}
                              alt={`${teamA} logo`}
                              className="h-6 w-6 rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-theme-border-soft text-[9px] font-semibold text-theme-subtle">
                              {String(teamA).slice(0, 3)}
                            </span>
                          )}
                          <span className="truncate font-semibold uppercase">
                            {teamA}
                          </span>
                          <span className="text-theme-subtle">vs</span>
                          {teamBLogo ? (
                            <img
                              src={teamBLogo}
                              alt={`${teamB} logo`}
                              className="h-6 w-6 rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-theme-border-soft text-[9px] font-semibold text-theme-subtle">
                              {String(teamB).slice(0, 3)}
                            </span>
                          )}
                          <span className="truncate font-semibold uppercase">
                            {teamB}
                          </span>
                          <span className="ml-auto text-[10px] uppercase tracking-wide text-theme-subtle">
                            {match.timing_label || "TBA"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:mt-5 sm:gap-4">
                  <MatchupTeam
                    teamName={activeEntry.home_team_name}
                    align="center"
                  />
                  <div className="mx-auto inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-brand-gold px-3 py-1.5 text-white font-black uppercase tracking-[0.22em] text-theme-contrast sm:min-h-[44px] sm:min-w-[44px] sm:px-5 sm:py-2 sm:text-sm sm:tracking-[0.28em]">
                    VS
                  </div>
                  <MatchupTeam
                    teamName={activeEntry.away_team_name}
                    align="center"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {entries.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPreviousSlide}
              className="absolute left-4 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-theme-border-soft bg-theme-surface text-theme-text shadow-sm transition-all duration-300 hover:bg-theme-surface-hover md:inline-flex md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous upcoming game"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToNextSlide}
              className="absolute right-4 top-1/2 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-theme-border-soft bg-theme-surface text-theme-text shadow-sm transition-all duration-300 hover:bg-theme-surface-hover md:inline-flex md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next upcoming game"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

export default FeaturedMatchupCarousel;
