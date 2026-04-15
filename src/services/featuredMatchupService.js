import { isSupabaseConfigured, supabase } from "./supabaseClient";

const featuredMatchupEntriesTable = "featured_matchup_entries";
const featuredMatchupActivityLogsTable = "featured_matchup_activity_logs";
const legacyFeaturedMatchupTable = "featured_matchup";
const legacyFeaturedMatchupLogsTable = "featured_matchup_logs";
const matchesTable = "matches";

const defaultFeaturedMatchupEntry = {
  id: "default-featured-matchup-entry",
  day_label: "Day 3",
  timing_label: "After Previous Team Game",
  sport_label: "Basketball",
  category_label: "Main Event",
  bracket_label: "A",
  game_label: "G1",
  venue: "Gymnasium",
  home_team_name: "ABBS",
  away_team_name: "COCS",
  is_featured: false,
  selected_match_ids: [],
  selected_matches: [],
  is_published: true,
  display_order: 0,
  created_at: null,
  updated_at: null,
  created_by_email: null,
  updated_by_email: null,
  source: "default",
};

function ensureSupabaseWriteAccess() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured in this local environment yet. Use a real Supabase Auth admin account before managing homepage upcoming games.",
    );
  }
}

function isMissingTableError(error, tableName) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes(tableName)
  );
}

function isOptionalActivityLogError(error, tableName) {
  if (!error) {
    return false;
  }

  return (
    isMissingTableError(error, tableName) ||
    error.code === "42501" ||
    error.code === "PGRST204" ||
    error.message?.toLowerCase().includes("column")
  );
}

function shouldRetryWithoutIncludedMatches(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" &&
    (message.includes("included_matches") || message.includes("schema cache"))
  );
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? "").trim(),
  );
}

function normalizeFeaturedMatchupEntry(row) {
  if (!row) {
    return { ...defaultFeaturedMatchupEntry };
  }

  const rawSelectedMatches =
    Array.isArray(row.selected_matches) && row.selected_matches.length
      ? row.selected_matches
      : Array.isArray(row.included_matches)
        ? row.included_matches
        : [];

  return {
    ...defaultFeaturedMatchupEntry,
    ...row,
    id: row.id ?? defaultFeaturedMatchupEntry.id,
    day_label: String(row.day_label ?? defaultFeaturedMatchupEntry.day_label),
    timing_label: String(
      row.timing_label ?? defaultFeaturedMatchupEntry.timing_label,
    ),
    sport_label: String(
      row.sport_label ?? defaultFeaturedMatchupEntry.sport_label,
    ),
    category_label: String(
      row.category_label ?? defaultFeaturedMatchupEntry.category_label,
    ),
    bracket_label: String(
      row.bracket_label ?? defaultFeaturedMatchupEntry.bracket_label,
    ),
    game_label: String(
      row.game_label ?? defaultFeaturedMatchupEntry.game_label,
    ),
    venue: String(row.venue ?? defaultFeaturedMatchupEntry.venue),
    home_team_name: String(
      row.home_team_name ?? defaultFeaturedMatchupEntry.home_team_name,
    ),
    away_team_name: String(
      row.away_team_name ?? defaultFeaturedMatchupEntry.away_team_name,
    ),
    is_featured: Boolean(
      row.is_featured ?? defaultFeaturedMatchupEntry.is_featured,
    ),
    selected_match_ids: Array.isArray(row.selected_match_ids)
      ? row.selected_match_ids.filter(Boolean)
      : [],
    selected_matches: Array.isArray(rawSelectedMatches)
      ? rawSelectedMatches
          .map((item, index) => ({
            match_id: String(item?.match_id ?? item?.id ?? "").trim(),
            bracket_label: String(item?.bracket_label ?? item?.bracket ?? "A")
              .trim()
              .toUpperCase(),
            game_label: String(
              item?.game_label ?? item?.game ?? `G${index + 1}`,
            )
              .trim()
              .toUpperCase(),
            game_number: String(
              item?.game_number ??
                item?.game_label ??
                item?.game ??
                `G${index + 1}`,
            )
              .trim()
              .toUpperCase(),
            timing_label: String(item?.timing_label ?? "").trim(),
            display_order: Number(item?.display_order ?? index),
            team_a_id: String(
              item?.team_a_id ??
                item?.home_team_name ??
                item?.team_a_name ??
                "",
            ).trim(),
            team_b_id: String(
              item?.team_b_id ??
                item?.away_team_name ??
                item?.team_b_name ??
                "",
            ).trim(),
            home_team_name: String(
              item?.home_team_name ??
                item?.team_a_name ??
                item?.team_a_id ??
                "",
            ).trim(),
            away_team_name: String(
              item?.away_team_name ??
                item?.team_b ??
                item?.team_b_name ??
                item?.team_b_id ??
                "",
            ).trim(),
          }))
          .filter(
            (item) =>
              item.match_id || (item.team_a_id && item.team_b_id),
          )
      : [],
    is_published: row.is_published !== false,
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by_email: row.created_by_email ?? null,
    updated_by_email: row.updated_by_email ?? null,
    source: row.source ?? "entries",
  };
}

function normalizeLegacyFeaturedMatchup(row) {
  if (!row) {
    return null;
  }

  return normalizeFeaturedMatchupEntry({
    id: `legacy-${row.id ?? 1}`,
    day_label: row.day_label ?? defaultFeaturedMatchupEntry.day_label,
    timing_label:
      row.time_label ??
      row.note_label ??
      defaultFeaturedMatchupEntry.timing_label,
    sport_label: row.event_label ?? defaultFeaturedMatchupEntry.sport_label,
    category_label:
      row.note_label ?? defaultFeaturedMatchupEntry.category_label,
    venue: row.venue ?? defaultFeaturedMatchupEntry.venue,
    home_team_name:
      row.home_team_name ?? defaultFeaturedMatchupEntry.home_team_name,
    away_team_name:
      row.away_team_name ?? defaultFeaturedMatchupEntry.away_team_name,
    is_published: true,
    display_order: 0,
    created_at: row.updated_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by_email: row.updated_by_email ?? null,
    updated_by_email: row.updated_by_email ?? null,
    source: "legacy",
  });
}

async function getLegacyFeaturedMatchupRow() {
  const { data, error } = await supabase
    .from(legacyFeaturedMatchupTable)
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (
      error.code === "PGRST116" ||
      isMissingTableError(error, legacyFeaturedMatchupTable)
    ) {
      return null;
    }

    throw error;
  }

  return normalizeLegacyFeaturedMatchup(data);
}

function toLegacyFeaturedMatchupShape(entry) {
  const normalizedEntry = normalizeFeaturedMatchupEntry(entry);

  return {
    id: normalizedEntry.id,
    day_label: normalizedEntry.day_label,
    time_label: normalizedEntry.timing_label,
    venue: normalizedEntry.venue,
    home_team_name: normalizedEntry.home_team_name,
    away_team_name: normalizedEntry.away_team_name,
    description: "",
    event_label: normalizedEntry.sport_label,
    updated_at: normalizedEntry.updated_at,
    updated_by_email: normalizedEntry.updated_by_email,
  };
}

async function upsertLegacyFeaturedMatchupFromEntry(entryPayload, actor) {
  const normalizedPayload = normalizeFeaturedMatchupEntry(entryPayload);
  const firstSelectedMatch = normalizedPayload.selected_matches?.[0] ?? null;

  const legacyPayload = {
    day_label: normalizedPayload.day_label,
    time_label:
      firstSelectedMatch?.timing_label ||
      normalizedPayload.timing_label ||
      defaultFeaturedMatchupEntry.timing_label,
    venue: normalizedPayload.venue,
    home_team_name:
      firstSelectedMatch?.team_a_id ||
      firstSelectedMatch?.home_team_name ||
      normalizedPayload.home_team_name ||
      defaultFeaturedMatchupEntry.home_team_name,
    home_team_description:
      firstSelectedMatch?.bracket_label && firstSelectedMatch?.game_label
        ? `${firstSelectedMatch.bracket_label} • ${firstSelectedMatch.game_label}`
        : "Bracket • Game",
    away_team_name:
      firstSelectedMatch?.team_b_id ||
      firstSelectedMatch?.away_team_name ||
      normalizedPayload.away_team_name ||
      defaultFeaturedMatchupEntry.away_team_name,
    away_team_description:
      normalizedPayload.category_label ||
      defaultFeaturedMatchupEntry.category_label,
    event_label:
      normalizedPayload.sport_label || defaultFeaturedMatchupEntry.sport_label,
    note_label:
      normalizedPayload.category_label ||
      defaultFeaturedMatchupEntry.category_label,
    updated_at: new Date().toISOString(),
    updated_by_email: actor?.email ?? null,
  };

  const payloadVariants = [
    legacyPayload,
    // Some projects have a reduced legacy schema without description columns.
    (() => {
      const { home_team_description, away_team_description, ...rest } =
        legacyPayload;
      return rest;
    })(),
    // Final fallback: only core identity/schedule columns.
    {
      day_label: legacyPayload.day_label,
      time_label: legacyPayload.time_label,
      venue: legacyPayload.venue,
      home_team_name: legacyPayload.home_team_name,
      away_team_name: legacyPayload.away_team_name,
      event_label: legacyPayload.event_label,
      note_label: legacyPayload.note_label,
      updated_at: legacyPayload.updated_at,
      updated_by_email: legacyPayload.updated_by_email,
    },
    // Oldest fallback schema may only have the core matchup columns.
    {
      day_label: legacyPayload.day_label,
      time_label: legacyPayload.time_label,
      venue: legacyPayload.venue,
      home_team_name: legacyPayload.home_team_name,
      away_team_name: legacyPayload.away_team_name,
      updated_at: legacyPayload.updated_at,
    },
  ];

  const { data: existingLegacyRow, error: existingLegacyError } = await supabase
    .from(legacyFeaturedMatchupTable)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingLegacyError && existingLegacyError.code !== "PGRST116") {
    throw existingLegacyError;
  }

  let lastError = null;

  for (const variant of payloadVariants) {
    const query = existingLegacyRow?.id
      ? supabase
          .from(legacyFeaturedMatchupTable)
          .update(variant)
          .eq("id", existingLegacyRow.id)
      : supabase.from(legacyFeaturedMatchupTable).insert(variant);

    const { data, error } = await query.select("*").single();

    if (!error) {
      return normalizeLegacyFeaturedMatchup(data);
    }

    lastError = error;

    // Retry only for schema-cache/column mismatch errors.
    const canRetryForColumnMismatch =
      error.code === "PGRST204" ||
      String(error.message ?? "")
        .toLowerCase()
        .includes("schema cache") ||
      String(error.message ?? "")
        .toLowerCase()
        .includes("could not find the");

    if (!canRetryForColumnMismatch) {
      throw error;
    }
  }

  throw lastError ?? new Error("Unable to upsert legacy featured matchup.");
}

async function syncLegacyFeaturedMatchup(entryPayload, actor) {
  try {
    await upsertLegacyFeaturedMatchupFromEntry(entryPayload, actor);
  } catch (error) {
    if (
      isMissingTableError(error, legacyFeaturedMatchupTable) ||
      error.code === "PGRST116"
    ) {
      return;
    }

    throw error;
  }
}

async function clearLegacyFeaturedMatchup() {
  const { error } = await supabase
    .from(legacyFeaturedMatchupTable)
    .delete()
    .neq("id", -1);

  if (
    error &&
    !isMissingTableError(error, legacyFeaturedMatchupTable) &&
    error.code !== "PGRST116"
  ) {
    throw error;
  }
}

async function syncLegacyFeaturedMatchupFromCurrentEntries(actor) {
  const entries = await getFeaturedMatchupEntries({
    limit: 1,
    includeUnpublished: false,
  });

  if (entries.length) {
    await syncLegacyFeaturedMatchup(entries[0], actor);
    return;
  }

  await clearLegacyFeaturedMatchup();
}

function buildEntryPayload(formState, actor, existingEntry = null) {
  const rawMatches =
    Array.isArray(formState.selected_matches) &&
    formState.selected_matches.length
      ? formState.selected_matches
      : Array.isArray(formState.included_matches)
        ? formState.included_matches
        : [];

  const selectedMatches = Array.isArray(rawMatches)
    ? rawMatches
        .map((item, index) => ({
          match_id: String(item?.match_id ?? item?.id ?? "").trim(),
          bracket_label: String(item?.bracket_label ?? item?.bracket ?? "A")
            .trim()
            .toUpperCase(),
          game_label: String(item?.game_label ?? item?.game ?? `G${index + 1}`)
            .trim()
            .toUpperCase(),
          game_number: String(
            item?.game_number ??
              item?.game_label ??
              item?.game ??
              `G${index + 1}`,
          )
            .trim()
            .toUpperCase(),
          timing_label: String(item?.timing_label ?? "").trim(),
          display_order: Number(item?.display_order ?? index),
          team_a_id: String(
            item?.team_a_id ??
              item?.team_a ??
              item?.home_team_name ??
              item?.team_a_name ??
              "",
          ).trim(),
          team_b_id: String(
            item?.team_b_id ??
              item?.team_b ??
              item?.away_team_name ??
              item?.team_b_name ??
              "",
          ).trim(),
          home_team_name: String(
            item?.home_team_name ??
              item?.team_a_name ??
              item?.team_a ??
              item?.team_a_id ??
              "",
          ).trim(),
          away_team_name: String(
            item?.away_team_name ??
              item?.team_b_name ??
              item?.team_b ??
              item?.team_b_id ??
              "",
          ).trim(),
        }))
        .filter((item) => item.match_id || (item.team_a_id && item.team_b_id))
    : [];

  const selectedMatchIds = selectedMatches
    .map((item) => String(item.match_id ?? "").trim())
    .filter(isUuidLike);

  return {
    day_label: String(formState.day_label ?? "").trim(),
    timing_label: String(formState.timing_label ?? "").trim(),
    sport_label: String(formState.sport_label ?? "").trim(),
    category_label: String(formState.category_label ?? "").trim(),
    bracket_label: String(
      formState.bracket_label ?? existingEntry?.bracket_label ?? "",
    )
      .trim()
      .toUpperCase(),
    game_label: String(formState.game_label ?? existingEntry?.game_label ?? "")
      .trim()
      .toUpperCase(),
    venue: String(formState.venue ?? "").trim(),
    home_team_name: String(formState.home_team_name ?? "").trim(),
    away_team_name: String(formState.away_team_name ?? "").trim(),
    is_featured:
      formState.is_featured === undefined
        ? Boolean(existingEntry?.is_featured)
        : Boolean(formState.is_featured),
    selected_match_ids: selectedMatchIds,
    selected_matches: selectedMatches,
    included_matches: selectedMatches.map((match) => ({
      bracket: match.bracket_label,
      game: match.game_label,
      team_a: match.team_a_id,
      team_b: match.team_b_id,
      timing: match.timing_label,
    })),
    is_published:
      formState.is_published === undefined
        ? true
        : Boolean(formState.is_published),
    display_order:
      Number(formState.display_order ?? existingEntry?.display_order ?? 0) || 0,
    updated_at: new Date().toISOString(),
    updated_by_email: actor?.email ?? null,
    ...(!existingEntry
      ? {
          created_by_email: actor?.email ?? null,
        }
      : {}),
    // Keep legacy top-level fields in sync using the first match for compatibility.
    ...(selectedMatches[0]
      ? {
          timing_label:
            selectedMatches[0].timing_label ||
            String(formState.timing_label ?? "").trim(),
          bracket_label:
            selectedMatches[0].bracket_label ||
            String(
              formState.bracket_label ?? existingEntry?.bracket_label ?? "A",
            )
              .trim()
              .toUpperCase(),
          game_label:
            selectedMatches[0].game_label ||
            String(formState.game_label ?? existingEntry?.game_label ?? "G1")
              .trim()
              .toUpperCase(),
          home_team_name:
            selectedMatches[0].team_a_id ||
            selectedMatches[0].home_team_name ||
            "TBA",
          away_team_name:
            selectedMatches[0].team_b_id ||
            selectedMatches[0].away_team_name ||
            "TBA",
        }
      : {}),
  };
}

function normalizeSelectableMatch(row, fallbackIndex = 0) {
  const gameLabel = String(
    row?.game_label ??
      row?.game ??
      (Number.isFinite(Number(row?.game_no))
        ? `G${row.game_no}`
        : `G${fallbackIndex + 1}`),
  )
    .trim()
    .toUpperCase();

  const bracketLabel = String(row?.bracket ?? row?.round ?? "A")
    .trim()
    .toUpperCase();

  return {
    id: String(row?.id ?? `match-${fallbackIndex}`),
    sport: String(row?.sport ?? "").trim(),
    bracket_label: bracketLabel.includes("B") ? "B" : "A",
    game_label: gameLabel || `G${fallbackIndex + 1}`,
    timing_label: String(row?.timing_label ?? "").trim(),
    team_a_id: String(
      row?.team_a_id ??
        row?.team_a_name ??
        row?.home_team_name ??
        row?.team_a ??
        "TBA",
    ).trim(),
    team_b_id: String(
      row?.team_b_id ??
        row?.team_b_name ??
        row?.away_team_name ??
        row?.team_b ??
        "TBA",
    ).trim(),
    home_team_name: String(
      row?.team_a_name ?? row?.home_team_name ?? row?.team_a ?? "TBA",
    ).trim(),
    away_team_name: String(
      row?.team_b_name ?? row?.away_team_name ?? row?.team_b ?? "TBA",
    ).trim(),
  };
}

export async function getMatchesForFeaturedSport(sportLabel) {
  const sport = String(sportLabel ?? "").trim();
  if (!sport) {
    return [];
  }

  const { data, error } = await supabase
    .from(matchesTable)
    .select(
      "id, sport, bracket, round, game_label, game_no, team_a_name, team_b_name, home_team_name, away_team_name, team_a, team_b",
    )
    .eq("sport", sport)
    .order("game_no", { ascending: true, nullsFirst: false })
    .order("game_label", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error, matchesTable)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row, index) => normalizeSelectableMatch(row, index));
}

async function writeFeaturedMatchupActivityLog({ action, actor, entry }) {
  const { error } = await supabase
    .from(featuredMatchupActivityLogsTable)
    .insert({
      entry_id: entry?.id ?? null,
      action,
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      day_label_snapshot: entry?.day_label ?? null,
      timing_label_snapshot: entry?.timing_label ?? null,
      sport_label_snapshot: entry?.sport_label ?? null,
      category_label_snapshot: entry?.category_label ?? null,
      venue_snapshot: entry?.venue ?? null,
      home_team_name_snapshot: entry?.home_team_name ?? null,
      away_team_name_snapshot: entry?.away_team_name ?? null,
    });

  if (
    error &&
    !isOptionalActivityLogError(error, featuredMatchupActivityLogsTable)
  ) {
    throw error;
  }
}

function normalizeFeaturedMatchupActivityLog(row) {
  return {
    id:
      row?.id ??
      `${row?.entry_id ?? "entry"}-${row?.created_at ?? "time"}-${row?.action ?? "action"}`,
    entry_id: row?.entry_id ?? null,
    action: row?.action ?? "updated",
    actor_email:
      row?.actor_email ??
      row?.updated_by_email ??
      row?.admin_email ??
      "Unknown admin",
    day_label_snapshot: row?.day_label_snapshot ?? row?.day_label ?? null,
    timing_label_snapshot:
      row?.timing_label_snapshot ?? row?.time_label ?? null,
    sport_label_snapshot: row?.sport_label_snapshot ?? row?.event_label ?? null,
    category_label_snapshot:
      row?.category_label_snapshot ?? row?.note_label ?? null,
    venue_snapshot: row?.venue_snapshot ?? row?.venue ?? null,
    home_team_name_snapshot:
      row?.home_team_name_snapshot ?? row?.home_team_name ?? "Unknown",
    away_team_name_snapshot:
      row?.away_team_name_snapshot ?? row?.away_team_name ?? "Unknown",
    created_at: row?.created_at ?? row?.updated_at ?? null,
    source: row?.source ?? "entries",
  };
}

async function getLegacyFeaturedMatchupLogs(limit = 20) {
  const query = supabase
    .from(legacyFeaturedMatchupLogsTable)
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } =
    typeof limit === "number" ? await query.limit(limit) : await query;

  if (error) {
    if (
      isMissingTableError(error, legacyFeaturedMatchupLogsTable) ||
      error.code === "42501"
    ) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) =>
    normalizeFeaturedMatchupActivityLog({
      ...row,
      action: row?.action ?? "updated",
      source: "legacy",
    }),
  );
}

export function getDefaultFeaturedMatchupEntry() {
  return { ...defaultFeaturedMatchupEntry };
}

export function getDefaultFeaturedMatchupEntries() {
  return [];
}

export function getDefaultFeaturedMatchup() {
  return toLegacyFeaturedMatchupShape(defaultFeaturedMatchupEntry);
}

export async function getFeaturedMatchupEntries({
  limit,
  includeUnpublished = false,
} = {}) {
  let query = supabase
    .from(featuredMatchupEntriesTable)
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } =
    typeof limit === "number" ? await query.limit(limit) : await query;

  if (error) {
    if (isMissingTableError(error, featuredMatchupEntriesTable)) {
      const legacyEntry = await getLegacyFeaturedMatchupRow();
      return legacyEntry ? [legacyEntry] : [];
    }

    throw error;
  }

  return (data ?? []).map((row) => normalizeFeaturedMatchupEntry(row));
}

export async function getFeaturedMatchupEntry() {
  const entries = await getFeaturedMatchupEntries({
    limit: 1,
    includeUnpublished: false,
  });

  return entries[0] ?? getDefaultFeaturedMatchupEntry();
}

export async function getFeaturedMatchup() {
  const entry = await getFeaturedMatchupEntry();
  return toLegacyFeaturedMatchupShape(entry);
}

export async function createFeaturedMatchupEntry(formState, actor) {
  ensureSupabaseWriteAccess();

  const payload = buildEntryPayload(formState, actor);
  let { data, error } = await supabase
    .from(featuredMatchupEntriesTable)
    .insert(payload)
    .select("*")
    .single();

  if (error && shouldRetryWithoutIncludedMatches(error)) {
    const { included_matches, ...payloadWithoutIncludedMatches } = payload;
    const retry = await supabase
      .from(featuredMatchupEntriesTable)
      .insert(payloadWithoutIncludedMatches)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isMissingTableError(error, featuredMatchupEntriesTable)) {
      const legacySavedEntry = await upsertLegacyFeaturedMatchupFromEntry(
        payload,
        actor,
      );
      return legacySavedEntry;
    }

    throw error;
  }

  const savedEntry = normalizeFeaturedMatchupEntry(data);
  await syncLegacyFeaturedMatchup(payload, actor);
  await writeFeaturedMatchupActivityLog({
    action: "created",
    actor,
    entry: savedEntry,
  });
  return savedEntry;
}

export async function updateFeaturedMatchupEntry(entry, formState, actor) {
  ensureSupabaseWriteAccess();

  if (!entry?.id || String(entry.id).startsWith("legacy-")) {
    throw new Error(
      "Legacy featured matchup data cannot be edited as carousel entries until the new featured matchup schema is applied.",
    );
  }

  const payload = buildEntryPayload(formState, actor, entry);
  let { data, error } = await supabase
    .from(featuredMatchupEntriesTable)
    .update(payload)
    .eq("id", entry.id)
    .select("*")
    .single();

  if (error && shouldRetryWithoutIncludedMatches(error)) {
    const { included_matches, ...payloadWithoutIncludedMatches } = payload;
    const retry = await supabase
      .from(featuredMatchupEntriesTable)
      .update(payloadWithoutIncludedMatches)
      .eq("id", entry.id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isMissingTableError(error, featuredMatchupEntriesTable)) {
      const legacySavedEntry = await upsertLegacyFeaturedMatchupFromEntry(
        payload,
        actor,
      );
      return legacySavedEntry;
    }

    throw error;
  }

  const savedEntry = normalizeFeaturedMatchupEntry(data);
  await syncLegacyFeaturedMatchup(payload, actor);
  await writeFeaturedMatchupActivityLog({
    action: "updated",
    actor,
    entry: savedEntry,
  });
  return savedEntry;
}

export async function deleteFeaturedMatchupEntry(entry, actor) {
  ensureSupabaseWriteAccess();

  if (!entry?.id || String(entry.id).startsWith("legacy-")) {
    throw new Error(
      "Legacy featured matchup data cannot be deleted as a carousel entry until the new featured matchup schema is applied.",
    );
  }

  await writeFeaturedMatchupActivityLog({
    action: "deleted",
    actor,
    entry,
  });

  const { error } = await supabase
    .from(featuredMatchupEntriesTable)
    .delete()
    .eq("id", entry.id);

  if (error) {
    if (isMissingTableError(error, featuredMatchupEntriesTable)) {
      const { error: legacyDeleteError } = await supabase
        .from(legacyFeaturedMatchupTable)
        .delete()
        .eq("id", 1);

      if (legacyDeleteError) {
        throw legacyDeleteError;
      }

      return;
    }

    throw error;
  }

  await syncLegacyFeaturedMatchupFromCurrentEntries(actor);
}

export async function saveFeaturedMatchup(formState, actor) {
  if (formState?.id) {
    return updateFeaturedMatchupEntry(formState, formState, actor);
  }

  const [existingEntry] = await getFeaturedMatchupEntries({
    limit: 1,
    includeUnpublished: true,
  });

  if (existingEntry && !String(existingEntry.id).startsWith("legacy-")) {
    return updateFeaturedMatchupEntry(existingEntry, formState, actor);
  }

  return createFeaturedMatchupEntry(formState, actor);
}

export async function getFeaturedMatchupLogs(limit = 20) {
  const query = supabase
    .from(featuredMatchupActivityLogsTable)
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } =
    typeof limit === "number" ? await query.limit(limit) : await query;

  if (error) {
    if (
      isMissingTableError(error, featuredMatchupActivityLogsTable) ||
      error.code === "42501"
    ) {
      return getLegacyFeaturedMatchupLogs(limit);
    }

    throw error;
  }

  return (data ?? []).map((row) => normalizeFeaturedMatchupActivityLog(row));
}
