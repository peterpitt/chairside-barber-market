import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import heroRight from "@/assets/hero-right.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in or sign up — Barberly" },
      { name: "description", content: "Create a Barberly account as a customer or barber, or sign in." },
      { property: "og:title", content: "Sign in — Barberly" },
      { property: "og:description", content: "Join Barberly as a customer or barber." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

type Role = "customer" | "shop";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/barbers", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin, data: { role } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (res.error) return setError(res.error.message);
    if (!res.data.session) return setError("Account created — please sign in.");
    navigate({ to: "/barbers", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-2">
      <div className="flex flex-col px-6 py-6 md:px-12">
        <Wordmark />
        <div className="mx-auto my-auto w-full max-w-sm animate-fade-up py-12">
          <h1 className="font-serif text-5xl">{mode === "signin" ? "Welcome back" : "Join Barberly"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to book your next look." : "Find a stylist — or list your chair."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div role="tablist" aria-label="Account type" className="grid grid-cols-2 rounded-full bg-secondary p-1">
                {(
                  [
                    ["customer", "Customer"],
                    ["shop", "Barber"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={role === value}
                    onClick={() => setRole(value)}
                    className={`rounded-full py-2 text-sm font-medium transition-all ${role === value ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <input type="email" required placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-full border bg-card px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input type="password" required minLength={6} placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-full border bg-card px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="pill" className="h-12 w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to Barberly?" : "Already have an account?"}{" "}
            <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}>
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
      <div className="hidden p-4 md:block">
        <img src={heroRight} alt="Stylish haircuts" width={768} height={1024} className="h-full w-full rounded-3xl object-cover" />
      </div>
    </div>
  );
}
