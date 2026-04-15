import { isSupabaseConfigured, supabase } from "./supabaseClient";

const guidelinesBucket = "adnl-guidelines";
const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg"]);
const pdfExtensions = new Set(["pdf"]);
const imageRoleNames = new Set(["cover", "thumbnail", "thumb", "image", "poster", "preview"]);
const pdfRoleNames = new Set(["guideline", "guidelines", "mechanics", "rulebook", "rules", "document", "pdf"]);
const guidelineSlugAliases = {
  botb: ["battle-of-the-bands", "battle-of-the-band", "botb"],
  cheer: ["cheer-dance", "cheerdance", "cheer"],
  dance: ["dance-sport", "dancesport", "street-dance", "dance"],
  gimmick: ["gimmick-games", "gimmick"],
};

function getFileExtension(filePath) {
  return String(filePath.split(".").pop() ?? "").toLowerCase();
}

function removeFileExtension(filePath) {
  return filePath.replace(/\.[^.]+$/, "");
}

function getLastPathSegment(filePath) {
  return filePath.split("/").filter(Boolean).at(-1) ?? filePath;
}

function normalizeFileName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getNormalizedAliasCandidates(value) {
  const normalizedValue = normalizeFileName(value);
  const matchedAliases = Object.entries(guidelineSlugAliases).flatMap(([key, aliases]) => {
    const normalizedAliases = aliases.map((alias) => normalizeFileName(alias));

    if (key === normalizedValue || normalizedAliases.includes(normalizedValue)) {
      return [key, ...normalizedAliases];
    }

    return [];
  });

  return Array.from(new Set([normalizedValue, ...matchedAliases].filter(Boolean)));
}

function toTitleCase(slug) {
  return String(slug ?? "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripTrailingAssetRole(value) {
  return String(value ?? "")
    .trim()
    .replace(/(?:[_\-\s]+)(cover|thumbnail|thumb|image|poster|preview|pdf)$/i, "")
    .trim();
}

function getGuidelineDisplayInfo(groupKey) {
  const rawName = getLastPathSegment(groupKey);
  const rawBaseName = stripTrailingAssetRole(removeFileExtension(rawName));
  const sequenceMatch = rawBaseName.match(/^(\d+)[-_ ]+(.*)$/);
  const sequence = sequenceMatch ? Number(sequenceMatch[1]) : Number.POSITIVE_INFINITY;
  const nameWithoutSequence = sequenceMatch ? sequenceMatch[2] : rawBaseName;
  const cleanedLabel = nameWithoutSequence
    .replace(/[_-]+/g, " ")
    .replace(/\bADNLS3\b/gi, "")
    .replace(/\bADNU\s+LEAGUE\s*S3\b/gi, "")
    .replace(/\bpdf\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const slug = normalizeFileName(cleanedLabel || rawBaseName);
  const title = toTitleCase(slug || normalizeFileName(rawBaseName));

  return {
    sequence,
    slug,
    title,
    is_featured: slug === "general-guidelines",
  };
}

function isFolderEntry(item) {
  return !item?.id;
}

function isMissingGuidelinesBucketError(error) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";

  return message.includes("bucket") && message.includes("not found");
}

function isGuidelinesListPolicyError(error) {
  if (!error) {
    return false;
  }

  return error.statusCode === "403" || error.statusCode === 403 || error.status === 403;
}

function getGuidelineGroupKey(filePath) {
  const segments = filePath.split("/").filter(Boolean);
  const fileName = segments.at(-1) ?? "";
  const rawBaseName = removeFileExtension(fileName);
  const baseName = normalizeFileName(removeFileExtension(fileName));
  const parentPath = segments.slice(0, -1).join("/");

  if (imageRoleNames.has(baseName) || pdfRoleNames.has(baseName)) {
    return parentPath || baseName;
  }

  if (!parentPath) {
    return stripTrailingAssetRole(rawBaseName);
  }

  return removeFileExtension(filePath);
}

function isBetterImageCandidate(currentPath, nextPath) {
  if (!currentPath) {
    return true;
  }

  const currentName = normalizeFileName(getLastPathSegment(currentPath));
  const nextName = normalizeFileName(getLastPathSegment(nextPath));

  return !imageRoleNames.has(currentName) && imageRoleNames.has(nextName);
}

function isBetterPdfCandidate(currentPath, nextPath) {
  if (!currentPath) {
    return true;
  }

  const currentName = normalizeFileName(getLastPathSegment(currentPath));
  const nextName = normalizeFileName(getLastPathSegment(nextPath));

  return !pdfRoleNames.has(currentName) && pdfRoleNames.has(nextName);
}

function getPublicAssetUrl(filePath) {
  if (!filePath) {
    return "";
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(guidelinesBucket).getPublicUrl(filePath);

  return publicUrl;
}

function getDownloadAssetUrl(filePath, downloadName) {
  const publicUrl = getPublicAssetUrl(filePath);

  if (!publicUrl) {
    return "";
  }

  const url = new URL(publicUrl);
  url.searchParams.set("download", downloadName);
  return url.toString();
}

function normalizeGuidelineEntry(groupKey, files) {
  const displayInfo = getGuidelineDisplayInfo(groupKey);
  const imagePath = files.image_path;
  const pdfPath = files.pdf_path;
  const pdfFileName = pdfPath ? `${displayInfo.slug || "guideline"}.pdf` : "";

  return {
    id: groupKey,
    slug: displayInfo.slug,
    title: displayInfo.title,
    sort_order: displayInfo.sequence,
    image_path: imagePath,
    image_url: imagePath ? getPublicAssetUrl(imagePath) : "",
    file_path: pdfPath,
    file_url: pdfPath ? getPublicAssetUrl(pdfPath) : "",
    download_url: pdfPath ? getDownloadAssetUrl(pdfPath, pdfFileName) : "",
    updated_at: files.updated_at ?? null,
    is_featured: displayInfo.is_featured,
  };
}

function canMergeGuidelineImageIntoPdf(sourceEntry, targetEntry) {
  if (!sourceEntry?.image_path || sourceEntry?.file_path || !targetEntry?.file_path) {
    return false;
  }

  const sourceCandidates = getNormalizedAliasCandidates(sourceEntry.slug || sourceEntry.id);
  const targetCandidates = getNormalizedAliasCandidates(targetEntry.slug || targetEntry.id);
  const compactTargetCandidates = targetCandidates.map((candidate) => candidate.replace(/-/g, ""));

  return sourceCandidates.some((candidate) => {
    const compactCandidate = candidate.replace(/-/g, "");

    return (
      targetCandidates.includes(candidate) ||
      compactTargetCandidates.includes(compactCandidate) ||
      targetCandidates.some(
        (targetCandidate) =>
          targetCandidate.includes(candidate) || candidate.includes(targetCandidate),
      )
    );
  });
}

function mergeStandaloneGuidelineImages(entries) {
  const nextEntries = entries.map((entry) => ({ ...entry }));
  const mergedEntryIds = new Set();

  nextEntries.forEach((entry) => {
    if (!entry.file_path || entry.image_path) {
      return;
    }

    const sourceImageEntry = nextEntries.find(
      (candidate) =>
        candidate.id !== entry.id &&
        !candidate.file_path &&
        candidate.image_path &&
        !mergedEntryIds.has(candidate.id) &&
        canMergeGuidelineImageIntoPdf(candidate, entry),
    );

    if (!sourceImageEntry) {
      return;
    }

    entry.image_path = sourceImageEntry.image_path;
    entry.image_url = sourceImageEntry.image_url;
    entry.updated_at = sourceImageEntry.updated_at ?? entry.updated_at;
    mergedEntryIds.add(sourceImageEntry.id);
  });

  return nextEntries.filter(
    (entry) => entry.file_url || (entry.image_url && !mergedEntryIds.has(entry.id)),
  );
}

async function listBucketFiles(folderPath = "") {
  const { data, error } = await supabase.storage.from(guidelinesBucket).list(folderPath, {
    limit: 100,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    if (isMissingGuidelinesBucketError(error)) {
      throw new Error(
        'Supabase Storage bucket "adnl-guidelines" was not found. Create a public bucket with that exact name to load the guidelines page.',
      );
    }

    if (isGuidelinesListPolicyError(error)) {
      throw new Error(
        'The guidelines bucket exists, but public listing is blocked. Add a public SELECT policy on storage.objects for bucket "adnl-guidelines".',
      );
    }

    throw error;
  }

  const allFiles = [];

  for (const item of data ?? []) {
    const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;

    if (isFolderEntry(item)) {
      const nestedFiles = await listBucketFiles(fullPath);
      allFiles.push(...nestedFiles);
      continue;
    }

    allFiles.push({
      ...item,
      fullPath,
    });
  }

  return allFiles;
}

function buildGuidelineEntries(files) {
  const groupedFiles = new Map();

  for (const file of files) {
    const extension = getFileExtension(file.fullPath);

    if (!imageExtensions.has(extension) && !pdfExtensions.has(extension)) {
      continue;
    }

    const groupKey = getGuidelineGroupKey(file.fullPath);
    const currentEntry = groupedFiles.get(groupKey) ?? {
      image_path: "",
      pdf_path: "",
      updated_at: file.updated_at ?? file.created_at ?? null,
    };

    if (imageExtensions.has(extension) && isBetterImageCandidate(currentEntry.image_path, file.fullPath)) {
      currentEntry.image_path = file.fullPath;
    }

    if (pdfExtensions.has(extension) && isBetterPdfCandidate(currentEntry.pdf_path, file.fullPath)) {
      currentEntry.pdf_path = file.fullPath;
    }

    currentEntry.updated_at = file.updated_at ?? file.created_at ?? currentEntry.updated_at;
    groupedFiles.set(groupKey, currentEntry);
  }

  return mergeStandaloneGuidelineImages(
    Array.from(groupedFiles.entries())
    .map(([groupKey, entry]) => normalizeGuidelineEntry(groupKey, entry))
    .filter((entry) => entry.file_url || entry.image_url)
  ).sort((left, right) => {
    if (left.is_featured && !right.is_featured) {
      return -1;
    }

    if (!left.is_featured && right.is_featured) {
      return 1;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.title.localeCompare(right.title);
  });
}

export async function getGuidelines() {
  if (!isSupabaseConfigured) {
    return [];
  }

  const files = await listBucketFiles();
  return buildGuidelineEntries(files);
}

export function getGuidelinesBucketName() {
  return guidelinesBucket;
}
