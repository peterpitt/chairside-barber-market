import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Loader2, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Barber = Tables<"barbers">;
type Service = Tables<"services">;
type Slot = Tables<"bookable_slots">;
type Settings = Tables<"platform_settings">;

const CATEGORIES = [
  { value: "cut", label: "Cut 剪髮" },
  { value: "color", label: "Color 染髮" },
  { value: "perm", label: "Perm 燙髮" },
  { value: "beard", label: "Beard 修鬍" },
] as const;

function money(amount: number, currency: string) {
  return `${currency.toUpperCase()} ${amount.toLocaleString()}`;
}

export default function ShopBookings() {
  useDocumentTitle("服務與排班 — Barberly");
  return <ShopLayout>{({ userId }) => <BookingsBody userId={userId} />}</ShopLayout>;
}

function BookingsBody({ userId }: { userId: string }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [{ data: bs, error: be }, { data: ps }] = await Promise.all([
        supabase
          .from("barbers")
          .select("*")
          .eq("shop_id", userId)
          .order("created_at", { ascending: true }),
        supabase.from("platform_settings").select("*").limit(1).maybeSingle(),
      ]);
      if (be) toast.error("讀取理髮師失敗 / Could not load barbers", { description: be.message });
      setBarbers(bs ?? []);
      setSettings(ps ?? null);
      setSelected((prev) => prev || bs?.[0]?.id || "");
      setLoading(false);
    })();
  }, [userId]);

  const slotMinutes = settings?.slot_minutes ?? 30;
  const currency = settings?.currency ?? "twd";

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">服務與排班 / Services &amp; schedule</h1>
        <p className="mt-2 text-muted-foreground">
          為每位理髮師設定服務與價格，並發布可預約的時間窗（每段 {slotMinutes} 分鐘）。
        </p>
      </div>

      {barbers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            還沒有理髮師。請先到{" "}
            <Link to="/shop" className="font-medium text-foreground underline underline-offset-4">
              開店設定
            </Link>{" "}
            建立至少一位理髮師。
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm">選擇理髮師 / Barber</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="選擇理髮師" />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <>
              <ServicesEditor barberId={selected} currency={currency} />
              <SlotPublisher barberId={selected} slotMinutes={slotMinutes} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── A. Services & price ─────────────────────────── */

function ServicesEditor({ barberId, currency }: { barberId: string; currency: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // add-form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("cut");
  const [price, setPrice] = useState("");
  const [requiredSlots, setRequiredSlots] = useState("1");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", barberId)
      .order("created_at", { ascending: true });
    if (error)
      toast.error("讀取服務失敗 / Could not load services", { description: error.message });
    setServices(data ?? []);
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function addService() {
    const p = Number(price);
    const rs = Number(requiredSlots);
    if (!name.trim()) {
      toast.error("服務名稱必填 / Service name is required");
      return;
    }
    if (!Number.isInteger(p) || p < 0) {
      toast.error("價格須為 ≥ 0 的整數 / Price must be a whole number");
      return;
    }
    if (!Number.isInteger(rs) || rs < 1) {
      toast.error("所需時段數須為 ≥ 1 的整數 / required_slots ≥ 1");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("services").insert({
      barber_id: barberId,
      name: name.trim(),
      category,
      price: p, // whole units in platform currency — NO ×100 here (that happens at Stripe in M2.1)
      required_slots: rs,
    });
    setAdding(false);
    if (error) {
      toast.error("新增服務失敗 / Could not add service", { description: error.message });
      return;
    }
    setName("");
    setCategory("cut");
    setPrice("");
    setRequiredSlots("1");
    toast.success("服務已新增 / Service added");
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>服務與價格 / Services &amp; price</CardTitle>
        <CardDescription>
          價格以「整數」儲存，單位是平台幣別（{currency.toUpperCase()}，例如 300 就是{" "}
          {money(300, currency)}）。所需時段數 = 需要幾個連續的可預約時段。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* add form */}
        <div className="grid items-end gap-3 rounded-2xl bg-secondary/40 p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">名稱 Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：俐落短髮"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">分類 Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">價格 Price</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-28"
              placeholder="300"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">時段數 Slots</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={requiredSlots}
              onChange={(e) => setRequiredSlots(e.target.value)}
              className="w-24"
            />
          </div>
          <Button variant="pill" className="px-4" onClick={addService} disabled={adding}>
            <Plus className="h-4 w-4" /> 新增
          </Button>
        </div>

        {/* list */}
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
          </div>
        ) : services.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">還沒有服務，用上面的表單新增。</p>
        ) : (
          <div className="divide-y rounded-2xl border">
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} currency={currency} onChanged={load} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceRow({
  service,
  currency,
  onChanged,
}: {
  service: Service;
  currency: string;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`刪除服務「${service.name}」？`)) return;
    setBusy(true);
    const { error } = await supabase.from("services").delete().eq("id", service.id);
    setBusy(false);
    if (error) {
      toast.error("刪除失敗 / Could not delete", { description: error.message });
      return;
    }
    toast.success("已刪除 / Deleted");
    await onChanged();
  }

  const cat = CATEGORIES.find((c) => c.value === service.category)?.label ?? service.category;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <span className="font-medium">{service.name}</span>
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
        {cat}
      </span>
      <span className="text-muted-foreground">{money(service.price, currency)}</span>
      <span className="text-muted-foreground">· {service.required_slots} 段</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto text-destructive"
        onClick={remove}
        disabled={busy}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ─────────────────────────── B. Slot publisher ───────────────────────────── */

function SlotPublisher({ barberId, slotMinutes }: { barberId: string; slotMinutes: number }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookable_slots")
      .select("*")
      .eq("barber_id", barberId)
      .order("starts_at", { ascending: true });
    if (error) toast.error("讀取時段失敗 / Could not load slots", { description: error.message });
    setSlots(data ?? []);
    setLoading(false);
  }, [barberId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function publish() {
    if (!date) {
      toast.error("請選擇日期 / Pick a date");
      return;
    }
    const startAt = new Date(`${date}T${start}:00`);
    const endAt = new Date(`${date}T${end}:00`);
    if (!(endAt.getTime() > startAt.getTime())) {
      toast.error("結束時間必須晚於開始時間 / End must be after start");
      return;
    }
    const stepMs = slotMinutes * 60 * 1000;
    const rows: { barber_id: string; starts_at: string; ends_at: string }[] = [];
    for (let t = startAt.getTime(); t + stepMs <= endAt.getTime(); t += stepMs) {
      rows.push({
        barber_id: barberId,
        starts_at: new Date(t).toISOString(),
        ends_at: new Date(t + stepMs).toISOString(),
      });
    }
    if (rows.length === 0) {
      toast.error(`區間不足一個 ${slotMinutes} 分鐘的時段 / Range is shorter than one slot`);
      return;
    }
    setPublishing(true);
    const { error } = await supabase.from("bookable_slots").insert(rows);
    setPublishing(false);
    if (error) {
      toast.error("發布失敗 / Could not publish", { description: error.message });
      return;
    }
    toast.success(`已發布 ${rows.length} 個時段 / Published ${rows.length} slot(s)`);
    await load();
  }

  async function removeSlot(id: string) {
    const { error } = await supabase.from("bookable_slots").delete().eq("id", id);
    if (error) {
      toast.error("刪除失敗 / Could not delete", { description: error.message });
      return;
    }
    await load();
  }

  // group slots by calendar day for a readable list
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const key = format(new Date(s.starts_at), "yyyy-MM-dd (EEE)");
    (acc[key] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>可預約時段 / Bookable slots</CardTitle>
        <CardDescription>
          每個時段是 {slotMinutes}{" "}
          分鐘。選日期與起訖時間，系統會自動產生一連串連續的時段。時段本身沒有狀態，之後有人預約才會被佔用（M1.2）。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid items-end gap-3 rounded-2xl bg-secondary/40 p-3 sm:grid-cols-[auto_auto_auto_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs">日期 Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">開始 Start</Label>
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">結束 End</Label>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-32"
            />
          </div>
          <Button variant="pill" className="px-4" onClick={publish} disabled={publishing}>
            <CalendarPlus className="h-4 w-4" /> 發布時段
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
          </div>
        ) : slots.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">還沒有發布任何時段。</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([day, daySlots]) => (
              <div key={day}>
                <p className="mb-2 text-sm font-medium">{day}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <span
                      key={s.id}
                      className="group inline-flex items-center gap-1 rounded-full border bg-card py-1 pl-3 pr-1 text-xs"
                    >
                      {format(new Date(s.starts_at), "HH:mm")}–
                      {format(new Date(s.ends_at), "HH:mm")}
                      <button
                        type="button"
                        title="刪除 / Delete"
                        onClick={() => removeSlot(s.id)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
