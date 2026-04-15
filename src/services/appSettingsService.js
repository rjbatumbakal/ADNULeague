import { isSupabaseConfigured, supabase } from "./supabaseClient";

const APP_SETTINGS_ID = 1;

export const blackoutModeOptions = [
  { value: "none", label: "Visible (No Blackout)" },
  { value: "top3", label: "Hide Top 3" },
  { value: "top5", label: "Hide Top 5" },
  { value: "all", label: "Hide All Teams" },
];

function createDefaultSettings() {
  return {
    blackout_mode: "none",
    is_breakdown_visible: false,
    is_forums_visible: true,
    is_tally_hidden: false,
  };
}

export async function getAppSettings() {
  if (!isSupabaseConfigured) {
    return createDefaultSettings();
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", APP_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load app settings:", error.message);
    return createDefaultSettings();
  }

  if (!data) {
    return createDefaultSettings();
  }

  return {
    blackout_mode: data.blackout_mode ?? "none",
    is_breakdown_visible: Boolean(data.is_breakdown_visible),
    is_forums_visible: data.is_forums_visible !== false,
    is_tally_hidden: Boolean(data.is_tally_hidden),
  };
}

export async function setBlackoutMode(mode) {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured before you can update app settings.",
    );
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: APP_SETTINGS_ID,
        blackout_mode: mode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Unable to update blackout mode.");
  }
}

export async function setBreakdownVisible(isVisible) {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured before you can update app settings.",
    );
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: APP_SETTINGS_ID,
        is_breakdown_visible: Boolean(isVisible),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Unable to update breakdown visibility.");
  }
}

export async function setForumsVisible(isVisible) {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured before you can update app settings.",
    );
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: APP_SETTINGS_ID,
        is_forums_visible: Boolean(isVisible),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Unable to update forums visibility.");
  }
}

export async function setTallyHidden(isHidden) {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase must be configured before you can update app settings.",
    );
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: APP_SETTINGS_ID,
        is_tally_hidden: Boolean(isHidden),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Unable to update tally visibility.");
  }
}
