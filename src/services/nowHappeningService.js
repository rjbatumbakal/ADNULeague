import { isSupabaseConfigured, supabase } from "./supabaseClient";

const nowHappeningPostsTable = "now_happening_posts";
const nowHappeningActivityLogsTable = "now_happening_activity_logs";
const nowHappeningBucket = "now-happening";

function ensureSupabaseWriteAccess() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured in this local environment yet. Use a real Supabase Auth admin account with storage enabled.",
    );
  }
}

function isMissingNowHappeningPostsTableError(error) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes(nowHappeningPostsTable)
  );
}

function isMissingNowHappeningLogsTableError(error) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.toLowerCase().includes(nowHappeningActivityLogsTable)
  );
}

function isOptionalNowHappeningLogError(error) {
  if (!error) {
    return false;
  }

  return (
    isMissingNowHappeningLogsTableError(error) ||
    error.code === "42501" ||
    error.code === "PGRST204" ||
    error.message?.toLowerCase().includes("column")
  );
}

function isMissingNowHappeningBucketError(error) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";

  return message.includes("bucket") && message.includes("not found");
}

function normalizeNowHappeningPost(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    caption: String(row.caption ?? ""),
    image_path: row.image_path ?? "",
    image_url: row.image_url ?? "",
    is_published: row.is_published !== false,
    display_order: Number(row.display_order ?? 0),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by_email: row.created_by_email ?? null,
    updated_by_email: row.updated_by_email ?? null,
  };
}

function normalizeNowHappeningLog(row) {
  return {
    id:
      row?.id ??
      `${row?.post_id ?? "post"}-${row?.created_at ?? "time"}-${row?.action ?? "action"}`,
    post_id: row?.post_id ?? null,
    action: row?.action ?? "updated",
    actor_email: row?.actor_email ?? "Unknown admin",
    caption_snapshot: row?.caption_snapshot ?? "",
    image_path_snapshot: row?.image_path_snapshot ?? "",
    created_at: row?.created_at ?? null,
  };
}

function createNowHappeningImagePath(file) {
  const fileExtension = String(file?.name?.split(".").pop() ?? "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "jpg";
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.round(Math.random() * 1000000)}`;

  return `${year}/${month}/${randomId}.${fileExtension}`;
}

async function uploadNowHappeningImage(imageFile) {
  if (!imageFile) {
    throw new Error("Please select an image to upload.");
  }

  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase storage is not configured in this local environment yet.",
    );
  }

  const imagePath = createNowHappeningImagePath(imageFile);
  const { error: uploadError } = await supabase.storage
    .from(nowHappeningBucket)
    .upload(imagePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    if (isMissingNowHappeningBucketError(uploadError)) {
      throw new Error(
        'Supabase Storage bucket "now-happening" was not found. Create a public bucket with that exact name before uploading Now Happening images.',
      );
    }

    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(nowHappeningBucket).getPublicUrl(imagePath);

  return {
    image_path: imagePath,
    image_url: publicUrl,
  };
}

async function removeNowHappeningImage(imagePath) {
  if (!imagePath || !isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.storage
    .from(nowHappeningBucket)
    .remove([imagePath]);

  if (error) {
    throw error;
  }
}

async function removeNowHappeningImageBestEffort(imagePath) {
  try {
    await removeNowHappeningImage(imagePath);
  } catch {
    return;
  }
}

async function writeNowHappeningActivityLog({
  action,
  actor,
  postId,
  caption,
  imagePath,
}) {
  const { error } = await supabase.from(nowHappeningActivityLogsTable).insert({
    post_id: postId,
    action,
    actor_id: actor?.id ?? null,
    actor_email: actor?.email ?? null,
    caption_snapshot: caption,
    image_path_snapshot: imagePath,
  });

  if (error && !isOptionalNowHappeningLogError(error)) {
    throw error;
  }
}

export async function getNowHappeningPosts({
  limit,
  includeUnpublished = false,
} = {}) {
  let query = supabase
    .from(nowHappeningPostsTable)
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeUnpublished) {
    query = query.eq("is_published", true);
  }

  const { data, error } = typeof limit === "number" ? await query.limit(limit) : await query;

  if (error) {
    if (isMissingNowHappeningPostsTableError(error)) {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) => normalizeNowHappeningPost(row));
}

export async function getNowHappeningActivityLogs(limit = 25) {
  const query = supabase
    .from(nowHappeningActivityLogsTable)
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = typeof limit === "number" ? await query.limit(limit) : await query;

  if (error) {
    if (isMissingNowHappeningLogsTableError(error) || error.code === "42501") {
      return [];
    }

    throw error;
  }

  return (data ?? []).map((row) => normalizeNowHappeningLog(row));
}

export async function createNowHappeningPost({
  caption,
  imageFile,
  isPublished,
  displayOrder,
  is_published,
  display_order,
  actor,
}) {
  ensureSupabaseWriteAccess();
  const normalizedCaption = String(caption ?? "").trim();
  const resolvedIsPublished = isPublished ?? is_published ?? true;
  const resolvedDisplayOrder = displayOrder ?? display_order ?? 0;

  if (!normalizedCaption) {
    throw new Error("Please enter a caption for the post.");
  }

  if (!imageFile) {
    throw new Error("Please upload an image for the post.");
  }

  const uploadedImage = await uploadNowHappeningImage(imageFile);

  try {
    const payload = {
      caption: normalizedCaption,
      image_path: uploadedImage.image_path,
      image_url: uploadedImage.image_url,
      is_published: Boolean(resolvedIsPublished),
      display_order: Number(resolvedDisplayOrder) || 0,
      created_by_email: actor?.email ?? null,
      updated_by_email: actor?.email ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(nowHappeningPostsTable)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const savedPost = normalizeNowHappeningPost(data);

    await writeNowHappeningActivityLog({
      action: "created",
      actor,
      postId: savedPost.id,
      caption: savedPost.caption,
      imagePath: savedPost.image_path,
    });

    return savedPost;
  } catch (error) {
    await removeNowHappeningImageBestEffort(uploadedImage.image_path);
    throw error;
  }
}

export async function updateNowHappeningPost(
  post,
  {
    caption,
    imageFile,
    isPublished,
    displayOrder,
    is_published,
    display_order,
    actor,
  },
) {
  ensureSupabaseWriteAccess();
  const normalizedCaption = String(caption ?? "").trim();
  const resolvedIsPublished = isPublished ?? is_published ?? post?.is_published ?? true;
  const resolvedDisplayOrder = displayOrder ?? display_order ?? post?.display_order ?? 0;

  if (!normalizedCaption) {
    throw new Error("Please enter a caption for the post.");
  }

  let uploadedImage = null;

  if (imageFile) {
    uploadedImage = await uploadNowHappeningImage(imageFile);
  }

  try {
    const payload = {
      caption: normalizedCaption,
      is_published: Boolean(resolvedIsPublished),
      display_order: Number(resolvedDisplayOrder) || 0,
      updated_by_email: actor?.email ?? null,
      updated_at: new Date().toISOString(),
    };

    if (uploadedImage) {
      payload.image_path = uploadedImage.image_path;
      payload.image_url = uploadedImage.image_url;
    }

    const { data, error } = await supabase
      .from(nowHappeningPostsTable)
      .update(payload)
      .eq("id", post.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const savedPost = normalizeNowHappeningPost(data);

    await writeNowHappeningActivityLog({
      action: "updated",
      actor,
      postId: savedPost.id,
      caption: savedPost.caption,
      imagePath: savedPost.image_path,
    });

    if (uploadedImage && post?.image_path && post.image_path !== uploadedImage.image_path) {
      await removeNowHappeningImageBestEffort(post.image_path);
    }

    return savedPost;
  } catch (error) {
    if (uploadedImage?.image_path) {
      await removeNowHappeningImageBestEffort(uploadedImage.image_path);
    }

    throw error;
  }
}

export async function deleteNowHappeningPost(post, actor) {
  ensureSupabaseWriteAccess();
  await writeNowHappeningActivityLog({
    action: "deleted",
    actor,
    postId: post.id,
    caption: post.caption,
    imagePath: post.image_path,
  });

  const { error } = await supabase
    .from(nowHappeningPostsTable)
    .delete()
    .eq("id", post.id);

  if (error) {
    throw error;
  }

  await removeNowHappeningImageBestEffort(post.image_path);
}
