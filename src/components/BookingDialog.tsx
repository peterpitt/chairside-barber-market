import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/money";
import { categoryLabel } from "@/lib/categories";
import { errMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;
type Slot = Tables<"bookable_slots">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberName: string;
  services: Service[];
  /** This barber's FREE future slots (no booking_slots row), sorted ascending by starts_at. */
  freeSlots: Slot[];
  slotMinutes: number;
  currency: string;
  onBooked: () => void | Promise<void>;
};

const dayKey = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
const dayLabel = (iso: string) => format(new Date(iso), "EEE, MMM d");
const timeLabel = (iso: string) => format(new Date(iso), "HH:mm");

// The signature M1.2 interaction: pick service → date → start slot inside a modal,
// see the price + the full N-slot span, confirm → create_booking RPC → stay on the
// page. No payment (that's M2.1 — it will reuse this exact create_booking call and
// then open Stripe Checkout). The customer never leaves /barbers/[id].
export function BookingDialog({
  open,
  onOpenChange,
  barberName,
  services,
  freeSlots,
  slotMinutes,
  currency,
  onBooked,
}: Props) {
  const [serviceId, setServiceId] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [startSlotId, setStartSlotId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // reset whenever the dialog is (re)opened
  useEffect(() => {
    if (open) {
      setServiceId(services[0]?.id ?? "");
      setDateKey("");
      setStartSlotId("");
    }
  }, [open, services]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const n = service?.required_slots ?? 1;

  // For the chosen service, which free slots can START a booking?
  // A slot at index i is eligible iff freeSlots[i..i+n-1] exist AND are back-to-back
  // (each ends_at === the next starts_at). Returns startSlotId -> end ISO of the span.
  const eligibleSpanEnd = useMemo(() => {
    const map = new Map<string, string>();
    if (!service) return map;
    for (let i = 0; i + n <= freeSlots.length; i++) {
      let ok = true;
      for (let k = 1; k < n; k++) {
        if (freeSlots[i + k]!.starts_at !== freeSlots[i + k - 1]!.ends_at) {
          ok = false;
          break;
        }
      }
      if (ok) map.set(freeSlots[i]!.id, freeSlots[i + n - 1]!.ends_at);
    }
    return map;
  }, [service, n, freeSlots]);

  // Dates that have at least one eligible start slot.
  const dates = useMemo(() => {
    const set = new Set<string>();
    for (const s of freeSlots) if (eligibleSpanEnd.has(s.id)) set.add(dayKey(s.starts_at));
    return [...set].sort();
  }, [freeSlots, eligibleSpanEnd]);

  // All of the chosen date's free slots (eligible + ineligible, so we can dim the
  // ones too close to the end of the schedule and explain why).
  const daySlots = useMemo(
    () => (dateKey ? freeSlots.filter((s) => dayKey(s.starts_at) === dateKey) : []),
    [freeSlots, dateKey],
  );

  // keep date valid when service changes
  useEffect(() => {
    if (dateKey && !dates.includes(dateKey)) {
      setDateKey("");
      setStartSlotId("");
    }
  }, [dates, dateKey]);

  const spanEnd = startSlotId ? eligibleSpanEnd.get(startSlotId) : undefined;
  const startSlot = daySlots.find((s) => s.id === startSlotId) ?? null;
  const spanSlotIds = useMemo(() => {
    if (!startSlot || !spanEnd) return new Set<string>();
    const ids = new Set<string>();
    const from = new Date(startSlot.starts_at).getTime();
    const to = new Date(spanEnd).getTime();
    for (const s of freeSlots) {
      if (new Date(s.starts_at).getTime() >= from && new Date(s.ends_at).getTime() <= to) {
        ids.add(s.id);
      }
    }
    return ids;
  }, [startSlot, spanEnd, freeSlots]);

  async function confirm() {
    if (!service || !startSlotId) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_booking", {
      p_service_id: service.id,
      p_start_slot_id: startSlotId,
    });
    setSubmitting(false);
    if (error || !data) {
      toast.error("預約失敗 / Could not book", { description: errMessage(error) });
      return;
    }
    toast.success("預約成功！/ You're booked", {
      description: "可到「我的預約」查看。目前這個里程碑還不收費。",
    });
    onOpenChange(false);
    await onBooked();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">預約 {barberName}</DialogTitle>
          <DialogDescription>
            選擇服務、日期與開始時段 / Pick a service, date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. service */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">服務 / Service</label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇服務" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {categoryLabel(s.category)} · {money(s.price, currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {service && (
              <p className="text-xs text-muted-foreground">
                需連續 {service.required_slots} 個時段（每段 {slotMinutes} 分鐘，共{" "}
                {service.required_slots * slotMinutes} 分鐘）· 價格 {money(service.price, currency)}
              </p>
            )}
          </div>

          {/* 2. date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">日期 / Date</label>
            {dates.length === 0 ? (
              <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
                這個服務目前沒有足夠的連續時段可預約。請改選其他服務或稍後再看。
              </p>
            ) : (
              <Select
                value={dateKey}
                onValueChange={(v) => {
                  setDateKey(v);
                  setStartSlotId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇日期" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {dayLabel(`${d}T00:00:00`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3. start slot */}
          {dateKey && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">開始時段 / Start time</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {daySlots.map((s) => {
                  const eligible = eligibleSpanEnd.has(s.id);
                  const inSpan = spanSlotIds.has(s.id);
                  const selected = s.id === startSlotId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!eligible}
                      title={eligible ? undefined : `無法從這裡開始（後面不足 ${n} 個連續時段）`}
                      onClick={() => setStartSlotId(s.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-colors",
                        !eligible && "cursor-not-allowed opacity-40",
                        eligible && !selected && !inSpan && "bg-card hover:bg-secondary",
                        inSpan && !selected && "bg-accent/50",
                        selected && "border-primary ring-2 ring-primary",
                      )}
                    >
                      {timeLabel(s.starts_at)}
                    </button>
                  );
                })}
              </div>
              {n > 1 && (
                <p className="text-xs text-muted-foreground">
                  此服務會連續佔用 {n} 個時段；選定開始時間後會整段標示起來。
                </p>
              )}
            </div>
          )}

          {/* summary */}
          {startSlot && spanEnd && (
            <div className="flex items-start gap-2 rounded-xl bg-cream px-4 py-3 text-sm">
              <Clock className="mt-0.5 h-4 w-4 text-gold" />
              <div>
                <p className="font-medium">
                  你的預約：{timeLabel(startSlot.starts_at)}–{timeLabel(spanEnd)}
                  {n > 1 ? `（連佔 ${n} 個時段）` : ""}
                </p>
                <p className="text-muted-foreground">
                  {dayLabel(startSlot.starts_at)} · {service ? money(service.price, currency) : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            取消 / Cancel
          </Button>
          <Button
            variant="pill"
            className="px-6"
            onClick={confirm}
            disabled={submitting || !service || !startSlotId}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            確認預約 / Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
