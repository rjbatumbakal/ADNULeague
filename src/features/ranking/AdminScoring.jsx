import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ShieldAlert,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  blackoutModeOptions,
  getAppSettings,
  setBlackoutMode,
  setBreakdownVisible,
  setTallyHidden,
} from "../../services/appSettingsService";
import {
  buildMasterTabulation,
  buildScoreRowsFromResults,
  createEmptyScoreRows,
  formatPoints,
  formatRankLabel,
  formatRankingDateTime,
  getEventResultsForEvent,
  getLastEventUpdate,
  getRankingReferenceData,
  saveEventResults,
} from "../../services/rankingService";
import { cn } from "../../utils/cn";
import DepartmentMultiSelect from "./DepartmentMultiSelect";
import MasterTabulationBreakdown from "./MasterTabulationBreakdown";
import ScoringActivityLog from "./ScoringActivityLog";

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

function ToastStack({ toasts, onDismiss }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[90] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-panel backdrop-blur-xl",
            toast.type === "error"
              ? "border-[#F43F5E66] bg-[#450A0A]/90 text-[#FECDD3]"
              : "border-[#10B98155] bg-[#052E2B]/90 text-[#BBF7D0]",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                toast.type === "error"
                  ? "bg-[#F43F5E26] text-[#FDA4AF]"
                  : "bg-[#10B98126] text-[#86EFAC]",
              )}
            >
              {toast.type === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {toast.type === "error" ? "Supabase error" : "Saved"}
              </p>
              <p className="mt-1 text-sm leading-5">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80 transition hover:opacity-100"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function createInitialData() {
  return {
    departments: [],
    events: [],
    eventResults: [],
  };
}

function normalizeDepartmentKey(acronym) {
  return String(acronym ?? "")
    .trim()
    .toUpperCase();
}

function getDepartmentLogoUrl(acronym) {
  const filename = departmentLogoFilenames[normalizeDepartmentKey(acronym)];
  if (!filename) return "";
  return `/College Department Logos/${encodeURIComponent(filename)}`;
}

function getUnavailableDepartmentIds(scoreRows, activeRank) {
  return scoreRows
    .filter((row) => Number(row.rank) !== Number(activeRank))
    .flatMap((row) => row.department_ids);
}

function getRankBadgeClassName(rank) {
  if (String(rank ?? "").trim().toUpperCase() === "D") {
    return "border border-slate-300 bg-slate-200 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }

  const numericRank = Number(rank);

  if (numericRank === 1) {
    return "bg-gradient-to-br from-[#FDE68A] via-[#FACC15] to-[#B45309] text-white font-bold shadow-md";
  }

  if (numericRank === 2) {
    return "bg-gradient-to-br from-[#E2E8F0] via-[#94A3B8] to-[#64748B] text-white font-bold shadow-md";
  }

  if (numericRank === 3) {
    return "bg-gradient-to-br from-[#FED7AA] via-[#FB923C] to-[#9A3412] text-white font-bold shadow-md";
  }

  return "bg-brand-gold-soft text-brand-gold";
}

function AdminScoring() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const toastTimeoutsRef = useRef(new Map());
  const [activeTab, setActiveTab] = useState("encode");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventSearchInput, setEventSearchInput] = useState("");
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const eventComboboxRef = useRef(null);
  const [scoreRows, setScoreRows] = useState(createEmptyScoreRows);
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const [toasts, setToasts] = useState([]);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState(new Set());
  const [blackoutMode, setBlackoutModeState] = useState("none");
  const [isBreakdownVisible, setIsBreakdownVisible] = useState(false);
  const [isTallyHidden, setIsTallyHidden] = useState(false);
  const [showTallyConfirmModal, setShowTallyConfirmModal] = useState(false);
  const [pendingTallyHidden, setPendingTallyHidden] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState(null);
  const [pendingBlackoutMode, setPendingBlackoutMode] = useState(null);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const loadScoringData = useCallback(() => getRankingReferenceData(), []);
  const { data, loading, error, refetch } = useAsyncData(
    loadScoringData,
    createInitialData(),
  );

  useEffect(() => {
    getAppSettings().then((settings) => {
      setBlackoutModeState(settings.blackout_mode);
      setIsBreakdownVisible(Boolean(settings.is_breakdown_visible));
      setIsTallyHidden(Boolean(settings.is_tally_hidden));
    });
  }, []);

  function handleTallyHiddenToggle() {
    const nextValue = !isTallyHidden;
    setPendingTallyHidden(nextValue);
    setShowTallyConfirmModal(true);
  }

  function handleCancelTallyConfirm() {
    setShowTallyConfirmModal(false);
    setPendingTallyHidden(null);
  }

  async function handleConfirmTallyHidden() {
    if (pendingTallyHidden === null) {
      setShowTallyConfirmModal(false);
      return;
    }

    setTogglingVisibility(true);

    try {
      await setTallyHidden(pendingTallyHidden);
      setIsTallyHidden(pendingTallyHidden);
      pushToast(
        "success",
        pendingTallyHidden
          ? "Overall tally names are now hidden on the public rankings page."
          : "Overall tally names are now visible on the public rankings page.",
      );
      setShowTallyConfirmModal(false);
      setPendingTallyHidden(null);
    } catch (err) {
      pushToast(
        "error",
        err.message || "Unable to update overall tally visibility.",
      );
    } finally {
      setTogglingVisibility(false);
    }
  }

  function handleBreakdownVisibilityToggle() {
    const nextValue = !isBreakdownVisible;
    setPendingVisibility(nextValue);
    setShowRevealModal(true);
  }

  function handleCancelRevealModal() {
    setShowRevealModal(false);
    setPendingVisibility(null);
  }

  async function handleConfirmBreakdownVisibility() {
    if (pendingVisibility === null) {
      setShowRevealModal(false);
      return;
    }

    setTogglingVisibility(true);

    try {
      await setBreakdownVisible(pendingVisibility);
      setIsBreakdownVisible(pendingVisibility);
      console.log(
        "Updated app_settings.is_breakdown_visible =>",
        pendingVisibility,
      );
      pushToast(
        "success",
        pendingVisibility
          ? "Public points breakdown is now revealed."
          : "Public points breakdown is now locked.",
      );
      setShowRevealModal(false);
      setPendingVisibility(null);
    } catch (err) {
      console.error("Failed to update breakdown visibility:", err);
      pushToast(
        "error",
        err.message || "Unable to update breakdown visibility.",
      );
    } finally {
      setTogglingVisibility(false);
    }
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!eventComboboxRef.current?.contains(event.target)) {
        setIsEventDropdownOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsEventDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (!eventSearchInput.trim()) return data.events;
    const query = eventSearchInput.toLowerCase();
    return data.events.filter(
      (event) =>
        event.name.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query),
    );
  }, [data.events, eventSearchInput]);
  const selectedEvent = useMemo(
    () => data.events.find((event) => event.id === selectedEventId) ?? null,
    [data.events, selectedEventId],
  );
  const selectedEventResults = useMemo(
    () => getEventResultsForEvent(data.eventResults, selectedEventId),
    [data.eventResults, selectedEventId],
  );
  const lastUpdated = useMemo(
    () => getLastEventUpdate(selectedEventResults),
    [selectedEventResults],
  );
  const masterTabulation = useMemo(
    () =>
      buildMasterTabulation(data.departments, data.events, data.eventResults),
    [data.departments, data.events, data.eventResults],
  );

  const eventResultCounts = useMemo(
    () =>
      data.eventResults.reduce((counts, eventResult) => {
        counts.set(
          eventResult.event_id,
          (counts.get(eventResult.event_id) ?? 0) + 1,
        );
        return counts;
      }, new Map()),
    [data.eventResults],
  );

  const pushToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((currentToasts) => [...currentToasts, { id, type, message }]);

    const timeoutId = window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id),
      );
      toastTimeoutsRef.current.delete(id);
    }, 5000);

    toastTimeoutsRef.current.set(id, timeoutId);
  }, []);

  function dismissToast(toastId) {
    const timeoutId = toastTimeoutsRef.current.get(toastId);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      toastTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setScoreRows(buildScoreRowsFromResults(selectedEventResults));
    setFormStatus("");
  }, [selectedEventResults, selectedEventId]);

  useEffect(() => {
    if (error) {
      pushToast(
        "error",
        error.message || "Unable to load the scoring dashboard right now.",
      );
    }
  }, [error, pushToast]);

  function handleDepartmentChange(rank, departmentIds) {
    setScoreRows((currentRows) =>
      currentRows.map((row) =>
        Number(row.rank) === Number(rank)
          ? {
              ...row,
              department_ids: departmentIds,
            }
          : row,
      ),
    );
  }

  function handlePointsChange(rank, nextValue) {
    setScoreRows((currentRows) =>
      currentRows.map((row) =>
        Number(row.rank) === Number(rank)
          ? {
              ...row,
              points_awarded: nextValue,
            }
          : row,
      ),
    );
  }

  function handleDefaultRank(rank) {
    setScoreRows((currentRows) =>
      currentRows.map((row) =>
        Number(row.rank) === Number(rank)
          ? {
              ...row,
              department_ids: [],
              points_awarded: "",
            }
          : row,
      ),
    );
  }

  function validateScoreRows(rows) {
    const rowsWithMissingPoints = rows.filter(
      (row) =>
        row.department_ids.length > 0 &&
        (row.points_awarded === "" ||
          row.points_awarded === null ||
          Number(row.points_awarded) === 0),
    );
    return rowsWithMissingPoints;
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!selectedEvent) {
      pushToast("error", "Choose an event before saving results.");
      return;
    }

    const missingPointsRows = validateScoreRows(scoreRows);

    if (missingPointsRows.length > 0) {
      setPendingSaveData({
        eventId: selectedEvent.id,
        scoreRows,
        actorEmail: actor.email,
        eventName: selectedEvent.name,
      });
      setIsWarningModalOpen(true);
      return;
    }

    await performSave({
      eventId: selectedEvent.id,
      scoreRows,
      actorEmail: actor.email,
      eventName: selectedEvent.name,
    });
  }

  async function performSave(saveData) {
    setSubmitting(true);
    setFormStatus("");

    try {
      await saveEventResults({
        eventId: saveData.eventId,
        scoreRows: saveData.scoreRows,
        actorEmail: saveData.actorEmail,
        allowEmptyPointsAsZero: Boolean(saveData.allowEmptyPointsAsZero),
      });
      setFormStatus(`Saved scoring for ${saveData.eventName}.`);
      pushToast("success", `Saved scoring for ${saveData.eventName}.`);
      await refetch();
    } catch (saveError) {
      pushToast(
        "error",
        saveError.message || "Unable to save the selected event results.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelWarning() {
    setIsWarningModalOpen(false);
    setPendingSaveData(null);
  }

  async function handleConfirmPublishRankings() {
    setIsWarningModalOpen(false);
    if (pendingSaveData) {
      await performSave({
        ...pendingSaveData,
        allowEmptyPointsAsZero: true,
      });
      setPendingSaveData(null);
    }
  }

  function handleBlackoutModeSelect(nextMode) {
    if (nextMode === blackoutMode) return;
    setPendingBlackoutMode(nextMode);
    setIsBlackoutModalOpen(true);
  }

  async function handleConfirmBlackoutChange() {
    setIsBlackoutModalOpen(false);
    if (!pendingBlackoutMode) return;
    setTogglingVisibility(true);
    try {
      await setBlackoutMode(pendingBlackoutMode);
      setBlackoutModeState(pendingBlackoutMode);
      const label =
        blackoutModeOptions.find((o) => o.value === pendingBlackoutMode)
          ?.label ?? pendingBlackoutMode;
      pushToast("success", `Blackout mode updated to: ${label}`);
    } catch (err) {
      pushToast("error", err.message || "Unable to update blackout mode.");
    } finally {
      setTogglingVisibility(false);
      setPendingBlackoutMode(null);
    }
  }

  async function handleRefresh() {
    setFormStatus("");

    try {
      await refetch();
    } catch (refreshError) {
      pushToast(
        "error",
        refreshError.message || "Unable to refresh the scoring dashboard.",
      );
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Event Scoring
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Finalize event results and distribute points.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Quickly assign ranks, manage tied placements, and apply custom
          Olympic-style scoring. Every saved result instantly updates the live
          leaderboard and master tabulation. Please be wary and double-check if you're inputting the right info.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-full border border-theme-border-soft bg-theme-bg p-1">
          <button
            type="button"
            onClick={() => setActiveTab("encode")}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition",
              activeTab === "encode"
                ? "bg-brand-gold text-white shadow-sm"
                : "text-theme-muted hover:text-theme-text",
            )}
          >
            Encode Scores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tabulation")}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition",
              activeTab === "tabulation"
                ? "bg-brand-gold text-white shadow-sm"
                : "text-theme-muted hover:text-theme-text",
            )}
          >
            Master Tabulation
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-theme-muted">
          Public Leaderboard Visibility
        </span>
        <div className="inline-flex rounded-full border border-theme-border-soft bg-theme-bg p-1">
          {blackoutModeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleBlackoutModeSelect(option.value)}
              disabled={togglingVisibility}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                blackoutMode === option.value
                  ? option.value === "none"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-amber-500 text-white shadow-sm"
                  : "text-theme-muted hover:text-theme-text",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "encode" && (
        <div className="mx-auto mt-8 max-w-4xl">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gold-soft text-brand-gold">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-theme-text">
                    Select Event
                  </h3>
                  <p className="mt-1 text-sm text-theme-muted">
                    Search and pick an event to score
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
              >
                Refresh
              </button>
            </div>

            <div ref={eventComboboxRef} className="relative mt-5">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
              <input
                type="text"
                placeholder="Search events by name or category..."
                value={eventSearchInput}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setEventSearchInput(nextValue);
                  if (
                    selectedEventId &&
                    nextValue.trim() !== (selectedEvent?.name ?? "").trim()
                  ) {
                    setSelectedEventId("");
                  }
                  setIsEventDropdownOpen(true);
                }}
                onFocus={() => setIsEventDropdownOpen(true)}
                className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg py-3 pl-11 pr-10 text-sm text-theme-text outline-none transition placeholder:text-theme-subtle focus:border-brand-gold"
              />
              {selectedEvent && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEventId("");
                    setEventSearchInput("");
                    setIsEventDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-theme-muted transition hover:bg-theme-surface-hover hover:text-theme-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isEventDropdownOpen && !selectedEvent && (
                <div className="absolute top-full z-10 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-theme-border-soft bg-theme-surface shadow-lg">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-theme-muted">
                      Loading events...
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                      const resultCount = eventResultCounts.get(event.id) ?? 0;
                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedEventId(event.id);
                            setEventSearchInput(event.name ?? "");
                            setIsEventDropdownOpen(false);
                          }}
                          className="w-full border-b border-theme-border-soft px-4 py-3 text-left transition last:border-b-0 hover:bg-theme-surface-hover"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-theme-text">
                                {event.name}
                              </p>
                              <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-theme-subtle">
                                {event.category}
                              </p>
                            </div>
                            <span className="rounded-full border border-theme-border-soft px-2 py-0.5 text-xs font-semibold text-theme-muted">
                              {resultCount}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-theme-muted">
                      No events found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-theme-border bg-theme-surface p-5">
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                {selectedEvent?.name ?? "Event score sheet"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-theme-muted">
                Enter the manual points for each rank. If departments tied, add
                all tied departments to the same rank row. Leave ranks blank for
                defaults, no-shows, or events with fewer participants.
              </p>
            </div>

            {lastUpdated ? (
              <div className="mt-4 inline-flex rounded-full border border-brand-gold/30 bg-brand-gold-soft/70 px-4 py-2 text-xs font-semibold text-brand-gold">
                Last updated by: {lastUpdated.admin_email} on{" "}
                {formatRankingDateTime(lastUpdated.updated_at)}
              </div>
            ) : null}

            {!data.departments.length && !loading ? (
              <div className="mt-6 rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-4 py-5 text-sm text-theme-muted">
                Add departments in Supabase before encoding event results.
              </div>
            ) : null}

            {!selectedEvent && !loading ? (
              <div className="mt-6 rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-4 py-5 text-sm text-theme-muted">
                Choose an event from the navigator to open its score sheet.
              </div>
            ) : null}

            {selectedEvent ? (
              <form className="mt-6 space-y-3" onSubmit={handleSave}>
                {scoreRows.map((row) => {
                  const unavailableDepartmentIds = getUnavailableDepartmentIds(
                    scoreRows,
                    row.rank,
                  );

                  return (
                    <div
                      key={row.rank}
                      className="grid gap-3 rounded-2xl border border-theme-border-soft bg-theme-bg p-3 md:grid-cols-[7rem_minmax(0,1fr)_9rem] md:items-center"
                    >
                      <div
                        className={cn(
                          "inline-flex rounded-full px-3 py-1.5 text-sm font-semibold",
                          getRankBadgeClassName(row.rank),
                        )}
                      >
                        {formatRankLabel(row.rank)}
                      </div>

                      <div>
                        <DepartmentMultiSelect
                          departments={data.departments}
                          selectedDepartmentIds={row.department_ids}
                          disabledDepartmentIds={unavailableDepartmentIds}
                          onChange={(departmentIds) =>
                            handleDepartmentChange(row.rank, departmentIds)
                          }
                          placeholder="Select departments..."
                        />
                      </div>

                      <div>
                        <input
                          id={`rank-points-${row.rank}`}
                          type="number"
                          step="any"
                          value={row.points_awarded}
                          onChange={(event) =>
                            handlePointsChange(row.rank, event.target.value)
                          }
                          className="w-full rounded-2xl border border-theme-border-soft bg-theme-surface px-3 py-2 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                          placeholder="Points"
                        />
                      </div>
                    </div>
                  );
                })}

                {formStatus ? (
                  <div className="rounded-2xl border border-[#10B9814D] bg-[#10B9811A] px-4 py-3 text-sm text-[#86EFAC]">
                    {formStatus}
                  </div>
                ) : null}

                <div className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-4 text-sm text-theme-muted">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gold-soft text-brand-gold">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-theme-text">
                        Audit stamp
                      </p>
                      <p className="mt-1 leading-6">
                        Every saved result row stores the active admin email and
                        the exact save timestamp in `event_results`.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={submitting || loading || !selectedEvent}
                    className="rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? "Saving results..." : "Save event results"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setScoreRows(
                        buildScoreRowsFromResults(selectedEventResults),
                      )
                    }
                    disabled={submitting || !selectedEvent}
                    className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reset event form
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {showTallyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Confirm Action</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isTallyHidden
                ? "Are you sure you want to REVEAL the team names to the public?"
                : "Are you sure you want to HIDE the team names from the public ranking page?"}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelTallyConfirm}
                disabled={togglingVisibility}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTallyHidden}
                disabled={togglingVisibility}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  pendingVisibility
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-slate-900/10 text-slate-900",
                )}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-theme-text">
                  {pendingVisibility ? "Reveal Points Breakdown?" : "Hide Points Breakdown?"}
                </h3>
                <p className="mt-3 leading-7 text-theme-muted">
                  {pendingVisibility
                    ? "⚠️ Are you sure? This will instantly make all event points public to the entire campus."
                    : "Hide points breakdown from the public?"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelRevealModal}
                disabled={togglingVisibility}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBreakdownVisibility}
                disabled={togglingVisibility}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70",
                  pendingVisibility
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800",
                )}
              >
                {pendingVisibility ? "Yes, Reveal" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tabulation" && (
        <div className="mx-auto mt-8 max-w-5xl">
          <div className="rounded-2xl border border-theme-border bg-theme-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-theme-text">
                  Master Tabulation
                </h3>
                <p className="mt-2 text-sm text-theme-muted">
                  Private audit view of all department totals and event-by-event
                  breakdowns
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleTallyHiddenToggle}
                  disabled={togglingVisibility}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-70",
                    isTallyHidden
                      ? "bg-slate-700 text-white hover:bg-slate-800"
                      : "border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
                  )}
                >
                  {isTallyHidden
                    ? "TALLY NAMES: HIDDEN"
                    : "TALLY NAMES: VISIBLE"}
                </button>
                <button
                  type="button"
                  onClick={handleBreakdownVisibilityToggle}
                  disabled={togglingVisibility}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-70",
                    isBreakdownVisible
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-slate-900 text-white hover:bg-slate-800",
                  )}
                >
                  {isBreakdownVisible ? "Breakdown: Revealed" : "Breakdown: Locked"}
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-center text-sm text-theme-muted">
                Loading tabulation data...
              </div>
            ) : masterTabulation.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-4 py-8 text-center text-sm text-theme-muted">
                No event results have been recorded yet.
              </div>
            ) : (
              <div className="mt-6 space-y-2">
                {masterTabulation.map((dept, index) => {
                  const isExpanded = expandedDepartmentIds.has(
                    dept.department_id,
                  );

                  return (
                    <div
                      key={dept.department_id}
                      className="overflow-hidden rounded-2xl border border-theme-border-soft bg-theme-bg transition"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const newExpanded = new Set(expandedDepartmentIds);
                          if (isExpanded) {
                            newExpanded.delete(dept.department_id);
                          } else {
                            newExpanded.add(dept.department_id);
                          }
                          setExpandedDepartmentIds(newExpanded);
                        }}
                        className="w-full px-5 py-4 text-left transition hover:bg-theme-surface-hover"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold-soft text-sm font-bold text-brand-gold">
                              #{index + 1}
                            </div>
                            {getDepartmentLogoUrl(dept.department_acronym) ? (
                              <img
                                src={getDepartmentLogoUrl(
                                  dept.department_acronym,
                                )}
                                alt={dept.department_acronym}
                                className="h-10 w-10 shrink-0 rounded-full border border-theme-border-soft bg-theme-surface object-contain"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-theme-border-soft bg-theme-surface text-xs font-bold text-theme-muted">
                                {dept.department_acronym?.slice(0, 2) ?? "??"}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-theme-text">
                                {dept.department_acronym}
                              </p>
                              <p className="mt-0.5 text-xs text-theme-subtle">
                                {dept.department_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-brand-gold">
                                {formatPoints(dept.total_points)}
                              </p>
                              <p className="text-xs uppercase tracking-wider text-theme-subtle">
                                Total Points
                              </p>
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 text-theme-muted transition-transform",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-theme-border-soft bg-theme-surface px-5 py-4">
                          {dept.event_breakdown.length === 0 ? (
                            <p className="text-sm text-theme-muted">
                              No event results recorded for this department yet.
                            </p>
                          ) : (
                            <MasterTabulationBreakdown
                              breakdownByCategory={dept.event_breakdown_by_category}
                              formatRankLabel={formatRankLabel}
                              getRankBadgeClassName={getRankBadgeClassName}
                              emptyMessage="No event results recorded for this department yet."
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ScoringActivityLog
        eventResults={data.eventResults}
        loading={loading}
        error={error}
        onRefresh={handleRefresh}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-theme-text">
                  Publish Rankings Without Points?
                </h3>
                <p className="mt-3 leading-7 text-theme-muted">
                  You have assigned departments to ranks but left some points
                  blank. This will update the event leaderboard so students can
                  see who won, but{" "}
                  <span className="font-semibold text-theme-text">
                    no points will be added to the overall Championship
                    Standings
                  </span>{" "}
                  for those ranks yet.
                </p>
                <p className="mt-2 leading-7 text-theme-muted">
                  Are you sure you want to proceed?
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelWarning}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublishRankings}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
              >
                Publish Rankings Only
              </button>
            </div>
          </div>
        </div>
      )}

      {isBlackoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl border border-theme-border bg-theme-surface p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  pendingBlackoutMode === "none"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500",
                )}
              >
                {pendingBlackoutMode === "none" ? (
                  <Eye className="h-6 w-6" />
                ) : (
                  <EyeOff className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-theme-text">
                  {pendingBlackoutMode === "none"
                    ? "Reveal Official Rankings?"
                    : "Initiate Blackout Period?"}
                </h3>
                <p className="mt-3 leading-7 text-theme-muted">
                  {pendingBlackoutMode === "none"
                    ? "This will instantly publish the true teams and their actual points to the public leaderboard. Are you ready to reveal the results?"
                    : "This will hide the identities of the selected teams on the public leaderboard to build suspense. Proceed?"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsBlackoutModalOpen(false);
                  setPendingBlackoutMode(null);
                }}
                className="rounded-full border border-theme-border-soft px-5 py-2.5 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlackoutChange}
                className={cn(
                  "rounded-full px-5 py-2.5 text-sm font-semibold text-white transition",
                  pendingBlackoutMode === "none"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-amber-500 hover:bg-amber-600",
                )}
              >
                {pendingBlackoutMode === "none"
                  ? "Reveal Rankings"
                  : "Hide Rankings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminScoring;
