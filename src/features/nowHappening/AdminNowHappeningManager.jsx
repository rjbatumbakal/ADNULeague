import { useCallback, useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useAsyncData } from "../../hooks/useAsyncData";
import {
  createNowHappeningPost,
  deleteNowHappeningPost,
  getNowHappeningActivityLogs,
  getNowHappeningPosts,
  updateNowHappeningPost,
} from "../../services/nowHappeningService";

function createInitialFormState() {
  return {
    caption: "",
    display_order: 0,
    is_published: true,
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

function AdminNowHappeningManager() {
  const { session } = useAuth();
  const actor = useMemo(
    () => ({
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
    }),
    [session],
  );
  const [formState, setFormState] = useState(createInitialFormState);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState("");
  const [formError, setFormError] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPosts = useCallback(
    () => getNowHappeningPosts({ limit: 100, includeUnpublished: true }),
    [],
  );
  const loadActivityLogs = useCallback(
    () => getNowHappeningActivityLogs(50),
    [],
  );
  const {
    data: posts,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
  } = useAsyncData(loadPosts, []);
  const {
    data: activityLogs,
    loading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useAsyncData(loadActivityLogs, []);

  useEffect(() => {
    if (!selectedImageFile) {
      setSelectedImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setSelectedImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;

    setFormState((currentState) => ({
      ...currentState,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleImageChange(event) {
    setSelectedImageFile(event.target.files?.[0] ?? null);
  }

  function resetForm() {
    setFormState(createInitialFormState());
    setEditingPost(null);
    setSelectedImageFile(null);
    setFormError("");
  }

  function handleEditClick(post) {
    setEditingPost(post);
    setFormState({
      caption: post.caption,
      display_order: post.display_order,
      is_published: post.is_published,
    });
    setSelectedImageFile(null);
    setFormError("");
    setFormStatus("");
  }

  async function refreshAdminData() {
    await Promise.all([refetchPosts(), refetchLogs()]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormStatus("");

    try {
      if (editingPost) {
        await updateNowHappeningPost(editingPost, {
          ...formState,
          imageFile: selectedImageFile,
          actor,
        });
        setFormStatus("Now Happening post updated successfully.");
      } else {
        await createNowHappeningPost({
          ...formState,
          imageFile: selectedImageFile,
          actor,
        });
        setFormStatus("Now Happening post created successfully.");
      }

      resetForm();
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to save the Now Happening post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteClick(post) {
    const shouldDelete = window.confirm("Delete this Now Happening post?");

    if (!shouldDelete) {
      return;
    }

    setFormError("");
    setFormStatus("");

    try {
      await deleteNowHappeningPost(post, actor);

      if (editingPost?.id === post.id) {
        resetForm();
      }

      setFormStatus("Now Happening post deleted successfully.");
      await refreshAdminData();
    } catch (error) {
      setFormError(error.message || "Unable to delete the Now Happening post.");
    }
  }

  const previewImageUrl =
    selectedImagePreviewUrl || editingPost?.image_url || "";

  return (
    <section className="mt-10 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Now Happening Manager
        </p>
        <h2 className="mt-3 text-2xl font-bold text-theme-text">
          Publish carousel posts for the Home page
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
          Upload an image, write a live-caption update, and manage the order of
          posts shown in the public Now Happening carousel.
        </p>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
          <h3 className="text-lg font-semibold text-theme-text">
            {editingPost ? "Edit carousel post" : "Create carousel post"}
          </h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="now-happening-caption"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Caption
              </label>
              <textarea
                id="now-happening-caption"
                name="caption"
                value={formState.caption}
                onChange={handleFieldChange}
                className="min-h-32 w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
                placeholder="Share what is happening right now..."
                required
              />
            </div>

            <div>
              <label
                htmlFor="now-happening-image"
                className="mb-2 block text-sm font-medium text-theme-muted"
              >
                Image
              </label>
              <input
                id="now-happening-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-sm text-theme-text file:mr-4 file:rounded-full file:border-0 file:bg-theme-subtle file:px-4 file:py-2 file:text-sm file:font-semibold file:text-theme-contrast"
                required={!editingPost}
              />
              <p className="mt-2 text-xs text-theme-subtle">
                {editingPost
                  ? "Leave the file input blank to keep the current image."
                  : "Upload one image for each carousel post."}
              </p>
            </div>

            {previewImageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-theme-border-soft bg-theme-bg">
                <img
                  src={previewImageUrl}
                  alt="Now Happening preview"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg text-theme-subtle">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="now-happening-display-order"
                  className="mb-2 block text-sm font-medium text-theme-muted"
                >
                  Display order
                </label>
                <input
                  id="now-happening-display-order"
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
                  name="is_published"
                  type="checkbox"
                  checked={Boolean(formState.is_published)}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-theme-border-soft"
                />
                Publish to homepage carousel
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
                className="rounded-full bg-brand-gold px-5 py-2.5 text-white font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting
                  ? editingPost
                    ? "Saving changes..."
                    : "Publishing post..."
                  : editingPost
                    ? "Save changes"
                    : "Publish post"}
              </button>
              {editingPost ? (
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
                Carousel posts
              </h3>
              <button
                type="button"
                onClick={refreshAdminData}
                className="rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
              >
                Refresh
              </button>
            </div>

            {postsLoading ? (
              <p className="mt-4 text-sm text-theme-muted">Loading posts...</p>
            ) : postsError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load Now Happening posts right now.
              </p>
            ) : !posts.length ? (
              <p className="mt-4 text-sm text-theme-muted">
                No Now Happening posts have been uploaded yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[30rem] space-y-4 overflow-y-auto pr-2">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-theme-border-soft bg-theme-bg"
                  >
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.caption || "Now Happening post"}
                        className="aspect-[16/9] w-full object-cover"
                      />
                    ) : null}
                    <div className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold">
                              Order {post.display_order}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                post.is_published
                                  ? "bg-[#10B9811A] text-[#34D399]"
                                  : "bg-theme-overlay text-theme-muted"
                              }`}
                            >
                              {post.is_published ? "Published" : "Hidden"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-theme-muted">
                            {post.caption}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditClick(post)}
                            className="rounded-full border border-theme-border-soft px-4 py-2 text-sm font-semibold text-theme-text transition hover:bg-theme-surface-hover"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(post)}
                            className="rounded-full border border-[#F43F5E4D] px-4 py-2 text-sm font-semibold text-[#FDA4AF] transition hover:bg-[#F43F5E1A]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-subtle">
                        <span>Created: {formatDateTime(post.created_at)}</span>
                        {post.created_by_email ? (
                          <span>Posted by: {post.created_by_email}</span>
                        ) : null}
                        {post.updated_at ? (
                          <span>
                            Updated: {formatDateTime(post.updated_at)}
                          </span>
                        ) : null}
                        {post.updated_by_email ? (
                          <span>Updated by: {post.updated_by_email}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-theme-border bg-theme-surface p-5">
            <h3 className="text-lg font-semibold text-theme-text">
              Now Happening activity log
            </h3>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              Every create, update, and delete action for the homepage carousel
              is recorded here.
            </p>

            {logsLoading ? (
              <p className="mt-4 text-sm text-theme-muted">
                Loading activity...
              </p>
            ) : logsError ? (
              <p className="mt-4 text-sm text-[#FDA4AF]">
                Unable to load the Now Happening activity log right now.
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
                          {log.action} carousel post
                        </p>
                        <p className="mt-1 text-sm text-theme-muted">
                          {log.caption_snapshot || "Untitled update"}
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

export default AdminNowHappeningManager;
