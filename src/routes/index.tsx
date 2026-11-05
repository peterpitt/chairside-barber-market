import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, BadgeCheck, Zap, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import heroLeft from "@/assets/hero-left.jpg";
import heroRight from "@/assets/hero-right.jpg";
import barbersGrid from "@/assets/barbers-grid.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barberly — Find your barber, book in a few taps" },
      {
        name: "description",
        content: "Discover verified barbers and hair stylists near you and book a Cut, Color, Perm or Beard appointment online.",
      },
      { property: "og:title", content: "Barberly — Style with Confident Hair" },
      { property: "og:description", content: "Discover great barbers and book a slot in a few taps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SERVICES = ["All", "Cut", "Color", "Perm", "Beard"] as const;

const BARBERS = [
  { name: "Kenji Watanabe", shop: "Hinoki Barber · Taipei", services: ["Cut", "Beard"], rating: 4.9, reviews: 312, price: 28, pos: "0% 0%" },
  { name: "Amara Okafor", shop: "Crown & Curl · London", services: ["Cut", "Color", "Perm"], rating: 4.8, reviews: 254, price: 45, pos: "100% 0%" },
  { name: "Seo-yeon Park", shop: "Atelier Seoul · Seoul", services: ["Color", "Perm", "Cut"], rating: 5.0, reviews: 198, price: 52, pos: "0% 100%" },
  { name: "Marco Rossi", shop: "Tradition Barbers · Milan", services: ["Cut", "Beard"], rating: 4.9, reviews: 421, price: 32, pos: "100% 100%" },
];

const FEATURES = [
  { icon: BadgeCheck, label: "Verified Barbers" },
  { icon: Zap, label: "Instant Booking" },
  { icon: ShieldCheck, label: "Secure Payment" },
  { icon: Star, label: "Top-Rated Styles" },
];

const LOGOS = ["MAISON CUT", "Hinoki", "CROWN & CURL", "Atelier", "Tradition", "NORDIC GROOM"];

function Index() {
  const [active, setActive] = useState<(typeof SERVICES)[number]>("All");
  const visible = active === "All" ? BARBERS : BARBERS.filter((b) => b.services.includes(active));

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-5 md:px-8">
        <Wordmark />
        <div className="ml-auto hidden max-w-xs flex-1 items-center gap-2 rounded-full border bg-card px-4 py-2 md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input aria-label="Search" placeholder="Search" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <Button asChild variant="pill" className="ml-auto px-6 md:ml-0">
          <Link to="/login">Login</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-5 pb-12 pt-6 md:px-8">
          <div className="grid items-center gap-6 rounded-3xl bg-cream p-5 md:grid-cols-[1fr_1.4fr_1fr] md:p-8">
            <img src={heroLeft} alt="East Asian woman with sleek bob and man with textured crop" width={768} height={1024} className="hidden aspect-[3/4] w-full rounded-2xl object-cover animate-fade-up md:block" />
            <div className="py-6 text-center animate-fade-up [animation-delay:120ms]">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">New Look</span>
              <h1 className="mt-4 font-serif text-5xl leading-[1.02] text-foreground md:text-7xl">
                Style with Confident Hair
              </h1>
              <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border bg-card p-1.5 pl-5 shadow-soft">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input aria-label="Find your stylist" placeholder="Find your stylist or search a style" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                <Button variant="pill" size="sm" className="px-5">Search</Button>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SERVICES.map((s) => (
                  <Button key={s} size="sm" variant={active === s ? "pill" : "pillOutline"} className="px-4" onClick={() => setActive(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <img src={heroRight} alt="East Asian man with two-block cut and woman with long blonde waves" width={768} height={1024} className="hidden aspect-[3/4] w-full rounded-2xl object-cover animate-fade-up [animation-delay:240ms] md:block" />
            <div className="grid grid-cols-2 gap-3 md:hidden">
              <img src={heroLeft} alt="" width={768} height={1024} className="aspect-[3/4] w-full rounded-2xl object-cover" />
              <img src={heroRight} alt="" width={768} height={1024} className="aspect-[3/4] w-full rounded-2xl object-cover" />
            </div>
          </div>
        </section>

        {/* Logos */}
        <section aria-label="Partner salons" className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 border-y py-8 md:justify-between">
            {LOGOS.map((l, i) => (
              <span key={l} className={`text-lg text-muted-foreground/80 ${i % 2 ? "font-serif italic" : "font-semibold tracking-[0.2em] text-sm"}`}>{l}</span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <h2 className="text-center font-serif text-4xl md:text-5xl">Best booking experience</h2>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex flex-col items-center gap-4 rounded-2xl bg-cream px-4 py-8 text-center animate-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
                <span className="grid h-14 w-14 place-items-center rounded-full bg-card shadow-soft">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Popular */}
        <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
          <div className="flex items-end justify-between">
            <h2 className="font-serif text-4xl md:text-5xl">Popular</h2>
            <span className="text-sm text-muted-foreground">{active === "All" ? "All services" : active}</span>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((b) => (
              <a key={b.name} href="#" onClick={(e) => e.preventDefault()} className="group block rounded-3xl bg-card p-3 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift">
                <div className="relative overflow-hidden rounded-2xl">
                  <div role="img" aria-label={`Portrait of ${b.name}`} className="aspect-square w-full bg-no-repeat transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${barbersGrid})`, backgroundSize: "200% 200%", backgroundPosition: b.pos }} />
                  <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium backdrop-blur">Popular</span>
                </div>
                <div className="px-2 pb-2 pt-4">
                  <h3 className="font-serif text-2xl leading-tight">{b.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{b.shop}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.services.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      <span className="font-medium">{b.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({b.reviews})</span>
                    </span>
                    <span><span className="text-muted-foreground">from </span><span className="font-semibold">${b.price}</span></span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-sm text-muted-foreground md:px-8">
          <span className="font-serif text-xl text-foreground">Barberly</span>
          <span>© 2026 Barberly</span>
        </div>
      </footer>
    </div>
  );
}
