import {
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Plus,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  createSchedule,
  deleteSchedule,
  getScheduleActivityLogs,
  getSchedules,
  getScheduleTeams,
  scheduleCategoryOrder,
  updateSchedule,
} from "../../services/scheduleService";

const dayOptions = [1, 2, 3, 4, 5];

function formatDateTime(value) {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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

function createInitialFormState(overrides = {}) {
  return {
    day: Number(overrides.day) || dayOptions[0],
    matchup_mode: overrides.matchup_mode || "single",
    category: overrides.category || "",
    event: overrides.event || "",
    home_team: overrides.home_team || "",
    away_team: overrides.away_team || "",
    teams_involved: overrides.teams_involved || "",
    time: overrides.time || "",
    venue: overrides.venue || "",
    game_no: overrides.game_no || "",
    bracket: overrides.bracket || "",
  };
}

function splitTeamsInvolved(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return { homeTeam: "", awayTeam: "" };
  }

  const [homeTeam, awayTeam] = normalizedValue.split(/\s+vs\.?\s+/i);

  return {
    homeTeam: String(homeTeam ?? "").trim(),
    awayTeam: String(awayTeam ?? "").trim(),
  };
}

function buildTeamsInvolved(homeTeam, awayTeam) {
  const homeValue = String(homeTeam ?? "").trim();
  const awayValue = String(awayTeam ?? "").trim();

  if (homeValue && awayValue) {
    return `${homeValue} vs ${awayValue}`;
  }

  return homeValue || awayValue || "";
}

function buildRoundRobinPairings(teams) {
  const pairings = [];

  for (let homeIndex = 0; homeIndex < teams.length; homeIndex += 1) {
    for (
      let awayIndex = homeIndex + 1;
      awayIndex < teams.length;
      awayIndex += 1
    ) {
      pairings.push({
        homeTeam: teams[homeIndex],
        awayTeam: teams[awayIndex],
      });
    }
  }

  return pairings;
}

function normalizeLabel(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function SearchableTeamSelect({
  id,
  label,
  value,
  options,
  disabledOption,
  onSelect,
  placeholder,
  required,
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const matchedOption = options.find((option) => option.value === value);
    setQuery(matchedOption?.label ?? value ?? "");
  }, [options, value]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeLabel(query);

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const searchBlob = normalizeLabel(
        [option.label, option.acronym, option.name].filter(Boolean).join(" "),
      );

      return searchBlob.includes(normalizedQuery);
    });
  }, [options, query]);

  return (
    <div ref={wrapperRef} className="relative">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-theme-muted"
      >
        {label}
      </label>
      <input
        id={id}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          onSelect("");
        }}
        className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
        placeholder={placeholder}
        autoComplete="off"
        required={required}
      />

      {isOpen ? (
        <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-theme-border-soft bg-theme-surface p-1 shadow-panel">
          {filteredOptions.length ? (
            filteredOptions.map((option) => {
              const isDisabled =
                disabledOption && option.value === disabledOption;

              return (
                <button
                  key={`${id}-${option.value}`}
                  type="button"
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }

                    onSelect(option.value);
                    setQuery(option.label);
                    setIsOpen(false);
                  }}
                  disabled={isDisabled}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    isDisabled
                      ? "cursor-not-allowed text-theme-subtle opacity-60"
                      : "text-theme-text hover:bg-theme-surface-hover"
                  }`}
                >
                  <span>{option.label}</span>
                  {isDisabled ? (
                    <span className="text-[10px] uppercase tracking-wide">
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-theme-muted">
              No teams found.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildSchedulesByDay(schedules) {
  const groupedByDay = new Map();

  schedules.forEach((schedule) => {
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
    const categories = scheduleCategoryOrder.map((label) => {
      const groupedByEvent = groupedByCategory.get(label) ?? new Map();
      const events = Array.from(groupedByEvent.entries())
        .map(([name, rows]) => ({
          name,
          rows,
        }))
        .sort((firstEvent, secondEvent) =>
          firstEvent.name.localeCompare(secondEvent.name),
        );

      return {
        label,
        events,
        entryCount: events.reduce(
          (total, eventGroup) => total + eventGroup.rows.length,
          0,
        ),
      };
    });

    return {
      day,
      categories,
      totalEntries: categories.reduce(
        (total, category) => total + category.entryCount,
        0,
      ),
      activeCategoryCount: categories.filter(
        (category) => category.events.length,
      ).length,
    };
  });
}

function AdminScheduleManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const [formState, setFormState] = useState(createInitialFormState);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastAutoCategory, setLastAutoCategory] = useState("");
  const editorSectionRef = useRef(null);

  const scrollEditorIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        editorSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }, []);

  const loadSchedules = useCallback(() => getSchedules(), []);
  const loadActivityLogs = useCallback(() => getScheduleActivityLogs(80), []);
  const loadTeams = useCallback(() => getScheduleTeams(), []);
  const {
    data: schedules,
    loading: schedulesLoading,
    error: schedulesError,
    refetch: refetchSchedules,
  } = useAsyncData(loadSchedules, []);
  const {
    data: activityLogs,
    loading: activityLogsLoading,
    error: activityLogsError,
    refetch: refetchActivityLogs,
  } = useAsyncData(loadActivityLogs, []);
  const {
    data: teamOptions,
    loading: teamOptionsLoading,
    error: teamOptionsError,
  } = useAsyncData(loadTeams, []);

  const teamsByValue = useMemo(
    () =>
      new Map(teamOptions.map((teamOption) => [teamOption.value, teamOption])),
    [teamOptions],
  );
  const availableTeamValues = useMemo(
    () =>
      Array.from(
        new Set(
          teamOptions
            .map((teamOption) => String(teamOption.value ?? "").trim())
            .filter(Boolean),
        ),
      ),
    [teamOptions],
  );
  const roundRobinPairings = useMemo(
    () => buildRoundRobinPairings(availableTeamValues),
    [availableTeamValues],
  );

  const schedulesByDay = useMemo(
    () => buildSchedulesByDay(schedules),
    [schedules],
  );
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
      (eventGroup) => eventGroup.name === selectedEvent,
    );

    if (!hasSelectedEvent) {
      setSelectedEvent(null);
    }
  }, [expandedCategory, selectedDaySchedule, selectedEvent]);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    scrollEditorIntoView();
  }, [isEditorOpen, editingSchedule, scrollEditorIntoView]);

  useEffect(() => {
    const homeCategory = teamsByValue.get(formState.home_team)?.category ?? "";
    const awayCategory = teamsByValue.get(formState.away_team)?.category ?? "";
    const detectedCategory = homeCategory || awayCategory;

    if (!detectedCategory) {
      return;
    }

    const matchedCategory = scheduleCategoryOrder.find(
      (categoryLabel) =>
        normalizeLabel(categoryLabel) === normalizeLabel(detectedCategory),
    );

    if (!matchedCategory) {
      return;
    }

    setFormState((currentState) => {
      if (currentState.category && currentState.category !== lastAutoCategory) {
        return currentState;
      }

      if (currentState.category === matchedCategory) {
        return currentState;
      }

      return {
        ...currentState,
        category: matchedCategory,
      };
    });
    setLastAutoCategory(matchedCategory);
  }, [
    formState.away_team,
    formState.home_team,
    lastAutoCategory,
    teamsByValue,
  ]);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    if (name === "category") {
      setLastAutoCategory("");
    }

    if (name === "matchup_mode") {
      setFormState((currentState) => ({
        ...currentState,
        matchup_mode: value,
        home_team: value === "single" ? currentState.home_team : "",
        away_team: value === "single" ? currentState.away_team : "",
        teams_involved: value === "single" ? currentState.teams_involved : "",
      }));
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      [name]: name === "day" ? Number(value) : value,
    }));
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingSchedule(null);
    setFormState(createInitialFormState({ day: selectedDay }));
    setFormError("");
    setLastAutoCategory("");
  }

  function openCreateForm(overrides = {}) {
    setEditingSchedule(null);
    setIsEditorOpen(true);
    setFormState(
      createInitialFormState({
        day: selectedDay,
        ...overrides,
      }),
    );
    setFormError("");
    setFormStatus("");
    setLastAutoCategory("");
    scrollEditorIntoView();
  }

  function handleEditClick(schedule) {
    setEditingSchedule(schedule);
    setIsEditorOpen(true);
    setSelectedDay(Number(schedule.day) || dayOptions[0]);
    setExpandedCategory(schedule.category || "Special Events");
    setSelectedEvent(
      schedule.event || schedule.event_name || "General Activity",
    );
    const parsedTeams = splitTeamsInvolved(schedule.teams_involved);

    setFormState({
      day: Number(schedule.day) || dayOptions[0],
      category: schedule.category || "",
      event: schedule.event || schedule.event_name || "",
      home_team: parsedTeams.homeTeam,
      away_team: parsedTeams.awayTeam,
      teams_involved: schedule.teams_involved || "",
      time: schedule.time || "",
      venue: schedule.venue || "",
      game_no: schedule.game_no || "",
      bracket: schedule.bracket || "",
    });
    setFormError("");
    setFormStatus("");
    setLastAutoCategory("");
    scrollEditorIntoView();
  }

  function handleTeamSelection(fieldName, selectedTeam) {
    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [fieldName]: selectedTeam,
      };

      if (
        nextState.home_team &&
        nextState.away_team &&
        nextState.home_team === nextState.away_team
      ) {
        if (fieldName === "home_team") {
          nextState.away_team = "";
        } else {
          nextState.home_team = "";
        }
      }

      nextState.teams_involved = buildTeamsInvolved(
        nextState.home_team,
        nextState.away_team,
      );

      return nextState;
    });
  }

  async function refreshAdminData() {
    await Promise.all([refetchSchedules(), refetchActivityLogs()]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const isRoundRobinCreate =
      !editingSchedule && formState.matchup_mode === "all_departments";
    const isAllTeamsSingleCreate =
      !editingSchedule && formState.matchup_mode === "all_teams_single";

    const teamsInvolved = isAllTeamsSingleCreate
      ? "All Departments"
      : buildTeamsInvolved(formState.home_team, formState.away_team);

    if (
      !isRoundRobinCreate &&
      !isAllTeamsSingleCreate &&
      (!formState.home_team || !formState.away_team)
    ) {
      setFormError("Select both Home Team and Away Team.");
      return;
    }

    if (
      !isRoundRobinCreate &&
      !isAllTeamsSingleCreate &&
      formState.home_team === formState.away_team
    ) {
      setFormError("Home Team and Away Team cannot be the same.");
      return;
    }

    if (isRoundRobinCreate && availableTeamValues.length < 2) {
      setFormError(
        "At least two departments are needed for all-departments round-robin scheduling.",
      );
      return;
    }

    if (isAllTeamsSingleCreate && availableTeamValues.length === 0) {
      setFormError("No departments found to mark this match as all teams.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormStatus("");

    const payload = {
      ...formState,
      teams_involved: teamsInvolved,
    };

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule, {
          ...payload,
          actor,
        });
        setFormStatus("Schedule updated successfully.");
      } else if (isRoundRobinCreate) {
        const gameNoPrefix = String(formState.game_no ?? "").trim();

        for (let index = 0; index < roundRobinPairings.length; index += 1) {
          const pairing = roundRobinPairings[index];
          const generatedGameNumber = gameNoPrefix
            ? `${gameNoPrefix} ${index + 1}`
            : `Game ${index + 1}`;

          await createSchedule({
            ...payload,
            home_team: pairing.homeTeam,
            away_team: pairing.awayTeam,
            teams_involved: buildTeamsInvolved(
              pairing.homeTeam,
              pairing.awayTeam,
            ),
            game_no: generatedGameNumber,
            actor,
          });
        }

        setFormStatus(
          `Created ${roundRobinPairings.length} schedule entries for all department matchups.`,
        );
      } else {
        await createSchedule({
          ...payload,
          actor,
        });
        setFormStatus("Schedule created successfully.");
      }

      await refreshAdminData();
      setEditingSchedule(null);
      setIsEditorOpen(false);
      setFormState(createInitialFormState({ day: formState.day }));
      setSelectedDay(Number(formState.day) || dayOptions[0]);
    } catch (error) {
      setFormError(error.message || "Unable to save the schedule entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClick(schedule) {
    const shouldDelete = window.confirm(
      `Delete schedule for Day ${schedule.day}: "${
        schedule.teams_involved || schedule.event || schedule.event_name
      }"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setFormError("");
    setFormStatus("");

    try {
      await deleteSchedule(schedule, actor);

      if (editingSchedule?.id === schedule.id) {
        closeEditor();
      }

      setFormStatus("Schedule deleted successfully.");
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to delete the schedule entry.");
    }
  }

  function handleDaySelect(day) {
    setSelectedDay(day);
    setExpandedCategory(null);
    setSelectedEvent(null);

    if (!editingSchedule) {
      setFormState((currentState) => ({
        ...currentState,
        day,
      }));
    }
  }

  function handleCategorySelect(category) {
    if (!category.events.length) {
      setExpandedCategory(category.label);
      setSelectedEvent(null);
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

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Schedule Manager
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Manage published schedules from Day 1 to Day 5
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Use the same dropdown browsing layout as the public schedule page, but
          manage each schedule slot directly from here.
        </p>
      </div>

      {formError ? (
        <div className="mt-6 rounded-2xl border border-[#F43F5E4D] bg-[#F43F5E1A] px-4 py-3 text-sm text-[#FDA4AF]">
          {formError}
        </div>
      ) : null}
      {formStatus ? (
        <div className="mt-6 rounded-2xl border border-[#10B9814D] bg-[#10B9811A] px-4 py-3 text-sm text-[#86EFAC]">
          {formStatus}
        </div>
      ) : null}

      <div className="mt-8 rounded-3xl border border-theme-border bg-theme-surface p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Editable Schedule Browser
            </p>
            <h3 className="mt-2 text-2xl font-bold text-theme-text">
              Select a day, category, and event
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
              Expand a category to reveal its events, then open an event to
              edit, delete, or add schedule slots for that day.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                <CalendarDays className="h-4 w-4" />
                Active Day
              </div>
              <p className="mt-2 text-lg font-bold text-theme-text">
                Day {selectedDay}
              </p>
            </div>
            <div className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                <Trophy className="h-4 w-4" />
                Published Items
              </div>
              <p className="mt-2 text-lg font-bold text-theme-text">
                {selectedDaySchedule?.totalEntries ?? 0}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => openCreateForm({ day: selectedDay })}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand-gold px-4 py-2 text-white font-semibold leading-none text-theme-contrast transition hover:opacity-90 sm:w-auto whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
              <button
                type="button"
                onClick={refreshAdminData}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase leading-none tracking-wide text-theme-text transition hover:bg-theme-surface-hover sm:w-auto whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dayOptions.map((day) => {
            const daySchedule =
              schedulesByDay.find(
                (scheduleGroup) => scheduleGroup.day === day,
              ) ?? null;
            const isActive = selectedDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDaySelect(day)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-brand-gold bg-brand-gold-soft/20 shadow-panel"
                    : "border-theme-border-soft bg-theme-bg hover:bg-theme-surface-hover"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
                  Competition Day
                </p>
                <p className="mt-2 text-lg font-bold text-theme-text">
                  Day {day}
                </p>
                <p className="mt-2 text-sm text-theme-muted">
                  {daySchedule?.totalEntries ?? 0} schedule entries
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {isEditorOpen ? (
        <div
          ref={editorSectionRef}
          className="mt-6 rounded-3xl border border-theme-border bg-theme-surface p-5 shadow-panel sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
                {editingSchedule
                  ? "Edit published slot"
                  : "Create schedule entry"}
              </p>
              <h3 className="mt-2 text-2xl font-bold text-theme-text">
                {editingSchedule
                  ? "Update this schedule slot"
                  : "Add a new schedule slot"}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                editingSchedule
                  ? "border-[#F43F5E66] bg-[#F43F5E14] text-[#DC2626] hover:bg-[#F43F5E22]"
                  : "border-theme-border-soft text-theme-text hover:bg-theme-surface-hover"
              }`}
            >
              Cancel
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="schedule-day"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Day
                </label>
                <select
                  id="schedule-day"
                  name="day"
                  value={formState.day}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                >
                  {dayOptions.map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="schedule-category"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Category
                </label>
                <select
                  id="schedule-category"
                  name="category"
                  value={formState.category}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                >
                  <option value="">Auto-detect category</option>
                  {scheduleCategoryOrder.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="schedule-event"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Event
              </label>
              <input
                id="schedule-event"
                name="event"
                type="text"
                value={formState.event}
                onChange={handleFieldChange}
                className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                placeholder="Basketball Men, Finals, Elimination Round, etc."
                required
              />
            </div>

            {!editingSchedule ? (
              <div>
                <label
                  htmlFor="schedule-matchup-mode"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Match setup
                </label>
                <select
                  id="schedule-matchup-mode"
                  name="matchup_mode"
                  value={formState.matchup_mode}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                >
                  <option value="single">Single matchup (manual teams)</option>
                  <option value="all_teams_single">
                    Single entry: all departments play
                  </option>
                  <option value="all_departments">
                    All departments play each other
                  </option>
                </select>
                {formState.matchup_mode === "all_departments" ? (
                  <p className="mt-2 text-xs text-theme-muted">
                    This creates {roundRobinPairings.length} entries from all
                    unique department pairings.
                  </p>
                ) : null}
                {formState.matchup_mode === "all_teams_single" ? (
                  <p className="mt-2 text-xs text-theme-muted">
                    This creates one schedule entry with teams involved marked
                    as all departments.
                  </p>
                ) : null}
              </div>
            ) : null}

            {editingSchedule || formState.matchup_mode === "single" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <SearchableTeamSelect
                  id="schedule-home-team"
                  label="Home Team"
                  value={formState.home_team}
                  options={teamOptions}
                  disabledOption={formState.away_team}
                  onSelect={(teamValue) =>
                    handleTeamSelection("home_team", teamValue)
                  }
                  placeholder="Type team acronym or name (e.g., COCS)"
                  required
                />
                <SearchableTeamSelect
                  id="schedule-away-team"
                  label="Away Team"
                  value={formState.away_team}
                  options={teamOptions}
                  disabledOption={formState.home_team}
                  onSelect={(teamValue) =>
                    handleTeamSelection("away_team", teamValue)
                  }
                  placeholder="Type team acronym or name (e.g., COL)"
                  required
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-muted">
                {formState.matchup_mode === "all_departments"
                  ? "Home and away teams are auto-generated from all department pairs."
                  : "Home and away team selection is optional for this all-departments match entry."}
              </div>
            )}

            {teamOptionsLoading ? (
              <p className="text-xs text-theme-muted">
                Loading team options...
              </p>
            ) : teamOptionsError ? (
              <p className="text-xs text-[#FDA4AF]">
                Unable to load teams. Team selection may be incomplete.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="schedule-game-no"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Game no.
                </label>
                <input
                  id="schedule-game-no"
                  name="game_no"
                  type="text"
                  value={formState.game_no}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Game 1, Match 02, Board 3"
                />
              </div>
              <div>
                <label
                  htmlFor="schedule-bracket"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Bracket
                </label>
                <input
                  id="schedule-bracket"
                  name="bracket"
                  type="text"
                  value={formState.bracket}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Elimination, Quarterfinals, Semifinals, Finals"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="schedule-time"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Time
                </label>
                <input
                  id="schedule-time"
                  name="time"
                  type="text"
                  value={formState.time}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="8:00 am - 10:00 am"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="schedule-venue"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Venue
                </label>
                <input
                  id="schedule-venue"
                  name="venue"
                  type="text"
                  value={formState.venue}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Covered Courts, Gym, Classroom 301"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting
                  ? editingSchedule
                    ? "Saving changes..."
                    : "Creating schedule..."
                  : editingSchedule
                    ? "Save changes"
                    : "Create schedule"}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
              >
                Close editor
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {schedulesLoading ? (
        <p className="mt-6 text-sm text-theme-muted">Loading schedules...</p>
      ) : schedulesError ? (
        <p className="mt-6 text-sm text-[#FDA4AF]">
          Unable to load schedules for editing right now.
        </p>
      ) : !schedules.length ? (
        <div className="mt-6 rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
          No schedules have been published yet.
        </div>
      ) : !selectedDaySchedule?.totalEntries ? (
        <div className="mt-6 rounded-3xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
          No schedules have been published for Day {selectedDay} yet.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {selectedDaySchedule.categories.map((category) => {
            const isExpanded = expandedCategory === category.label;

            return (
              <article
                key={`${selectedDay}-${category.label}`}
                className="overflow-hidden rounded-3xl border border-theme-border bg-theme-surface shadow-panel"
              >
                <button
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition sm:px-6 ${
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
                    <span className="rounded-full bg-theme-bg/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#ffffff]">
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
                    {!category.events.length ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-theme-muted">
                          No events have been published for this category on Day{" "}
                          {selectedDay}.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            openCreateForm({
                              day: selectedDay,
                              category: category.label,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                        >
                          <Plus className="h-4 w-4" />
                          Add first entry
                        </button>
                      </div>
                    ) : (
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
                                className="flex w-full items-center justify-between gap-4 bg-[var(--brand-primary-blue)] px-5 py-4 text-left text-[#ffffff] transition hover:opacity-95"
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
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCreateForm({
                                          day: selectedDay,
                                          category: category.label,
                                          event: eventGroup.name,
                                        })
                                      }
                                      className="inline-flex items-center gap-2 rounded-full border border-theme-border-soft bg-theme-bg px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add slot
                                    </button>
                                  </div>

                                  {eventGroup.rows.map((schedule) => (
                                    <article
                                      key={schedule.id}
                                      className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-4"
                                    >
                                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                          <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[var(--brand-primary-blue)] px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#ffffff]">
                                            <Clock3 className="h-4 w-4" />
                                            {schedule.time || "TBA"}
                                          </div>

                                          <div>
                                            <h5 className="text-base font-bold text-theme-text sm:text-lg">
                                              {getScheduleHeadline(schedule)}
                                            </h5>
                                            <p className="mt-1 text-sm text-theme-muted">
                                              {getScheduleSubline(schedule)}
                                            </p>
                                            <div className="mt-3 grid gap-2 text-sm text-theme-muted sm:grid-cols-2">
                                              <span>
                                                <span className="font-semibold text-theme-text">
                                                  Game no.:
                                                </span>{" "}
                                                {schedule.game_no ||
                                                  "Not specified"}
                                              </span>
                                              <span>
                                                <span className="font-semibold text-theme-text">
                                                  Bracket:
                                                </span>{" "}
                                                {schedule.bracket ||
                                                  "Not specified"}
                                              </span>
                                              <span>
                                                <span className="font-semibold text-theme-text">
                                                  Posted:
                                                </span>{" "}
                                                {formatDateTime(
                                                  schedule.created_at,
                                                )}
                                              </span>
                                              <span>
                                                <span className="font-semibold text-theme-text">
                                                  Table:
                                                </span>{" "}
                                                {schedule.source_table}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleEditClick(schedule)
                                            }
                                            className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteClick(schedule)
                                            }
                                            className="rounded-full border border-[#F43F5E4D] px-4 py-2 text-sm font-semibold text-[#FDA4AF] transition hover:bg-[#F43F5E1A]"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3 text-sm text-theme-muted">
                                        <MapPin className="h-4 w-4 text-brand-gold" />
                                        <span>
                                          <span className="font-semibold text-theme-text">
                                            Venue:
                                          </span>{" "}
                                          {schedule.venue || "To be announced"}
                                        </span>
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-theme-border bg-theme-surface p-5">
        <h3 className="text-lg font-semibold text-theme-text">
          Schedule activity log
        </h3>
        <p className="mt-2 text-sm leading-6 text-theme-muted">
          Every create, update, and delete action for the schedule tables is
          recorded here with the admin account used during the action.
        </p>

        {activityLogsLoading ? (
          <p className="mt-4 text-sm text-theme-muted">Loading activity...</p>
        ) : activityLogsError ? (
          <p className="mt-4 text-sm text-[#FDA4AF]">
            Unable to load the schedule activity log right now.
          </p>
        ) : !activityLogs.length ? (
          <p className="mt-4 text-sm text-theme-muted">
            No schedule activity has been tracked yet.
          </p>
        ) : (
          <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-2">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold capitalize text-theme-text">
                      {log.action} schedule entry
                    </p>
                    <p className="mt-1 text-sm text-theme-muted">
                      Day {log.day || "?"} |{" "}
                      {log.teams_involved_snapshot ||
                        log.event_snapshot ||
                        "Untitled schedule"}
                    </p>
                    <p className="mt-1 text-xs text-theme-subtle">
                      {log.event_snapshot || "No event specified"} |{" "}
                      {log.time_snapshot || "TBA"} |{" "}
                      {log.venue_snapshot || "Venue TBA"}
                    </p>
                    <p className="mt-1 text-xs text-theme-subtle">
                      Admin: {log.actor_email || "Unknown admin"}
                    </p>
                  </div>
                  <p className="text-xs text-theme-subtle">
                    {formatDateTime(log.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminScheduleManager;
