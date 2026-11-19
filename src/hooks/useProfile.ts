import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type ProfileState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

// Loads the signed-in user AND their profiles row (the source of truth for role,
// shop name, and bank fields). Every role decision in the app reads profiles.role
// via this hook — NOT user_metadata.role (that was the M0 carryover we fixed).
export function useProfile(): ProfileState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user ?? null;
    setUser(u);
    if (!u) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data: rows } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile(rows ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { user, profile, loading, refetch: load };
}
