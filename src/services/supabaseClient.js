import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function createMockQuery() {
  return {
    select() {
      return this;
    },
    order() {
      return this;
    },
    eq() {
      return this;
    },
    limit() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };
}

function createMockSupabaseClient() {
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithPassword() {
        return {
          data: { session: null, user: null },
          error: {
            message:
              "Supabase auth is not configured in this local environment yet.",
          },
        };
      },
      async signOut() {
        return { error: null };
      },
    },
    from() {
      return createMockQuery();
    },
  };
}

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase environment variables are missing. Expected VITE_SUPABASE_URL and either VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY. Using local mock data responses for UI testing.",
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();
