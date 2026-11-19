import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Scissors, Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { BookingDialog } from "@/components/BookingDialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";
import { money } from "@/lib/money";
import { categoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Barber = Tables<"barbers">;
type Service = Tables<"services">;
type Slot = Tables<"bookable_slots">;
type Photo = Tables<"barber_photos">;

const BUCKET = "barber-photos";

export default function BarberDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useProfile();

  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [freeSlots, setFreeSlots] = useState<Slot[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [currency, setCurrency] = useState("twd");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // carousel dots
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useDocumentTitle(barber ? `${barber.name} — Barberly` : "Barber — Barberly");

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  // Load the free, future slots for this barber: all future bookable_slots MINUS any
  // that a booking already holds (the NOT EXISTS anti-join against booking_slots —
  // a slot has no status; availability is derived purely from booking_slots).
  const loadSlots = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const { data: slots, error } = await supabase
      .from("bookable_slots")
      .select("*")
      .eq("barber_id", id)
      .gt("starts_at", nowIso)
      .order("starts_at", { ascending: true });
    if (error) {
      toast.error("讀取時段失敗 / Could not load slots", { description: error.message });
      setFreeSlots([]);
      return;
    }
    const slotRows = slots ?? [];
    if (slotRows.length === 0) {
      setFreeSlots([]);
      return;
    }
    const { data: held } = await supabase
      .from("booking_slots")
      .select("slot_id")
      .in(
        "slot_id",
        slotRows.map((s) => s.id),
      );
    const heldSet = new Set((held ?? []).map((h) => h.slot_id));
    setFreeSlots(slotRows.filter((s) => !heldSet.has(s.id)));
  }, [id]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [barberRes, servicesRes, photosRes, settingsRes] = await Promise.all([
        supabase.from("barbers").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("services")
          .select("*")
          .eq("barber_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("barber_photos")
          .select("*")
          .eq("barber_id", id)
          .order("is_featured", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase.from("platform_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (barberRes.error || !barberRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBarber(barberRes.data);
      setServices(servicesRes.data ?? []);
      setPhotos(photosRes.data ?? []);
      if (settingsRes.data) {
        setSlotMinutes(settingsRes.data.slot_minutes);
        setCurrency(settingsRes.data.currency);
      }
      await loadSlots();
      setLoading(false);
    })();
  }, [id, loadSlots]);

  function onBookClick() {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: false });
      return;
    }
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader active="browse" />
        <div className="flex items-center gap-2 px-8 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
        </div>
      </div>
    );
  }

  if (notFound || !barber) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader active="browse" />
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-serif text-3xl">找不到這位理髮師</h1>
          <p className="mt-3 text-muted-foreground">This barber doesn’t exist or was removed.</p>
          <Button asChild variant="pill" className="mt-6 px-6">
            <Link to="/barbers">← 回到瀏覽 / Back to browse</Link>
          </Button>
        </div>
      </div>
    );
  }

  // availability summary: group free slots by local date
  const dateCounts = new Map<string, number>();
  for (const s of freeSlots) {
    const k = format(new Date(s.starts_at), "yyyy-MM-dd");
    dateCounts.set(k, (dateCounts.get(k) ?? 0) + 1);
  }
  const upcomingDates = [...dateCounts.keys()].sort().slice(0, 5);
  const canBook = services.length > 0 && freeSlots.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="browse" />

      <main className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <Link
          to="/barbers"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← 回到瀏覽 / Back to browse
        </Link>

        {/* photo carousel */}
        <div className="mt-4">
          {photos.length > 0 ? (
            <div className="space-y-3">
              <Carousel setApi={setApi} className="overflow-hidden rounded-3xl">
                <CarouselContent>
                  {photos.map((p) => (
                    <CarouselItem key={p.id}>
                      <button
                        type="button"
                        onClick={() => setLightbox(publicUrl(p.storage_path))}
                        className="block w-full"
                      >
                        <img
                          src={publicUrl(p.storage_path)}
                          alt={p.caption ?? barber.name}
                          className="aspect-[16/9] w-full cursor-zoom-in object-cover"
                        />
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {photos.length > 1 && (
                  <>
                    <CarouselPrevious className="left-3" />
                    <CarouselNext className="right-3" />
                  </>
                )}
              </Carousel>
              {photos.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => api?.scrollTo(i)}
                      className={cn(
                        "h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors",
                        i === current ? "border-primary" : "border-transparent opacity-70",
                      )}
                    >
                      <img
                        src={publicUrl(p.storage_path)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-3xl bg-secondary text-muted-foreground">
              <Scissors className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
          {/* left: info + services */}
          <div className="space-y-8">
            <div>
              <h1 className="font-serif text-4xl">{barber.name}</h1>
              {barber.address && (
                <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {barber.address}
                </p>
              )}
              {barber.intro && <p className="mt-4 leading-relaxed">{barber.intro}</p>}
            </div>

            <div>
              <h2 className="font-serif text-2xl">服務 / Services</h2>
              {services.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">這位理髮師還沒有上架服務。</p>
              ) : (
                <div className="mt-4 divide-y rounded-2xl border">
                  {services.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="font-medium">{s.name}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                        {categoryLabel(s.category)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {s.required_slots * slotMinutes} 分鐘
                      </span>
                      <span className="ml-auto font-medium">{money(s.price, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* right: availability + book */}
          <aside className="h-fit space-y-4 rounded-3xl border bg-card p-6 shadow-soft md:sticky md:top-6">
            <h2 className="flex items-center gap-2 font-serif text-xl">
              <CalendarDays className="h-5 w-5" /> 可預約 / Availability
            </h2>
            {canBook ? (
              <>
                <p className="text-sm text-muted-foreground">
                  目前有 {freeSlots.length} 個可預約時段。
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {upcomingDates.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                    >
                      {format(new Date(`${d}T00:00:00`), "EEE, MMM d")} · {dateCounts.get(d)}
                    </span>
                  ))}
                </div>
                <Button variant="pill" className="h-12 w-full" onClick={onBookClick}>
                  預約 / Book
                </Button>
                {!authLoading && !user && (
                  <p className="text-center text-xs text-muted-foreground">
                    按「預約」需要先登入 / you’ll be asked to log in first.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {services.length === 0
                  ? "還沒有服務可預約。"
                  : "目前沒有可預約的時段，請稍後再看。"}
              </p>
            )}
          </aside>
        </div>
      </main>

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        barberName={barber.name}
        services={services}
        freeSlots={freeSlots}
        slotMinutes={slotMinutes}
        currency={currency}
        onBooked={loadSlots}
      />

      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl border-0 bg-transparent p-0 shadow-none">
          {lightbox && (
            <img src={lightbox} alt="" className="max-h-[85vh] w-full rounded-xl object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
