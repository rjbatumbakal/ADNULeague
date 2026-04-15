import {
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  getSchedules,
  scheduleCategoryOrder,
} from "../../services/scheduleService";

const dayOptions = [1, 2, 3, 4, 5];

const DEPARTMENT_LOGOS = {
  ABBS: "/College Department Logos/ABBS_LOGO_withBG.png",
  ACHSS: "/College Department Logos/ACCHS_LOGO_withBG.png",
  ANSA: "/College Department Logos/ANSA_LOGO_withBG.png",
  AXI: "/College Department Logos/AXI_LOGO_withBG.png",
  COCS: "/College Department Logos/COCS_LOGO_withBG.png",
  COL: "/College Department Logos/COL_LOGO_withBG.png",
  JPIA: "/College Department Logos/JPIA_LOGO_withBG.png",
  STEP: "/College Department Logos/STEP_LOGO_withBG.png",
};

const TEAM_ALIASES = {
  ACHHS: "ACHSS",
  ACCHS: "ACHSS",
};

const bracketColors = {
  "Bracket A": "text-blue-700 bg-blue-50 border-blue-200",
  "Bracket B": "text-emerald-700 bg-emerald-50 border-emerald-200",
  Finals: "text-amber-700 bg-amber-50 border-amber-200",
};

function getScheduleHeadline(schedule) {
  return (
    schedule.teams_involved ||
    schedule.event_name ||
    schedule.event ||
    "Upcoming event"
  );
}

function getScheduleSubline(schedule) {
  if (
    schedule.teams_involved &&
    schedule.event_name &&
    schedule.teams_involved !== schedule.event_name
  ) {
    return schedule.event_name;
  }

  return schedule.category || "Official intramurals activity";
}

function normalizeTeamName(teamName) {
  return String(teamName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function getTeamLogo(teamName) {
  const normalizedTeam = normalizeTeamName(teamName);
  const mappedTeam = TEAM_ALIASES[normalizedTeam] ?? normalizedTeam;
  return DEPARTMENT_LOGOS[mappedTeam] ?? null;
}

function splitMatchupTeams(headline) {
  const normalizedHeadline = String(headline ?? "").trim();
  if (!normalizedHeadline) return null;

  const [teamA, teamB] = normalizedHeadline.split(/\s+vs\.?\s+/i);
  if (!teamA || !teamB) return null;

  return [teamA.trim(), teamB.trim()];
}

function normalizeBracketLabel(bracketValue) {
  const normalizedBracket = String(bracketValue ?? "").trim();

  if (!normalizedBracket) {
    return "";
  }

  if (/^finals?$/i.test(normalizedBracket)) {
    return "Finals";
  }

  if (/^bracket\s*a$/i.test(normalizedBracket) || /^a$/i.test(normalizedBracket)) {
    return "Bracket A";
  }

  if (/^bracket\s*b$/i.test(normalizedBracket) || /^b$/i.test(normalizedBracket)) {
    return "Bracket B";
  }

  return normalizedBracket;
}

function TeamNameWithLogo({ teamName }) {
  const logo = getTeamLogo(teamName);

  return (
    <span className="inline-flex min-w-fit max-w-full flex-1 items-start gap-1.5 rounded-2xl bg-theme-surface-soft px-2 py-1">
      {logo ? (
        <img
          src={logo}
          alt={`${teamName} logo`}
          className="h-5 w-5 shrink-0 rounded-full border border-theme-border-soft object-cover"
          loading="lazy"
        />
      ) : (
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-theme-border-soft bg-theme-bg text-[9px] font-black uppercase text-theme-text">
          {normalizeTeamName(teamName).slice(0, 3) || "TBA"}
        </span>
      )}
      <span className="min-w-fit whitespace-normal break-words text-[14px] leading-tight sm:text-sm">
        {teamName}
      </span>
    </span>
  );
}

function MatchupHeadline({ headline }) {
  const teams = splitMatchupTeams(headline);

  if (!teams) {
    return <>{headline}</>;
  }

  const [teamA, teamB] = teams;

  return (
    <span className="flex w-full min-w-0 flex-wrap items-start gap-1.5 sm:flex-nowrap sm:items-center">
      <TeamNameWithLogo teamName={teamA} />
      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-theme-muted">
        VS
      </span>
      <TeamNameWithLogo teamName={teamB} />
    </span>
  );
}

function ScheduleTable() {
  const { data, loading, error } = useAsyncData(getSchedules, []);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const schedulesByDay = useMemo(() => {
    const groupedByDay = new Map();

    data.forEach((schedule) => {
      const day = Number(schedule.day) || dayOptions[0];
      const category = schedule.category || "Special Events";
      const eventName =
        schedule.event ||
        schedule.event_name ||
        schedule.sport ||
        "General Activity";

      if (!groupedByDay.has(day)) {
        groupedByDay.set(day, new Map());
      }

      const groupedByCategory = groupedByDay.get(day);

      if (!groupedByCategory.has(category)) {
        groupedByCategory.set(category, new Map());
      }

      const groupedByEvent = groupedByCategory.get(category);

      if (!groupedByEvent.has(eventName)) {
        groupedByEvent.set(eventName, []);
      }

      groupedByEvent.get(eventName).push(schedule);
    });

    return dayOptions.map((day) => {
      const groupedByCategory = groupedByDay.get(day) ?? new Map();
      const orderedCategoryLabels = [
        ...scheduleCategoryOrder,
        ...Array.from(groupedByCategory.keys()).filter(
          (label) => !scheduleCategoryOrder.includes(label),
        ),
      ];
      const categories = orderedCategoryLabels
        .map((label) => {
          const groupedByEvent = groupedByCategory.get(label) ?? new Map();
          const events = Array.from(groupedByEvent.entries())
            .map(([name, rows]) => ({
              name,
              rows: rows.filter(Boolean),
            }))
            .filter((event) => event.rows.length > 0)
            .sort((firstEvent, secondEvent) =>
              firstEvent.name.localeCompare(secondEvent.name),
            );

          return {
            label,
            events,
            entryCount: events.reduce(
              (total, event) => total + event.rows.length,
              0,
            ),
          };
        })
        .sort((firstCategory, secondCategory) => {
          const firstHasEntries = firstCategory.entryCount > 0;
          const secondHasEntries = secondCategory.entryCount > 0;

          if (firstHasEntries === secondHasEntries) {
            return (
              orderedCategoryLabels.indexOf(firstCategory.label) -
              orderedCategoryLabels.indexOf(secondCategory.label)
            );
          }

          return firstHasEntries ? -1 : 1;
        });

      return {
        day,
        categories,
        totalEntries: categories.reduce(
          (total, category) => total + category.entryCount,
          0,
        ),
        activeCategoryCount: categories.length,
      };
    });
  }, [data]);

  const selectedDaySchedule =
    schedulesByDay.find((scheduleGroup) => scheduleGroup.day === selectedDay) ??
    schedulesByDay[0];

  useEffect(() => {
    if (!selectedDaySchedule) {
      setExpandedCategory(null);
      setSelectedEvent(null);
      return;
    }

    const matchedCategory = selectedDaySchedule.categories.find(
      (category) => category.label === expandedCategory,
    );

    if (!matchedCategory || !matchedCategory.events.length) {
      setExpandedCategory(null);
      setSelectedEvent(null);
      return;
    }

    const hasSelectedEvent = matchedCategory.events.some(
      (event) => event.name === selectedEvent,
    );

    if (!hasSelectedEvent) {
      setSelectedEvent(null);
    }
  }, [expandedCategory, selectedDaySchedule, selectedEvent]);

  function handleDaySelect(day) {
    setSelectedDay(day);
    setExpandedCategory(null);
    setSelectedEvent(null);
  }

  function handleCategorySelect(category) {
    if (!category.events.length) {
      return;
    }

    if (expandedCategory === category.label) {
      setExpandedCategory(null);
      setSelectedEvent(null);
      return;
    }

    setExpandedCategory(category.label);
    setSelectedEvent(null);
  }

  function handleEventSelect(eventName) {
    setSelectedEvent((currentEvent) =>
      currentEvent === eventName ? null : eventName,
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-theme-muted">Loading event schedule...</p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load the event schedule right now.
      </p>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
        No schedule entries have been published yet.
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-3xl border border-theme-border bg-theme-surface p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Browse Schedule
            </p>  
            <h3 className="mt-2 text-2xl font-bold text-theme-text">
              Select a Day, Category, and Event
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
              Filter by day and category to find specific match details and venue assignments.
            </p>
          </div>
        </div>

        <div className="mt-6 sm:hidden">
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {dayOptions.map((day) => {
              const daySchedule =
                schedulesByDay.find(
                  (scheduleGroup) => scheduleGroup.day === day,
                ) ?? null;
              const isActive = selectedDay === day;
              const activeCategories = daySchedule?.activeCategoryCount ?? 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={`relative min-h-[44px] min-w-[44px] shrink-0 snap-start overflow-hidden rounded-2xl border px-4 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 ${
                    isActive
                      ? "border-brand-gold bg-brand-gold-soft/25 shadow-panel"
                      : "border-theme-border-soft bg-theme-bg hover:border-brand-gold/40 hover:bg-theme-surface-hover"
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 ${
                      isActive ? "bg-brand-gold" : "bg-transparent"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-brand-gold text-white"
                          : "bg-theme-surface text-theme-muted"
                      }`}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <p
                        className={`text-[0.65rem] font-semibold uppercase tracking-[0.2em] ${
                          isActive ? "text-brand-gold" : "text-theme-muted"
                        }`}
                      >
                        Day
                      </p>
                      <p className="text-base font-black text-theme-text">
                        {day}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-theme-muted">
                    {activeCategories} categories
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 hidden grid-cols-1 gap-6 sm:grid sm:grid-cols-2 xl:grid-cols-5">
          {dayOptions.map((day) => {
            const daySchedule =
              schedulesByDay.find(
                (scheduleGroup) => scheduleGroup.day === day,
              ) ?? null;
            const isActive = selectedDay === day;
            const activeCategories = daySchedule?.activeCategoryCount ?? 0;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`group relative min-h-[44px] min-w-[44px] overflow-hidden rounded-2xl border px-4 py-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 ${
                  isActive
                    ? "border-brand-gold bg-brand-gold-soft/25 shadow-panel"
                    : "border-theme-border-soft bg-theme-bg hover:-translate-y-0.5 hover:border-brand-gold/40 hover:bg-theme-surface-hover"
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${
                    isActive ? "bg-brand-gold" : "bg-transparent"
                  }`}
                />
                <p
                  className={`text-[0.68rem] font-semibold uppercase tracking-[0.22em] ${
                    isActive ? "text-brand-gold" : "text-theme-muted"
                  }`}
                >
                  Schedule Day
                </p>
                <p className="mt-1 text-xl font-black text-theme-text">
                  Day {day}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {!selectedDaySchedule?.totalEntries ? (
        <div className="rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
          No schedules have been published for Day {selectedDay} yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {selectedDaySchedule.categories
            .filter((category) => category.events.length > 0)
            .map((category) => {
            const isExpanded = expandedCategory === category.label;

            return (
              <article
                key={`${selectedDay}-${category.label}`}
                className="overflow-hidden rounded-3xl border border-theme-border bg-theme-surface shadow-panel"
              >
                <button
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`flex min-h-[44px] min-w-[44px] w-full items-center justify-between gap-4 px-5 py-5 text-left transition sm:px-6 ${
                    category.events.length
                      ? "bg-[var(--brand-accent-gold)] text-[#ffffff] hover:opacity-95"
                      : "bg-theme-bg text-theme-muted"
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
                      Category
                    </p>
                    <h3 className="mt-2 text-xl font-bold">{category.label}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-theme-bg/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-#ffffff">
                      {category.events.length} events
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 transition ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-theme-border-soft bg-theme-bg px-4 py-4 sm:px-6">
                    <div className="space-y-3">
                      {category.events.map((eventGroup) => {
                        const isEventExpanded =
                          selectedEvent === eventGroup.name;

                        return (
                          <div
                            key={`${category.label}-${eventGroup.name}`}
                            className="overflow-hidden rounded-2xl border border-theme-border-soft bg-theme-surface"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleEventSelect(eventGroup.name)
                              }
                              className="flex min-h-[44px] min-w-[44px] w-full items-center justify-between gap-4 bg-[var(--brand-primary-blue)] px-5 py-4 text-left text-[#ffffff] transition hover:opacity-95"
                            >
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
                                  Event
                                </p>
                                <h4 className="mt-2 text-lg font-bold">
                                  {eventGroup.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-theme-bg/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#ffffff]">
                                  {eventGroup.rows.length} slots
                                </span>
                                <ChevronDown
                                  className={`h-5 w-5 transition ${
                                    isEventExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {isEventExpanded ? (
                              <div className="space-y-3 bg-theme-surface-soft p-4">
                                {eventGroup.rows.map((schedule, index) => (
                                  <article
                                    key={
                                      schedule.id ??
                                      `${eventGroup.name}-${index}`
                                    }
                                    className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-4"
                                  >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                                        <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[var(--brand-primary-blue)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#ffffff]">
                                          <Clock3 className="h-4 w-4" />
                                          {schedule.time || "TBA"}
                                        </div>

                                        <div className="min-w-0">
                                          <h5 className="text-base font-bold text-theme-text sm:text-lg">
                                            <MatchupHeadline
                                              headline={getScheduleHeadline(
                                                schedule,
                                              )}
                                            />
                                          </h5>

                                          {String(
                                            schedule.game_no ?? "",
                                          ).trim() ||
                                          String(
                                            schedule.bracket ?? "",
                                          ).trim() ? (
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-theme-muted">
                                              {String(
                                                schedule.game_no ?? "",
                                              ).trim() ? (
                                                <span>
                                                  <span className="font-semibold text-theme-text">
                                                    Game no.:
                                                  </span>{" "}
                                                  {schedule.game_no}
                                                </span>
                                              ) : null}
                                              {String(
                                                schedule.bracket ?? "",
                                              ).trim() ? (
                                                <span
                                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                                    bracketColors[
                                                      normalizeBracketLabel(
                                                        schedule.bracket,
                                                      )
                                                    ] ??
                                                    "text-indigo-700 bg-indigo-50 border-indigo-200"
                                                  }`}
                                                >
                                                  {normalizeBracketLabel(
                                                    schedule.bracket,
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>

                                      <div className="flex w-full items-center gap-2 rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3 text-sm text-theme-muted sm:inline-flex sm:w-fit">
                                        <MapPin className="h-4 w-4 text-brand-gold" />
                                        <span>
                                          <span className="font-semibold text-theme-text">
                                            Venue:
                                          </span>{" "}
                                          {schedule.venue ||
                                            "To be announced"}
                                        </span>
                                      </div>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ScheduleTable;
