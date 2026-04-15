import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Medal, Search, Trophy, X } from "lucide-react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { isSupabaseConfigured, supabase } from "../../services/supabaseClient";
import {
  buildEventStandings,
  buildOverallStandings,
  formatRankLabel,
  getRankingReferenceData,
  groupEventsByCategory,
} from "../../services/rankingService";

function createInitialData() {
  return {
    departments: [],
    events: [],
    eventResults: [],
  };
}

const departmentLogoFilenames = {
  ABBS: "ABBS_LOGO_withBG.png",
  ACHSS: "ACCHS_LOGO_withBG.png",
  ANSA: "ANSA_LOGO_withBG.png",
  AXI: "AXI_LOGO_withBG.png",
  COCS: "COCS_LOGO_withBG.png",
  COL: "COL_LOGO_withBG.png",
  JPIA: "JPIA_LOGO_withBG.png",
  STEP: "STEP_LOGO_withBG.png",
};

const departmentColors = {
  COCS: "bg-slate-900",
  ABBS: "bg-red-800",
  STEP: "bg-gray-400",
  JPIA: "bg-yellow-400",
  COL: "bg-purple-700",
  ACHSS: "bg-pink-500",
  AXI: "bg-orange-500",
  ANSA: "bg-blue-800",
};

const lightDepartmentKeys = new Set(["STEP", "JPIA"]);

const overallPlaceBadgeConfig = [
  {
    rank: 1,
    label: "1ST",
    tileClassName:
      "bg-gradient-to-br from-[#FDE68A] via-[#FACC15] to-[#B45309] shadow-md",
    icon: "medal",
  },
  {
    rank: 2,
    label: "2ND",
    tileClassName:
      "bg-gradient-to-br from-[#E2E8F0] via-[#94A3B8] to-[#64748B] shadow-md",
    icon: "medal",
  },
  {
    rank: 3,
    label: "3RD",
    tileClassName:
      "bg-gradient-to-br from-[#FED7AA] via-[#FB923C] to-[#9A3412] shadow-md",
    icon: "medal",
  },
  {
    rank: 4,
    label: "4TH",
    tileClassName: "shadow-sm",
    icon: "rank",
  },
  {
    rank: 5,
    label: "5TH",
    tileClassName: "shadow-sm",
    icon: "rank",
  },
  {
    rank: 6,
    label: "6TH",
    tileClassName: "shadow-sm",
    icon: "rank",
  },
  {
    rank: 7,
    label: "7TH",
    tileClassName: "shadow-sm",
    icon: "rank",
  },
  {
    rank: 8,
    label: "8TH",
    tileClassName: "shadow-sm",
    icon: "rank",
  },
];

function normalizeDepartmentKey(acronym) {
  return String(acronym ?? "")
    .trim()
    .toUpperCase();
}

function getLogoMonogram(acronym) {
  return String(acronym ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

function getDepartmentLogoUrl(acronym) {
  const filename = departmentLogoFilenames[normalizeDepartmentKey(acronym)];
  if (!filename) return "";
  return `/College Department Logos/${encodeURIComponent(filename)}`;
}

function getDepartmentTheme(acronym) {
  const key = normalizeDepartmentKey(acronym);
  const isLightBackground = lightDepartmentKeys.has(key);
  return {
    backgroundClassName: departmentColors[key] ?? "bg-slate-800",
    textClassName: isLightBackground ? "text-slate-900" : "text-white",
    secondaryTextClassName: isLightBackground
      ? "text-slate-800"
      : "text-white/85",
    tertiaryTextClassName: isLightBackground
      ? "text-slate-700"
      : "text-white/70",
    borderClassName: isLightBackground
      ? "border-slate-900/10"
      : "border-white/10",
    badgeClassName: isLightBackground
      ? "bg-white/80 text-slate-900"
      : "bg-white/15 text-white",
    logoFallbackClassName: isLightBackground
      ? "bg-slate-900/10 text-slate-900"
      : "bg-white/10 text-white",
  };
}

function normalizeFilterValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getSelectedDepartmentMatchValues(
  selectedDepartment,
  selectedDepartmentId,
) {
  const values = [
    selectedDepartmentId,
    typeof selectedDepartment === "string"
      ? selectedDepartment
      : selectedDepartment?.id,
    typeof selectedDepartment === "string"
      ? selectedDepartment
      : selectedDepartment?.acronym,
    typeof selectedDepartment === "string"
      ? selectedDepartment
      : selectedDepartment?.name,
  ]
    .map(normalizeFilterValue)
    .filter(Boolean);

  return Array.from(new Set(values));
}

function getStandingDepartmentMatchValues(standing) {
  const values = [
    standing?.department_id,
    standing?.department?.id,
    standing?.departmentId,
    standing?.department_acronym,
    standing?.department?.acronym,
    standing?.acronym,
    standing?.department_name,
    standing?.department?.name,
    standing?.departmentName,
    typeof standing?.department === "string" ? standing.department : "",
  ]
    .map(normalizeFilterValue)
    .filter(Boolean);

  return Array.from(new Set(values));
}

function matchesSelectedDepartment(
  standing,
  selectedDepartment,
  selectedDepartmentId,
) {
  const selectedValues = getSelectedDepartmentMatchValues(
    selectedDepartment,
    selectedDepartmentId,
  );

  if (!selectedValues.length) {
    return true;
  }

  const standingValues = getStandingDepartmentMatchValues(standing);

  return selectedValues.some((value) => standingValues.includes(value));
}

function Rankings() {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [eventSearchInput, setEventSearchInput] = useState("");
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [isTallyHidden, setIsTallyHidden] = useState(false);
  const eventDropdownRef = useRef(null);
  const departmentDropdownRef = useRef(null);
  const loadRankingsData = useCallback(() => getRankingReferenceData(), []);
  const { data, loading, error } = useAsyncData(
    loadRankingsData,
    createInitialData(),
  );

  const groupedEvents = useMemo(
    () => groupEventsByCategory(data.events),
    [data.events],
  );


  const filteredEvents = useMemo(() => {
    if (!eventSearchInput.trim()) return data.events;
    const query = eventSearchInput.toLowerCase();
    return data.events.filter((event) =>
      event.name.toLowerCase().includes(query),
    );
  }, [data.events, eventSearchInput]);

  const selectedDepartment = useMemo(() => {
    if (selectedDepartmentId) {
      return (
        data.departments.find((dept) => dept.id === selectedDepartmentId) ??
        null
      );
    }
    return null;
  }, [data.departments, selectedDepartmentId]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId) {
      return data.events.find((event) => event.id === selectedEventId) ?? null;
    }
    return null;
  }, [data.events, selectedEventId]);
  const overallStandings = useMemo(
    () => buildOverallStandings(data.departments, data.eventResults),
    [data.departments, data.eventResults],
  );
  const eventStandings = useMemo(
    () =>
      selectedEventId
        ? buildEventStandings(data.departments, data.eventResults, selectedEventId)
        : [],
    [data.departments, data.eventResults, selectedEventId],
  );

  const filteredOverallStandings = useMemo(() => {
    let standings = [...overallStandings];

    if (selectedDepartmentId) {
      return standings.filter(
        (standing) => standing.id === selectedDepartmentId,
      );
    }

    return standings;
  }, [overallStandings, selectedDepartmentId]);

  const filteredEventStandings = useMemo(() => {
    if (!Array.isArray(eventStandings)) return [];
    if (selectedDepartmentId || selectedDepartment) {
      return eventStandings
        .filter((standing) =>
          matchesSelectedDepartment(
            standing,
            selectedDepartment,
            selectedDepartmentId,
          ),
        )
        .filter((standing) => !standing?.defaulted);
    }
    return eventStandings;
  }, [eventStandings, selectedDepartment, selectedDepartmentId]);

  const hasEventResults = useMemo(() => {
    return Array.isArray(eventStandings) && eventStandings.length > 0;
  }, [eventStandings]);

  const isDepartmentInEvent = useMemo(() => {
    if ((!selectedDepartmentId && !selectedDepartment) || !hasEventResults) {
      return false;
    }

    return eventStandings.some((standing) =>
      matchesSelectedDepartment(
        standing,
        selectedDepartment,
        selectedDepartmentId,
      ) && !standing?.defaulted,
    );
  }, [
    selectedDepartment,
    selectedDepartmentId,
    hasEventResults,
    eventStandings,
  ]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!eventDropdownRef.current?.contains(event.target)) {
        setIsEventDropdownOpen(false);
      }
      if (!departmentDropdownRef.current?.contains(event.target)) {
        setIsDepartmentDropdownOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsEventDropdownOpen(false);
        setIsDepartmentDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialTallyHidden() {
      if (!isSupabaseConfigured) {
        return;
      }

      const { data: settings, error } = await supabase
        .from("app_settings")
        .select("is_tally_hidden")
        .eq("id", 1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.warn("Failed to fetch app_settings.is_tally_hidden:", error.message);
        return;
      }

      setIsTallyHidden(Boolean(settings?.is_tally_hidden));
    }

    fetchInitialTallyHidden();

    if (!isSupabaseConfigured || typeof supabase.channel !== "function") {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel("public:app_settings_tally_hidden")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_settings",
          filter: "id=eq.1",
        },
        (payload) => {
          setIsTallyHidden(Boolean(payload?.new?.is_tally_hidden));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-theme-muted">Loading rankings...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load rankings right now.
      </p>
    );
  }

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-panel sm:p-8">
        <div className="w-full">
          <div ref={departmentDropdownRef} className="relative">
            {/*
            <button
              type="button"
              onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
              className="w-full min-h-[44px] rounded-2xl border border-theme-border bg-white px-4 py-3 text-left text-base text-theme-text outline-none transition focus:border-brand-blue hover:border-brand-blue/50 flex items-center justify-between"
            >
              {selectedDepartment ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {getDepartmentLogoUrl(selectedDepartment.acronym) ? (
                      <img
                        src={getDepartmentLogoUrl(selectedDepartment.acronym)}
                        alt={selectedDepartment.acronym}
                        className="h-full w-full rounded-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200">
                        <span className="text-[10px] font-black text-slate-700">
                          {getLogoMonogram(selectedDepartment.acronym)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="font-bold">{selectedDepartment.acronym}</span>
                  <span className="text-theme-muted">- {selectedDepartment.name}</span>
                </div>
              ) : (
                "All Departments"
              )}
              <ChevronDown className={`h-5 w-5 text-theme-muted transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            */}
            {isDepartmentDropdownOpen && (
              <div className="absolute top-full z-10 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-theme-border-soft bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartmentId("");
                    setIsDepartmentDropdownOpen(false);
                  }}
                  className="w-full min-h-[44px] px-4 py-3 text-left text-base font-semibold text-theme-text transition hover:bg-blue-50"
                >
                  All Departments
                </button>
                {data.departments.map((dept) => {
                  const logoUrl = getDepartmentLogoUrl(dept.acronym);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => {
                        setSelectedDepartmentId(dept.id);
                        setIsDepartmentDropdownOpen(false);
                      }}
                      className="w-full min-h-[44px] px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={dept.acronym}
                              className="h-full w-full rounded-full object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200">
                              <span className="text-xs font-black text-slate-700">
                                {getLogoMonogram(dept.acronym)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{dept.acronym}</p>
                          <p className="text-sm text-slate-500">{dept.name}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div ref={eventDropdownRef} className="relative mx-auto w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
            <input
              type="text"
              placeholder="Search events..."
              value={eventSearchInput}
              onChange={(e) => {
                if (selectedEventId) {
                  setSelectedEventId("");
                }
                setEventSearchInput(e.target.value);
                setIsEventDropdownOpen(true);
              }}
              onFocus={() => setIsEventDropdownOpen(true)}
              className="w-full min-h-[44px] rounded-2xl border border-theme-border-soft bg-theme-bg py-3 pl-11 pr-10 text-base text-theme-text outline-none transition placeholder:text-theme-subtle focus:border-brand-gold"
            />
            {selectedEvent && (
              <button
                onClick={() => {
                  setSelectedEventId("");
                  setEventSearchInput("");
                  setIsEventDropdownOpen(false);
                }}
                className="absolute right-2 top-1/2 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full p-1 text-theme-muted transition hover:bg-theme-surface-hover hover:text-theme-text"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isEventDropdownOpen && !selectedEvent && (
              <div className="absolute top-full z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-theme-border-soft bg-theme-surface shadow-lg">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setEventSearchInput(event.name || "");
                        setIsEventDropdownOpen(false);
                      }}
                      className="w-full min-h-[44px] px-4 py-3 text-left text-base text-theme-text transition hover:bg-theme-surface-hover"
                    >
                      <p className="font-semibold">{event.name}</p>
                      <p className="mt-0.5 text-xs text-theme-subtle">
                        {event.category}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-theme-muted">
                    No events found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedEvent ? (
        <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
              {selectedEvent.category}
            </p>
            <h3 className="mt-2 text-xl font-bold text-theme-text sm:text-2xl">
              {selectedEvent.name}
            </h3>
          </div>

          {!filteredEventStandings || filteredEventStandings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-theme-border-soft bg-slate-50/50 px-6 py-10 text-center dark:bg-slate-800/50">
              {!hasEventResults ? (
                <>
                  <p className="text-base font-semibold text-theme-text">
                    No results recorded yet.
                  </p>
                  <p className="mt-2 text-sm text-theme-muted">
                    Scores for this event have not been published. Please check
                    back later.
                  </p>
                </>
              ) : selectedDepartment && !isDepartmentInEvent ? (
                <>
                  <p className="text-base font-semibold text-theme-text">
                    {selectedDepartment.acronym} has no recorded placement in{" "}
                    {selectedEvent.name}.
                  </p>
                  <p className="mt-2 text-sm text-theme-muted">
                    This department did not participate or place in this event.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-theme-text">
                    No results found.
                  </p>
                  <p className="mt-2 text-sm text-theme-muted">
                    Try adjusting your search filters.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEventStandings.map((standing) => {
                const theme = getDepartmentTheme(standing.department_acronym);
                const logoUrl = getDepartmentLogoUrl(
                  standing.department_acronym,
                );
                const isDefaultRank =
                  Boolean(standing?.defaulted) ||
                  ((!Number.isFinite(Number(standing?.rank)) ||
                    Number(standing?.rank) <= 0) &&
                    (standing?.points_awarded === null ||
                      standing?.points_awarded === undefined ||
                      Number(standing?.points_awarded) <= 0));
                const displayTheme = isDefaultRank
                  ? {
                      backgroundClassName:
                        "bg-slate-100/90 dark:bg-slate-900/70",
                      borderClassName:
                        "border-slate-200 dark:border-slate-800",
                      textClassName: "text-slate-600 dark:text-slate-300",
                      secondaryTextClassName:
                        "text-slate-500 dark:text-slate-400",
                      logoFallbackClassName:
                        "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    }
                  : theme;
                const rankBadgeColors = {
                  1: "bg-gradient-to-r from-[#FDE68A] via-[#FACC15] to-[#B45309] text-white",
                  2: "bg-gradient-to-r from-[#E2E8F0] via-[#94A3B8] to-[#64748B] text-white",
                  3: "bg-gradient-to-r from-[#FED7AA] via-[#FB923C] to-[#9A3412] text-white",
                };
                const rankBadgeClass =
                  isDefaultRank
                    ? "border border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    : rankBadgeColors[standing.rank] ||
                  "bg-theme-surface-soft text-theme-text";

                return (
                  <div
                    key={standing?.id || `standing-${standing?.department_id}`}
                    className={`flex items-center justify-between gap-3 rounded-[1.5rem] border px-4 py-3.5 ${isDefaultRank ? "shadow-none" : "shadow-[0_16px_32px_rgba(15,23,42,0.14)]"} ${displayTheme.backgroundClassName} ${displayTheme.borderClassName}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-[0_10px_22px_rgba(15,23,42,0.18)] ${rankBadgeClass}`}
                      >
                        {isDefaultRank ? "D" : formatRankLabel(standing?.rank)}
                      </div>
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full`}
                      >
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${standing?.department_name || "Department"} logo`}
                            className={`h-full w-full rounded-full object-contain ${isDefaultRank ? "grayscale opacity-60" : "animate-spin-y"}`}
                            style={
                              isDefaultRank
                                ? undefined
                                : { transformStyle: "preserve-3d" }
                            }
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center rounded-full ${displayTheme.logoFallbackClassName}`}
                          >
                            <span
                              className={`text-[11px] font-black uppercase tracking-[0.14em] ${displayTheme.textClassName}`}
                            >
                              {getLogoMonogram(
                                standing?.department_acronym || "",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-black uppercase tracking-[0.18em] sm:text-base ${displayTheme.textClassName}`}
                        >
                          {standing?.department_acronym || "N/A"}
                        </p>
                        <p
                          className={`mt-1 hidden truncate text-[11px] font-semibold uppercase tracking-[0.16em] sm:block ${displayTheme.secondaryTextClassName}`}
                        >
                          {standing?.department_name || "Unknown Department"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[2rem] border border-theme-border-soft bg-gradient-to-br from-white via-[#F8FAFC] to-[#F1F5F9] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Overall Tally
            </p>
            <h3 className="mt-2 text-xl font-bold text-theme-text sm:text-2xl">
              Championship Standings
            </h3>
          </div>

          {!filteredOverallStandings ||
          filteredOverallStandings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-theme-border-soft bg-slate-50/50 px-6 py-10 text-center dark:bg-slate-800/50">
              <p className="text-base font-semibold text-theme-text">
                {selectedDepartment
                  ? "No results for this department."
                  : "No results available yet."}
              </p>
              <p className="mt-2 text-sm text-theme-muted">
                {selectedDepartment
                  ? "This department hasn't participated in any events yet."
                  : "Check back later once event results have been published."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOverallStandings.map((standing) => {
                const theme = getDepartmentTheme(standing.department_acronym);
                const logoUrl = getDepartmentLogoUrl(
                  standing.department_acronym,
                );
                const anonymizedTeamName = `TEAM ${String.fromCharCode(
                  65 + filteredOverallStandings.findIndex(
                    (candidate) => candidate.department_id === standing.department_id,
                  ),
                )}`;
                const displayTheme = isTallyHidden
                  ? {
                      backgroundClassName: "bg-slate-600",
                      borderClassName: "border-white/15",
                      textClassName: "text-white",
                      secondaryTextClassName: "text-slate-200/70",
                      tertiaryTextClassName: "text-slate-200/70",
                      badgeClassName: "bg-white/15 text-white",
                      logoFallbackClassName: "bg-white/10 text-white",
                    }
                  : theme;

                return (
                  <div
                    key={standing?.id || `overall-${standing?.department_id}`}
                    className={`flex flex-col gap-3 rounded-[1.5rem] border px-4 py-4 shadow-[0_16px_32px_rgba(15,23,42,0.14)] sm:flex-row sm:items-center sm:justify-between ${displayTheme.backgroundClassName} ${displayTheme.borderClassName}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full`}
                      >
                        {isTallyHidden ? (
                          <div className="flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-white/10">
                            <span className="text-lg font-black text-white/80">?</span>
                          </div>
                        ) : logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${standing?.department_name || "Department"} logo`}
                            className="h-full w-full animate-spin-y rounded-full object-contain"
                            style={{ transformStyle: "preserve-3d" }}
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center rounded-full ${theme.logoFallbackClassName}`}
                          >
                            <span
                              className={`text-xs font-black uppercase tracking-[0.14em] ${theme.textClassName}`}
                            >
                              {getLogoMonogram(
                                standing?.department_acronym || "",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-base font-black uppercase tracking-[0.18em] sm:text-lg ${displayTheme.textClassName}`}
                        >
                          {isTallyHidden
                            ? anonymizedTeamName
                            : standing?.department_acronym || "N/A"}
                        </p>
                        <p
                          className={`mt-1 truncate text-xs font-semibold uppercase tracking-[0.16em] sm:text-sm ${displayTheme.secondaryTextClassName}`}
                        >
                          {isTallyHidden
                            ? "OFFICIAL RANKINGS HIDDEN"
                            : standing?.department_name || "Unknown Department"}
                        </p>
                      </div>
                    </div>

                    <div className="-mx-1 overflow-x-auto sm:mx-0 sm:overflow-visible">
                      <div className="flex min-w-max flex-nowrap items-center gap-1.5 px-1 pb-1 sm:min-w-0 sm:flex-wrap sm:gap-2 sm:px-0 sm:pb-0">
                        {overallPlaceBadgeConfig.map((placeBadge) => (
                          <div
                            key={`${standing?.department_id}-${placeBadge.rank}`}
                            className="flex shrink-0 items-start gap-1.5"
                          >
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
                                placeBadge.icon === "medal"
                                  ? placeBadge.tileClassName
                                  : `${placeBadge.tileClassName} ${displayTheme.badgeClassName}`
                              }`}
                            >
                              {placeBadge.icon === "medal" ? (
                                <Medal className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" />
                              ) : (
                                <span
                                  className={`text-[10px] font-black sm:text-xs ${displayTheme.textClassName}`}
                                >
                                  {placeBadge.rank}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-center justify-start pt-[1px] text-center">
                              <p
                                className={`text-base font-black leading-none sm:text-lg ${displayTheme.textClassName}`}
                              >
                                {standing.place_counts[placeBadge.rank] || 0}
                              </p>
                              <p
                                className={`mt-0.5 text-[8px] font-semibold uppercase tracking-wider sm:text-[9px] ${displayTheme.tertiaryTextClassName}`}
                              >
                                {placeBadge.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Rankings;
