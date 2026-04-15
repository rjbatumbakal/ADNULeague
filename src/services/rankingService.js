import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const rankingPlaceOptions = [1, 2, 3, 4, 5, 6, 7, 8];

function createEventResultSelectQuery() {
  return `
    id,
    event_id,
    department_id,
    rank,
    points_awarded,
    admin_email,
    updated_at,
    department:departments (
      id,
      name,
      acronym
    ),
    event:events (
      id,
      name,
      category
    )
  `;
}

export function formatPoints(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 10,
  }).format(numericValue);
}

function normalizeDepartment(row) {
  return {
    id: row?.id ?? "",
    name: row?.name?.trim?.() ?? "Unknown department",
    acronym: row?.acronym?.trim?.() ?? row?.name?.trim?.() ?? "N/A",
  };
}

function normalizeEvent(row) {
  return {
    id: row?.id ?? "",
    name: row?.name?.trim?.() ?? "Untitled event",
    category: row?.category?.trim?.() ?? "Uncategorized",
  };
}

function normalizeEventResult(row) {
  const department = row?.department ?? row?.departments ?? null;
  const event = row?.event ?? row?.events ?? null;

  return {
    id:
      row?.id ??
      `${row?.event_id ?? "event"}-${row?.department_id ?? "department"}`,
    event_id: row?.event_id ?? event?.id ?? "",
    department_id: row?.department_id ?? department?.id ?? "",
    rank: Number(row?.rank ?? 0),
    points_awarded: Number(row?.points_awarded ?? 0),
    admin_email: row?.admin_email ?? null,
    updated_at: row?.updated_at ?? null,
    department: department ? normalizeDepartment(department) : null,
    event: event ? normalizeEvent(event) : null,
  };
}

function sortByName(rows, key) {
  return [...rows].sort((left, right) =>
    String(left?.[key] ?? "").localeCompare(String(right?.[key] ?? "")),
  );
}

function getSortableRankValue(rank) {
  const numericRank = Number(rank ?? 0);

  if (!Number.isFinite(numericRank) || numericRank <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  return numericRank;
}

function isDefaultRank(rank) {
  return getSortableRankValue(rank) === Number.POSITIVE_INFINITY;
}

function sortEventResults(rows) {
  return [...rows].sort((left, right) => {
    const leftCategory = left.event?.category ?? "";
    const rightCategory = right.event?.category ?? "";
    const categoryComparison = leftCategory.localeCompare(rightCategory);

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    const leftEventName = left.event?.name ?? "";
    const rightEventName = right.event?.name ?? "";
    const eventComparison = leftEventName.localeCompare(rightEventName);

    if (eventComparison !== 0) {
      return eventComparison;
    }

    const leftRank = getSortableRankValue(left.rank);
    const rightRank = getSortableRankValue(right.rank);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftDepartmentAcronym = left.department?.acronym ?? "";
    const rightDepartmentAcronym = right.department?.acronym ?? "";
    const acronymComparison = leftDepartmentAcronym.localeCompare(
      rightDepartmentAcronym,
    );

    if (acronymComparison !== 0) {
      return acronymComparison;
    }

    const leftDepartmentName = left.department?.name ?? "";
    const rightDepartmentName = right.department?.name ?? "";

    return leftDepartmentName.localeCompare(rightDepartmentName);
  });
}

function sortScoringActivityEntries(rows) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? 0).getTime();
    const rightTime = new Date(right.updated_at ?? 0).getTime();

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    const categoryComparison = String(left.event_category ?? "").localeCompare(
      String(right.event_category ?? ""),
    );

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    return String(left.event_name ?? "").localeCompare(
      String(right.event_name ?? ""),
    );
  });
}

function createOverallStanding(department) {
  return {
    id: department.id,
    department_id: department.id,
    department_name: department.name,
    department_acronym: department.acronym,
    total_points: 0,
    place_counts: Object.fromEntries(
      rankingPlaceOptions.map((rank) => [rank, 0]),
    ),
  };
}

function sortOverallStandings(rows) {
  return [...rows].sort((left, right) => {
    if (left.total_points !== right.total_points) {
      return right.total_points - left.total_points;
    }

    for (const rank of rankingPlaceOptions) {
      const leftCount = left.place_counts[rank] ?? 0;
      const rightCount = right.place_counts[rank] ?? 0;

      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
    }

    return left.department_name.localeCompare(right.department_name);
  });
}

function sortEventsForBreakdown(rows) {
  return [...rows].sort((left, right) => {
    const categoryComparison = String(left?.category ?? "").localeCompare(
      String(right?.category ?? ""),
    );

    if (categoryComparison !== 0) {
      return categoryComparison;
    }

    return String(left?.name ?? "").localeCompare(String(right?.name ?? ""));
  });
}

function getScoredEvents(events, eventResults) {
  const eventsById = new Map(
    events.map((event) => [String(event.id ?? ""), normalizeEvent(event)]),
  );
  const scoredEventsById = new Map();

  eventResults.forEach((eventResult) => {
    const eventId = String(eventResult.event_id ?? eventResult.event?.id ?? "");

    if (!eventId || scoredEventsById.has(eventId)) {
      return;
    }

    scoredEventsById.set(
      eventId,
      normalizeEvent(
        eventResult.event ?? eventsById.get(eventId) ?? { id: eventId },
      ),
    );
  });

  return sortEventsForBreakdown([...scoredEventsById.values()]);
}

function groupBreakdownByCategory(eventBreakdown) {
  return eventBreakdown.reduce((groupedBreakdown, event) => {
    const category = String(event?.event_category ?? "").trim() || "Uncategorized";

    if (!groupedBreakdown[category]) {
      groupedBreakdown[category] = [];
    }

    groupedBreakdown[category].push(event);
    return groupedBreakdown;
  }, {});
}

function normalizeScoreRows(scoreRows) {
  return rankingPlaceOptions.map((rank) => {
    const row = scoreRows.find(
      (currentRow) => Number(currentRow.rank) === Number(rank),
    );

    return {
      rank,
      department_ids: Array.from(
        new Set((row?.department_ids ?? []).filter(Boolean)),
      ),
      points_awarded:
        row?.points_awarded === null || row?.points_awarded === undefined
          ? ""
          : String(row.points_awarded).trim(),
    };
  });
}

function sanitizeScoreRowsForSave(
  scoreRows,
  { allowEmptyPointsAsZero = false } = {},
) {
  return scoreRows.map((row) => {
    const hasSelectedDepartments = row.department_ids.length > 0;
    const hasMissingPoints =
      row.points_awarded === null ||
      row.points_awarded === undefined ||
      String(row.points_awarded).trim() === "";

    if (
      allowEmptyPointsAsZero &&
      hasSelectedDepartments &&
      hasMissingPoints
    ) {
      return {
        ...row,
        points_awarded: "0",
      };
    }

    return row;
  });
}

function validateScoreRows(scoreRows, { allowEmptyPointsAsZero = false } = {}) {
  const selectedDepartmentIds = new Set();

  scoreRows.forEach((row) => {
    if (!row.department_ids.length) {
      return;
    }

    const hasMissingPoints = String(row.points_awarded).trim() === "";

    if (hasMissingPoints && !allowEmptyPointsAsZero) {
      throw new Error(
        `Enter points for ${formatRankLabel(row.rank)} place selections.`,
      );
    }

    const numericPoints = hasMissingPoints ? 0 : Number(row.points_awarded);

    if (!Number.isFinite(numericPoints)) {
      throw new Error(
        `Points for ${formatRankLabel(row.rank)} place must be a valid number.`,
      );
    }

    row.department_ids.forEach((departmentId) => {
      if (selectedDepartmentIds.has(departmentId)) {
        throw new Error(
          "Each department can only be assigned to one rank per event.",
        );
      }

      selectedDepartmentIds.add(departmentId);
    });
  });
}

function createEventResultsPayload(eventId, scoreRows, actorEmail, updatedAt) {
  return scoreRows.flatMap((row) =>
    row.department_ids.map((departmentId) => ({
      event_id: eventId,
      department_id: departmentId,
      rank: row.rank,
      points_awarded: Number(row.points_awarded),
      admin_email: actorEmail,
      updated_at: updatedAt,
    })),
  );
}

export function formatRankLabel(rank) {
  const numericRank = Number(rank);

  if (numericRank % 100 >= 11 && numericRank % 100 <= 13) {
    return `${numericRank}th`;
  }

  switch (numericRank % 10) {
    case 1:
      return `${numericRank}st`;
    case 2:
      return `${numericRank}nd`;
    case 3:
      return `${numericRank}rd`;
    default:
      return `${numericRank}th`;
  }
}

export function formatRankingDateTime(value) {
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

export function createEmptyScoreRows() {
  return rankingPlaceOptions.map((rank) => ({
    rank,
    department_ids: [],
    points_awarded: "",
  }));
}

export function groupEventsByCategory(events) {
  const eventsByCategory = events.reduce((groups, event) => {
    const category = event.category || "Uncategorized";

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category).push(event);
    return groups;
  }, new Map());

  return [...eventsByCategory.entries()]
    .map(([category, groupedEvents]) => ({
      category,
      events: sortByName(groupedEvents, "name"),
    }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

export function getEventResultsForEvent(eventResults, eventId) {
  return sortEventResults(
    eventResults.filter(
      (eventResult) => String(eventResult.event_id) === String(eventId),
    ),
  );
}

export function getLastEventUpdate(eventResults) {
  if (!eventResults.length) {
    return null;
  }

  const latestResult = [...eventResults].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? 0).getTime();
    const rightTime = new Date(right.updated_at ?? 0).getTime();
    return rightTime - leftTime;
  })[0];

  return {
    admin_email: latestResult.admin_email ?? "Unknown admin",
    updated_at: latestResult.updated_at ?? null,
  };
}

export function buildScoreRowsFromResults(eventResults) {
  const rows = createEmptyScoreRows();
  const rowsByRank = new Map(rows.map((row) => [row.rank, row]));

  getEventResultsForEvent(eventResults, eventResults[0]?.event_id ?? "")
    .forEach((result) => {
      const row = rowsByRank.get(Number(result.rank));

      if (!row) {
        return;
      }

      row.department_ids.push(result.department_id);

      if (row.points_awarded === "") {
        row.points_awarded = String(result.points_awarded);
      }
    });

  return rows;
}

export function buildOverallStandings(departments, eventResults) {
  const standingsByDepartmentId = new Map(
    departments.map((department) => [
      department.id,
      createOverallStanding(department),
    ]),
  );

  eventResults.forEach((eventResult) => {
    const department =
      standingsByDepartmentId.get(eventResult.department_id) ??
      createOverallStanding(
        eventResult.department ?? {
          id: eventResult.department_id,
          name: "Unknown department",
          acronym: "N/A",
        },
      );

    if (!standingsByDepartmentId.has(eventResult.department_id)) {
      standingsByDepartmentId.set(eventResult.department_id, department);
    }

    department.total_points += Number(eventResult.points_awarded) || 0;
    const numericRank = Number(eventResult.rank);

    if (rankingPlaceOptions.includes(numericRank)) {
      department.place_counts[numericRank] += 1;
    }
  });

  return sortOverallStandings([...standingsByDepartmentId.values()]);
}

export function buildMasterTabulation(departments, events, eventResults) {
  const overallStandings = buildOverallStandings(departments, eventResults);
  const scoredEvents = getScoredEvents(events, eventResults);
  const resultsByDepartmentId = eventResults.reduce((accumulator, eventResult) => {
    const departmentId = String(
      eventResult.department_id ?? eventResult.department?.id ?? "",
    );
    const eventId = String(eventResult.event_id ?? eventResult.event?.id ?? "");

    if (!departmentId || !eventId) {
      return accumulator;
    }

    if (!accumulator.has(departmentId)) {
      accumulator.set(departmentId, new Map());
    }

    accumulator.get(departmentId).set(eventId, eventResult);
    return accumulator;
  }, new Map());

  return overallStandings.map((standing) => {
    const departmentResultsByEventId =
      resultsByDepartmentId.get(String(standing.department_id)) ?? new Map();

    const event_breakdown = scoredEvents.map((event) => {
      const eventResult = departmentResultsByEventId.get(String(event.id));

      if (!eventResult) {
        return {
          event_id: event.id,
          event_name: event.name,
          event_category: event.category,
          points_awarded: 0,
          rank: "D",
          isDefault: true,
        };
      }

      const defaulted = isDefaultRank(eventResult.rank);

      return {
        event_id: event.id,
        event_name: eventResult.event?.name ?? event.name,
        event_category: eventResult.event?.category ?? event.category,
        points_awarded: defaulted ? 0 : Number(eventResult.points_awarded ?? 0),
        rank: defaulted ? "D" : Number(eventResult.rank),
        isDefault: defaulted,
      };
    });

    return {
      ...standing,
      event_breakdown,
      event_breakdown_by_category: groupBreakdownByCategory(event_breakdown),
    };
  });
}

export function buildEventStandings(departments, eventResults, eventId) {
  const filteredEventResults = getEventResultsForEvent(eventResults, eventId);

  if (!filteredEventResults.length) {
    return [];
  }

  const eventStandingRows = filteredEventResults.map((eventResult) => ({
    id: eventResult.id,
    department_id: eventResult.department_id ?? eventResult.department?.id ?? "",
    rank: isDefaultRank(eventResult.rank) ? null : Number(eventResult.rank),
    department_name: eventResult.department?.name ?? "Unknown department",
    department_acronym: eventResult.department?.acronym ?? "N/A",
    points_awarded: isDefaultRank(eventResult.rank)
      ? null
      : Number(eventResult.points_awarded ?? 0),
    defaulted: isDefaultRank(eventResult.rank),
  }));

  const standingsByDepartmentId = new Map(
    eventStandingRows.map((standing) => [String(standing.department_id), standing]),
  );

  return departments
    .map((department) => {
      const existingStanding = standingsByDepartmentId.get(String(department.id));

      if (existingStanding) {
        return existingStanding;
      }

      return {
        id: `defaulted-${eventId}-${department.id}`,
        department_id: department.id,
        rank: null,
        department_name: department.name ?? "Unknown department",
        department_acronym: department.acronym ?? "N/A",
        points_awarded: null,
        defaulted: true,
      };
    })
    .sort((left, right) => {
      const leftRank = getSortableRankValue(left.rank);
      const rightRank = getSortableRankValue(right.rank);

      if (left.defaulted !== right.defaulted) {
        return left.defaulted ? 1 : -1;
      }

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const acronymComparison = String(left.department_acronym ?? "").localeCompare(
        String(right.department_acronym ?? ""),
      );

      if (acronymComparison !== 0) {
        return acronymComparison;
      }

      return String(left.department_name ?? "").localeCompare(
        String(right.department_name ?? ""),
      );
    });
}

export function buildScoringActivityEntries(eventResults) {
  const activityEntries = eventResults.reduce((entries, eventResult) => {
    const eventId = String(eventResult.event_id ?? eventResult.event?.id ?? "");
    const updatedAt = eventResult.updated_at ?? null;

    if (!eventId || !updatedAt) {
      return entries;
    }

    const adminEmail = eventResult.admin_email ?? "Unknown admin";
    const key = [eventId, adminEmail, updatedAt].join("::");

    if (!entries.has(key)) {
      entries.set(key, {
        id: key,
        event_id: eventId,
        event_name: eventResult.event?.name ?? "Untitled event",
        event_category: eventResult.event?.category ?? "Uncategorized",
        admin_email: adminEmail,
        updated_at: updatedAt,
        result_count: 0,
        ranks: new Set(),
      });
    }

    const entry = entries.get(key);
    entry.result_count += 1;

    if (rankingPlaceOptions.includes(Number(eventResult.rank))) {
      entry.ranks.add(Number(eventResult.rank));
    }

    return entries;
  }, new Map());

  return sortScoringActivityEntries(
    [...activityEntries.values()].map((entry) => ({
      ...entry,
      ranks: [...entry.ranks].sort((left, right) => left - right),
    })),
  );
}

export async function getDepartments() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((row) => normalizeDepartment(row));
}

export async function getEvents() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map((row) => normalizeEvent(row));
}

export async function getEventResults() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_results")
    .select(createEventResultSelectQuery())
    .order("updated_at", { ascending: false })
    .order("rank", { ascending: true });

  if (error) {
    throw error;
  }

  return sortEventResults(data.map((row) => normalizeEventResult(row)));
}

export async function getRankingReferenceData() {
  const [departments, events, eventResults] = await Promise.all([
    getDepartments(),
    getEvents(),
    getEventResults(),
  ]);

  return {
    departments,
    events,
    eventResults,
  };
}

export async function saveEventResults({
  eventId,
  scoreRows,
  actorEmail,
  allowEmptyPointsAsZero = false,
}) {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured before you can save event scoring.",
    );
  }

  if (!eventId) {
    throw new Error("Select an event before saving results.");
  }

  if (!actorEmail) {
    throw new Error("Your admin account email is required to save results.");
  }

  const normalizedScoreRows = normalizeScoreRows(scoreRows);
  const sanitizedScoreRows = sanitizeScoreRowsForSave(normalizedScoreRows, {
    allowEmptyPointsAsZero,
  });
  validateScoreRows(sanitizedScoreRows, { allowEmptyPointsAsZero });
  const filledScoreRows = sanitizedScoreRows.filter(
    (row) => row.department_ids.length > 0,
  );

  const updatedAt = new Date().toISOString();
  const nextPayload = createEventResultsPayload(
    eventId,
    filledScoreRows,
    actorEmail,
    updatedAt,
  );
  const filteredPayload = nextPayload.filter(
    (row) => String(row.department_id ?? "").trim() !== "",
  );

  const { error: clearEventError } = await supabase
    .from("event_results")
    .delete()
    .eq("event_id", eventId);

  if (clearEventError) {
    throw clearEventError;
  }

  if (filteredPayload.length) {
    const { error: insertError } = await supabase
      .from("event_results")
      .insert(filteredPayload);

    if (insertError) {
      throw insertError;
    }
  }

  return updatedAt;
}
