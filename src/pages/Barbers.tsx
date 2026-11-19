import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";

export default function Barbers() {
  useDocumentTitle("Your Barberly");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading, refetch } = useProfile();
  const [upgrading, setUpgrading] = useState(false);

  // Auth + role guard. Roles are read from profiles.role (not user_metadata).
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // Shops belong in the shop dashboard — send them there.
    if (profile?.role === "shop") navigate("/shop", { replace: true });
  }, [loading, user, profile, navigate]);

  if (loading || !user || profile?.role === "shop") return null;

  async function becomeShop() {
    if (!user) return;
    setUpgrading(true);
    // Upgrade the current user to a shop. RLS (profiles_update_own) scopes this to
    // the user's own row; the "Become a shop" path only ever writes 'shop'.
    const { error } = await supabase.from("profiles").update({ role: "shop" }).eq("id", user.id);
    setUpgrading(false);
    if (error) {
      toast.error("開店失敗 / Could not switch to a shop account", { description: error.message });
      return;
    }
    await refetch();
    await queryClient.invalidateQueries();
    toast.success("歡迎開店！/ You're a shop now — let's set things up.");
    navigate("/shop", { replace: true });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 md:px-8">
          <Wordmark />
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate">Hi {user.email}</span>
            <Button
              variant="pillOutline"
              size="sm"
              className="ml-2 px-4"
              onClick={becomeShop}
              disabled={upgrading}
            >
              {upgrading ? "請稍候…" : "開店 / Become a shop"}
            </Button>
            <Button variant="pill" size="sm" className="px-4" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-24 text-center animate-fade-up">
        <div className="rounded-3xl bg-cream px-6 py-16">
          <h1 className="font-serif text-4xl md:text-5xl">Barbers near you</h1>
          <p className="mt-6 text-lg">附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。</p>
          <p className="mt-2 text-muted-foreground">
            Barbers near you are coming soon — browse &amp; booking arrive in the next milestone.
          </p>
          <p className="mt-8 text-sm text-muted-foreground">
            想成為理髮店、上架你的理髮師與排班嗎？點右上角的「開店 / Become a shop」。
          </p>
        </div>
      </main>
    </div>
  );
}
