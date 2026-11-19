import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, MapPin, Scissors, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/SiteHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Barber = Tables<"barbers">;

const BUCKET = "barber-photos";

type BarberCard = Barber & {
  categories: string[];
  photoPath: string | null;
};

// Public marketplace listing of every barber. Browsing needs no sign-in; the Book
// action on a detail page is what requires login. Reads M1.1's barbers / services /
// barber_photos (all public-select under RLS).
export default function Barbers() {
  useDocumentTitle("Browse barbers — Barberly");

  const [cards, setCards] = useState<BarberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    void (async () => {
      const [barbersRes, servicesRes, photosRes] = await Promise.all([
        supabase.from("barbers").select("*").order("created_at", { ascending: true }),
        supabase.from("services").select("barber_id, category"),
        supabase
          .from("barber_photos")
          .select("barber_id, storage_path, is_featured, sort_order")
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true }),
      ]);

      if (barbersRes.error) {
        toast.error("讀取理髮師失敗 / Could not load barbers", {
          description: barbersRes.error.message,
        });
        setLoading(false);
        return;
      }

      const catsByBarber = new Map<string, Set<string>>();
      for (const s of servicesRes.data ?? []) {
        const set = catsByBarber.get(s.barber_id) ?? new Set<string>();
        set.add(s.category);
        catsByBarber.set(s.barber_id, set);
      }
      // photos already ordered featured-first then sort_order → first seen per barber is the rep
      const repByBarber = new Map<string, string>();
      for (const p of photosRes.data ?? []) {
        if (!repByBarber.has(p.barber_id)) repByBarber.set(p.barber_id, p.storage_path);
      }

      setCards(
        (barbersRes.data ?? []).map((b) => ({
          ...b,
          categories: [...(catsByBarber.get(b.id) ?? [])],
          photoPath: repByBarber.get(b.id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        (c.intro ?? "").toLowerCase().includes(q);
      const matchesCategory = category === "all" || c.categories.includes(category);
      return matchesQuery && matchesCategory;
    });
  }, [cards, query, category]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="browse" />

      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="animate-fade-up">
          <h1 className="font-serif text-4xl md:text-5xl">Find your barber</h1>
          <p className="mt-3 text-muted-foreground">
            瀏覽所有理髮師，挑一位、看作品、預約一個時段。
          </p>
        </div>

        {/* search + category filter */}
        <div className="mt-8 space-y-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋名稱或地址 / Search name or location"
              aria-label="Search barbers"
              className="h-12 rounded-full pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ value: "all", label: "All 全部" }, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  category === c.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* grid */}
        {loading ? (
          <div className="flex items-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-cream px-6 py-20 text-center">
            <p className="text-lg">找不到符合的理髮師</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No barbers match your search — try another keyword or category.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/barbers/${c.id}`}
                className="group overflow-hidden rounded-3xl border bg-card shadow-soft transition-transform hover:-translate-y-1"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                  {c.photoPath ? (
                    <img
                      src={publicUrl(c.photoPath)}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Scissors className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <h2 className="font-serif text-xl">{c.name}</h2>
                  {c.address && (
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {c.address}
                    </p>
                  )}
                  {c.intro && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.intro}</p>
                  )}
                  {c.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {c.categories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                        >
                          {categoryLabel(cat)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
