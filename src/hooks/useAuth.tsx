import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_seed: string | null;
  team_id: string | null;
  is_admin: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: AuthProfile | null;
  isAdmin: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Listener PRIMERO
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    // Luego sesión actual
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<AuthProfile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, avatar_seed, team_id, is_admin")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      avatar_seed: data.avatar_seed,
      team_id: data.team_id,
      is_admin: !!data.is_admin,
    };
  }, []);

  // Carga profile cuando hay usuario; lo limpia al cerrar sesión.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    fetchProfile(user.id).then((p) => {
      if (cancelled) return;
      setProfile(p);
      setProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        isAdmin: profile?.is_admin ?? false,
        profileLoading,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
