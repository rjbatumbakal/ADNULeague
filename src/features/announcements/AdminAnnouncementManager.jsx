import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementActivityLogs,
  getAnnouncements,
  updateAnnouncement,
} from "../../services/announcementService";

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

function createInitialFormState() {
  return {
    title: "",
    content: "",
  };
}

function AdminAnnouncementManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const [formState, setFormState] = useState(createInitialFormState);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAnnouncements = useCallback(() => getAnnouncements(100), []);
  const loadActivityLogs = useCallback(
    () => getAnnouncementActivityLogs(50),
    [],
  );
  const {
    data: announcements,
    loading: announcementsLoading,
    error: announcementsError,
    refetch: refetchAnnouncements,
  } = useAsyncData(loadAnnouncements, []);
  const {
    data: activityLogs,
    loading: activityLogsLoading,
    error: activityLogsError,
    refetch: refetchActivityLogs,
  } = useAsyncData(loadActivityLogs, []);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  }

  function resetForm() {
    setFormState(createInitialFormState());
    setEditingAnnouncement(null);
    setFormError("");
  }

  function handleEditClick(announcement) {
    setEditingAnnouncement(announcement);
    setFormState({
      title: announcement.title,
      content: announcement.content,
    });
    setFormError("");
    setFormStatus("");
  }

  async function refreshAdminData() {
    await Promise.all([refetchAnnouncements(), refetchActivityLogs()]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormStatus("");

    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement, {
          ...formState,
          actor,
        });
        setFormStatus("Announcement updated successfully.");
      } else {
        await createAnnouncement({
          ...formState,
          actor,
        });
        setFormStatus("Announcement posted successfully.");
      }

      resetForm();
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to save the announcement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClick(announcement) {
    const shouldDelete = window.confirm(
      `Delete announcement \"${announcement.title}\"?`,
    );

    if (!shouldDelete) {
      return;
    }

    setFormError("");
    setFormStatus("");

    try {
      await deleteAnnouncement(announcement, actor);

      if (editingAnnouncement?.id === announcement.id) {
        resetForm();
      }

      setFormStatus("Announcement deleted successfully.");
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to delete the announcement.");
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Announcement Manager
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Post and manage official announcements
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Use this panel to publish new announcements, revise live posts, and
          remove outdated notices from the public homepage.
        </p>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <h3 className="text-lg font-semibold text-theme-text">
            {editingAnnouncement ? "Edit announcement" : "Create announcement"}
          </h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="announcement-title"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Title
              </label>
              <input
                id="announcement-title"
                name="title"
                type="text"
                value={formState.title}
                onChange={handleFieldChange}
                className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                placeholder="Enter the announcement headline"
                required
              />
            </div>
            <div>
              <label
                htmlFor="announcement-content"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Content
              </label>
              <textarea
                id="announcement-content"
                name="content"
                value={formState.content}
                onChange={handleFieldChange}
                className="min-h-36 w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                placeholder="Write the full announcement body"
                required
              />
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
                className="rounded-full bg-brand-gold px-5 py-2.5 text-white font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting
                  ? editingAnnouncement
                    ? "Saving changes..."
                    : "Posting announcement..."
                  : editingAnnouncement
                    ? "Save changes"
                    : "Post announcement"}
              </button>
              {editingAnnouncement ? (
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
              <h3 className="text-lg font-semibold text-theme-text">
                Published announcements
              </h3>
              <button
                type="button"
                onClick={refreshAdminData}
                className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
              >
                Refresh
              </button>
            </div>

            {announcementsLoading ? (
              <p className="mt-4 text-sm text-theme-muted">
                Loading announcements...
              </p>
            ) : announcementsError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load announcements for editing right now.
              </p>
            ) : !announcements.length ? (
              <p className="mt-4 text-sm text-theme-muted">
                No announcements have been posted yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[26rem] space-y-4 overflow-y-auto pr-2">
                {announcements.map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-2xl border border-theme-border-soft bg-theme-bg p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-theme-text">
                          {announcement.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-theme-muted">
                          {announcement.content}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(announcement)}
                          className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(announcement)}
                          className="rounded-full border border-[#F43F5E4D] px-4 py-2 text-sm font-semibold text-[#FDA4AF] transition hover:bg-[#F43F5E1A]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-subtle">
                      <span>
                        Posted: {formatDateTime(announcement.created_at)}
                      </span>
                      {announcement.posted_by_email ? (
                        <span>Posted by: {announcement.posted_by_email}</span>
                      ) : null}
                      {announcement.updated_at ? (
                        <span>
                          Updated: {formatDateTime(announcement.updated_at)}
                        </span>
                      ) : null}
                      {announcement.updated_by_email ? (
                        <span>Updated by: {announcement.updated_by_email}</span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <h3 className="text-lg font-semibold text-theme-text">
              Announcement activity log
            </h3>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              Every create, update, and delete action is recorded here with the
              admin account used during the action.
            </p>

            {activityLogsLoading ? (
              <p className="mt-4 text-sm text-theme-muted">
                Loading activity...
              </p>
            ) : activityLogsError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load the announcement activity log right now.
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
                          {log.action} announcement
                        </p>
                        <p className="mt-1 text-sm text-theme-muted">
                          {log.title_snapshot || "Untitled announcement"}
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

export default AdminAnnouncementManager;
