import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  getAppSettings,
  setForumsVisible,
} from "../../services/appSettingsService";
import {
  concernStatusOptions,
  deleteConcernSubmission,
  getConcernSubmissions,
  updateConcernSubmission,
} from "../../services/concernService";

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

const filterOptions = ["all", ...concernStatusOptions, "spam"];

function AdminConcernManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [actingId, setActingId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isForumsVisible, setIsForumsVisible] = useState(true);
  const [togglingForumsVisibility, setTogglingForumsVisibility] = useState(false);

  const loadConcerns = useCallback(() => getConcernSubmissions(200), []);
  const {
    data: concerns,
    loading,
    error,
    refetch,
  } = useAsyncData(loadConcerns, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const settings = await getAppSettings();

        if (!cancelled) {
          setIsForumsVisible(settings.is_forums_visible !== false);
        }
      } catch (settingsError) {
        if (!cancelled) {
          setActionError(
            settingsError.message || "Unable to load forums visibility.",
          );
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setReplyDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };

      concerns.forEach((concern) => {
        if (nextDrafts[concern.id] === undefined) {
          nextDrafts[concern.id] = concern.admin_reply ?? "";
        }
      });

      return nextDrafts;
    });
  }, [concerns]);

  const filteredConcerns = useMemo(() => {
    if (selectedFilter === "all") {
      return concerns;
    }

    if (selectedFilter === "spam") {
      return concerns.filter((concern) => concern.is_spam);
    }

    return concerns.filter((concern) => concern.status === selectedFilter);
  }, [concerns, selectedFilter]);

  async function handleStatusChange(concern, status) {
    setActingId(concern.id);
    setActionError("");
    setActionStatus("");

    try {
      await updateConcernSubmission(concern, { status, actor });
      setActionStatus(`Concern marked as ${status}.`);
      await refetch();
    } catch (updateError) {
      setActionError(
        updateError.message || "Unable to update the concern status.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleSpamToggle(concern) {
    setActingId(concern.id);
    setActionError("");
    setActionStatus("");

    try {
      await updateConcernSubmission(concern, {
        is_spam: !concern.is_spam,
        actor,
      });
      setActionStatus(
        concern.is_spam
          ? "Concern removed from spam."
          : "Concern marked as spam.",
      );
      await refetch();
    } catch (updateError) {
      setActionError(
        updateError.message || "Unable to update the concern flag.",
      );
    } finally {
      setActingId(null);
    }
  }

  function handleReplyDraftChange(concernId, value) {
    setReplyDrafts((currentDrafts) => ({
      ...currentDrafts,
      [concernId]: value,
    }));
  }

  async function handleReplySave(concern) {
    setActingId(concern.id);
    setActionError("");
    setActionStatus("");

    try {
      const replyDraft = replyDrafts[concern.id] ?? "";
      await updateConcernSubmission(concern, {
        admin_reply: replyDraft,
        actor,
      });
      setActionStatus(
        replyDraft.trim()
          ? "Admin reply saved. The concern is now visible on the public concerns page."
          : "Admin reply cleared. The concern is no longer visible on the public concerns page.",
      );
      await refetch();
    } catch (updateError) {
      setActionError(updateError.message || "Unable to save the admin reply.");
    } finally {
      setActingId(null);
    }
  }

  async function handleDeleteClick(concern) {
    const shouldDelete = window.confirm(
      `Delete anonymous concern \"${concern.subject}\"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setActingId(concern.id);
    setActionError("");
    setActionStatus("");

    try {
      await deleteConcernSubmission(concern);
      setActionStatus("Concern deleted successfully.");
      await refetch();
    } catch (deleteError) {
      setActionError(deleteError.message || "Unable to delete the concern.");
    } finally {
      setActingId(null);
    }
  }

    async function handleForumsVisibilityToggle() {
    const nextValue = !isForumsVisible;

    setActionError("");
    setActionStatus("");
    setTogglingForumsVisibility(true);

    try {
      await setForumsVisible(nextValue);
      setIsForumsVisible(nextValue);
      setActionStatus(
        nextValue
          ? "Forums section is now visible on the About & Forums page."
          : "Forums section is now hidden on the About & Forums page.",
      );
    } catch (toggleError) {
      setActionError(
        toggleError.message || "Unable to update forums visibility.",
      );
    } finally {
      setTogglingForumsVisibility(false);
    }
  }
  
  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Concern Inbox
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Review anonymous concerns from the homepage
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Admins can review concerns, reply to them, and control whether they
          become visible on the public concerns page. A concern is published
          publicly only after an admin reply has been saved.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-theme-border bg-theme-surface p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-theme-text">
              Public forums visibility
            </h3>
            <p className="mt-1 text-sm text-theme-muted">
              Hide or show the Concerns and Queries section on the About & Forums
              page.
            </p>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-text">
            <input
              type="checkbox"
              checked={isForumsVisible}
              onChange={handleForumsVisibilityToggle}
              disabled={togglingForumsVisibility}
              className="h-4 w-4 rounded border-theme-border-soft"
            />
            <span>
              {togglingForumsVisibility
                ? "Updating..."
                : isForumsVisible
                  ? "Forums section visible"
                  : "Forums section hidden"}
            </span>
          </label>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-theme-border bg-theme-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-theme-text">Inbox</h3>
            <p className="mt-1 text-sm text-theme-muted">
              Filter submissions by status or isolate spam reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedFilter}
              onChange={(event) => setSelectedFilter(event.target.value)}
              className="rounded-full border border-theme-border-soft bg-theme-bg px-4 py-2 text-sm capitalize text-theme-text outline-none transition focus:border-brand-gold"
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refetch}
              className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
            >
              Refresh
            </button>
          </div>
        </div>

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-[#F43F5E4D] bg-[#F43F5E1A] px-4 py-3 text-sm text-[#FDA4AF]">
            {actionError}
          </div>
        ) : null}
        {actionStatus ? (
          <div className="mt-4 rounded-2xl border border-[#10B9814D] bg-[#10B9811A] px-4 py-3 text-sm text-[#86EFAC]">
            {actionStatus}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-theme-muted">Loading concerns...</p>
        ) : error ? (
          <p className="mt-4 text-sm text-[#FDA4AF]">
            Unable to load anonymous concerns right now.
          </p>
        ) : !filteredConcerns.length ? (
          <p className="mt-4 text-sm text-theme-muted">
            No anonymous concerns match the current filter.
          </p>
        ) : (
          <div className="mt-4 max-h-[36rem] space-y-4 overflow-y-auto pr-2">
            {filteredConcerns.map((concern) => {
              const isActing = actingId === concern.id;

              return (
                <article
                  key={concern.id}
                  className="rounded-2xl border border-theme-border-soft bg-theme-bg p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold">
                          {concern.category || "General Inquiry"}
                        </span>
                        <span className="rounded-full border border-theme-border-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-theme-subtle">
                          {concern.status || "new"}
                        </span>
                        {concern.is_spam ? (
                          <span className="rounded-full border border-[#F43F5E4D] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FDA4AF]">
                            Spam flagged
                          </span>
                        ) : null}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-theme-text">
                        {concern.subject}
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-theme-muted">
                        {concern.message}
                      </p>
                      <div className="mt-4 rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-theme-text">
                            Admin reply
                          </p>
                          <span className="text-xs text-theme-subtle">
                            {concern.is_publicly_visible
                              ? "Visible on public concerns page"
                              : "Hidden until reply is posted"}
                          </span>
                        </div>
                        <textarea
                          value={
                            replyDrafts[concern.id] ?? concern.admin_reply ?? ""
                          }
                          onChange={(event) =>
                            handleReplyDraftChange(
                              concern.id,
                              event.target.value,
                            )
                          }
                          className="mt-3 min-h-28 w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-text outline-none transition focus:border-brand-gold"
                          placeholder="Write the admin response that should appear on the public concerns page."
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleReplySave(concern)}
                            className="rounded-full bg-brand-gold px-4 py-2 text-white font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Save reply
                          </button>
                          {concern.admin_reply ? (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() =>
                                handleReplyDraftChange(concern.id, "")
                              }
                              className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Clear draft
                            </button>
                          ) : null}
                        </div>
                        {concern.admin_reply ? (
                          <div className="mt-3 text-xs text-theme-subtle">
                            {concern.replied_at ? (
                              <p>
                                Replied: {formatDateTime(concern.replied_at)}
                              </p>
                            ) : null}
                            {concern.replied_by_email ? (
                              <p>Reply by: {concern.replied_by_email}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        disabled={isActing || concern.status === "reviewed"}
                        onClick={() => handleStatusChange(concern, "reviewed")}
                        className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reviewed
                      </button>
                      <button
                        type="button"
                        disabled={isActing || concern.status === "resolved"}
                        onClick={() => handleStatusChange(concern, "resolved")}
                        className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        disabled={isActing || concern.status === "archived"}
                        onClick={() => handleStatusChange(concern, "archived")}
                        className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleSpamToggle(concern)}
                        className="rounded-full border border-[#F59E0B4D] px-4 py-2 text-sm font-semibold text-[#FDE68A] transition hover:bg-[#F59E0B1A] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {concern.is_spam ? "Unflag spam" : "Flag spam"}
                      </button>
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => handleDeleteClick(concern)}
                        className="rounded-full border border-[#F43F5E4D] px-4 py-2 text-sm font-semibold text-[#FDA4AF] transition hover:bg-[#F43F5E1A] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-subtle">
                    <span>Submitted: {formatDateTime(concern.created_at)}</span>
                    {concern.reviewed_at ? (
                      <span>
                        Reviewed: {formatDateTime(concern.reviewed_at)}
                      </span>
                    ) : null}
                    {concern.reviewed_by_email ? (
                      <span>Updated by: {concern.reviewed_by_email}</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminConcernManager;
