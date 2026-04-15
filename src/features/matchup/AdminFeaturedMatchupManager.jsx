import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  getDefaultFeaturedMatchup,
  getFeaturedMatchup,
  getFeaturedMatchupLogs,
  saveFeaturedMatchup,
} from "../../services/featuredMatchupService";
import { getEvents } from "../../services/rankingService";

const dayOptions = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

const venueOptions = [
  "Gymnasium",
  "Covered Courts",
  "Football Field",
  "Tennis Court",
  "Xavier Hall",
  "Phelan Lab (P217)",
  "Phelan Lab (P216)",
  "Santos Building (Lab 2)",
  "Santos Building (MMLab)",
  "3rd Floor Bonoan",
  "Arrupe",
  "Barcade",
  "Civic Center",
];

const teamOptions = [
  "ABBS",
  "ACHSS",
  "ANSA",
  "AXI",
  "COCS",
  "COL",
  "JPIA",
  "STEP",
];

const fallbackEventBadgeOptions = [
  "Basketball Main Event",
  "Volleyball Main Event",
  "Badminton Main Event",
  "Table Tennis Main Event",
  "Chess Main Event",
  "Mobile Legends Main Event",
  "Valorant Main Event",
  "Cheerdance Main Event",
  "Esports Main Event",
  "Special Event",
];

function getSelectValue(value, options) {
  return options.includes(value) ? value : "";
}

function createInitialFormState(eventOptions = fallbackEventBadgeOptions) {
  const defaults = getDefaultFeaturedMatchup();

  return {
    day_label: getSelectValue(defaults.day_label, dayOptions),
    time_label: defaults.time_label,
    venue: getSelectValue(defaults.venue, venueOptions),
    home_team_name: getSelectValue(defaults.home_team_name, teamOptions),
    away_team_name: getSelectValue(defaults.away_team_name, teamOptions),
    description: defaults.description ?? "",
    event_label: getSelectValue(defaults.event_label, eventOptions),
  };
}

function mapFeaturedMatchupToFormState(
  matchup,
  eventOptions = fallbackEventBadgeOptions,
) {
  return {
    day_label: getSelectValue(matchup.day_label, dayOptions),
    time_label: matchup.time_label ?? "",
    venue: getSelectValue(matchup.venue, venueOptions),
    home_team_name: getSelectValue(matchup.home_team_name, teamOptions),
    away_team_name: getSelectValue(matchup.away_team_name, teamOptions),
    description: matchup.description ?? "",
    event_label: getSelectValue(matchup.event_label, eventOptions),
  };
}

function AdminFeaturedMatchupManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );

  const [formState, setFormState] = useState(createInitialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFeaturedMatchup = useCallback(() => getFeaturedMatchup(), []);
  const {
    data: featuredMatchup,
    loading,
    error,
    refetch,
  } = useAsyncData(loadFeaturedMatchup, getDefaultFeaturedMatchup());

  const loadFeaturedMatchupLogs = useCallback(
    () => getFeaturedMatchupLogs(30),
    [],
  );
  const {
    data: featuredMatchupLogs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAsyncData(loadFeaturedMatchupLogs, []);

  const loadEventOptions = useCallback(() => getEvents(), []);
  const {
    data: eventOptionsData,
    loading: eventOptionsLoading,
    error: eventOptionsError,
  } = useAsyncData(loadEventOptions, []);

  const eventBadgeOptions = useMemo(() => {
    const eventNames = Array.from(
      new Set(
        (eventOptionsData ?? [])
          .map((eventItem) => String(eventItem?.name ?? "").trim())
          .filter(Boolean),
      ),
    );

    return eventNames.length ? eventNames : fallbackEventBadgeOptions;
  }, [eventOptionsData]);

  const groupedEventBadgeOptions = useMemo(() => {
    if (!eventOptionsData?.length) {
      return [
        {
          category: "General",
          events: fallbackEventBadgeOptions,
        },
      ];
    }

    const groups = eventOptionsData.reduce((map, eventItem) => {
      const category =
        String(eventItem?.category ?? "General").trim() || "General";
      const eventName = String(eventItem?.name ?? "").trim();

      if (!eventName) {
        return map;
      }

      if (!map.has(category)) {
        map.set(category, new Set());
      }

      map.get(category).add(eventName);
      return map;
    }, new Map());

    return [...groups.entries()]
      .map(([category, events]) => ({
        category,
        events: [...events].sort((left, right) => left.localeCompare(right)),
      }))
      .sort((left, right) => left.category.localeCompare(right.category));
  }, [eventOptionsData]);

  useEffect(() => {
    if (!featuredMatchup) {
      return;
    }

    setFormState(
      mapFeaturedMatchupToFormState(featuredMatchup, eventBadgeOptions),
    );
  }, [featuredMatchup, eventBadgeOptions]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  }

  function handleEditStart() {
    setFormState(
      mapFeaturedMatchupToFormState(featuredMatchup, eventBadgeOptions),
    );
    setFormError("");
    setFormStatus("");
    setIsEditing(true);
  }

  function handleEditCancel() {
    setFormState(
      mapFeaturedMatchupToFormState(featuredMatchup, eventBadgeOptions),
    );
    setFormError("");
    setFormStatus("");
    setIsEditing(false);
  }

  async function handleRefresh() {
    setFormError("");
    setFormStatus("");
    await Promise.all([refetch(), refetchLogs()]);
  }

  function handleSaveClick() {
    const formElement = document.getElementById("featured-matchup-form");

    if (formElement instanceof HTMLFormElement) {
      formElement.requestSubmit();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormStatus("");

    try {
      await saveFeaturedMatchup(formState, actor);
      setFormStatus("Featured matchup updated successfully.");
      setIsEditing(false);
      await Promise.all([refetch(), refetchLogs()]);
    } catch (submitError) {
      console.log(submitError);
      setFormError(
        submitError.message || "Unable to update the featured matchup.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateTime(value) {
    if (!value) {
      return "Unknown time";
    }

    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const matchupMeta = [
    featuredMatchup.day_label,
    featuredMatchup.time_label,
    featuredMatchup.venue,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-4 shadow-panel lg:p-8">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
            Home Featured Matchup
          </p>
          <h2 className="mt-3 text-2xl font-bold text-theme-text">
            Edit the featured matchup card on the Home page
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
            Update teams, descriptions, schedule details, and labels that appear
            in the public Featured Matchup section.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleEditStart}
                className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-theme-contrast transition hover:opacity-90"
              >
                Edit Matchup
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
              >
                Refresh
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={submitting}
                className="rounded-full bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-blue transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save to Live Hub"}
              </button>
              <button
                type="button"
                onClick={handleEditCancel}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-theme-border bg-theme-surface p-4 lg:p-8">
        {!isEditing ? (
          <article style={{ fontFamily: "Satoshi, sans-serif" }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
                  Live Hub Preview
                </p>
                <h3 className="mt-2 text-2xl font-bold">Featured Matchup</h3>
                <p className="mt-2 text-sm text-theme-muted">{matchupMeta}</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-surface-soft px-4 py-3 text-right text-xs text-theme-muted">
                <p>Last Updated</p>
                <p className="mt-1 font-semibold text-theme-text">
                  {formatDateTime(featuredMatchup.updated_at)}
                </p>
                <p className="mt-1 break-all">
                  {featuredMatchup.updated_by_email ?? "Unknown admin"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <div className="rounded-2xl border border-theme-border bg-theme-surface-soft p-4">
                <p className="mt-2 text-xl font-bold text-theme-text">
                  {featuredMatchup.home_team_name}
                </p>
              </div>
              <div className="mx-auto inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-brand-gold px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-white">
                VS
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-surface-soft p-4">
                <p className="mt-2 text-xl font-bold text-theme-text">
                  {featuredMatchup.away_team_name}
                </p>
              </div>
            </div>

            {featuredMatchup.description ? (
              <p className="mt-5 text-sm text-theme-muted">
                {featuredMatchup.description}
              </p>
            ) : null}

            <div className="mt-5">
              <span className="inline-flex rounded-full bg-brand-gold-soft px-4 py-2 text-sm font-semibold text-brand-gold">
                {featuredMatchup.event_label}
              </span>
            </div>
          </article>
        ) : (
          <form
            id="featured-matchup-form"
            className="space-y-4"
            onSubmit={handleSubmit}
          >
            <h3 className="text-lg font-semibold text-theme-text">
              Edit matchup details
            </h3>

            {loading ? (
              <p className="text-sm text-theme-muted">Loading matchup...</p>
            ) : error ? (
              <p className="text-sm text-[#FDA4AF]">
                Unable to load matchup details right now.
              </p>
            ) : null}
            {eventOptionsError ? (
              <p className="text-sm text-theme-muted">
                Event list from Supabase is currently unavailable. Showing
                fallback options.
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="matchup-day-label"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Day label
                </label>
                <div className="relative">
                  <select
                    id="matchup-day-label"
                    name="day_label"
                    value={formState.day_label}
                    onChange={handleFieldChange}
                    className="w-full appearance-none rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 pr-10 text-theme-text outline-none transition focus:border-brand-gold"
                    required
                  >
                    <option value="" disabled>
                      Select a Day
                    </option>
                    {dayOptions.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="matchup-time-label"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Time label
                </label>
                <input
                  id="matchup-time-label"
                  name="time_label"
                  type="text"
                  value={formState.time_label}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="5:30 PM"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="matchup-venue"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Venue
                </label>
                <div className="relative">
                  <select
                    id="matchup-venue"
                    name="venue"
                    value={formState.venue}
                    onChange={handleFieldChange}
                    className="w-full appearance-none rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 pr-10 text-theme-text outline-none transition focus:border-brand-gold"
                    required
                  >
                    <option value="" disabled>
                      Select a Venue
                    </option>
                    {venueOptions.map((venue) => (
                      <option key={venue} value={venue}>
                        {venue}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="matchup-home-team-name"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Home team name
                </label>
                <div className="relative">
                  <select
                    id="matchup-home-team-name"
                    name="home_team_name"
                    value={formState.home_team_name}
                    onChange={handleFieldChange}
                    className="w-full appearance-none rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 pr-10 text-theme-text outline-none transition focus:border-brand-gold"
                    required
                  >
                    <option value="" disabled>
                      Select a Team
                    </option>
                    {teamOptions.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
                </div>
              </div>
              <div>
                <label
                  htmlFor="matchup-away-team-name"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Away team name
                </label>
                <div className="relative">
                  <select
                    id="matchup-away-team-name"
                    name="away_team_name"
                    value={formState.away_team_name}
                    onChange={handleFieldChange}
                    className="w-full appearance-none rounded-2xl border border-theme-border bg-theme-surface px-4 py-3 pr-10 text-theme-text outline-none transition focus:border-brand-gold"
                    required
                  >
                    <option value="" disabled>
                      Select a Team
                    </option>
                    {teamOptions.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
                </div>
              </div>
            </div>

            <div>
              <div>
                <label
                  htmlFor="matchup-description"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Matchup description (optional)
                </label>
                <textarea
                  id="matchup-description"
                  name="description"
                  value={formState.description}
                  onChange={handleFieldChange}
                  className="min-h-28 w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Add a short note about this matchup"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="matchup-event-label"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Event badge label
              </label>
              <div className="relative">
                <select
                  id="matchup-event-label"
                  name="event_label"
                  value={formState.event_label}
                  onChange={handleFieldChange}
                  className="w-full appearance-none rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 pr-10 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                  required
                >
                  <option value="" disabled>
                    Select an Event Badge
                  </option>
                  {groupedEventBadgeOptions.map((group) => (
                    <optgroup key={group.category} label={group.category}>
                      {group.events.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
              </div>
              {eventOptionsLoading ? (
                <p className="mt-2 text-xs text-theme-subtle">
                  Loading events...
                </p>
              ) : null}
            </div>

            {formError ? (
              <div className="rounded-2xl border border-[#F43F5E4D] bg-[#F43F5E1A] px-4 py-3 text-sm text-[#FDA4AF]">
                {formError}
              </div>
            ) : null}
            {formStatus ? (
              <div className="rounded-2xl border border-[#10B9814D] bg-[#10B9811A] px-4 py-3 text-sm text-[#86EFAC]">
                {formStatus}
              </div>
            ) : null}
          </form>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-theme-border bg-theme-surface p-4 lg:p-8">
        <h3 className="text-lg font-semibold text-theme-text">
          Change History
        </h3>

        {logsLoading ? (
          <p className="mt-3 text-sm text-theme-muted">Loading history...</p>
        ) : logsError ? (
          <p className="mt-3 text-sm text-[#FDA4AF]">
            Unable to load matchup history right now.
          </p>
        ) : !featuredMatchupLogs.length ? (
          <p className="mt-3 text-sm text-theme-muted">
            No change history has been recorded yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {featuredMatchupLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-text"
              >
                <p>
                  {log.actor_email} updated matchup to {log.home_team_name} vs{" "}
                  {log.away_team_name} at {formatDateTime(log.created_at)}
                </p>
                <p
                  className="mt-1 text-xs text-theme-subtle"
                  style={{ fontFamily: "Geist, sans-serif" }}
                >
                  {formatDateTime(log.created_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminFeaturedMatchupManager;
