import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, CalendarX, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";
import { money } from "@/lib/money";
import { categoryLabel } from "@/lib/categories";
import { errMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type BookingRow = Tables<"bookings_with_start">;
type ServiceInfo = { name: string; category: string; barberName: string };

const PENDING = { label: "已預約 / Reserved", cls: "bg-accent/60 text-accent-foreground" };
const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: PENDING,
  paid: { label: "已付款 / Paid", cls: "bg-cream text-foreground" },
  cancelled: { label: "已取消 / Cancelled", cls: "bg-secondary text-muted-foreground" },
};

export default function MyBookings() {
  useDocumentTitle("My bookings — Barberly");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useProfile();

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [svcMap, setSvcMap] = useState<Map<string, ServiceInfo>>(new Map());
  const [currency, setCurrency] = useState("twd");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [bookingsRes, settingsRes] = await Promise.all([
      // RLS scopes this to the signed-in customer's own rows. Start time is the
      // DERIVED MIN(starts_at) over the booking's slots (bookings has no start_slot_id).
      supabase.from("bookings_with_start").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("currency").limit(1).maybeSingle(),
    ]);

    if (bookingsRes.error) {
      toast.error("讀取預約失敗 / Could not load bookings", {
        description: bookingsRes.error.message,
      });
      setLoading(false);
      return;
    }
    const bookings = bookingsRes.data ?? [];
    setRows(bookings);
    if (settingsRes.data?.currency) setCurrency(settingsRes.data.currency);

    // Resolve barber + service names via the service (bookings has no barber_id —
    // the barber is reached through services → barbers).
    const serviceIds = [...new Set(bookings.map((b) => b.service_id).filter(Boolean))] as string[];
    if (serviceIds.length > 0) {
      const { data: svc } = await supabase
        .from("services")
        .select("id, name, category, barbers(name)")
        .in("id", serviceIds);
      const map = new Map<string, ServiceInfo>();
      for (const s of svc ?? []) {
        const barberName =
          (s as { barbers?: { name?: string | null } | null }).barbers?.name ?? "理髮師";
        map.set(s.id, { name: s.name, category: s.category, barberName });
      }
      setSvcMap(map);
    } else {
      setSvcMap(new Map());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    void load();
  }, [authLoading, user, navigate, load]);

  async function cancel(id: string) {
    if (!window.confirm("確定要取消這筆預約嗎？時段會被釋出。")) return;
    setCancelling(id);
    // The trg_free_slots_on_cancel trigger deletes this booking's booking_slots rows,
    // so the slots free up automatically — the client must NOT delete them itself.
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    setCancelling(null);
    if (error) {
      toast.error("取消失敗 / Could not cancel", { description: errMessage(error) });
      return;
    }
    toast.success("已取消 / Booking cancelled");
    await load();
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="bookings" />

      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <h1 className="font-serif text-4xl md:text-5xl">我的預約 / My bookings</h1>
        <p className="mt-3 text-muted-foreground">你預約的時段都在這裡。目前這個里程碑還不收費。</p>

        {loading ? (
          <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-cream px-6 py-20 text-center">
            <Scissors className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-lg">還沒有預約</p>
            <p className="mt-2 text-sm text-muted-foreground">
              You have no bookings yet — browse barbers to book your first slot.
            </p>
            <Button asChild variant="pill" className="mt-6 px-6">
              <a href="/barbers">瀏覽理髮師 / Browse barbers</a>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {rows.map((b) => {
              const info = b.service_id ? svcMap.get(b.service_id) : undefined;
              const status = (b.status && STATUS[b.status]) || PENDING;
              const active = b.status !== "cancelled";
              return (
                <li
                  key={b.id ?? Math.random()}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card p-5 shadow-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-xl">{info?.barberName ?? "理髮師"}</p>
                    <p className="text-sm text-muted-foreground">
                      {info ? `${info.name} · ${categoryLabel(info.category)}` : "服務"}
                    </p>
                    <p className="mt-1 text-sm">
                      {b.starts_at
                        ? format(new Date(b.starts_at), "EEE, MMM d · HH:mm")
                        : "時段已釋出 / slot released"}
                      {b.ends_at ? `–${format(new Date(b.ends_at), "HH:mm")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-medium">{money(b.price ?? 0, currency)}</span>
                    <span
                      className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.cls)}
                    >
                      {status.label}
                    </span>
                    {active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => b.id && cancel(b.id)}
                        disabled={cancelling === b.id}
                      >
                        {cancelling === b.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarX className="h-4 w-4" />
                        )}
                        取消 / Cancel
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
