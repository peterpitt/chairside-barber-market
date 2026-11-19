import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

// Public chrome for the buyer-facing pages (/barbers, /barbers/:id, /bookings).
// Browsing is public; signing in is only required to Book. The header adapts to
// whether someone is signed in — no auth guard here.
export function SiteHeader({ active }: { active?: "browse" | "bookings" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading } = useProfile();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  const linkCls = (on: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
      on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
    );

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 py-4 md:px-8">
        <Wordmark />
        <nav className="ml-auto flex min-w-0 items-center gap-1 text-sm">
          <Link to="/barbers" className={linkCls(active === "browse")}>
            瀏覽 / Browse
          </Link>
          {!loading && user && (
            <Link to="/bookings" className={linkCls(active === "bookings")}>
              我的預約 / My bookings
            </Link>
          )}
          {!loading && user && profile?.role === "shop" && (
            <Link to="/shop" className={linkCls(false)}>
              店家後台 / Shop
            </Link>
          )}
          {!loading && user ? (
            <>
              <span className="ml-1 hidden max-w-[12rem] truncate text-muted-foreground md:inline">
                {user.email}
              </span>
              <Button variant="pill" size="sm" className="ml-1 px-4" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild variant="pill" size="sm" className="ml-1 px-4">
              <Link to="/login">登入 / Log in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
