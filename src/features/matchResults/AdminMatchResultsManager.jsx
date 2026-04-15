import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Clock3,
  CircleHelp,
  History,
  Loader2,
  RotateCcw,
  Trophy,
  Dumbbell,
  Volleyball,
} from "lucide-react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../contexts/AuthContext";
import {
  confirmMatchResult,
  createEventMatchTemplate,
  deleteEventMatches,
  getLeaderboardSnapshotBySport,
  getMatchesForAdmin,
  resetMatchResult,
  saveMatchupTeams,
} from "../../services/matchResultsService";

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
  ACCHS: "ACHSS",
};

const DEPARTMENT_OPTIONS = [
  ...new Set(
    Object.keys(DEPARTMENT_LOGOS).map((team) =>
      normalizeTeamName(TEAM_ALIASES[normalizeTeamName(team)] ?? team),
    ),
  ),
]
  .filter(Boolean)
  .sort((left, right) => left.localeCompare(right));

const NO_TEAM_OPTION_VALUE = "__NO_TEAM__";
const MATCH_RESULTS_ACTIVITY_LOG_STORAGE_KEY =
  "adnue_match_results_activity_log_v1";

const MATCH_RESULTS_HELP_TEXT = `1. The Matchup Phase 
Pick Your Sport: Use the top dropdown to select the event you're managing.

Finals Setup: In the Finals section, click "Edit Matchup" to unlock the team dropdowns.

Select Teams: Choose the two departments that qualified (e.g., COL vs JPIA).

Save Matchup: Hit the "Save Matchup" button. This locks the teams in so students can see who is playing, but keeps the result "Pending."

2. The Result Phase 
Declare the Winner: Simply tap/click the team card of the winner. You’ll see a blue border highlight their card.

Enter Scores (Optional): Type the final scores into the small "A" and "B" input fields. If you leave them blank, no scores will show on the public view.

Confirm Result: Tap the Checkmark (Confirm) button. This locks the game, updates the Leaderboard, and pushes the "WINNER" badge to the public site.`;

const WINNER_BY_DEFAULT_STORAGE_KEY = "adnue_winner_by_default_map_v1";

function readMatchResultsActivityLogFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const serialized = window.localStorage.getItem(
      MATCH_RESULTS_ACTIVITY_LOG_STORAGE_KEY,
    );
    if (!serialized) {
      return [];
    }

    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry) => entry && typeof entry === "object" && entry.id,
    );
  } catch {
    return [];
  }
}

function writeMatchResultsActivityLogToStorage(entries) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      MATCH_RESULTS_ACTIVITY_LOG_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch {
    // Ignore storage quota or serialization errors.
  }
}

function formatActivityDateTime(value) {
  const timestamp = Date.parse(String(value ?? ""));
  if (!Number.isFinite(timestamp)) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function readWinnerByDefaultStorageMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const serialized = window.localStorage.getItem(
      WINNER_BY_DEFAULT_STORAGE_KEY,
    );
    if (!serialized) {
      return {};
    }

    const parsed = JSON.parse(serialized);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeWinnerByDefaultStorageMap(nextMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      WINNER_BY_DEFAULT_STORAGE_KEY,
      JSON.stringify(nextMap),
    );
  } catch {
    // Ignore storage errors and continue with DB-backed state.
  }
}

function setWinnerByDefaultStorageValue(matchId, value) {
  const normalizedId = String(matchId ?? "").trim();
  if (!normalizedId) {
    return;
  }

  const currentMap = readWinnerByDefaultStorageMap();
  if (value) {
    currentMap[normalizedId] = true;
  } else {
    delete currentMap[normalizedId];
  }
  writeWinnerByDefaultStorageMap(currentMap);
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
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

  if (!roundText) return "finals";
  if (/\ba\b|bracket\s*a|group\s*a|pool\s*a|seed\s*a/.test(roundText)) {
    return "A";
  }
  if (/\bb\b|bracket\s*b|group\s*b|pool\s*b|seed\s*b/.test(roundText)) {
    return "B";
  }

  return "finals";
}

function normalizeTeamName(teamName) {
  return String(teamName ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function isPlaceholder(name) {
  const label = String(name ?? "").trim();
  if (!label) return true;

  return /(?:\btop\b|\bseed\b|\bwinner\b|\bloser\b|\btba\b)/i.test(label);
}

function normalizeFinalsTeamSelection(value) {
  const normalizedValue = normalizeTeamName(value);
  if (
    !normalizedValue ||
    normalizedValue === "TBA" ||
    normalizedValue === normalizeTeamName(NO_TEAM_OPTION_VALUE)
  ) {
    return "";
  }

  return normalizedValue;
}

function isValidFinalsTeamSelection(value) {
  const normalizedValue = normalizeFinalsTeamSelection(value);
  return normalizedValue === "" || DEPARTMENT_OPTIONS.includes(normalizedValue);
}

function getTeamLogo(teamName) {
  const normalizedTeam = normalizeTeamName(teamName);
  const mappedTeam = TEAM_ALIASES[normalizedTeam] ?? normalizedTeam;
  return DEPARTMENT_LOGOS[mappedTeam] ?? null;
}

function getCompactTeamLabel(teamName) {
  const cleanedName = normalizeTeamName(teamName);
  return cleanedName.slice(0, 4) || "TBA";
}

function normalizeTeamId(match, teamKey) {
  if (teamKey === "A") {
    return (
      match.teamAId ??
      match.team_a_id ??
      match.department_a_id ??
      match.team_a ??
      match.teamAName ??
      null
    );
  }

  return (
    match.teamBId ??
    match.team_b_id ??
    match.department_b_id ??
    match.team_b ??
    match.teamBName ??
    null
  );
}

function getStatusFromMatch(match) {
  return Boolean(match.is_completed ?? match.isCompleted ?? match.winner_id);
}

function toScoreInputValue(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : "";
}

function parseScoreValue(value) {
  if (value === "") {
    return null;
  }

  const parsedValue = parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
}

function TeamActionButton({
  teamName,
  align,
  isWinner,
  isLoser,
  isLocked,
  showTeamLabel = true,
  disabled,
  onClick,
}) {
  const isRight = align === "right";
  const isTeamPlaceholder = isPlaceholder(teamName);
  const resolvedTeamName = isTeamPlaceholder ? "TBA" : teamName;
  const logo = isTeamPlaceholder ? null : getTeamLogo(resolvedTeamName);
  const teamAlias = getCompactTeamLabel(resolvedTeamName);

  return (
    <button
      type="button"
      disabled={disabled || isTeamPlaceholder}
      onClick={onClick}
      className={`inline-flex min-h-9 min-w-[5rem] items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-black uppercase tracking-wide transition-all disabled:opacity-60 ${
        isRight ? "justify-end text-right" : "justify-start text-left"
      } ${isLocked ? "cursor-not-allowed" : "active:scale-95"} ${
        isWinner
          ? "border-green-300 bg-green-50 text-green-700"
          : isLoser
            ? "border-gray-200 bg-gray-50 text-gray-400"
            : isLocked
              ? "border-gray-200 bg-white text-theme-text"
              : "border-gray-300 bg-white text-theme-text hover:border-blue-300 hover:bg-blue-50/40"
      }`}
    >
      {logo ? (
        <img
          src={logo}
          alt={`${teamName} logo`}
          className="h-6 w-6 shrink-0 rounded-full border border-gray-300 object-cover md:h-8 md:w-8"
          loading="lazy"
        />
      ) : (
        <span
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-black uppercase tracking-wide md:h-8 md:w-8 ${isTeamPlaceholder ? "border-dashed border-slate-300 bg-transparent text-slate-400" : "border-gray-300 bg-theme-surface-soft text-theme-text"}`}
        >
          {teamAlias}
        </span>
      )}

      <div className="min-w-0 flex items-center gap-1">
        <span
          className={`block truncate font-['Satoshi'] text-[11px] font-black tracking-[0.06em] ${isTeamPlaceholder ? "text-slate-400" : ""}`}
        >
          {teamAlias}
        </span>
        {isWinner && !isTeamPlaceholder ? (
          <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[8px] font-black text-green-700">
            WIN
          </span>
        ) : null}
      </div>
    </button>
  );
}

function ConfirmResetModal({ payload, busy, onCancel, onConfirm }) {
  if (!payload || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onCancel}
        disabled={busy}
        aria-label="Close reset confirmation"
      />

      <div className="animate-in fade-in zoom-in duration-300 relative w-[90%] max-w-sm rounded-[32px] bg-white p-8 shadow-2xl">
        <h3 className="text-2xl font-black text-slate-900 mb-2">
          Reset Result?
        </h3>

        <p className="text-sm text-slate-600 leading-6">
          Are you sure you want to reset the scores and winner? The matchup will
          remain.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-base font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Resetting..." : "Undo Result"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 rounded-xl px-4 text-base font-bold text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmResultModal({
  payload,
  busy,
  hasDiscrepancy,
  discrepancyMessage,
  onToggleWinnerByDefault,
  onCancel,
  onConfirm,
}) {
  if (!payload || typeof document === "undefined") {
    return null;
  }

  const teamAName = String(payload.teamAName ?? "TBA").trim() || "TBA";
  const teamBName = String(payload.teamBName ?? "TBA").trim() || "TBA";
  const teamALogo = getTeamLogo(teamAName);
  const teamBLogo = getTeamLogo(teamBName);
  const teamAAlias = getCompactTeamLabel(teamAName);
  const teamBAlias = getCompactTeamLabel(teamBName);
  const winnerTeamKey = String(payload.winnerTeamKey ?? "").toUpperCase();
  const teamAIsWinner = winnerTeamKey === "A";
  const teamBIsWinner = winnerTeamKey === "B";
  const scoreA = payload.hasAnyScore ? payload.teamAScore ?? "-" : "-";
  const scoreB = payload.hasAnyScore ? payload.teamBScore ?? "-" : "-";

  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onCancel}
        disabled={busy}
        aria-label="Close result confirmation"
      />

      <div className="animate-in fade-in zoom-in duration-300 relative w-[90%] max-w-sm rounded-[32px] bg-white p-8 shadow-2xl">
        <h3
          className={`mb-2 text-2xl font-black ${hasDiscrepancy ? "text-red-600" : "text-slate-900"}`}
        >
          {hasDiscrepancy
            ? "⚠️WARNING⚠️"
            : "Save Match Result?"}
        </h3>

        {hasDiscrepancy ? (
          <p className="text-sm leading-6 text-red-700">{discrepancyMessage}</p>
        ) : (
          <p className="text-sm text-slate-600 leading-6">
            {payload.gameLabel}: confirm winner and score before saving.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <div className="min-w-0">
              <div
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 ${teamAIsWinner ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}
              >
                {teamALogo ? (
                  <img
                    src={teamALogo}
                    alt={`${teamAName} logo`}
                    className="h-7 w-7 shrink-0 rounded-full border border-gray-300 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-theme-surface-soft text-[10px] font-black uppercase text-theme-text">
                    {teamAAlias}
                  </span>
                )}
                <span className="truncate text-xs font-black uppercase tracking-wide text-theme-text">
                  {teamAName}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-white px-2 py-1 text-center font-mono text-sm font-black text-slate-900 shadow-sm">
              {scoreA} - {scoreB}
            </div>

            <div className="min-w-0 flex justify-end">
              <div
                className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 ${teamBIsWinner ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}
              >
                <span className="truncate text-xs font-black uppercase tracking-wide text-theme-text">
                  {teamBName}
                </span>
                {teamBLogo ? (
                  <img
                    src={teamBLogo}
                    alt={`${teamBName} logo`}
                    className="h-7 w-7 shrink-0 rounded-full border border-gray-300 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-theme-surface-soft text-[10px] font-black uppercase text-theme-text">
                    {teamBAlias}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-600">
            Winner to save: <span className="font-black text-slate-900">{payload.winnerName}</span>
          </p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(payload.winnerByDefault)}
              onChange={(event) => onToggleWinnerByDefault(event.target.checked)}
              disabled={busy}
              className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
            />
            Winner by default (forfeit)
          </label>
          {!payload.hasAnyScore ? (
            <p className="mt-1 text-xs text-slate-500">
              Scores are blank and will be cleared.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${hasDiscrepancy ? "bg-red-500 hover:bg-red-600" : "bg-[#0D30E4] hover:opacity-95"}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Saving..." : "Confirm Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MatchResultsHelpModal({ open, onClose }) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[126] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close help instructions"
      />

      <div className="animate-in fade-in zoom-in duration-300 relative w-[92%] max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <h3 className="text-xl font-black text-slate-900 sm:text-2xl">
          Match Results Help
        </h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
          {MATCH_RESULTS_HELP_TEXT}
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmDeleteEventModal({
  payload,
  busy,
  onChangeTypedValue,
  onCancel,
  onConfirm,
}) {
  if (!payload || typeof document === "undefined") {
    return null;
  }

  const sportName = String(payload.sportName ?? "").trim();
  const typedValue = String(payload.typedValue ?? "");
  const isExactMatch = typedValue === sportName;

  return createPortal(
    <div className="fixed inset-0 z-[127] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onCancel}
        disabled={busy}
        aria-label="Close delete event confirmation"
      />

      <div className="animate-in fade-in zoom-in duration-300 relative w-[92%] max-w-md rounded-[30px] border border-rose-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-rose-700">
          Destructive action
        </div>

        <h3 className="mt-3 text-2xl font-black text-slate-900">
          Remove Event?
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          This will permanently delete every match under
          <span className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-black text-slate-900">
            {sportName}
          </span>
          and cannot be undone.
        </p>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
          Type the exact event name to continue
        </label>
        <input
          type="text"
          value={typedValue}
          onChange={(event) => onChangeTypedValue(event.target.value)}
          disabled={busy}
          className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder={sportName}
          aria-label="Type event name to confirm deletion"
        />

        {!isExactMatch ? (
          <p className="mt-2 text-xs font-semibold text-rose-600">
            Text must match exactly: {sportName}
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-emerald-600">
            Exact match confirmed.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !isExactMatch}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Removing..." : "Remove Event"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FinalsTeamPicker({ matchId, side, value, disabled, onCommit }) {
  const normalizedCurrentValue = normalizeFinalsTeamSelection(value);
  const hasKnownCurrentValue = DEPARTMENT_OPTIONS.includes(
    normalizedCurrentValue,
  );
  const isNoTeamSelected = normalizedCurrentValue === "";
  const selectValue = hasKnownCurrentValue
    ? normalizedCurrentValue
    : isNoTeamSelected
      ? NO_TEAM_OPTION_VALUE
      : "";
  const placeholderLabel = hasKnownCurrentValue
    ? "Select team"
    : normalizedCurrentValue || "Select team";

  return (
    <div className="relative w-[6rem]">
      <select
        value={selectValue}
        onChange={(event) => {
          const nextValue = normalizeFinalsTeamSelection(event.target.value);
          onCommit(side, nextValue);
        }}
        disabled={disabled}
        className="h-9 w-full appearance-none rounded-full border border-gray-300 bg-white px-2 pr-7 text-center text-[10px] font-black uppercase tracking-wide text-theme-text focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`Select finals team ${side} for ${matchId}`}
      >
        <option value="">{placeholderLabel}</option>
        <option value={NO_TEAM_OPTION_VALUE}>TBA</option>
        {DEPARTMENT_OPTIONS.map((department) => (
          <option
            key={`finals-team-${matchId}-${side}-${department}`}
            value={department}
          >
            {department}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-muted"
        aria-hidden="true"
      />
    </div>
  );
}

function AdminMatchRow({
  match,
  busy,
  isFinals = false,
  onRequestConfirmResult,
  onSaveMatchup,
  onUpdateFinalsTeam,
  onRequestReset,
}) {
  const teamAName = match.teamAName ?? "TBA";
  const teamBName = match.teamBName ?? "TBA";
  const [teamANameDraft, setTeamANameDraft] = useState(teamAName);
  const [teamBNameDraft, setTeamBNameDraft] = useState(teamBName);
  const [teamAScoreDraft, setTeamAScoreDraft] = useState(
    toScoreInputValue(match.teamAScore ?? match.team_a_score),
  );
  const [teamBScoreDraft, setTeamBScoreDraft] = useState(
    toScoreInputValue(match.teamBScore ?? match.team_b_score),
  );
  const [isMatchupEditing, setIsMatchupEditing] = useState(false);

  useEffect(() => {
    setTeamANameDraft(teamAName);
    setTeamBNameDraft(teamBName);
  }, [match.id, teamAName, teamBName]);

  const winnerIdentity = normalizeIdentity(match.winner_id ?? match.winnerId);
  const teamAIdentity = normalizeIdentity(
    isFinals ? teamANameDraft : (normalizeTeamId(match, "A") ?? teamANameDraft),
  );
  const teamBIdentity = normalizeIdentity(
    isFinals ? teamBNameDraft : (normalizeTeamId(match, "B") ?? teamBNameDraft),
  );

  const hasWinner = Boolean(winnerIdentity);
  const persistedWinnerKey =
    winnerIdentity && winnerIdentity === teamAIdentity
      ? "A"
      : winnerIdentity && winnerIdentity === teamBIdentity
        ? "B"
        : null;
  const [selectedWinnerKey, setSelectedWinnerKey] =
    useState(persistedWinnerKey);

  useEffect(() => {
    setSelectedWinnerKey(persistedWinnerKey);
  }, [match.id, persistedWinnerKey]);

  const activeWinnerKey = persistedWinnerKey ?? selectedWinnerKey;
  const teamAIsWinner = activeWinnerKey === "A";
  const teamBIsWinner = activeWinnerKey === "B";
  const teamAIsLoser = Boolean(activeWinnerKey) && !teamAIsWinner;
  const teamBIsLoser = Boolean(activeWinnerKey) && !teamBIsWinner;
  const teamAIsPlaceholder = isPlaceholder(teamANameDraft);
  const teamBIsPlaceholder = isPlaceholder(teamBNameDraft);
  const hasPlaceholderTeam = teamAIsPlaceholder || teamBIsPlaceholder;

  const isCompleted = getStatusFromMatch(match);
  const originalTeamAScore = toScoreInputValue(
    match.teamAScore ?? match.team_a_score,
  );
  const originalTeamBScore = toScoreInputValue(
    match.teamBScore ?? match.team_b_score,
  );

  useEffect(() => {
    setTeamAScoreDraft(originalTeamAScore);
    setTeamBScoreDraft(originalTeamBScore);
  }, [match.id, originalTeamAScore, originalTeamBScore]);

  useEffect(() => {
    setIsMatchupEditing(false);
  }, [match.id]);

  const parsedTeamAScore = parseScoreValue(teamAScoreDraft);
  const parsedTeamBScore = parseScoreValue(teamBScoreDraft);
  const hasValidScores =
    (parsedTeamAScore === null ||
      (Number.isFinite(parsedTeamAScore) && parsedTeamAScore >= 0)) &&
    (parsedTeamBScore === null ||
      (Number.isFinite(parsedTeamBScore) && parsedTeamBScore >= 0));

  const hasScoreChanges =
    teamAScoreDraft !== originalTeamAScore ||
    teamBScoreDraft !== originalTeamBScore;

  const hasWinnerSelection = Boolean(selectedWinnerKey);
  const hasValidMatchupTeams =
    isValidFinalsTeamSelection(teamANameDraft) &&
    isValidFinalsTeamSelection(teamBNameDraft);
  const selectedWinnerHasTeam =
    selectedWinnerKey === "A"
      ? normalizeFinalsTeamSelection(teamANameDraft) !== ""
      : selectedWinnerKey === "B"
        ? normalizeFinalsTeamSelection(teamBNameDraft) !== ""
        : false;
  const hasTeamChanges =
    normalizeTeamName(teamANameDraft) !== normalizeTeamName(teamAName) ||
    normalizeTeamName(teamBNameDraft) !== normalizeTeamName(teamBName);
  const hasResultChanges =
    hasScoreChanges ||
    selectedWinnerKey !== persistedWinnerKey ||
    hasTeamChanges;
  const canSaveMatchup =
    !busy &&
    !isCompleted &&
    isMatchupEditing &&
    hasValidMatchupTeams;
  const canConfirmResult =
    !busy &&
    !isCompleted &&
    !hasPlaceholderTeam &&
    hasValidScores &&
    hasWinnerSelection &&
    selectedWinnerHasTeam &&
    hasValidMatchupTeams &&
    hasResultChanges;
  const matchupInputsDisabled = busy || isCompleted || !isMatchupEditing;

  function handleScoreInputChange(setter) {
    return (event) => {
      const nextValue = event.target.value;

      if (nextValue === "" || /^\d+$/.test(nextValue)) {
        setter(nextValue);
      }
    };
  }

  return (
    <div className="group border-b border-gray-200 px-2 py-2 transition-all duration-200 hover:bg-blue-50/30 sm:px-3">
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center justify-between">
          <p className="font-['Satoshi'] text-sm font-black tracking-wide text-theme-text md:text-base">
            {match.gameLabel}
          </p>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompleted ? "Done" : "Live"}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="flex min-w-0 flex-1 justify-end">
            {isMatchupEditing ? (
              <FinalsTeamPicker
                matchId={match.id}
                side="a"
                value={teamANameDraft}
                disabled={matchupInputsDisabled}
                onCommit={(_side, nextTeamName) => {
                  setTeamANameDraft(nextTeamName);
                }}
              />
            ) : (
              <div className="min-w-0 flex-1">
                <TeamActionButton
                  teamName={teamANameDraft}
                  align="left"
                  isWinner={teamAIsWinner}
                  isLoser={teamAIsLoser}
                  isLocked={isCompleted}
                  showTeamLabel={!isFinals}
                  disabled={busy || isCompleted}
                  onClick={() =>
                    setSelectedWinnerKey((currentWinnerKey) =>
                      currentWinnerKey === "A" ? null : "A",
                    )
                  }
                />
              </div>
            )}
          </div>

          <span className="shrink-0 text-[10px] font-black uppercase tracking-tight text-theme-muted">
            VS
          </span>

          <div className="flex min-w-0 flex-1 justify-start">
            {isMatchupEditing ? (
              <FinalsTeamPicker
                matchId={match.id}
                side="b"
                value={teamBNameDraft}
                disabled={matchupInputsDisabled}
                onCommit={(_side, nextTeamName) => {
                  setTeamBNameDraft(nextTeamName);
                }}
              />
            ) : (
              <div className="min-w-0 flex-1">
                <TeamActionButton
                  teamName={teamBNameDraft}
                  align="right"
                  isWinner={teamBIsWinner}
                  isLoser={teamBIsLoser}
                  isLocked={isCompleted}
                  showTeamLabel={!isFinals}
                  disabled={busy || isCompleted}
                  onClick={() =>
                    setSelectedWinnerKey((currentWinnerKey) =>
                      currentWinnerKey === "B" ? null : "B",
                    )
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {hasPlaceholderTeam ? (
              <span className="text-xs font-semibold text-slate-400">TBA</span>
            ) : (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={teamAScoreDraft}
                  onChange={handleScoreInputChange(setTeamAScoreDraft)}
                  disabled={busy || isCompleted}
                  className="h-9 w-10 rounded-lg border border-gray-300 bg-white px-1 text-center text-sm font-bold text-theme-text focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Team A score for ${match.gameLabel}`}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={teamBScoreDraft}
                  onChange={handleScoreInputChange(setTeamBScoreDraft)}
                  disabled={busy || isCompleted}
                  className="h-9 w-10 rounded-lg border border-gray-300 bg-white px-1 text-center text-sm font-bold text-theme-text focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Team B score for ${match.gameLabel}`}
                />
              </>
            )}
          </div>

          <div className="ml-auto">
            {isCompleted ? (
              <button
                type="button"
                onClick={onRequestReset}
                disabled={busy}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-red-200 bg-white px-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Undo ${match.gameLabel}`}
                title="Undo result"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onRequestConfirmResult(
                    match,
                    selectedWinnerKey,
                    teamAScoreDraft,
                    teamBScoreDraft,
                    teamANameDraft,
                    teamBNameDraft,
                  )
                }
                disabled={!canConfirmResult}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-[#0D30E4] px-2 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:flex md:items-center md:gap-2">
        <div className="w-10 shrink-0 text-center">
          <p className="font-['Satoshi'] text-sm font-black tracking-wide text-theme-text">
            {match.gameLabel}
          </p>
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isCompleted ? "Done" : "Live"}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2">
          <div className="flex min-w-0 flex-1 justify-end">
            {isMatchupEditing ? (
              <FinalsTeamPicker
                matchId={match.id}
                side="a"
                value={teamANameDraft}
                disabled={matchupInputsDisabled}
                onCommit={(_side, nextTeamName) => {
                  setTeamANameDraft(nextTeamName);
                }}
              />
            ) : (
              <TeamActionButton
                teamName={teamANameDraft}
                align="left"
                isWinner={teamAIsWinner}
                isLoser={teamAIsLoser}
                isLocked={isCompleted}
                showTeamLabel={!isFinals}
                disabled={busy || isCompleted}
                onClick={() =>
                  setSelectedWinnerKey((currentWinnerKey) =>
                    currentWinnerKey === "A" ? null : "A",
                  )
                }
              />
            )}
          </div>

          {hasPlaceholderTeam ? (
            <span className="shrink-0 text-xs font-semibold text-slate-400">
              TBA
            </span>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={teamAScoreDraft}
                onChange={handleScoreInputChange(setTeamAScoreDraft)}
                disabled={busy || isCompleted}
                className="h-9 w-10 rounded-lg border border-gray-300 bg-white px-1 text-center text-sm font-bold text-theme-text focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-12"
                aria-label={`Team A score for ${match.gameLabel}`}
              />

              <span className="shrink-0 text-[10px] font-black uppercase tracking-tight text-theme-muted">
                VS
              </span>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={teamBScoreDraft}
                onChange={handleScoreInputChange(setTeamBScoreDraft)}
                disabled={busy || isCompleted}
                className="h-9 w-10 rounded-lg border border-gray-300 bg-white px-1 text-center text-sm font-bold text-theme-text focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-12"
                aria-label={`Team B score for ${match.gameLabel}`}
              />
            </>
          )}

          <div className="flex min-w-0 flex-1 justify-start">
            {isMatchupEditing ? (
              <FinalsTeamPicker
                matchId={match.id}
                side="b"
                value={teamBNameDraft}
                disabled={matchupInputsDisabled}
                onCommit={(_side, nextTeamName) => {
                  setTeamBNameDraft(nextTeamName);
                }}
              />
            ) : (
              <TeamActionButton
                teamName={teamBNameDraft}
                align="right"
                isWinner={teamBIsWinner}
                isLoser={teamBIsLoser}
                isLocked={isCompleted}
                showTeamLabel={!isFinals}
                disabled={busy || isCompleted}
                onClick={() =>
                  setSelectedWinnerKey((currentWinnerKey) =>
                    currentWinnerKey === "B" ? null : "B",
                  )
                }
              />
            )}
          </div>
        </div>

        <div className="shrink-0">
          {isCompleted ? (
            <button
              type="button"
              onClick={onRequestReset}
              disabled={busy}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-red-200 bg-white px-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Undo ${match.gameLabel}`}
              title="Undo result"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="ml-1 hidden text-[10px] font-black uppercase tracking-wide sm:inline">
                Undo
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                onRequestConfirmResult(
                  match,
                  selectedWinnerKey,
                  teamAScoreDraft,
                  teamBScoreDraft,
                  teamANameDraft,
                  teamBNameDraft,
                )
              }
              disabled={!canConfirmResult}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-[#0D30E4] px-2 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span className="ml-1 hidden text-[10px] font-black uppercase tracking-wide sm:inline">
                Confirm
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setIsMatchupEditing(true)}
          disabled={busy || isCompleted}
          className="inline-flex min-h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-[10px] font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Edit Matchup
        </button>
        <button
          type="button"
          onClick={async () => {
            const saved = await onSaveMatchup(
              match,
              teamANameDraft,
              teamBNameDraft,
            );
            if (saved) {
              setIsMatchupEditing(false);
            }
          }}
          disabled={!canSaveMatchup}
          className="inline-flex min-h-8 items-center justify-center rounded-md bg-slate-700 px-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save Matchup
        </button>
      </div>
    </div>
  );
}

function BracketCard({
  title,
  icon: Icon,
  headerClassName,
  borderClassName,
  rows,
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border-2 ${borderClassName} bg-gradient-to-br from-slate-50 to-white/80 shadow-lg`}
    >
      <div
        className={`py-4 px-4 text-center font-['Satoshi'] text-lg font-black tracking-[0.08em] text-white ${headerClassName}`}
      >
        <div className="flex items-center justify-center gap-2">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </div>
      </div>
      {rows}
    </div>
  );
}

function normalizeMatches(matches) {
  return (matches ?? []).map((match, index) => ({
    ...match,
    gameLabel: String(
      match.gameLabel ?? match.game_label ?? match.game ?? `G${index + 1}`,
    ),
    teamAName: String(
      match.teamAName ??
        match.team_a_name ??
        match.team_a ??
        match.home_team_name ??
        "TBA",
    ),
    teamBName: String(
      match.teamBName ??
        match.team_b_name ??
        match.team_b ??
        match.away_team_name ??
        "TBA",
    ),
    teamAScore: match.teamAScore ?? match.team_a_score ?? "",
    teamBScore: match.teamBScore ?? match.team_b_score ?? "",
  }));
}

function AdminMatchResultsManager() {
  const { session } = useAuth();
  const adminEmail =
    String(session?.user?.email ?? "").trim() || "Unknown admin";
  const [activeSport, setActiveSport] = useState("");
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isRemovingEvent, setIsRemovingEvent] = useState(false);
  const [pendingDeleteEventModal, setPendingDeleteEventModal] =
    useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingResult, setConfirmingResult] = useState(false);
  const [matchOverrides, setMatchOverrides] = useState({});
  const [pendingResultModal, setPendingResultModal] = useState(null);
  const [pendingResetModal, setPendingResetModal] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [hasResultDiscrepancy, setHasResultDiscrepancy] = useState(false);
  const [resultDiscrepancyMessage, setResultDiscrepancyMessage] =
    useState("");
  const [activityLogEntries, setActivityLogEntries] = useState(() =>
    readMatchResultsActivityLogFromStorage(),
  );

  const appendActivityEntry = useCallback(
    ({
      action,
      description,
      sport,
      gameLabel = null,
      matchId = null,
      meta = null,
    }) => {
      const timestamp = new Date().toISOString();
      const entry = {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp,
        adminEmail,
        action: String(action ?? "Updated result").trim() || "Updated result",
        description: String(description ?? "").trim() || "No details provided.",
        sport: String(sport ?? "").trim() || "Unknown sport",
        gameLabel: gameLabel ? String(gameLabel).trim() : null,
        matchId: matchId ? String(matchId).trim() : null,
        meta,
      };

      setActivityLogEntries((currentEntries) => {
        const nextEntries = [entry, ...currentEntries].slice(0, 120);
        writeMatchResultsActivityLogToStorage(nextEntries);
        return nextEntries;
      });
    },
    [adminEmail],
  );

  const visibleActivityEntries = useMemo(
    () =>
      activityLogEntries.filter((entry) => {
        if (!activeSport) {
          return true;
        }

        return String(entry?.sport ?? "").trim() === activeSport;
      }),
    [activityLogEntries, activeSport],
  );

  const loadMatchResults = useCallback(async () => {
    const [matches, standings] = await Promise.all([
      getMatchesForAdmin(),
      getLeaderboardSnapshotBySport(),
    ]);

    return {
      matches: normalizeMatches(matches),
      standings: standings ?? [],
    };
  }, []);

  const {
    data,
    loading,
    error,
    refetch: refetchData,
  } = useAsyncData(loadMatchResults, {
    matches: [],
    standings: [],
  });

  const sportOptions = useMemo(
    () =>
      [
        ...new Set(
          data.matches
            .map((match) => String(match.sport ?? "").trim())
            .filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [data.matches],
  );

  useEffect(() => {
    if (!activeSport && sportOptions.length) {
      setActiveSport(sportOptions[0]);
    }

    if (activeSport && !sportOptions.includes(activeSport)) {
      setActiveSport(sportOptions[0] ?? "");
    }
  }, [activeSport, sportOptions]);

  const matchesForSport = useMemo(
    () =>
      data.matches
        .filter((match) => String(match.sport ?? "").trim() === activeSport)
        .map((match) => ({
          ...match,
          ...(matchOverrides[match.id] ?? {}),
        })),
    [data.matches, activeSport, matchOverrides],
  );

  const groupedMatches = useMemo(() => {
    const grouped = {
      A: [],
      B: [],
      finals: [],
    };

    matchesForSport.forEach((match, index) => {
      const roundKey = normalizeRoundKey(
        match.bracket ?? match.round ?? match.group,
      );
      if (roundKey === "A") {
        grouped.A.push(match);
      } else if (roundKey === "B") {
        grouped.B.push(match);
      } else {
        grouped.finals.push(match);
      }
    });

    grouped.A.sort(
      (left, right) =>
        parseGameSortValue(left.gameLabel) -
        parseGameSortValue(right.gameLabel),
    );
    grouped.B.sort(
      (left, right) =>
        parseGameSortValue(left.gameLabel) -
        parseGameSortValue(right.gameLabel),
    );
    grouped.finals.sort(
      (left, right) =>
        parseGameSortValue(left.gameLabel) -
        parseGameSortValue(right.gameLabel),
    );

    return grouped;
  }, [matchesForSport]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  function applyLocalWinner(match, teamKey, winnerByDefault = false) {
    const winnerValue =
      teamKey === "A"
        ? normalizeTeamId(match, "A")
        : normalizeTeamId(match, "B");

    setMatchOverrides((current) => ({
      ...current,
      [match.id]: {
        ...(current[match.id] ?? {}),
        winner_id: winnerValue,
        winnerByDefault: Boolean(winnerByDefault),
        winner_by_default: Boolean(winnerByDefault),
        is_completed: true,
      },
    }));
  }

  function clearMatchOverride(matchId) {
    setMatchOverrides((current) => {
      const next = { ...current };
      delete next[matchId];
      return next;
    });
  }

  function applyLocalReset(match) {
    setMatchOverrides((current) => ({
      ...current,
      [match.id]: {
        ...(current[match.id] ?? {}),
        winner_id: null,
        winnerByDefault: false,
        winner_by_default: false,
        is_completed: false,
        teamAScore: null,
        team_a_score: null,
        teamBScore: null,
        team_b_score: null,
      },
    }));
  }

  function applyLocalFinalsTeam(match, side, teamName) {
    const normalizedSide = String(side ?? "").toLowerCase();

    setMatchOverrides((current) => {
      const existing = current[match.id] ?? {};

      if (normalizedSide === "a") {
        return {
          ...current,
          [match.id]: {
            ...existing,
            teamAName: teamName,
            team_a_name: teamName,
            teamAId: teamName,
            team_a_id: teamName,
          },
        };
      }

      return {
        ...current,
        [match.id]: {
          ...existing,
          teamBName: teamName,
          team_b_name: teamName,
          teamBId: teamName,
          team_b_id: teamName,
        },
      };
    });
  }

  function applyLocalScores(match, teamAScore, teamBScore) {
    setMatchOverrides((current) => ({
      ...current,
      [match.id]: {
        ...(current[match.id] ?? {}),
        teamAScore,
        team_a_score: teamAScore,
        teamBScore,
        team_b_score: teamBScore,
      },
    }));
  }

  async function syncAfterMutation() {
    await refetchData();
    setMatchOverrides({});
  }

  async function handleCreateEvent() {
    const normalizedEventName = String(newEventName ?? "").trim();

    if (!normalizedEventName) {
      setErrorMessage("Enter an event name before creating.");
      return;
    }

    setErrorMessage("");
    setIsCreatingEvent(true);

    try {
      const result = await createEventMatchTemplate(normalizedEventName);
      await refetchData();
      setActiveSport(result.sport);
      setNewEventName("");
      setIsAddingEvent(false);
      appendActivityEntry({
        action: "Created event",
        description: `${result.inserted} template matches were created for ${result.sport}.`,
        sport: result.sport,
        meta: {
          inserted: result.inserted,
        },
      });
      setToastMessage(
        `${result.sport} created with ${result.inserted} template matches.`,
      );
    } catch (createError) {
      setErrorMessage(
        createError.message || "Unable to create the new event template.",
      );
    } finally {
      setIsCreatingEvent(false);
    }
  }

  async function handleRemoveEvent() {
    const normalizedSport = String(activeSport ?? "").trim();

    if (!normalizedSport) {
      setErrorMessage("Select an event to remove.");
      return;
    }
    setErrorMessage("");
    setPendingDeleteEventModal({
      sportName: normalizedSport,
      typedValue: "",
    });
  }

  async function handleConfirmRemoveEvent() {
    if (!pendingDeleteEventModal) {
      return;
    }

    const normalizedSport = String(
      pendingDeleteEventModal.sportName ?? "",
    ).trim();
    const typedEventName = String(
      pendingDeleteEventModal.typedValue ?? "",
    );

    if (!normalizedSport) {
      setErrorMessage("Select an event to remove.");
      return;
    }

    if (typedEventName !== normalizedSport) {
      setErrorMessage("Deletion cancelled. Event name did not match exactly.");
      return;
    }

    setErrorMessage("");
    setIsRemovingEvent(true);

    try {
      const result = await deleteEventMatches(normalizedSport);
      await refetchData();
      setActiveSport("");
      setPendingDeleteEventModal(null);
      appendActivityEntry({
        action: "Removed event",
        description: `${result.deleted} matches were deleted from ${result.sport}.`,
        sport: result.sport,
        meta: {
          deleted: result.deleted,
        },
      });
      setToastMessage(
        `${result.sport} removed (${result.deleted} matches deleted).`,
      );
    } catch (deleteError) {
      setErrorMessage(deleteError.message || "Unable to remove this event.");
    } finally {
      setIsRemovingEvent(false);
    }
  }

  function handleRequestConfirmResult(
    match,
    winnerTeamKey,
    teamAScore,
    teamBScore,
    selectedTeamA,
    selectedTeamB,
  ) {
    const normalizedWinnerTeamKey = String(winnerTeamKey ?? "").toUpperCase();
    const resolvedTeamAName = String(
      selectedTeamA ?? match.teamAName ?? "Team 1",
    ).trim();
    const resolvedTeamBName = String(
      selectedTeamB ?? match.teamBName ?? "Team 2",
    ).trim();
    const winnerName =
      normalizedWinnerTeamKey === "A"
        ? resolvedTeamAName
        : normalizedWinnerTeamKey === "B"
          ? resolvedTeamBName
          : "";

    const scoreAValue = String(teamAScore ?? "").trim();
    const scoreBValue = String(teamBScore ?? "").trim();
    const hasAnyScore = scoreAValue !== "" || scoreBValue !== "";

    let nextHasDiscrepancy = false;
    let nextDiscrepancyMessage = "";

    if (scoreAValue !== "" && scoreBValue !== "") {
      const numericScoreA = Number(scoreAValue);
      const numericScoreB = Number(scoreBValue);

      if (Number.isFinite(numericScoreA) && Number.isFinite(numericScoreB)) {
        const teamAIsHigher = numericScoreA > numericScoreB;
        const teamBIsHigher = numericScoreB > numericScoreA;

        if (
          (teamAIsHigher && normalizedWinnerTeamKey === "B") ||
          (teamBIsHigher && normalizedWinnerTeamKey === "A")
        ) {
          nextHasDiscrepancy = true;

          if (teamAIsHigher) {
            nextDiscrepancyMessage = `${resolvedTeamAName} has a higher score (${numericScoreA}) than ${resolvedTeamBName} (${numericScoreB}), but you have marked ${resolvedTeamBName} as the winner. Is this a default/forfeit or a mistake?`;
          } else {
            nextDiscrepancyMessage = `${resolvedTeamBName} has a higher score (${numericScoreB}) than ${resolvedTeamAName} (${numericScoreA}), but you have marked ${resolvedTeamAName} as the winner. Is this a default/forfeit or a mistake?`;
          }
        }
      }
    }

    setHasResultDiscrepancy(nextHasDiscrepancy);
    setResultDiscrepancyMessage(nextDiscrepancyMessage);

    setPendingResultModal({
      match,
      winnerTeamKey: normalizedWinnerTeamKey,
      teamAScore: scoreAValue,
      teamBScore: scoreBValue,
      selectedTeamA,
      selectedTeamB,
      teamAName: resolvedTeamAName || "TBA",
      teamBName: resolvedTeamBName || "TBA",
      gameLabel: match.gameLabel,
      winnerName,
      hasAnyScore,
      winnerByDefault: false,
    });
  }

  async function handleSaveMatchup(match, selectedTeamA, selectedTeamB) {
    if (getStatusFromMatch(match)) {
      setErrorMessage(
        "This match is already completed. Reset first to modify matchup.",
      );
      return false;
    }

    const normalizedTeamAName = normalizeFinalsTeamSelection(selectedTeamA);
    const normalizedTeamBName = normalizeFinalsTeamSelection(selectedTeamB);

    if (
      !isValidFinalsTeamSelection(selectedTeamA) ||
      !isValidFinalsTeamSelection(selectedTeamB)
    ) {
      setErrorMessage("Please select valid teams before saving matchup.");
      return false;
    }

    setBusyMatchId(match.id);
    setErrorMessage("");
    applyLocalFinalsTeam(match, "a", normalizedTeamAName);
    applyLocalFinalsTeam(match, "b", normalizedTeamBName);

    try {
      await saveMatchupTeams(match, normalizedTeamAName, normalizedTeamBName);
      appendActivityEntry({
        action: "Saved matchup",
        description: `${match.gameLabel} teams updated to ${normalizedTeamAName || "TBA"} vs ${normalizedTeamBName || "TBA"}.`,
        sport: match.sport,
        gameLabel: match.gameLabel,
        matchId: match.id,
      });
      setToastMessage(
        `${match.gameLabel}: Matchup saved (${normalizedTeamAName} vs ${normalizedTeamBName})`,
      );
      await syncAfterMutation();
      return true;
    } catch (saveError) {
      setErrorMessage(
        saveError.message || "Unable to save matchup for this match.",
      );
      clearMatchOverride(match.id);
      return false;
    } finally {
      setBusyMatchId(null);
    }
  }

  async function handleConfirmResult() {
    if (!pendingResultModal) {
      return;
    }

    const {
      match,
      winnerTeamKey,
      teamAScore,
      teamBScore,
      selectedTeamA,
      selectedTeamB,
      winnerByDefault,
    } = pendingResultModal;

    if (getStatusFromMatch(match)) {
      setErrorMessage(
        "This match is already completed. Reset first to modify result.",
      );
      return;
    }

    const normalizedWinnerTeamKey = String(winnerTeamKey ?? "").toUpperCase();
    if (normalizedWinnerTeamKey !== "A" && normalizedWinnerTeamKey !== "B") {
      setErrorMessage("Pick a winner before confirming the result.");
      return;
    }

    const winnerId =
      normalizedWinnerTeamKey === "A"
        ? normalizeIdentity(selectedTeamA)
        : normalizeIdentity(selectedTeamB);

    if (!winnerId) {
      setErrorMessage("Unable to resolve winner identity for this match.");
      return;
    }

    const normalizedTeamAName = normalizeFinalsTeamSelection(selectedTeamA);
    const normalizedTeamBName = normalizeFinalsTeamSelection(selectedTeamB);

    const valueA = String(teamAScore ?? "").trim();
    const valueB = String(teamBScore ?? "").trim();
    const parsedTeamAScore = valueA === "" ? null : parseInt(valueA, 10);
    const parsedTeamBScore = valueB === "" ? null : parseInt(valueB, 10);

    if (
      (parsedTeamAScore !== null &&
        (!Number.isFinite(parsedTeamAScore) || parsedTeamAScore < 0)) ||
      (parsedTeamBScore !== null &&
        (!Number.isFinite(parsedTeamBScore) || parsedTeamBScore < 0))
    ) {
      setErrorMessage("Scores must be whole numbers 0 or higher.");
      return;
    }

    if (
      !isValidFinalsTeamSelection(selectedTeamA) ||
      !isValidFinalsTeamSelection(selectedTeamB)
    ) {
      setErrorMessage("Please select valid teams before saving.");
      return;
    }

    const selectedWinnerName =
      normalizedWinnerTeamKey === "A"
        ? normalizedTeamAName
        : normalizedTeamBName;
    if (!selectedWinnerName) {
      setErrorMessage("Select a winner from a non-empty team slot.");
      return;
    }

    setBusyMatchId(match.id);
    setConfirmingResult(true);
    setErrorMessage("");
    applyLocalFinalsTeam(match, "a", normalizedTeamAName);
    applyLocalFinalsTeam(match, "b", normalizedTeamBName);
    applyLocalScores(match, teamAScore, teamBScore);
    applyLocalWinner(match, normalizedWinnerTeamKey, winnerByDefault);

    try {
      await confirmMatchResult(
        match,
        winnerId,
        valueA,
        valueB,
        normalizedTeamAName,
        normalizedTeamBName,
        winnerByDefault,
      );
      setWinnerByDefaultStorageValue(match.id, Boolean(winnerByDefault));
      const winnerName =
        normalizedWinnerTeamKey === "A"
          ? normalizedTeamAName
          : normalizedTeamBName;
      const confirmationSuffix = winnerByDefault ? " by default" : "";
      appendActivityEntry({
        action: "Confirmed result",
        description: `${match.gameLabel}: ${winnerName} won${confirmationSuffix}. Score ${valueA || "-"}-${valueB || "-"}.`,
        sport: match.sport,
        gameLabel: match.gameLabel,
        matchId: match.id,
        meta: {
          winner: winnerName,
          scoreA: valueA,
          scoreB: valueB,
          winnerByDefault: Boolean(winnerByDefault),
        },
      });
      if (teamAScore !== null || teamBScore !== null) {
        const displayScoreA = teamAScore ?? "-";
        const displayScoreB = teamBScore ?? "-";
        setToastMessage(
          `${match.gameLabel}: ${winnerName} confirmed${confirmationSuffix} (${displayScoreA}-${displayScoreB})`,
        );
      } else {
        setToastMessage(
          `${match.gameLabel}: ${winnerName} confirmed${confirmationSuffix}.`,
        );
      }
      await syncAfterMutation();
      setPendingResultModal(null);
      setHasResultDiscrepancy(false);
      setResultDiscrepancyMessage("");
    } catch (confirmError) {
      setErrorMessage(
        confirmError.message || "Unable to confirm this match result.",
      );
      clearMatchOverride(match.id);
    } finally {
      setBusyMatchId(null);
      setConfirmingResult(false);
    }
  }

  function handleRequestReset(match) {
    setPendingResetModal({
      match,
      gameLabel: match.gameLabel,
    });
  }

  async function handleConfirmReset() {
    if (!pendingResetModal) {
      return;
    }

    const { match } = pendingResetModal;

    setBusyMatchId(match.id);
    setConfirmingReset(true);
    setErrorMessage("");
    applyLocalReset(match);

    try {
      await resetMatchResult(match);
      setWinnerByDefaultStorageValue(match.id, false);
      appendActivityEntry({
        action: "Reset result",
        description: `${match.gameLabel} was reset to pending and scores were cleared.`,
        sport: match.sport,
        gameLabel: match.gameLabel,
        matchId: match.id,
      });
      setToastMessage(`${match.gameLabel} has been reset.`);
      await syncAfterMutation();
      setPendingResetModal(null);
    } catch (resetError) {
      setErrorMessage(resetError.message || "Unable to reset this match.");
      clearMatchOverride(match.id);
    } finally {
      setBusyMatchId(null);
      setConfirmingReset(false);
    }
  }

  function handleUpdateFinalsTeam(match, side, teamName) {
    if (getStatusFromMatch(match)) {
      setErrorMessage(
        "Reset the game result first before editing finals teams.",
      );
      return;
    }

    applyLocalFinalsTeam(match, side, teamName);
  }

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Match Results
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Declare winners and manage completed matches
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Manage winners in the matches table using the same bracket flow as the
          public view.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-theme-muted">
            Select Sport
          </label>

          {!isAddingEvent ? (
            <div className="flex items-center gap-2">
              <div className="relative w-full min-w-[220px] max-w-md">
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

              <button
                type="button"
                onClick={() => {
                  setNewEventName("");
                  setIsAddingEvent(true);
                }}
                disabled={isRemovingEvent}
                className="inline-flex h-12 min-w-12 items-center justify-center rounded-xl border border-gray-300 bg-white text-lg font-black text-slate-700 transition hover:bg-slate-50"
                aria-label="Add new event"
                title="Add new event"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleRemoveEvent}
                disabled={!activeSport || isRemovingEvent}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 text-xs font-black uppercase tracking-wide text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Remove selected event"
                title="Remove selected event"
              >
                {isRemovingEvent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isRemovingEvent ? "Removing" : "Remove"}
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-[220px] max-w-2xl items-center gap-2">
              <input
                type="text"
                value={newEventName}
                onChange={(event) => setNewEventName(event.target.value)}
                placeholder="Enter new sport/event name"
                className="h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-theme-text shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={isCreatingEvent}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0D30E4] px-4 text-sm font-black text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingEvent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isCreatingEvent ? "Creating" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isCreatingEvent) {
                    return;
                  }

                  setNewEventName("");
                  setIsAddingEvent(false);
                }}
                disabled={isCreatingEvent}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          aria-label="Open match results help"
        >
          <CircleHelp className="h-4 w-4" />
          Help
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-theme-muted">
          Loading match results...
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-[#FDA4AF]">
          {error.message || "Unable to load match results right now."}
        </p>
      ) : null}

      {!loading && !error ? (
        activeSport ? (
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <BracketCard
                title="BRACKET A"
                icon={Dumbbell}
                borderClassName="border-slate-900"
                headerClassName="bg-gradient-to-r from-slate-800 to-slate-700"
                rows={
                  groupedMatches.A.length ? (
                    groupedMatches.A.map((match) => (
                      <AdminMatchRow
                        key={match.id}
                        match={match}
                        busy={busyMatchId === match.id}
                        isFinals={false}
                        onRequestConfirmResult={handleRequestConfirmResult}
                        onSaveMatchup={handleSaveMatchup}
                        onUpdateFinalsTeam={handleUpdateFinalsTeam}
                        onRequestReset={() => handleRequestReset(match)}
                      />
                    ))
                  ) : (
                    <p className="px-4 py-4 text-sm text-theme-muted">
                      No Bracket A matches yet.
                    </p>
                  )
                }
              />

              <BracketCard
                title="BRACKET B"
                icon={Volleyball}
                borderClassName="border-blue-500"
                headerClassName="bg-gradient-to-r from-blue-600 to-blue-500"
                rows={
                  groupedMatches.B.length ? (
                    groupedMatches.B.map((match) => (
                      <AdminMatchRow
                        key={match.id}
                        match={match}
                        busy={busyMatchId === match.id}
                        isFinals={false}
                        onRequestConfirmResult={handleRequestConfirmResult}
                        onSaveMatchup={handleSaveMatchup}
                        onUpdateFinalsTeam={handleUpdateFinalsTeam}
                        onRequestReset={() => handleRequestReset(match)}
                      />
                    ))
                  ) : (
                    <p className="px-4 py-4 text-sm text-theme-muted">
                      No Bracket B matches yet.
                    </p>
                  )
                }
              />
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

              <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
                {groupedMatches.finals.length ? (
                  groupedMatches.finals.map((match, index) => (
                    <div
                      key={match.id}
                      className={`${index % 2 === 0 ? "lg:border-r" : ""} border-gray-200 lg:border-gray-300`}
                    >
                      <AdminMatchRow
                        match={match}
                        busy={busyMatchId === match.id}
                        isFinals
                        onRequestConfirmResult={handleRequestConfirmResult}
                        onSaveMatchup={handleSaveMatchup}
                        onUpdateFinalsTeam={handleUpdateFinalsTeam}
                        onRequestReset={() => handleRequestReset(match)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-4 text-sm text-theme-muted">
                    No Finals matches yet.
                  </p>
                )}
              </div>
            </div>

            <section className="mt-8 rounded-3xl border border-theme-border bg-white/90 p-4 shadow-lg sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Activity Log
                    </p>
                    <h3 className="mt-1 text-lg font-black text-theme-text sm:text-xl">
                      Match Results Change History
                    </h3>
                    <p className="mt-1 text-xs text-theme-muted sm:text-sm">
                      Tracks matchup saves, winner confirmations, resets, and event setup actions.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center rounded-full border border-theme-border-soft bg-theme-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-theme-muted">
                  {visibleActivityEntries.length} change
                  {visibleActivityEntries.length === 1 ? "" : "s"}
                </span>
              </div>

              {visibleActivityEntries.length ? (
                <div className="mt-4 max-h-[20rem] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(100,116,139,0.45)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/60 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                  {visibleActivityEntries.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                          {entry.action}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                          {entry.sport}
                        </span>
                        {entry.gameLabel ? (
                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                            {entry.gameLabel}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {entry.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {entry.adminEmail}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatActivityDateTime(entry.timestamp)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No activity entries yet for {activeSport || "this view"}.
                </div>
              )}
            </section>
          </div>
        ) : (
          <p className="mt-6 text-sm text-theme-muted">
            No sports available yet.
          </p>
        )
      ) : null}

      <ConfirmResetModal
        payload={pendingResetModal}
        busy={confirmingReset}
        onCancel={() => {
          if (confirmingReset) return;
          setPendingResetModal(null);
        }}
        onConfirm={handleConfirmReset}
      />

      <ConfirmResultModal
        payload={pendingResultModal}
        busy={confirmingResult}
        hasDiscrepancy={hasResultDiscrepancy}
        discrepancyMessage={resultDiscrepancyMessage}
        onToggleWinnerByDefault={(checked) => {
          setPendingResultModal((currentModal) => {
            if (!currentModal) return currentModal;
            return {
              ...currentModal,
              winnerByDefault: checked,
            };
          });
        }}
        onCancel={() => {
          if (confirmingResult) return;
          setPendingResultModal(null);
          setHasResultDiscrepancy(false);
          setResultDiscrepancyMessage("");
        }}
        onConfirm={handleConfirmResult}
      />

      <MatchResultsHelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <ConfirmDeleteEventModal
        payload={pendingDeleteEventModal}
        busy={isRemovingEvent}
        onChangeTypedValue={(value) => {
          setPendingDeleteEventModal((currentModal) => {
            if (!currentModal) {
              return currentModal;
            }

            return {
              ...currentModal,
              typedValue: value,
            };
          });
        }}
        onCancel={() => {
          if (isRemovingEvent) {
            return;
          }
          setPendingDeleteEventModal(null);
        }}
        onConfirm={handleConfirmRemoveEvent}
      />

      {toastMessage ? (
        <div className="animate-in fade-in zoom-in-95 duration-300 fixed bottom-6 right-6 z-[130] rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {toastMessage}
        </div>
      ) : null}
    </section>
  );
}

export default AdminMatchResultsManager;
