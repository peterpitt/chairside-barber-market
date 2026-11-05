import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/_authenticated/barbers")({
  head: () => ({
    meta: [
      { title: "Your Barberly" },
      { name: "description", content: "Your Barberly home." },
      { property: "og:title", content: "Your Barberly" },
      { property: "og:description", content: "Your Barberly home." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BarbersPage,
});

function BarbersPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isShop = user.user_metadata?.role === "shop";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 md:px-8">
          <Wordmark />
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
            <span className="truncate">Hi {user.email}</span>
            {isShop && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">barber</span>
            )}
            <Button variant="pill" size="sm" className="ml-2 px-4" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-24 text-center animate-fade-up">
        <div className="rounded-3xl bg-cream px-6 py-16">
          <h1 className="font-serif text-4xl md:text-5xl">{isShop ? "Barber dashboard" : "Barbers near you"}</h1>
          <p className="mt-6 text-lg">
            {isShop
              ? "理髮師後台即將上線 — 下一個里程碑會加上個人檔案、服務項目與排班管理。"
              : "附近的理髮師即將上線 — 下一個里程碑會加上瀏覽與預約功能。"}
          </p>
          <p className="mt-2 text-muted-foreground">
            {isShop
              ? "Your barber dashboard is coming soon — profile, services & schedule arrive in the next milestone."
              : "Barbers near you are coming soon — browse & booking arrive in the next milestone."}
          </p>
        </div>
      </main>
    </div>
  );
}
