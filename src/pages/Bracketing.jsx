import { useEffect, useMemo, useState } from "react";
import { Trophy, Volleyball, Dumbbell, ChevronDown } from "lucide-react";
import SectionHeading from "../components/ui/SectionHeading";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

export const TOURNAMENT_SCHEDULE = {
  "Basketball Men": {
    bracketA: [
      { game: "G1", matchup: "COL vs ACHSS" },
      { game: "G2", matchup: "ABBS vs ANSA" },
      { game: "G3", matchup: "ACHSS vs ABBS" },
      { game: "G4", matchup: "ANSA vs COL" },
      { game: "G5", matchup: "COL vs ABBS" },
      { game: "G6", matchup: "ANSA vs ACHSS" },
    ],
    bracketB: [
      { game: "G1", matchup: "STEP vs JPIA" },
      { game: "G2", matchup: "COCS vs AXI" },
      { game: "G3", matchup: "JPIA vs COCS" },
      { game: "G4", matchup: "AXI vs STEP" },
      { game: "G5", matchup: "STEP vs COCS" },
      { game: "G6", matchup: "AXI vs JPIA" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Basketball Women": {
    bracketA: [
      { game: "G1", matchup: "COCS vs COL" },
      { game: "G2", matchup: "AXI vs STEP" },
      { game: "G3", matchup: "COL vs AXI" },
      { game: "G4", matchup: "STEP vs COCS" },
      { game: "G5", matchup: "COCS vs AXI" },
      { game: "G6", matchup: "STEP vs COL" },
    ],
    bracketB: [
      { game: "G1", matchup: "ABBS vs JPIA" },
      { game: "G2", matchup: "ACHSS vs ANSA" },
      { game: "G3", matchup: "JPIA vs ACHSS" },
      { game: "G4", matchup: "ANSA vs ABBS" },
      { game: "G5", matchup: "ABBS vs ACHSS" },
      { game: "G6", matchup: "ANSA vs JPIA" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Volleyball Men": {
    bracketA: [
      { game: "G1", matchup: "AXI vs JPIA" },
      { game: "G2", matchup: "COL vs STEP" },
      { game: "G3", matchup: "JPIA vs COL" },
      { game: "G4", matchup: "STEP vs AXI" },
      { game: "G5", matchup: "AXI vs COL" },
      { game: "G6", matchup: "STEP vs JPIA" },
    ],
    bracketB: [
      { game: "G1", matchup: "ABBS vs COCS" },
      { game: "G2", matchup: "ACHSS vs ANSA" },
      { game: "G3", matchup: "COCS vs ACHSS" },
      { game: "G4", matchup: "ANSA vs ABBS" },
      { game: "G5", matchup: "ABBS vs ACHSS" },
      { game: "G6", matchup: "ANSA vs COCS" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Volleyball Women": {
    bracketA: [
      { game: "G1", matchup: "AXI vs COCS" },
      { game: "G2", matchup: "ACHSS vs ABBS" },
      { game: "G3", matchup: "COCS vs ACHSS" },
      { game: "G4", matchup: "ABBS vs AXI" },
      { game: "G5", matchup: "AXI vs ACHSS" },
      { game: "G6", matchup: "ABBS vs COCS" },
    ],
    bracketB: [
      { game: "G1", matchup: "STEP vs ANSA" },
      { game: "G2", matchup: "COL vs JPIA" },
      { game: "G3", matchup: "ANSA vs COL" },
      { game: "G4", matchup: "JPIA vs STEP" },
      { game: "G5", matchup: "STEP vs COL" },
      { game: "G6", matchup: "JPIA vs ANSA" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Futsal Women": {
    bracketA: [
      { game: "G1", matchup: "AXI vs JPIA" },
      { game: "G2", matchup: "COCS vs ANSA" },
      { game: "G3", matchup: "JPIA vs COCS" },
      { game: "G4", matchup: "ANSA vs AXI" },
      { game: "G5", matchup: "AXI vs COCS" },
      { game: "G6", matchup: "ANSA vs JPIA" },
    ],
    bracketB: [
      { game: "G1", matchup: "ACHSS vs STEP" },
      { game: "G2", matchup: "ABBS vs COL" },
      { game: "G3", matchup: "STEP vs ABBS" },
      { game: "G4", matchup: "COL vs ACHSS" },
      { game: "G5", matchup: "ACHSS vs ABBS" },
      { game: "G6", matchup: "COL vs STEP" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Football Men": {
    bracketA: [
      { game: "G1", matchup: "COL vs ABBS" },
      { game: "G2", matchup: "ACHSS vs STEP" },
      { game: "G3", matchup: "ABBS vs ACHSS" },
      { game: "G4", matchup: "STEP vs COL" },
      { game: "G5", matchup: "COL vs ACHSS" },
      { game: "G6", matchup: "STEP vs ABBS" },
    ],
    bracketB: [
      { game: "G1", matchup: "COCS vs AXI" },
      { game: "G2", matchup: "ANSA vs JPIA" },
      { game: "G3", matchup: "AXI vs ANSA" },
      { game: "G4", matchup: "JPIA vs COCS" },
      { game: "G5", matchup: "COCS vs ANSA" },
      { game: "G6", matchup: "JPIA vs AXI" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  Softball: {
    bracketA: [
      { game: "G1", matchup: "COL vs JPIA" },
      { game: "G2", matchup: "STEP vs AXI" },
      { game: "G3", matchup: "JPIA vs STEP" },
      { game: "G4", matchup: "AXI vs COL" },
      { game: "G5", matchup: "COL vs STEP" },
      { game: "G6", matchup: "AXI vs JPIA" },
    ],
    bracketB: [
      { game: "G1", matchup: "COCS vs ACHSS" },
      { game: "G2", matchup: "ANSA vs ABBS" },
      { game: "G3", matchup: "ACHSS vs ANSA" },
      { game: "G4", matchup: "ABBS vs COCS" },
      { game: "G5", matchup: "COCS vs ANSA" },
      { game: "G6", matchup: "ABBS vs ACHSS" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Table Tennis Men": {
    bracketA: [
      { game: "G1", matchup: "ABBS vs STEP" },
      { game: "G2", matchup: "JPIA vs COCS" },
      { game: "G3", matchup: "STEP vs JPIA" },
      { game: "G4", matchup: "COCS vs ABBS" },
      { game: "G5", matchup: "ABBS vs JPIA" },
      { game: "G6", matchup: "COCS vs STEP" },
    ],
    bracketB: [
      { game: "G1", matchup: "ACHSS vs COL" },
      { game: "G2", matchup: "AXI vs ANSA" },
      { game: "G3", matchup: "COL vs AXI" },
      { game: "G4", matchup: "ANSA vs ACHSS" },
      { game: "G5", matchup: "ACHSS vs AXI" },
      { game: "G6", matchup: "ANSA vs COL" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Table Tennis Women": {
    bracketA: [
      { game: "G1", matchup: "COCS vs STEP" },
      { game: "G2", matchup: "JPIA vs AXI" },
      { game: "G3", matchup: "STEP vs JPIA" },
      { game: "G4", matchup: "AXI vs COCS" },
      { game: "G5", matchup: "COCS vs JPIA" },
      { game: "G6", matchup: "AXI vs STEP" },
    ],
    bracketB: [
      { game: "G1", matchup: "ANSA vs COL" },
      { game: "G2", matchup: "ABBS vs ACHSS" },
      { game: "G3", matchup: "COL vs ABBS" },
      { game: "G4", matchup: "ACHSS vs ANSA" },
      { game: "G5", matchup: "ANSA vs ABBS" },
      { game: "G6", matchup: "ACHSS vs COL" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Badminton Men": {
    bracketA: [
      { game: "G1", matchup: "JPIA vs COCS" },
      { game: "G2", matchup: "AXI vs COL" },
      { game: "G3", matchup: "COCS vs AXI" },
      { game: "G4", matchup: "COL vs JPIA" },
      { game: "G5", matchup: "JPIA vs AXI" },
      { game: "G6", matchup: "COL vs COCS" },
    ],
    bracketB: [
      { game: "G1", matchup: "ACHSS vs STEP" },
      { game: "G2", matchup: "ABBS vs ANSA" },
      { game: "G3", matchup: "STEP vs ABBS" },
      { game: "G4", matchup: "ANSA vs ACHSS" },
      { game: "G5", matchup: "ACHSS vs ABBS" },
      { game: "G6", matchup: "ANSA vs STEP" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Badminton Women": {
    bracketA: [
      { game: "G1", matchup: "COL vs STEP" },
      { game: "G2", matchup: "ACHSS vs COCS" },
      { game: "G3", matchup: "STEP vs ACHSS" },
      { game: "G4", matchup: "COCS vs COL" },
      { game: "G5", matchup: "COL vs ACHSS" },
      { game: "G6", matchup: "COCS vs STEP" },
    ],
    bracketB: [
      { game: "G1", matchup: "JPIA vs ABBS" },
      { game: "G2", matchup: "ANSA vs AXI" },
      { game: "G3", matchup: "ABBS vs ANSA" },
      { game: "G4", matchup: "AXI vs JPIA" },
      { game: "G5", matchup: "JPIA vs ANSA" },
      { game: "G6", matchup: "AXI vs ABBS" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Lawn Tennis": {
    bracketA: [
      { game: "G1", matchup: "STEP vs COL" },
      { game: "G2", matchup: "ANSA vs AXI" },
      { game: "G3", matchup: "COL vs ANSA" },
      { game: "G4", matchup: "AXI vs STEP" },
      { game: "G5", matchup: "STEP vs ANSA" },
      { game: "G6", matchup: "AXI vs COL" },
    ],
    bracketB: [
      { game: "G1", matchup: "ABBS vs COCS" },
      { game: "G2", matchup: "JPIA vs ACHSS" },
      { game: "G3", matchup: "COCS vs JPIA" },
      { game: "G4", matchup: "ACHSS vs ABBS" },
      { game: "G5", matchup: "ABBS vs JPIA" },
      { game: "G6", matchup: "ACHSS vs COCS" },
    ],
    finals: [
      { game: "G7", matchup: "Top 4 A vs Top 4 B" },
      { game: "G8", matchup: "Top 3 A vs Top 3 B" },
      { game: "G9", matchup: "Top 2 A vs Top 2 B" },
      { game: "G10", matchup: "Top 1 A vs Top 1 B" },
    ],
  },
  "Billiards (Students)": {
    bracketA: [],
    bracketB: [],
    finals: [],
  },
  Tekken: {
    bracketA: [
      { game: "G1", matchup: "ANSA vs COL" },
      { game: "G2", matchup: "COCS vs ANSA" },
      { game: "G3", matchup: "COCS vs STEP" },
      { game: "G4", matchup: "COL vs STEP" },
      { game: "G5", matchup: "COL vs COCS" },
      { game: "G6", matchup: "STEP vs ANSA" },
    ],
    bracketB: [
      { game: "G1", matchup: "ABBS vs AXI" },
      { game: "G2", matchup: "AXI vs JPIA" },
      { game: "G3", matchup: "JPIA vs ACHSS" },
      { game: "G4", matchup: "ACHSS vs ABBS" },
      { game: "G5", matchup: "ABBS vs JPIA" },
      { game: "G6", matchup: "ACHSS vs AXI" },
    ],
    finals: [
      { game: "G7", matchup: "1st Seed A vs 2nd Seed B" },
      { game: "G8", matchup: "1st Seed B vs 2nd Seed A" },
      { game: "G9", matchup: "Loser G7 vs Loser G8" },
      { game: "G10", matchup: "Winner G7 vs Winner G8" },
    ],
  },
  "Call of Duty: Mobile": {
    bracketA: [
      { game: "G1", matchup: "AXI vs COCS" },
      { game: "G2", matchup: "COL vs JPIA" },
      { game: "G3", matchup: "JPIA vs AXI" },
      { game: "G4", matchup: "COCS vs COL" },
      { game: "G5", matchup: "COL vs AXI" },
      { game: "G6", matchup: "COCS vs JPIA" },
    ],
    bracketB: [
      { game: "G1", matchup: "ABBS vs STEP" },
      { game: "G2", matchup: "ANSA vs ACHSS" },
      { game: "G3", matchup: "ACHSS vs ABBS" },
      { game: "G4", matchup: "STEP vs ANSA" },
      { game: "G5", matchup: "ANSA vs ABBS" },
      { game: "G6", matchup: "STEP vs ACHSS" },
    ],
    finals: [
      { game: "G7", matchup: "1ST SEED A vs 2ND SEED B" },
      { game: "G8", matchup: "1ST SEED B vs 2ND SEED A" },
      { game: "G9", matchup: "Loser G7 vs Loser G8" },
      { game: "G10", matchup: "Winner G7 vs Winner G8" },
    ],
  },
  "Mobile Legends": {
    bracketA: [
      { game: "G1", matchup: "ANSA vs ACHSS" },
      { game: "G2", matchup: "COCS vs ANSA" },
      { game: "G3", matchup: "ABBS vs COCS" },
      { game: "G4", matchup: "ACHSS vs ABBS" },
      { game: "G5", matchup: "ABBS vs ANSA" },
      { game: "G6", matchup: "ACHSS vs COCS" },
    ],
    bracketB: [
      { game: "G1", matchup: "JPIA vs STEP" },
      { game: "G2", matchup: "AXI vs JPIA" },
      { game: "G3", matchup: "COL vs AXI" },
      { game: "G4", matchup: "STEP vs COL" },
      { game: "G5", matchup: "COL vs JPIA" },
      { game: "G6", matchup: "STEP vs AXI" },
    ],
    finals: [
      { game: "G7", matchup: "1ST SEED A vs 2ND SEED B" },
      { game: "G8", matchup: "1ST SEED B vs 2ND SEED A" },
      { game: "G9", matchup: "Loser G7 vs Loser G8" },
      { game: "G10", matchup: "Winner G7 vs Winner G8" },
    ],
  },
  "League of Legends": {
    bracketA: [
      { game: "G1", matchup: "ABBS vs ACHSS" },
      { game: "G2", matchup: "COL vs AXI" },
      { game: "G3", matchup: "AXI vs ABBS" },
      { game: "G4", matchup: "ACHSS vs COL" },
      { game: "G5", matchup: "COL vs ABBS" },
      { game: "G6", matchup: "ACHSS vs AXI" },
    ],
    bracketB: [
      { game: "G1", matchup: "ANSA vs COCS" },
      { game: "G2", matchup: "JPIA vs STEP" },
      { game: "G3", matchup: "STEP vs ANSA" },
      { game: "G4", matchup: "COCS vs JPIA" },
      { game: "G5", matchup: "JPIA vs ANSA" },
      { game: "G6", matchup: "COCS vs STEP" },
    ],
    finals: [
      { game: "G7", matchup: "1ST SEED A vs 2ND SEED B" },
      { game: "G8", matchup: "1ST SEED B vs 2ND SEED A" },
      { game: "G9", matchup: "Loser G7 vs Loser G8" },
      { game: "G10", matchup: "Winner G7 vs Winner G8" },
    ],
  },
  Valorant: {
    bracketA: [
      { game: "G1", matchup: "STEP vs ABBS" },
      { game: "G2", matchup: "AXI vs ANSA" },
      { game: "G3", matchup: "ANSA vs STEP" },
      { game: "G4", matchup: "ABBS vs AXI" },
      { game: "G5", matchup: "AXI vs STEP" },
      { game: "G6", matchup: "ABBS vs ANSA" },
    ],
    bracketB: [
      { game: "G1", matchup: "ACHSS vs COL" },
      { game: "G2", matchup: "COCS vs JPIA" },
      { game: "G3", matchup: "JPIA vs ACHSS" },
      { game: "G4", matchup: "COL vs COCS" },
      { game: "G5", matchup: "COCS vs ACHSS" },
      { game: "G6", matchup: "COL vs JPIA" },
    ],
    finals: [
      { game: "G7", matchup: "1ST SEED A vs 2ND SEED B" },
      { game: "G8", matchup: "1ST SEED B vs 2ND SEED A" },
      { game: "G9", matchup: "Loser G7 vs Loser G8" },
      { game: "G10", matchup: "Winner G7 vs Winner G8" },
    ],
  },
};

const DEPARTMENT_LOGOS = {
  ABBS: "/College Department Logos/ABBS_LOGO_withBG.png",
  ACCHS: "/College Department Logos/ACCHS_LOGO_withBG.png",
  ACHSS: "/College Department Logos/ACHSS_Logo.png",
  ANSA: "/College Department Logos/ANSA_LOGO_withBG.png",
  AXI: "/College Department Logos/AXI_LOGO_withBG.png",
  COCS: "/College Department Logos/COCS_LOGO_withBG.png",
  COL: "/College Department Logos/COL_LOGO_withBG.png",
  JPIA: "/College Department Logos/JPIA_LOGO_withBG.png",
  STEP: "/College Department Logos/STEP_LOGO_withBG.png",
};

const TEAM_ALIASES = {
  ACHHS: "ACHSS",
};

const EMPTY_ROUNDS = {
  bracketA: [],
  bracketB: [],
  finals: [],
};

const SPORT_QUERY_ALIASES = {
  "Billiards (Students)": [
    "Billiards (Students)",
    "Billiards Students",
    "Billiards",
  ],
};

const WINNER_BY_DEFAULT_STORAGE_KEY = "adnue_winner_by_default_map_v1";

function normalizeIdentity(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getWinnerByDefaultFromStorage(matchId) {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedId = String(matchId ?? "").trim();
  if (!normalizedId) {
    return false;
  }

  try {
    const serialized = window.localStorage.getItem(
      WINNER_BY_DEFAULT_STORAGE_KEY,
    );
    if (!serialized) {
      return false;
    }

    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") {
      return false;
    }

    return Boolean(parsed[normalizedId]);
  } catch {
    return false;
  }
}

function normalizeSportKey(value) {
  const normalizedSport = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedSport) return "";

  if (normalizedSport.includes("billiards")) {
    if (normalizedSport.includes("faculty")) {
      return "billiards-faculty";
    }

    if (normalizedSport.includes("students") || normalizedSport === "billiards") {
      return "billiards-students";
    }
  }

  return normalizedSport;
}

function getSportQueryVariants(sport) {
  const selectedSport = String(sport ?? "").trim();
  if (!selectedSport) return [];

  const aliasValues = SPORT_QUERY_ALIASES[selectedSport] ?? [];
  return [...new Set([selectedSport, ...aliasValues].filter(Boolean))];
}

function resolveAliasIdentity(value) {
  const normalizedValue = normalizeIdentity(value);
  if (!normalizedValue) return "";

  const directAlias = TEAM_ALIASES[normalizedValue];
  if (directAlias) {
    return normalizeIdentity(directAlias);
  }

  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    if (normalizeIdentity(alias) === normalizedValue) {
      return normalizeIdentity(canonical);
    }
  }

  return normalizedValue;
}

function resolveTeamIdentityKey(value) {
  const aliasedIdentity = resolveAliasIdentity(value);
  if (!aliasedIdentity) return "";

  if (DEPARTMENT_LOGOS[aliasedIdentity]) {
    return aliasedIdentity;
  }

  return normalizeIdentity(value) || aliasedIdentity;
}

function resolveLeaderboardTeamLabel(teamName, teamId) {
  const normalizedTeamName = normalizeIdentity(teamName);
  const normalizedTeamId = normalizeIdentity(teamId);
  const logoKey = resolveTeamIdentityKey(
    normalizedTeamId || normalizedTeamName,
  );

  if (logoKey && DEPARTMENT_LOGOS[logoKey]) {
    return logoKey;
  }

  if (normalizedTeamName) {
    return normalizedTeamName;
  }

  if (normalizedTeamId) {
    return normalizedTeamId;
  }

  return "TBA";
}

function parseGameSortValue(gameLabel, fallbackIndex = 0) {
  const gameText = String(gameLabel ?? "").trim();
  const gameNumberMatch = gameText.match(/(\d+)/);
  if (!gameNumberMatch) return fallbackIndex;

  const parsedValue = Number(gameNumberMatch[1]);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackIndex;
}

function normalizeRoundKey(roundValue) {
  const roundText = String(roundValue ?? "")
    .trim()
    .toLowerCase();

  if (!roundText) return null;
  if (roundText.includes("final")) return "finals";
  if (/(?:bracket\s*a|\ba\b|group\s*a|pool\s*a|seed\s*a)/.test(roundText)) {
    return "bracketA";
  }
  if (/(?:bracket\s*b|\bb\b|group\s*b|pool\s*b|seed\s*b)/.test(roundText)) {
    return "bracketB";
  }

  return null;
}

function resolveMatchTeamName(match, side) {
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

function resolveMatchTeamId(match, side) {
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

function resolveMatchTeamScore(match, side) {
  if (side === "a") {
    return match.team_a_score ?? match.home_score ?? match.score_a ?? null;
  }

  return match.team_b_score ?? match.away_score ?? match.score_b ?? null;
}

function mapMatchToEntry(match, fallbackIndex = 0) {
  const gameLabel =
    match.game_label ??
    match.game ??
    (Number.isFinite(Number(match.game_no))
      ? `G${match.game_no}`
      : `G${fallbackIndex + 1}`);
  const teamA = resolveMatchTeamName(match, "a");
  const teamB = resolveMatchTeamName(match, "b");
  const resolvedMatchId = match.id ?? `${gameLabel}-${fallbackIndex}`;
  const winnerByDefaultFromData = Boolean(
    match.winner_by_default ?? match.winnerByDefault ?? false,
  );
  const winnerByDefault =
    winnerByDefaultFromData || getWinnerByDefaultFromStorage(resolvedMatchId);

  return {
    id: resolvedMatchId,
    game: gameLabel,
    matchup: `${teamA} vs ${teamB}`,
    teamA,
    teamB,
    teamAId: resolveMatchTeamId(match, "a"),
    teamBId: resolveMatchTeamId(match, "b"),
    teamAScore: resolveMatchTeamScore(match, "a"),
    teamBScore: resolveMatchTeamScore(match, "b"),
    winnerId: match.winner_id ?? match.winner ?? null,
    winnerByDefault,
    isCompleted: Boolean(
      match.is_completed ?? match.isCompleted ?? match.winner_id,
    ),
    sortValue: parseGameSortValue(gameLabel, fallbackIndex),
  };
}

function groupMatchesByRound(matches) {
  const grouped = {
    bracketA: [],
    bracketB: [],
    finals: [],
  };

  matches.forEach((match, index) => {
    const roundKey = normalizeRoundKey(
      match.round ?? match.bracket ?? match.group,
    );
    if (!roundKey) return;
    grouped[roundKey].push(mapMatchToEntry(match, index));
  });

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((left, right) => left.sortValue - right.sortValue);
  }

  return grouped;
}

function mapStaticRoundToEntries(rows = []) {
  return rows.map((row, index) => {
    const [teamA, teamB] = splitMatchup(row?.matchup);

    return {
      id: `static-${row?.game ?? "G"}-${index}`,
      game: row?.game ?? `G${index + 1}`,
      matchup: row?.matchup ?? "TBA vs TBA",
      teamA,
      teamB,
      teamAId: teamA,
      teamBId: teamB,
      teamAScore: 0,
      teamBScore: 0,
      winnerId: null,
      winnerByDefault: false,
      isCompleted: false,
      sortValue: parseGameSortValue(row?.game, index),
    };
  });
}

function normalizeStandingBracket(bracketValue) {
  const bracketText = String(bracketValue ?? "")
    .trim()
    .toLowerCase();

  if (!bracketText) return null;
  if (/\ba\b|bracket\s*a|group\s*a|pool\s*a|seed\s*a/.test(bracketText)) {
    return "A";
  }
  if (/\bb\b|bracket\s*b|group\s*b|pool\s*b|seed\s*b/.test(bracketText)) {
    return "B";
  }

  return null;
}

function getStandingRank(standing) {
  const numericRank = Number(
    standing.rank ??
      standing.position ??
      standing.seed ??
      standing.standing_rank,
  );
  return Number.isFinite(numericRank) ? numericRank : null;
}

function getStandingTeamName(standing) {
  return (
    standing.team_name ??
    standing.department_acronym ??
    standing.department_name ??
    standing.team ??
    null
  );
}

function getStandingTeamId(standing) {
  return (
    standing.team_id ??
    standing.department_id ??
    standing.department_acronym ??
    standing.team_name ??
    null
  );
}

function resolveStandingIdentity(standing) {
  const teamId = getStandingTeamId(standing);
  const teamName = getStandingTeamName(standing);
  const logoKey = resolveTeamIdentityKey(teamId ?? teamName);
  const resolvedTeamId =
    logoKey || normalizeIdentity(teamId) || normalizeIdentity(teamName) || null;

  return {
    teamId: resolvedTeamId,
    teamName: resolveLeaderboardTeamLabel(teamName, resolvedTeamId ?? teamId),
  };
}

function getStandingWins(standing) {
  const numericWins = Number(
    standing.wins ?? standing.win_count ?? standing.total_wins ?? 0,
  );
  return Number.isFinite(numericWins) ? numericWins : 0;
}

function getStandingLosses(standing) {
  const numericLosses = Number(
    standing.losses ?? standing.loss_count ?? standing.total_losses ?? 0,
  );
  return Number.isFinite(numericLosses) ? numericLosses : 0;
}

function buildBracketLeaderboardRows({ standings, bracket, bracketMatches }) {
  const bracketLetter = String(bracket ?? "").toUpperCase();
  const teamSeedMap = new Map();

  bracketMatches.forEach((match) => {
    const teamPairs = [
      [match.teamAId ?? match.teamA, match.teamA],
      [match.teamBId ?? match.teamB, match.teamB],
    ];

    teamPairs.forEach(([teamIdentity, teamName]) => {
      const normalizedId = resolveTeamIdentityKey(teamIdentity ?? teamName);
      if (!normalizedId) return;

      if (!teamSeedMap.has(normalizedId)) {
        teamSeedMap.set(normalizedId, {
          teamId: normalizedId,
          teamName: resolveLeaderboardTeamLabel(teamName, normalizedId),
          wins: 0,
          losses: 0,
        });
      }
    });
  });

  bracketMatches.forEach((match) => {
    const teamAId = resolveTeamIdentityKey(match.teamAId ?? match.teamA);
    const teamBId = resolveTeamIdentityKey(match.teamBId ?? match.teamB);
    if (!teamAId || !teamBId) return;

    const teamARecord = teamSeedMap.get(teamAId);
    const teamBRecord = teamSeedMap.get(teamBId);
    if (!teamARecord || !teamBRecord) return;

    const winnerIdentity = normalizeIdentity(match.winnerId);
    const hasCompletedMatch = Boolean(match.isCompleted);
    const hasWinner = Boolean(winnerIdentity);

    if (!hasCompletedMatch && !hasWinner) {
      return;
    }

    const scoreA = Number(match.teamAScore);
    const scoreB = Number(match.teamBScore);
    const hasValidScores = Number.isFinite(scoreA) && Number.isFinite(scoreB);

    let resolvedWinnerId = "";
    if (winnerIdentity === teamAId || winnerIdentity === teamBId) {
      resolvedWinnerId = winnerIdentity;
    } else if (hasValidScores && scoreA !== scoreB) {
      resolvedWinnerId = scoreA > scoreB ? teamAId : teamBId;
    }

    if (!resolvedWinnerId) {
      return;
    }

    if (resolvedWinnerId === teamAId) {
      teamARecord.wins += 1;
      teamBRecord.losses += 1;
    } else if (resolvedWinnerId === teamBId) {
      teamBRecord.wins += 1;
      teamARecord.losses += 1;
    }
  });

  (standings ?? []).forEach((standing) => {
    const standingBracket = normalizeStandingBracket(
      standing.bracket ?? standing.group ?? standing.pool,
    );

    if (standingBracket !== bracketLetter) return;

    const resolvedStanding = resolveStandingIdentity(standing);
    const normalizedId = normalizeIdentity(
      resolvedStanding.teamId ?? resolvedStanding.teamName,
    );
    if (!normalizedId) return;

    const seededTeam = teamSeedMap.get(normalizedId) ?? {
      teamId: resolvedStanding.teamId,
      teamName: resolvedStanding.teamName,
      wins: 0,
      losses: 0,
    };

    teamSeedMap.set(normalizedId, {
      ...seededTeam,
      teamId: resolvedStanding.teamId ?? seededTeam.teamId,
      teamName: resolvedStanding.teamName || seededTeam.teamName,
      wins: getStandingWins(standing),
      losses: getStandingLosses(standing),
    });
  });

  return [...teamSeedMap.values()].sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (left.losses !== right.losses) {
      return left.losses - right.losses;
    }

    return String(left.teamName).localeCompare(String(right.teamName));
  });
}

function resolveSeedLabel(teamLabel, standings) {
  const label = String(teamLabel ?? "").trim();

  const topMatch = label.match(/^top\s*(\d+)\s*([ab])$/i);
  const seedMatch = label.match(/^(\d+)(?:st|nd|rd|th)\s*seed\s*([ab])$/i);
  const matched = topMatch ?? seedMatch;

  if (!matched) {
    return { teamName: label || "TBA", teamId: label || null };
  }

  const rank = Number(matched[1]);
  const bracket = String(matched[2] ?? "").toUpperCase();

  const seededStanding = standings.find((standing) => {
    const standingBracket = normalizeStandingBracket(
      standing.bracket ?? standing.group ?? standing.pool,
    );
    const standingRank = getStandingRank(standing);

    return standingBracket === bracket && standingRank === rank;
  });

  if (!seededStanding) {
    return { teamName: label || "TBA", teamId: label || null };
  }

  return {
    teamName: getStandingTeamName(seededStanding),
    teamId: getStandingTeamId(seededStanding),
  };
}

function isSeedPlaceholderLabel(teamLabel) {
  const label = String(teamLabel ?? "").trim();
  if (!label) return true;

  return (
    /^top\s*\d+\s*[ab]$/i.test(label) ||
    /^(\d+)(?:st|nd|rd|th)\s*seed\s*[ab]$/i.test(label)
  );
}

function hydrateFinalMatch(match, standings) {
  const [fallbackTeamA, fallbackTeamB] = splitMatchup(match?.matchup);

  const rawDatabaseTeamA =
    match?.team_a_name ?? match?.teamAName ?? match?.teamA ?? fallbackTeamA;
  const rawDatabaseTeamB =
    match?.team_b_name ?? match?.teamBName ?? match?.teamB ?? fallbackTeamB;

  const shouldSeedTeamA = isSeedPlaceholderLabel(rawDatabaseTeamA);
  const shouldSeedTeamB = isSeedPlaceholderLabel(rawDatabaseTeamB);
  const databaseTeamAName = String(rawDatabaseTeamA ?? "").trim();
  const databaseTeamBName = String(rawDatabaseTeamB ?? "").trim();
  const fallbackTeamAId = databaseTeamAName || null;
  const fallbackTeamBId = databaseTeamBName || null;

  const resolvedTeamA = shouldSeedTeamA
    ? resolveSeedLabel(rawDatabaseTeamA, standings)
    : {
        teamName: databaseTeamAName || "TBA",
        teamId: match?.team_a_id ?? match?.teamAId ?? fallbackTeamAId,
      };

  const resolvedTeamB = shouldSeedTeamB
    ? resolveSeedLabel(rawDatabaseTeamB, standings)
    : {
        teamName: databaseTeamBName || "TBA",
        teamId: match?.team_b_id ?? match?.teamBId ?? fallbackTeamBId,
      };

  return {
    ...match,
    teamA: resolvedTeamA.teamName,
    teamB: resolvedTeamB.teamName,
    teamAId: resolvedTeamA.teamId,
    teamBId: resolvedTeamB.teamId,
    matchup: `${resolvedTeamA.teamName} vs ${resolvedTeamB.teamName}`,
  };
}

function getTeamLogo(teamName) {
  const teamKey = resolveTeamIdentityKey(teamName);
  if (!teamKey) return null;
  return DEPARTMENT_LOGOS[teamKey] ?? null;
}

function getCompactTeamLabel(teamName) {
  if (!teamName) return "TBA";
  const cleanedName = teamName.trim().toUpperCase();
  if (/^[A-Z0-9]{2,6}$/.test(cleanedName)) return cleanedName;
  return cleanedName.replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TBA";
}

function isPlaceholder(name) {
  const label = String(name ?? "").trim();
  if (!label) return true;

  return /(?:\btop\b|\bseed\b|\bwinner\b|\bloser\b|\btba\b)/i.test(label);
}

function splitMatchup(matchup) {
  if (!matchup) return ["TBA", "TBA"];
  const [teamA, teamB] = matchup.split(/\s+vs\s+/i);
  return [teamA?.trim() || "TBA", teamB?.trim() || "TBA"];
}

function TeamIdentity({
  teamName,
  align = "left",
  isWinner = false,
  winnerByDefault = false,
  isLoser = false,
}) {
  const isTeamPlaceholder = isPlaceholder(teamName);
  const resolvedTeamName = isTeamPlaceholder ? "TBA" : teamName;
  const logo = isTeamPlaceholder ? null : getTeamLogo(resolvedTeamName);
  const isRight = align === "right";

  return (
    <div
      className={`flex min-w-0 w-full items-center gap-2 ${isRight ? "justify-end text-right" : "justify-start text-left"} ${isLoser ? "opacity-50" : ""}`}
    >
      {!isRight ? (
        logo ? (
          <img
            src={logo}
            alt={`${teamName} logo`}
            className="h-8 w-8 shrink-0 rounded-full border border-gray-300 object-cover sm:h-10 sm:w-10"
            loading="lazy"
          />
        ) : (
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isTeamPlaceholder ? "border-dashed border-slate-300 bg-transparent text-slate-400" : "border-gray-300 bg-theme-surface-soft text-theme-text"} text-[10px] font-black uppercase tracking-wide sm:h-10 sm:w-10 sm:text-xs`}
          >
            {getCompactTeamLabel(resolvedTeamName)}
          </span>
        )
      ) : null}

      <div className="min-w-0">
        <span
          className={`hidden truncate font-['Satoshi'] text-xs font-black tracking-[0.06em] min-[390px]:block sm:text-sm ${isTeamPlaceholder ? "text-slate-400" : "text-theme-text"}`}
        >
          {resolvedTeamName}
        </span>
        <span
          className={`block truncate font-['Satoshi'] text-[11px] font-black tracking-[0.06em] min-[390px]:hidden ${isTeamPlaceholder ? "text-slate-400" : "text-theme-text"}`}
        >
          {getCompactTeamLabel(resolvedTeamName)}
        </span>
        {isWinner && !isTeamPlaceholder ? (
          <span className="mt-1 inline-flex rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">
            {winnerByDefault ? "WIN BY DEFAULT" : "WINNER"}
          </span>
        ) : null}
      </div>

      {isRight ? (
        logo ? (
          <img
            src={logo}
            alt={`${teamName} logo`}
            className="h-8 w-8 shrink-0 rounded-full border border-gray-300 object-cover sm:h-10 sm:w-10"
            loading="lazy"
          />
        ) : (
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${isTeamPlaceholder ? "border-dashed border-slate-300 bg-transparent text-slate-400" : "border-gray-300 bg-theme-surface-soft text-theme-text"} text-[10px] font-black uppercase tracking-wide sm:h-10 sm:w-10 sm:text-xs`}
          >
            {getCompactTeamLabel(resolvedTeamName)}
          </span>
        )
      ) : null}
    </div>
  );
}

function MatchRow({
  game,
  matchup,
  teamA,
  teamB,
  teamAId,
  teamBId,
  teamAScore,
  teamBScore,
  winnerId,
  winnerByDefault = false,
  isCompleted = false,
  showTrophy = false,
}) {
  const [fallbackTeamA, fallbackTeamB] = splitMatchup(matchup);
  const resolvedTeamA = teamA ?? fallbackTeamA;
  const resolvedTeamB = teamB ?? fallbackTeamB;
  const teamAIsPlaceholder = isPlaceholder(resolvedTeamA);
  const teamBIsPlaceholder = isPlaceholder(resolvedTeamB);
  const hasPlaceholderTeam = teamAIsPlaceholder || teamBIsPlaceholder;
  const resolvedWinner = normalizeIdentity(winnerId);
  const resolvedTeamAIdentity = normalizeIdentity(teamAId ?? resolvedTeamA);
  const resolvedTeamBIdentity = normalizeIdentity(teamBId ?? resolvedTeamB);
  const hasWinner = Boolean(resolvedWinner) && !hasPlaceholderTeam;
  const teamAIsWinner = hasWinner && resolvedTeamAIdentity === resolvedWinner;
  const teamBIsWinner = hasWinner && resolvedTeamBIdentity === resolvedWinner;
  const teamAIsLoser = hasWinner && !teamAIsWinner;
  const teamBIsLoser = hasWinner && !teamBIsWinner;
  const parseNullableScore = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  };

  const parsedTeamAScore = parseNullableScore(teamAScore);
  const parsedTeamBScore = parseNullableScore(teamBScore);
  const shouldShowScores =
    !hasPlaceholderTeam &&
    Boolean(isCompleted) &&
    parsedTeamAScore !== null &&
    parsedTeamBScore !== null;

  const teamAScoreClass = hasWinner
    ? teamAIsWinner
      ? "text-slate-900 font-black text-lg"
      : "text-slate-400 font-medium text-lg"
    : "text-slate-900 font-black text-lg";

  const teamBScoreClass = hasWinner
    ? teamBIsWinner
      ? "text-slate-900 font-black text-lg"
      : "text-slate-400 font-medium text-lg"
    : "text-slate-900 font-black text-lg";

  return (
    <div className="group grid min-h-16 grid-cols-[5rem_minmax(0,1fr)] items-stretch border-t border-gray-300 transition-all duration-200 hover:bg-blue-50/40">
      <div className="flex items-center justify-center border-r border-gray-300 bg-theme-surface-soft px-2">
        <span className="inline-flex items-center justify-center font-['Satoshi'] text-xl font-black leading-none tracking-wide text-theme-text sm:text-2xl">
          {game ?? "-"}
        </span>
      </div>

      <div className="flex flex-col justify-center px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="min-w-0 flex-1 pr-2 sm:pr-4">
            <TeamIdentity
              teamName={resolvedTeamA}
              align="left"
              isWinner={teamAIsWinner}
              winnerByDefault={teamAIsWinner && winnerByDefault}
              isLoser={teamAIsLoser}
            />
          </div>

          <div className="shrink-0 px-2 sm:px-4">
            {shouldShowScores ? (
              <div className="inline-flex items-center gap-2 font-mono tabular-nums sm:gap-3">
                <span className={teamAScoreClass}>{parsedTeamAScore}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                  VS
                </span>
                <span className={teamBScoreClass}>{parsedTeamBScore}</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                VS
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pl-2 sm:pl-4">
            <TeamIdentity
              teamName={resolvedTeamB}
              align="right"
              isWinner={teamBIsWinner}
              winnerByDefault={teamBIsWinner && winnerByDefault}
              isLoser={teamBIsLoser}
            />
          </div>
        </div>

        {showTrophy ? (
          <div className="mt-1.5 flex justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
              <Trophy className="h-3.5 w-3.5" />
              Trophy
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BracketLeaderboardCard({
  bracket,
  standings,
  bracketMatches,
  accentClassName,
  headerClassName,
}) {
  const leaderboardRows = useMemo(
    () =>
      buildBracketLeaderboardRows({
        standings,
        bracket,
        bracketMatches,
      }),
    [standings, bracket, bracketMatches],
  );

  return (
    <div className={`overflow-hidden rounded-3xl border-2 ${accentClassName}`}>
      <div className={`px-4 py-3 ${headerClassName}`}>
        <p className="font-['Satoshi'] text-base font-black uppercase tracking-[0.14em] text-white">
          Leaderboard {bracket}
        </p>
      </div>
      <div className="bg-white/90 px-3 py-3">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-gray-200 px-2 pb-2 font-['Satoshi'] text-[11px] font-black uppercase tracking-[0.08em] text-theme-muted">
          <span>Rank</span>
          <span>Team</span>
          <span>W</span>
          <span>L</span>
        </div>

        {leaderboardRows.length ? (
          <div className="mt-1 space-y-1">
            {leaderboardRows.map((row, index) => {
              const rank = index + 1;
              const logo = getTeamLogo(row.teamName);

              return (
                <div
                  key={`${bracket}-${normalizeIdentity(row.teamId ?? row.teamName)}-${rank}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-transparent px-2 py-2"
                >
                  <div className="inline-flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold text-theme-text">
                      {rank}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    {logo ? (
                      <img
                        src={logo}
                        alt={`${row.teamName} logo`}
                        className="h-7 w-7 shrink-0 rounded-full border border-gray-300 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-theme-surface-soft text-[10px] font-black uppercase text-theme-text">
                        {getCompactTeamLabel(row.teamName)}
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold text-theme-text">
                      {row.teamName}
                    </span>
                  </div>

                  <span className="font-mono text-sm font-semibold text-theme-text">
                    {row.wins}
                  </span>
                  <span className="font-mono text-sm font-semibold text-theme-text">
                    {row.losses}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-3 text-sm text-theme-muted">
            No teams available yet.
          </p>
        )}
      </div>
    </div>
  );
}

function Bracketing() {
  const [activeMobileTab, setActiveMobileTab] = useState("standings");
  const [activeSport, setActiveSport] = useState(
    () =>
      Object.keys(TOURNAMENT_SCHEDULE).sort((left, right) =>
        left.localeCompare(right),
      )[0] ?? "",
  );
  const [matches, setMatches] = useState(EMPTY_ROUNDS);
  const [standings, setStandings] = useState([]);
  const [liveSports, setLiveSports] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadLiveSports() {
      if (!isSupabaseConfigured) {
        if (active) {
          setLiveSports([]);
        }
        return;
      }

      const { data, error } = await supabase
        .from("matches")
        .select("sport")
        .not("sport", "is", null);

      if (!active) {
        return;
      }

      if (error) {
        console.error("Unable to load available sports", error);
        setLiveSports([]);
        return;
      }

      const normalizedSports = Array.from(
        new Set(
          (data ?? [])
            .map((row) => row?.sport)
            .filter((value) => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      );

      setLiveSports(normalizedSports);
    }

    loadLiveSports();

    return () => {
      active = false;
    };
  }, []);

  const sportOptions = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(TOURNAMENT_SCHEDULE), ...liveSports]),
      ).sort((left, right) => left.localeCompare(right)),
    [liveSports],
  );

  useEffect(() => {
    if (!sportOptions.length) {
      return;
    }

    if (!sportOptions.includes(activeSport)) {
      setActiveSport(sportOptions[0]);
    }
  }, [activeSport, sportOptions]);

  const activeSchedule = TOURNAMENT_SCHEDULE[activeSport] ?? {
    bracketA: [],
    bracketB: [],
    finals: [],
  };

  useEffect(() => {
    let active = true;

    async function loadLiveBracketData() {
      if (!isSupabaseConfigured || !activeSport) {
        if (active) {
          setMatches(EMPTY_ROUNDS);
          setStandings([]);
        }
        return;
      }

      const selectedSportKey = normalizeSportKey(activeSport);
      const sportQueryVariants = getSportQueryVariants(activeSport);
      const sportFilterValues = sportQueryVariants.length
        ? sportQueryVariants
        : [activeSport];

      const [matchesResponse, standingsResponse] = await Promise.all([
        supabase.from("matches").select("*").in("sport", sportFilterValues),
        supabase
          .from("leaderboard")
          .select("*")
          .in("sport", sportFilterValues),
      ]);

      if (!active) {
        return;
      }

      if (matchesResponse.error) {
        console.error("Unable to load matches", matchesResponse.error);
        setMatches(EMPTY_ROUNDS);
      } else {
        const filteredMatches = (matchesResponse.data ?? []).filter(
          (match) =>
            normalizeSportKey(match.sport) === selectedSportKey ||
            (!selectedSportKey && !match.sport),
        );
        setMatches(groupMatchesByRound(filteredMatches));
      }

      if (standingsResponse.error) {
        console.error("Unable to load standings", standingsResponse.error);
        setStandings([]);
      } else {
        const filteredStandings = (standingsResponse.data ?? []).filter(
          (standing) =>
            normalizeSportKey(standing.sport) === selectedSportKey ||
            (!selectedSportKey && !standing.sport),
        );

        const hydratedStandings = filteredStandings.map((standing) => {
            const resolvedStanding = resolveStandingIdentity(standing);

            return {
              ...standing,
              team_id: resolvedStanding.teamId,
              team_name: resolvedStanding.teamName,
            };
          });

        setStandings(hydratedStandings);
      }
    }

    loadLiveBracketData();

    return () => {
      active = false;
    };
  }, [activeSport]);

  const fallbackMatches = useMemo(
    () => ({
      bracketA: mapStaticRoundToEntries(activeSchedule.bracketA),
      bracketB: mapStaticRoundToEntries(activeSchedule.bracketB),
      finals: mapStaticRoundToEntries(activeSchedule.finals),
    }),
    [activeSchedule],
  );

  const hasLiveMatches =
    matches.bracketA.length > 0 ||
    matches.bracketB.length > 0 ||
    matches.finals.length > 0;

  const activeMatches = hasLiveMatches ? matches : fallbackMatches;

  const hydratedFinalMatches = useMemo(
    () =>
      activeMatches.finals.map((match) => hydrateFinalMatch(match, standings)),
    [activeMatches.finals, standings],
  );

  const bracketRowCount = Math.max(
    activeMatches?.bracketA?.length ?? 0,
    activeMatches?.bracketB?.length ?? 0,
  );

  return (
    <div className="w-full px-4 py-10 md:mx-auto md:max-w-3xl md:px-6 lg:max-w-7xl lg:px-8 lg:py-14">
      <SectionHeading
        eyebrow="Bracketing"
        title="Tournament Brackets and Match Results"
        description="Track every matchup, winner, and advancing team as they battle for the trophy. Matches and brackets for unlisted events will be updated as they are finalized. For real-time announcements, follow the official Ateneo de Naga League Facebook Page."
      />

      <section className="mt-8 space-y-6">
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-theme-muted">
            Select Sport
          </label>
          <div className="relative w-full max-w-md">
            <select
              value={activeSport}
              onChange={(event) => setActiveSport(event.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 pr-11 text-sm font-semibold text-theme-text shadow-sm transition-colors duration-200 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              aria-label="Select sport"
            >
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-theme-muted"
              aria-hidden="true"
            />
          </div>
        </div>

        {!bracketRowCount && !activeMatches?.finals?.length ? (
          <div className="rounded-[32px] border border-gray-200 bg-white/90 p-6 text-sm text-theme-muted shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            No static bracket schedule is available yet for {activeSport}.
          </div>
        ) : (
          <div>
            <div className="md:hidden">
              <div className="rounded-full border border-slate-200 bg-slate-100 p-1">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: "standings", label: "Standings" },
                    { key: "brackets", label: "Brackets" },
                    { key: "finals", label: "Finals" },
                  ].map((tab) => {
                    const isActive = activeMobileTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveMobileTab(tab.key)}
                        className={`rounded-full px-3 py-2 text-xs transition ${
                          isActive
                            ? "bg-white shadow-sm font-bold text-theme-text"
                            : "font-semibold text-theme-muted"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                key={activeMobileTab}
                className="mt-4 animate-in fade-in duration-300"
              >
                {activeMobileTab === "standings" ? (
                  <div className="space-y-4">
                    <BracketLeaderboardCard
                      bracket="A"
                      standings={standings}
                      bracketMatches={activeMatches.bracketA}
                      accentClassName="border-slate-900"
                      headerClassName="bg-gradient-to-r from-slate-800 to-slate-700"
                    />
                    <BracketLeaderboardCard
                      bracket="B"
                      standings={standings}
                      bracketMatches={activeMatches.bracketB}
                      accentClassName="border-blue-500"
                      headerClassName="bg-gradient-to-r from-blue-600 to-blue-500"
                    />
                  </div>
                ) : null}

                {activeMobileTab === "brackets" ? (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-slate-50 to-white/80 shadow-lg">
                      <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-4 px-4 text-center font-['Satoshi'] text-lg font-black tracking-[0.08em] text-white">
                        <div className="flex items-center justify-center gap-2">
                          <Dumbbell className="h-5 w-5" />
                          <span>BRACKET A</span>
                        </div>
                      </div>
                      {Array.from({ length: bracketRowCount }).map(
                        (_, index) => {
                          const match = activeMatches.bracketA[index];

                          return (
                            <MatchRow
                              key={`A-mobile-${index}`}
                              game={match?.game}
                              matchup={match?.matchup}
                              teamA={match?.teamA}
                              teamB={match?.teamB}
                              teamAId={match?.teamAId}
                              teamBId={match?.teamBId}
                              teamAScore={match?.teamAScore}
                              teamBScore={match?.teamBScore}
                              winnerId={match?.winnerId}
                              winnerByDefault={match?.winnerByDefault}
                              isCompleted={match?.isCompleted}
                            />
                          );
                        },
                      )}
                    </div>

                    <div className="overflow-hidden rounded-3xl border-2 border-blue-500 bg-gradient-to-br from-blue-50/50 to-white/80 shadow-lg">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-500 py-4 px-4 text-center font-['Satoshi'] text-lg font-black tracking-[0.08em] text-white">
                        <div className="flex items-center justify-center gap-2">
                          <Volleyball className="h-5 w-5" />
                          <span>BRACKET B</span>
                        </div>
                      </div>
                      {Array.from({ length: bracketRowCount }).map(
                        (_, index) => {
                          const match = activeMatches.bracketB[index];

                          return (
                            <MatchRow
                              key={`B-mobile-${index}`}
                              game={match?.game}
                              matchup={match?.matchup}
                              teamA={match?.teamA}
                              teamB={match?.teamB}
                              teamAId={match?.teamAId}
                              teamBId={match?.teamBId}
                              teamAScore={match?.teamAScore}
                              teamBScore={match?.teamBScore}
                              winnerId={match?.winnerId}
                              winnerByDefault={match?.winnerByDefault}
                              isCompleted={match?.isCompleted}
                            />
                          );
                        },
                      )}
                    </div>
                  </div>
                ) : null}

                {activeMobileTab === "finals" ? (
                  <div className="overflow-hidden rounded-3xl border-2 border-amber-500 bg-gradient-to-br from-amber-50/50 to-white/85 shadow-lg">
                    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 py-5 px-4 text-center font-['Satoshi'] text-xl font-black tracking-[0.08em] text-white">
                      <div className="flex items-center justify-center gap-3">
                        <Trophy className="h-6 w-6" />
                        <span>FINALS</span>
                        <Trophy className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0">
                      {hydratedFinalMatches.map((match, index) => (
                        <div
                          key={`F-mobile-${match.id ?? match.game}-${index}`}
                        >
                          <MatchRow
                            game={match.game}
                            matchup={match.matchup}
                            teamA={match.teamA}
                            teamB={match.teamB}
                            teamAId={match.teamAId}
                            teamBId={match.teamBId}
                            teamAScore={match.teamAScore}
                            teamBScore={match.teamBScore}
                            winnerId={match.winnerId}
                            winnerByDefault={match.winnerByDefault}
                            isCompleted={match.isCompleted}
                            //showTrophy={match.game === "G10"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <BracketLeaderboardCard
                    bracket="A"
                    standings={standings}
                    bracketMatches={activeMatches.bracketA}
                    accentClassName="border-slate-900"
                    headerClassName="bg-gradient-to-r from-slate-800 to-slate-700"
                  />

                  <div className="overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-slate-50 to-white/80 shadow-lg">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-4 px-4 text-center font-['Satoshi'] text-lg font-black tracking-[0.08em] text-white">
                      <div className="flex items-center justify-center gap-2">
                        <Dumbbell className="h-5 w-5" />
                        <span>BRACKET A</span>
                      </div>
                    </div>
                    {Array.from({ length: bracketRowCount }).map((_, index) => {
                      const match = activeMatches.bracketA[index];

                      return (
                        <MatchRow
                          key={`A-${index}`}
                          game={match?.game}
                          matchup={match?.matchup}
                          teamA={match?.teamA}
                          teamB={match?.teamB}
                          teamAId={match?.teamAId}
                          teamBId={match?.teamBId}
                          teamAScore={match?.teamAScore}
                          teamBScore={match?.teamBScore}
                          winnerId={match?.winnerId}
                          winnerByDefault={match?.winnerByDefault}
                          isCompleted={match?.isCompleted}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <BracketLeaderboardCard
                    bracket="B"
                    standings={standings}
                    bracketMatches={activeMatches.bracketB}
                    accentClassName="border-blue-500"
                    headerClassName="bg-gradient-to-r from-blue-600 to-blue-500"
                  />

                  <div className="overflow-hidden rounded-3xl border-2 border-blue-500 bg-gradient-to-br from-blue-50/50 to-white/80 shadow-lg">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 py-4 px-4 text-center font-['Satoshi'] text-lg font-black tracking-[0.08em] text-white">
                      <div className="flex items-center justify-center gap-2">
                        <Volleyball className="h-5 w-5" />
                        <span>BRACKET B</span>
                      </div>
                    </div>
                    {Array.from({ length: bracketRowCount }).map((_, index) => {
                      const match = activeMatches.bracketB[index];

                      return (
                        <MatchRow
                          key={`B-${index}`}
                          game={match?.game}
                          matchup={match?.matchup}
                          teamA={match?.teamA}
                          teamB={match?.teamB}
                          teamAId={match?.teamAId}
                          teamBId={match?.teamBId}
                          teamAScore={match?.teamAScore}
                          teamBScore={match?.teamBScore}
                          winnerId={match?.winnerId}
                          winnerByDefault={match?.winnerByDefault}
                          isCompleted={match?.isCompleted}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="my-8 border-t-2 border-gray-200"></div>

              <div className="overflow-hidden rounded-3xl border-2 border-amber-500 bg-gradient-to-br from-amber-50/50 to-white/85 shadow-lg">
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 py-5 px-4 text-center font-['Satoshi'] text-xl font-black tracking-[0.08em] text-white">
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="h-6 w-6" />
                    <span>FINALS</span>
                    <Trophy className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 lg:gap-1">
                  {hydratedFinalMatches.map((match, index) => (
                    <div
                      key={`F-${match.id ?? match.game}-${index}`}
                      className="lg:border-r lg:border-gray-300 last:lg:border-r-0"
                    >
                      <MatchRow
                        game={match.game}
                        matchup={match.matchup}
                        teamA={match.teamA}
                        teamB={match.teamB}
                        teamAId={match.teamAId}
                        teamBId={match.teamBId}
                        teamAScore={match.teamAScore}
                        teamBScore={match.teamBScore}
                        winnerId={match.winnerId}
                        winnerByDefault={match.winnerByDefault}
                        isCompleted={match.isCompleted}
                        //showTrophy={match.game === "G10"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default Bracketing;
