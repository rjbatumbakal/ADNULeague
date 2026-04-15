import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { TOURNAMENT_SCHEDULE } from "../pages/Bracketing";

const matchesTable = "matches";
const leaderboardView = "leaderboard";

const bracketKeyToLabel = {
  bracketA: "A",
  bracketB: "B",
  finals: "Finals",
};

function ensureSupabaseWriteAccess() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured in this local environment yet. Use a real Supabase project to manage match results.",
    );
  }
}

function getMatchTeamName(match, side) {
  if (side === "a") {
    return (
      match.team_a_name ??
      match.team_a ??
      match.home_team_name ??
      match.home_team ??
      "TBA"
    );
  }

  return (
    match.team_b_name ??
    match.team_b ??
    match.away_team_name ??
    match.away_team ??
    "TBA"
  );
}

function getMatchTeamId(match, side) {
  if (side === "a") {
    return (
      match.team_a_id ??
      match.home_team_id ??
      match.department_a_id ??
      match.team_a ??
      null
    );
  }

  return (
    match.team_b_id ??
    match.away_team_id ??
    match.department_b_id ??
    match.team_b ??
    null
  );
}

function getGameLabel(match, index = 0) {
  if (match.game_label) {
    return String(match.game_label);
  }

  if (match.game) {
    return String(match.game);
  }

  if (Number.isFinite(Number(match.game_no))) {
    return `G${match.game_no}`;
  }

  return `G${index + 1}`;
}

function splitMatchupTeams(matchup) {
  const matchupText = String(matchup ?? "").trim();
  if (!matchupText) {
    return ["TBA", "TBA"];
  }

  const [teamA, teamB] = matchupText.split(/\s+vs\s+/i);
  return [teamA?.trim() || "TBA", teamB?.trim() || "TBA"];
}

function sanitizeTeamNameForStorage(teamName) {
  const normalizedName = String(teamName ?? "")
    .trim()
    .toUpperCase();
  return normalizedName || "TBA";
}

function normalizeMatch(match, index = 0) {
  return {
    ...match,
    gameLabel: getGameLabel(match, index),
    teamAName: getMatchTeamName(match, "a"),
    teamBName: getMatchTeamName(match, "b"),
    teamAId: getMatchTeamId(match, "a"),
    teamBId: getMatchTeamId(match, "b"),
    winnerByDefault: Boolean(match.winner_by_default ?? false),
    isCompleted: Boolean(match.is_completed ?? match.winner_id),
    status: Boolean(match.is_completed ?? match.winner_id)
      ? "Completed"
      : "Pending",
  };
}

function hasWinnerByDefaultColumnError(error) {
  const errorMessage = String(error?.message ?? "").toLowerCase();
  return (
    errorMessage.includes("winner_by_default") &&
    (errorMessage.includes("column") || errorMessage.includes("schema cache"))
  );
}

export async function getMatchesForAdmin() {
  const { data, error } = await supabase
    .from(matchesTable)
    .select("*")
    .order("sport", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((match, index) => normalizeMatch(match, index));
}

export async function getLeaderboardSnapshotBySport() {
  const { data, error } = await supabase
    .from(leaderboardView)
    .select("*")
    .order("sport", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function declareMatchWinner(match, winnerId) {
  ensureSupabaseWriteAccess();

  const { error } = await supabase
    .from(matchesTable)
    .update({
      winner_id: winnerId,
      is_completed: true,
    })
    .eq("id", match.id);

  if (error) {
    throw error;
  }
}

export async function resetMatchResult(match) {
  ensureSupabaseWriteAccess();

  const basePayload = {
    winner_id: null,
    is_completed: false,
    team_a_score: null,
    team_b_score: null,
  };

  const { error } = await supabase
    .from(matchesTable)
    .update({
      ...basePayload,
      winner_by_default: false,
    })
    .eq("id", match.id);

  if (!error) {
    return;
  }

  if (!hasWinnerByDefaultColumnError(error)) {
    throw error;
  }

  const { error: fallbackError } = await supabase
    .from(matchesTable)
    .update(basePayload)
    .eq("id", match.id);

  if (fallbackError) {
    throw fallbackError;
  }
}

export async function updateMatchTeamName(match, side, teamName) {
  ensureSupabaseWriteAccess();

  const sanitizedSide = String(side ?? "")
    .trim()
    .toLowerCase();
  if (sanitizedSide !== "a" && sanitizedSide !== "b") {
    throw new Error("Invalid team side. Expected 'a' or 'b'.");
  }

  const payload =
    sanitizedSide === "a"
      ? { team_a_name: teamName }
      : { team_b_name: teamName };

  const { error } = await supabase
    .from(matchesTable)
    .update(payload)
    .eq("id", match.id);

  if (error) {
    throw error;
  }
}

export async function updateMatchScores(match, teamAScore, teamBScore) {
  ensureSupabaseWriteAccess();

  const valueA = String(teamAScore ?? "").trim();
  const valueB = String(teamBScore ?? "").trim();
  const parsedTeamAScore = valueA === "" ? null : parseInt(valueA, 10);
  const parsedTeamBScore = valueB === "" ? null : parseInt(valueB, 10);

  if (
    (parsedTeamAScore !== null && !Number.isFinite(parsedTeamAScore)) ||
    (parsedTeamBScore !== null && !Number.isFinite(parsedTeamBScore))
  ) {
    throw new Error("Scores must be valid numbers.");
  }

  const { error } = await supabase
    .from(matchesTable)
    .update({
      team_a_score: valueA === "" ? null : parseInt(valueA, 10),
      team_b_score: valueB === "" ? null : parseInt(valueB, 10),
    })
    .eq("id", match.id);

  if (error) {
    throw error;
  }
}

export async function confirmMatchResult(
  match,
  winnerId,
  teamAScore,
  teamBScore,
  teamAName,
  teamBName,
  winnerByDefault = false,
) {
  ensureSupabaseWriteAccess();

  if (!winnerId) {
    throw new Error("Winner is required before confirming the result.");
  }

  const normalizedTeamAName = sanitizeTeamNameForStorage(teamAName);
  const normalizedTeamBName = sanitizeTeamNameForStorage(teamBName);

  const valueA = String(teamAScore ?? "").trim();
  const valueB = String(teamBScore ?? "").trim();
  const parsedTeamAScore = valueA === "" ? null : parseInt(valueA, 10);
  const parsedTeamBScore = valueB === "" ? null : parseInt(valueB, 10);

  if (
    (parsedTeamAScore !== null && !Number.isFinite(parsedTeamAScore)) ||
    (parsedTeamBScore !== null && !Number.isFinite(parsedTeamBScore))
  ) {
    throw new Error("Scores must be valid numbers.");
  }

  const payload = {
    team_a_name: normalizedTeamAName,
    team_b_name: normalizedTeamBName,
    team_a_score: valueA === "" ? null : parseInt(valueA, 10),
    team_b_score: valueB === "" ? null : parseInt(valueB, 10),
    winner_id: winnerId,
    is_completed: true,
    winner_by_default: Boolean(winnerByDefault),
  };

  const { error } = await supabase
    .from(matchesTable)
    .update(payload)
    .eq("id", match.id);

  if (!error) {
    return;
  }

  if (!hasWinnerByDefaultColumnError(error)) {
    throw error;
  }

  const fallbackPayload = {
    team_a_name: normalizedTeamAName,
    team_b_name: normalizedTeamBName,
    team_a_score: valueA === "" ? null : parseInt(valueA, 10),
    team_b_score: valueB === "" ? null : parseInt(valueB, 10),
    winner_id: winnerId,
    is_completed: true,
  };

  const { error: fallbackError } = await supabase
    .from(matchesTable)
    .update(fallbackPayload)
    .eq("id", match.id);

  if (fallbackError) {
    throw fallbackError;
  }
}

export async function saveMatchupTeams(match, teamAName, teamBName) {
  ensureSupabaseWriteAccess();

  const normalizedTeamAName = sanitizeTeamNameForStorage(teamAName);
  const normalizedTeamBName = sanitizeTeamNameForStorage(teamBName);

  const { error } = await supabase
    .from(matchesTable)
    .update({
      team_a_name: normalizedTeamAName,
      team_b_name: normalizedTeamBName,
    })
    .eq("id", match.id);

  if (error) {
    throw error;
  }
}

export async function createEventMatchTemplate(sportName) {
  ensureSupabaseWriteAccess();

  const normalizedSport = String(sportName ?? "").trim();

  if (!normalizedSport) {
    throw new Error("Event name is required.");
  }

  const { data: existingMatches, error: existingError } = await supabase
    .from(matchesTable)
    .select("id")
    .eq("sport", normalizedSport)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if ((existingMatches ?? []).length) {
    throw new Error("This event already exists.");
  }

  const rowsToInsert = [
    ...Array.from({ length: 6 }, (_, index) => ({
      sport: normalizedSport,
      bracket: "A",
      game_label: `G${index + 1}`,
      team_a_name: "TBA",
      team_b_name: "TBA",
      winner_id: null,
      is_completed: false,
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      sport: normalizedSport,
      bracket: "B",
      game_label: `G${index + 1}`,
      team_a_name: "TBA",
      team_b_name: "TBA",
      winner_id: null,
      is_completed: false,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      sport: normalizedSport,
      bracket: "Finals",
      game_label: `G${index + 7}`,
      team_a_name: "TBA",
      team_b_name: "TBA",
      winner_id: null,
      is_completed: false,
    })),
  ];

  const { error: insertError } = await supabase
    .from(matchesTable)
    .insert(rowsToInsert);

  if (insertError) {
    throw insertError;
  }

  return {
    sport: normalizedSport,
    inserted: rowsToInsert.length,
  };
}

export async function deleteEventMatches(sportName) {
  ensureSupabaseWriteAccess();

  const normalizedSport = String(sportName ?? "").trim();

  if (!normalizedSport) {
    throw new Error("Event name is required.");
  }

  const { data, error } = await supabase
    .from(matchesTable)
    .delete()
    .eq("sport", normalizedSport)
    .select("id");

  if (error) {
    throw error;
  }

  return {
    sport: normalizedSport,
    deleted: Array.isArray(data) ? data.length : 0,
  };
}

export async function seedMatches() {
  ensureSupabaseWriteAccess();

  const rowsToSeed = [];

  Object.entries(TOURNAMENT_SCHEDULE).forEach(([sport, schedule]) => {
    Object.entries(bracketKeyToLabel).forEach(([scheduleKey, bracketLabel]) => {
      const matches = schedule?.[scheduleKey] ?? [];

      matches.forEach((match, index) => {
        const [teamAName, teamBName] = splitMatchupTeams(match?.matchup);

        rowsToSeed.push({
          sport,
          bracket: bracketLabel,
          game_label: String(match?.game ?? `G${index + 1}`),
          team_a_name: teamAName,
          team_b_name: teamBName,
          is_completed: false,
          winner_id: null,
        });
      });
    });
  });

  const { data: existingMatches, error: existingError } = await supabase
    .from(matchesTable)
    .select("sport, bracket, game_label");

  if (existingError) {
    throw existingError;
  }

  const existingKeys = new Set(
    (existingMatches ?? []).map(
      (row) =>
        `${String(row.sport ?? "").toLowerCase()}::${String(row.bracket ?? "").toLowerCase()}::${String(row.game_label ?? "").toLowerCase()}`,
    ),
  );

  const rowsToInsert = rowsToSeed.filter((row) => {
    const key = `${String(row.sport).toLowerCase()}::${String(row.bracket).toLowerCase()}::${String(row.game_label).toLowerCase()}`;
    return !existingKeys.has(key);
  });

  if (!rowsToInsert.length) {
    return {
      inserted: 0,
      skipped: rowsToSeed.length,
      total: rowsToSeed.length,
    };
  }

  const { error: insertError } = await supabase
    .from(matchesTable)
    .insert(rowsToInsert);

  if (insertError) {
    throw insertError;
  }

  return {
    inserted: rowsToInsert.length,
    skipped: rowsToSeed.length - rowsToInsert.length,
    total: rowsToSeed.length,
  };
}
