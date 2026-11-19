import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/shop", label: "開店設定 / Setup" },
  { to: "/shop/bookings", label: "服務與排班 / Schedule" },
] as const;

type ShopLayoutProps = {
  children: (ctx: {
    userId: string;
    email: string | null;
    profile: Profile;
    refetchProfile: () => Promise<void>;
  }) => ReactNode;
};

// Shared chrome + auth/role guard for every /shop/* page.
// Not signed in → /login; signed in but not a shop → /barbers.
export function ShopLayout({ children }: ShopLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, profile, loading, refetch } = useProfile();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (profile && profile.role !== "shop") navigate("/barbers", { replace: true });
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile || profile.role !== "shop") return null;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4 md:px-8">
          <Wordmark />
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  location.pathname === n.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden truncate sm:inline">{profile.display_name || user.email}</span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              barber
            </span>
            <Button variant="pill" size="sm" className="ml-2 px-4" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {children({ userId: user.id, email: user.email ?? null, profile, refetchProfile: refetch })}
      </main>
    </div>
  );
}
