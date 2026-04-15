import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";

const TEMP_ADMIN_STORAGE_KEY = "adnls3-temp-admin-session";

function clearTemporarySession() {
  window.localStorage.removeItem(TEMP_ADMIN_STORAGE_KEY);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (mounted) {
        clearTemporarySession();
        setSession(activeSession);
        setLoading(false);
      }
    }

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    clearTemporarySession();
    await supabase.auth.signOut();
    setSession(null);
  }

  const value = useMemo(
    () => ({
      session,
      loading,
      signOut,
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
