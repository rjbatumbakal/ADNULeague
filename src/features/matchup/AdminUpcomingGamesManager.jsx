import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, MapPin, Trophy } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  createFeaturedMatchupEntry,
  deleteFeaturedMatchupEntry,
  getDefaultFeaturedMatchupEntry,
  getFeaturedMatchupEntries,
  getFeaturedMatchupLogs,
  updateFeaturedMatchupEntry,
} from "../../services/featuredMatchupService";
import {
  getTeamLogo,
  matchupDayOptions,
  matchupTeamOptions,
  matchupVenueOptions,
} from "./matchupConfig";

function createEmptySelectedMatch(index = 0) {
  return {
    bracket_label: "A",
    game_label: `G${index + 1}`,
    team_a_id: "",
    team_b_id: "",
    timing_label: "",
  };
}

function normalizeSelectedMatchesForForm(matches = []) {
  if (!Array.isArray(matches) || !matches.length) {
    return [createEmptySelectedMatch(0)];
  }

  return matches.map((match, index) => ({
    bracket_label:
      String(match?.bracket_label ?? "A")
        .trim()
        .toUpperCase() || "A",
    game_label:
      String(match?.game_label ?? `G${index + 1}`)
        .trim()
        .toUpperCase() || `G${index + 1}`,
    team_a_id: String(match?.team_a_id ?? match?.home_team_name ?? "").trim(),
    team_b_id: String(match?.team_b_id ?? match?.away_team_name ?? "").trim(),
    timing_label: String(match?.timing_label ?? "").trim(),
  }));
}

function createInitialFormState() {
  const defaults = getDefaultFeaturedMatchupEntry();

  return {
    day_label: defaults.day_label,
    sport_label: defaults.sport_label,
    category_label: defaults.category_label,
    venue: defaults.venue,
    selected_matches: normalizeSelectedMatchesForForm(
      defaults.selected_matches,
    ),
    display_order: defaults.display_order,
    is_featured: defaults.is_featured,
  };
}

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

function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options,
  placeholder,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-theme-muted"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 pr-10 text-theme-text outline-none transition focus:border-brand-gold"
          required
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
      </div>
    </div>
  );
}

function AdminUpcomingGamesManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const [formState, setFormState] = useState(createInitialFormState);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inlineDrafts, setInlineDrafts] = useState({});
  const [updatingInline, setUpdatingInline] = useState(false);

  const loadEntries = useCallback(
    () => getFeaturedMatchupEntries({ limit: 100, includeUnpublished: true }),
    [],
  );
  const loadActivityLogs = useCallback(() => getFeaturedMatchupLogs(50), []);
  const {
    data: entries,
    loading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
  } = useAsyncData(loadEntries, []);
  const {
    data: activityLogs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAsyncData(loadActivityLogs, []);

  useEffect(() => {
    setInlineDrafts((current) => {
      const next = {};

      entries.forEach((entry) => {
        if (String(entry?.source) === "legacy") {
          return;
        }

        next[entry.id] = {
          is_featured: Boolean(entry.is_featured),
          bracket_label:
            String(entry.bracket_label ?? "A")
              .trim()
              .toUpperCase() || "A",
          game_label:
            String(entry.game_label ?? "")
              .trim()
              .toUpperCase() || "G1",
          timing_label: String(entry.timing_label ?? ""),
          display_order: Number(entry.display_order ?? 0),
        };
      });

      return Object.keys(next).length ? { ...current, ...next } : current;
    });
  }, [entries]);

  const featuredCount = useMemo(
    () =>
      entries.filter((entry) => {
        if (String(entry?.source) === "legacy") return false;
        return Boolean(
          inlineDrafts[entry.id]?.is_featured ?? entry.is_featured,
        );
      }).length,
    [entries, inlineDrafts],
  );

  function getInlineState(entry) {
    return (
      inlineDrafts[entry.id] ?? {
        is_featured: Boolean(entry.is_featured),
        bracket_label:
          String(entry.bracket_label ?? "A")
            .trim()
            .toUpperCase() || "A",
        game_label:
          String(entry.game_label ?? "")
            .trim()
            .toUpperCase() || "G1",
        timing_label: String(entry.timing_label ?? ""),
        display_order: Number(entry.display_order ?? 0),
      }
    );
  }

  function setInlineField(entryId, field, value) {
    setInlineDrafts((current) => ({
      ...current,
      [entryId]: {
        ...(current[entryId] ?? {}),
        [field]: value,
      },
    }));
  }

  function buildUpdatePayload(entry, draft) {
    return {
      day_label: entry.day_label,
      sport_label: entry.sport_label,
      category_label: entry.category_label,
      venue: entry.venue,
      selected_matches: Array.isArray(entry.selected_matches)
        ? entry.selected_matches
        : [],
      display_order: Number(draft.display_order ?? entry.display_order ?? 0),
      is_featured: Boolean(draft.is_featured ?? entry.is_featured),
      is_published: Boolean(entry.is_published),
    };
  }

  async function handleInlineToggle(entry, nextChecked) {
    if (String(entry?.source) === "legacy") {
      return;
    }

    setFormError("");
    setFormStatus("");
    const draft = { ...getInlineState(entry), is_featured: nextChecked };
    setInlineField(entry.id, "is_featured", nextChecked);

    try {
      await updateFeaturedMatchupEntry(
        entry,
        buildUpdatePayload(entry, draft),
        actor,
      );
      setFormStatus("Featured toggle updated.");
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to update featured toggle.");
    }
  }

  async function handleUpdateAllInline() {
    const editableEntries = entries.filter(
      (entry) => String(entry?.source) !== "legacy",
    );
    if (!editableEntries.length) {
      return;
    }

    setUpdatingInline(true);
    setFormError("");
    setFormStatus("");

    try {
      await Promise.all(
        editableEntries.map((entry) =>
          updateFeaturedMatchupEntry(
            entry,
            buildUpdatePayload(entry, getInlineState(entry)),
            actor,
          ),
        ),
      );
      setFormStatus("All featured matchup controls updated.");
      await refreshAdminData();
    } catch (error) {
      setFormError(
        error.message || "Unable to update all featured match controls.",
      );
    } finally {
      setUpdatingInline(false);
    }
  }

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;

    setFormState((currentState) => ({
      ...currentState,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleMatchFieldChange(matchIndex, field, value) {
    setFormState((currentState) => ({
      ...currentState,
      selected_matches: (currentState.selected_matches ?? []).map(
        (match, index) =>
          index === matchIndex
            ? {
                ...match,
                [field]:
                  field === "game_label" ? String(value).toUpperCase() : value,
              }
            : match,
      ),
    }));
  }

  function handleAddMatch() {
    setFormState((currentState) => {
      const currentMatches = currentState.selected_matches ?? [];
      return {
        ...currentState,
        selected_matches: [
          ...currentMatches,
          createEmptySelectedMatch(currentMatches.length),
        ],
      };
    });
  }

  function handleRemoveMatch(matchIndex) {
    setFormState((currentState) => {
      const currentMatches = currentState.selected_matches ?? [];
      if (currentMatches.length <= 1) {
        return {
          ...currentState,
          selected_matches: [createEmptySelectedMatch(0)],
        };
      }

      return {
        ...currentState,
        selected_matches: currentMatches.filter(
          (_, index) => index !== matchIndex,
        ),
      };
    });
  }

  function resetForm() {
    setFormState(createInitialFormState());
    setEditingEntry(null);
    setFormError("");
    setFormStatus("");
  }

  function handleEditClick(entry) {
    if (String(entry?.source) === "legacy") {
      return;
    }

    setEditingEntry(entry);
    setFormState({
      day_label: entry.day_label,
      sport_label: entry.sport_label,
      category_label: entry.category_label,
      venue: entry.venue,
      selected_matches: normalizeSelectedMatchesForForm(entry.selected_matches),
      display_order: entry.display_order,
      is_featured: Boolean(entry.is_featured),
    });
    setFormError("");
    setFormStatus("");
  }

  async function refreshAdminData() {
    await Promise.all([refetchEntries(), refetchLogs()]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormStatus("");

    const matchList = formState.selected_matches ?? [];
    const matchesData = matchList
      .map((match, index) => ({
        bracket:
          String(match?.bracket_label ?? match?.bracket ?? "A")
            .trim()
            .toUpperCase() || "A",
        game:
          String(match?.game_label ?? match?.game ?? `G${index + 1}`)
            .trim()
            .toUpperCase() || `G${index + 1}`,
        team_a: String(match?.team_a_id ?? match?.team_a ?? "").trim(),
        team_b: String(match?.team_b_id ?? match?.team_b ?? "").trim(),
        timing: String(match?.timing_label ?? match?.timing ?? "").trim(),
      }))
      .filter(
        (match) =>
          match.bracket &&
          match.game &&
          match.team_a &&
          match.team_b &&
          match.timing,
      );

    if (!matchesData.length) {
      setSubmitting(false);
      setFormError("Add at least one complete match row before saving.");
      return;
    }

    const normalizedMatches = matchesData.map((match) => ({
      bracket_label: match.bracket,
      game_label: match.game,
      team_a_id: match.team_a,
      team_b_id: match.team_b,
      timing_label: match.timing,
    }));

    const payload = {
      ...formState,
      included_matches: matchesData,
      selected_matches: normalizedMatches,
    };

    try {
      if (editingEntry) {
        await updateFeaturedMatchupEntry(editingEntry, payload, actor);
        setFormStatus("Upcoming game updated successfully.");
      } else {
        await createFeaturedMatchupEntry(payload, actor);
        setFormStatus("Upcoming game added to the carousel.");
      }

      resetForm();
      await refreshAdminData();
    } catch (error) {
      console.log(error);
      setFormError(error.message || "Unable to save the upcoming game.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClick(entry) {
    if (String(entry?.source) === "legacy") {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this upcoming game from the carousel?",
    );

    if (!shouldDelete) {
      return;
    }

    setFormError("");
    setFormStatus("");

    try {
      await deleteFeaturedMatchupEntry(entry, actor);

      if (editingEntry?.id === entry.id) {
        resetForm();
      }

      setFormStatus("Upcoming game removed successfully.");
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to delete the upcoming game.");
    }
  }

  const hasLegacyFallback = entries.some(
    (entry) => String(entry.source) === "legacy",
  );

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Featured Matchup Manager
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Configure featured entries and select included matches
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Manage featured matchup settings, then add/select which matches are
          included in each sport/day entry for the homepage compact matchup
          list.
        </p>
      </div>

      {hasLegacyFallback ? (
        <div className="mt-6 rounded-2xl border border-[#F59E0B4D] bg-[#F59E0B1A] px-4 py-3 text-sm text-[#FDE68A]">
          Legacy featured matchup data is still being shown as a fallback. Apply
          the updated Supabase schema to enable full carousel create, edit,
          delete, and ordering.
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <h3 className="text-lg font-semibold text-theme-text">
            {editingEntry ? "Edit upcoming game" : "Create upcoming game"}
          </h3>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                id="upcoming-day-label"
                name="day_label"
                label="Day"
                value={formState.day_label}
                onChange={handleFieldChange}
                options={matchupDayOptions}
                placeholder="Select a day"
              />

              <SelectField
                id="upcoming-venue"
                name="venue"
                label="Venue"
                value={formState.venue}
                onChange={handleFieldChange}
                options={matchupVenueOptions}
                placeholder="Select a venue"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="upcoming-sport-label"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Sport
                </label>
                <input
                  id="upcoming-sport-label"
                  name="sport_label"
                  type="text"
                  value={formState.sport_label}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Basketball"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="upcoming-category-label"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Category
                </label>
                <input
                  id="upcoming-category-label"
                  name="category_label"
                  type="text"
                  value={formState.category_label}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                  placeholder="Main Event"
                  required
                />
              </div>
            </div>

            <div className="rounded-2xl border border-theme-border-soft bg-theme-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
                    Match List
                  </p>
                  <p className="mt-1 text-sm text-theme-muted">
                    Add one or more matches for this carousel card.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMatch}
                  className="rounded-full border border-theme-border-soft bg-theme-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
                >
                  Add Match
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {(formState.selected_matches ?? []).map((match, index) => (
                  <div
                    key={`match-builder-${index}`}
                    className="rounded-2xl border border-theme-border-soft bg-theme-surface p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-5">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                          Bracket
                        </label>
                        <select
                          value={match.bracket_label}
                          onChange={(event) =>
                            handleMatchFieldChange(
                              index,
                              "bracket_label",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-theme-border-soft bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                          Game #
                        </label>
                        <input
                          type="text"
                          value={match.game_label}
                          onChange={(event) =>
                            handleMatchFieldChange(
                              index,
                              "game_label",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-theme-border-soft bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                          placeholder={`G${index + 1}`}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                          Team A
                        </label>
                        <select
                          value={match.team_a_id}
                          onChange={(event) =>
                            handleMatchFieldChange(
                              index,
                              "team_a_id",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-theme-border-soft bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                        >
                          <option value="" disabled>
                            Select team
                          </option>
                          {matchupTeamOptions.map((team) => (
                            <option
                              key={`team-a-${index}-${team}`}
                              value={team}
                            >
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                          Team B
                        </label>
                        <select
                          value={match.team_b_id}
                          onChange={(event) =>
                            handleMatchFieldChange(
                              index,
                              "team_b_id",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-theme-border-soft bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                        >
                          <option value="" disabled>
                            Select team
                          </option>
                          {matchupTeamOptions.map((team) => (
                            <option
                              key={`team-b-${index}-${team}`}
                              value={team}
                            >
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                          Timing
                        </label>
                        <input
                          type="text"
                          value={match.timing_label}
                          onChange={(event) =>
                            handleMatchFieldChange(
                              index,
                              "timing_label",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-xl border border-theme-border-soft bg-theme-bg px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                          placeholder="9:00 AM"
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMatch(index)}
                        className="rounded-full border border-[#F43F5E4D] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#FDA4AF] transition hover:bg-[#F43F5E1A]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-theme-border-soft bg-theme-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
                    Preview
                  </p>
                  <p className="mt-1 text-sm text-theme-muted">
                    This is how the carousel card content will be arranged.
                  </p>
                </div>
                <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  {formState.category_label || "Category"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                    <CalendarDays className="h-4 w-4" />
                    Day
                  </div>
                  <p className="mt-2 text-sm font-bold text-theme-text">
                    {formState.day_label}
                  </p>
                </div>
                <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                    <MapPin className="h-4 w-4" />
                    Venue
                  </div>
                  <p className="mt-2 text-sm font-bold text-theme-text">
                    {formState.venue}
                  </p>
                </div>
                <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                    <Trophy className="h-4 w-4" />
                    Sport
                  </div>
                  <p className="mt-2 text-sm font-bold text-theme-text">
                    {formState.sport_label}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {(formState.selected_matches ?? []).map((match, index) => (
                  <div
                    key={`preview-match-${index}`}
                    className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-theme-border-soft bg-theme-surface px-3 py-2"
                  >
                    <span className="rounded-full bg-theme-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                      {match.bracket_label || "A"}
                    </span>
                    <span className="rounded-full bg-theme-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                      {match.game_label || `G${index + 1}`}
                    </span>

                    <div className="min-w-0 text-xs text-theme-text">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={getTeamLogo(match.team_a_id) ?? ""}
                          alt=""
                          className={`h-6 w-6 rounded-full object-cover ${getTeamLogo(match.team_a_id) ? "" : "hidden"}`}
                        />
                        {!getTeamLogo(match.team_a_id) ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-theme-border-soft text-[9px] font-semibold text-theme-subtle">
                            {String(match.team_a_id || "TBA").slice(0, 3)}
                          </span>
                        ) : null}
                        <span className="truncate font-semibold">
                          {match.team_a_id || "TBA"}
                        </span>
                        <span className="text-theme-subtle">vs</span>
                        <img
                          src={getTeamLogo(match.team_b_id) ?? ""}
                          alt=""
                          className={`h-6 w-6 rounded-full object-cover ${getTeamLogo(match.team_b_id) ? "" : "hidden"}`}
                        />
                        {!getTeamLogo(match.team_b_id) ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-theme-border-soft text-[9px] font-semibold text-theme-subtle">
                            {String(match.team_b_id || "TBA").slice(0, 3)}
                          </span>
                        ) : null}
                        <span className="truncate font-semibold">
                          {match.team_b_id || "TBA"}
                        </span>
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-theme-subtle">
                          {match.timing_label || "TBA"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="upcoming-display-order"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Display order
                </label>
                <input
                  id="upcoming-display-order"
                  name="display_order"
                  type="number"
                  min="0"
                  value={formState.display_order}
                  onChange={handleFieldChange}
                  className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-text md:self-end">
                <input
                  name="is_featured"
                  type="checkbox"
                  checked={Boolean(formState.is_featured)}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-theme-border-soft"
                />
                Mark as featured for compact homepage matchup list
              </label>
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

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting
                  ? editingEntry
                    ? "Saving changes..."
                    : "Adding game..."
                  : editingEntry
                    ? "Save changes"
                    : "Add to carousel"}
              </button>
              {editingEntry ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-theme-text">
                  Add/Select Matches
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-theme-subtle">
                  Matches Featured: {featuredCount}/{entries.length || 0}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUpdateAllInline}
                  disabled={updatingInline || entriesLoading || !entries.length}
                  className="rounded-full bg-brand-gold px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingInline ? "Updating..." : "Update All"}
                </button>
                <button
                  type="button"
                  onClick={refreshAdminData}
                  className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
                >
                  Refresh
                </button>
              </div>
            </div>

            {entriesLoading ? (
              <p className="mt-4 text-sm text-theme-muted">
                Loading entries...
              </p>
            ) : entriesError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load the upcoming games right now.
              </p>
            ) : !entries.length ? (
              <p className="mt-4 text-sm text-theme-muted">
                No upcoming games have been added yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[34rem] space-y-4 overflow-y-auto pr-2">
                {entries.map((entry) => {
                  const isLegacyEntry = String(entry.source) === "legacy";
                  const inlineState = getInlineState(entry);

                  return (
                    <article
                      key={entry.id}
                      className="overflow-hidden rounded-2xl border border-theme-border-soft bg-theme-bg"
                    >
                      <div className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold">
                                Order {entry.display_order}
                              </span>
                              <label className="inline-flex items-center gap-2 rounded-full border border-theme-border-soft bg-theme-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-theme-text">
                                <input
                                  type="checkbox"
                                  checked={Boolean(inlineState.is_featured)}
                                  onChange={(event) =>
                                    handleInlineToggle(
                                      entry,
                                      event.target.checked,
                                    )
                                  }
                                  disabled={isLegacyEntry}
                                  className="h-3.5 w-3.5 rounded border-theme-border-soft"
                                />
                                Featured
                              </label>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                  entry.is_published
                                    ? "bg-[#10B9811A] text-[#34D399]"
                                    : "bg-theme-overlay text-theme-muted"
                                }`}
                              >
                                {entry.is_published ? "Published" : "Hidden"}
                              </span>
                              {isLegacyEntry ? (
                                <span className="rounded-full bg-[#F59E0B1A] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FDE68A]">
                                  Legacy fallback
                                </span>
                              ) : null}
                            </div>
                            <h4 className="mt-3 text-lg font-bold text-theme-text">
                              {entry.sport_label}
                            </h4>
                            <p className="mt-1 text-sm text-theme-muted">
                              {entry.day_label} • {entry.timing_label} •{" "}
                              {entry.venue}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditClick(entry)}
                              disabled={isLegacyEntry}
                              className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(entry)}
                              disabled={isLegacyEntry}
                              className="rounded-full border border-[#F43F5E4D] px-4 py-2 text-sm font-semibold text-[#FDA4AF] transition hover:bg-[#F43F5E1A] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {!isLegacyEntry ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-1">
                            <div className="max-w-[10rem]">
                              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-theme-subtle">
                                Sort Order
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={inlineState.display_order}
                                onChange={(event) =>
                                  setInlineField(
                                    entry.id,
                                    "display_order",
                                    Number(event.target.value || 0),
                                  )
                                }
                                className="w-full rounded-xl border border-theme-border-soft bg-theme-surface px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                              />
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                              Category
                            </p>
                            <p className="mt-2 text-sm font-bold text-theme-text">
                              {entry.category_label}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-theme-subtle">
                              Included Matches
                            </p>
                            <p className="mt-2 text-sm font-bold text-theme-text">
                              {entry.selected_matches?.length || 0}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {(entry.selected_matches ?? []).length ? (
                            entry.selected_matches.map((match, index) => (
                              <div
                                key={`${entry.id}-match-${index}`}
                                className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-theme-border-soft bg-theme-surface px-3 py-2"
                              >
                                <span className="rounded-full bg-theme-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                                  {match.bracket_label || "A"}
                                </span>
                                <span className="rounded-full bg-theme-bg px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-theme-subtle">
                                  {match.game_label || `G${index + 1}`}
                                </span>
                                <p className="truncate text-xs font-semibold text-theme-text">
                                  {match.team_a_id ||
                                    match.home_team_name ||
                                    "TBA"}{" "}
                                  vs{" "}
                                  {match.team_b_id ||
                                    match.away_team_name ||
                                    "TBA"}{" "}
                                  • {match.timing_label || "TBA"}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-theme-subtle">
                              No matches attached yet.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-subtle">
                          <span>
                            Created: {formatDateTime(entry.created_at)}
                          </span>
                          {entry.created_by_email ? (
                            <span>Posted by: {entry.created_by_email}</span>
                          ) : null}
                          {entry.updated_at ? (
                            <span>
                              Updated: {formatDateTime(entry.updated_at)}
                            </span>
                          ) : null}
                          {entry.updated_by_email ? (
                            <span>Updated by: {entry.updated_by_email}</span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <h3 className="text-lg font-semibold text-theme-text">
              Upcoming games activity log
            </h3>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              Every create, update, and delete action for the homepage upcoming
              games carousel is recorded here.
            </p>

            {logsLoading ? (
              <p className="mt-4 text-sm text-theme-muted">
                Loading activity...
              </p>
            ) : logsError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load the upcoming games activity log right now.
              </p>
            ) : !activityLogs.length ? (
              <p className="mt-4 text-sm text-theme-muted">
                No activity has been tracked yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-2">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold capitalize text-theme-text">
                          {log.action} upcoming game
                        </p>
                        <p className="mt-1 text-sm text-theme-muted">
                          {log.home_team_name_snapshot} vs{" "}
                          {log.away_team_name_snapshot}
                        </p>
                        <p className="mt-1 text-xs text-theme-subtle">
                          {log.day_label_snapshot} • {log.sport_label_snapshot}{" "}
                          • {log.venue_snapshot}
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
        </div>
      </div>
    </section>
  );
}

export default AdminUpcomingGamesManager;
