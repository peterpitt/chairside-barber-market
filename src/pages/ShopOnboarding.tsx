import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Profile } from "@/hooks/useProfile";
import { ShopLayout } from "@/components/ShopLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Tables } from "@/integrations/supabase/types";

type Barber = Tables<"barbers">;
type Photo = Tables<"barber_photos">;

const BUCKET = "barber-photos";

export default function ShopOnboarding() {
  useDocumentTitle("開店設定 — Barberly");
  return (
    <ShopLayout>
      {({ userId, profile, refetchProfile }) => (
        <OnboardingBody userId={userId} profile={profile} refetchProfile={refetchProfile} />
      )}
    </ShopLayout>
  );
}

function OnboardingBody({
  userId,
  profile,
  refetchProfile,
}: {
  userId: string;
  profile: Profile;
  refetchProfile: () => Promise<void>;
}) {
  const complete = Boolean(
    profile.display_name?.trim() &&
    profile.bank_account_name?.trim() &&
    profile.bank_account_number?.trim(),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl">開店設定 / Shop setup</h1>
        <p className="mt-2 text-muted-foreground">
          填好撥款資訊、建立你的理髮師、上傳作品照，就完成開店。
        </p>
      </div>

      <div
        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
          complete ? "bg-cream text-foreground" : "bg-accent/40 text-foreground"
        }`}
      >
        {complete ? (
          <CheckCircle2 className="h-5 w-5 text-gold" />
        ) : (
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
        )}
        <span>
          {complete
            ? "撥款資訊已填寫，開店資料完成 ✅ — 接著就能發布服務與排班。"
            : "尚未完成：請填寫店名與撥款銀行帳號（三個欄位都必填）才算完成開店。"}
        </span>
      </div>

      <PayoutSettings profile={profile} refetchProfile={refetchProfile} />
      <MyBarbers userId={userId} />

      <div className="flex justify-end">
        <Button asChild variant="pill" className="px-6" disabled={!complete}>
          <Link to="/shop/bookings">前往服務與排班 / Services &amp; schedule →</Link>
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── A. Payout settings ─────────────────────────── */

function PayoutSettings({
  profile,
  refetchProfile,
}: {
  profile: Profile;
  refetchProfile: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bankName, setBankName] = useState(profile.bank_account_name ?? "");
  const [bankNumber, setBankNumber] = useState(profile.bank_account_number ?? "");
  const [saving, setSaving] = useState(false);

  const valid = displayName.trim() && bankName.trim() && bankNumber.trim();

  async function save() {
    if (!valid) {
      toast.error("店名與撥款銀行帳號為必填 / Shop name and bank details are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bank_account_name: bankName.trim(),
        bank_account_number: bankNumber.trim(),
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗 / Could not save", { description: error.message });
      return;
    }
    await refetchProfile();
    toast.success("撥款資訊已儲存 / Payout settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>撥款設定 / Payout settings</CardTitle>
        <CardDescription>
          店家層級，全部理髮師共用。先用測試資料即可。銀行資訊只有你本人和平台管理員看得到。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">店名 Shop name *</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例如：Downtown Cuts"
          />
          <p className="text-xs text-muted-foreground">
            你的理髮店名稱，會顯示在撥款紀錄上 / your shop's name, shown on payout
            records（這是店名，不是理髮師的名字）。
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bankName">匯款戶名 Account name *</Label>
            <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bankNumber">匯款帳號 Account number *</Label>
            <Input
              id="bankNumber"
              value={bankNumber}
              onChange={(e) => setBankNumber(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          你的理髮店收款的銀行帳戶 / the bank account where your shop gets paid.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="pill" className="px-6" onClick={save} disabled={saving || !valid}>
          {saving ? "儲存中…" : "儲存撥款資訊 / Save"}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ─────────────────────────── B. My barbers (many) ────────────────────────── */

function MyBarbers({ userId }: { userId: string }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("shop_id", userId)
      .order("created_at", { ascending: true });
    if (error)
      toast.error("讀取理髮師失敗 / Could not load barbers", { description: error.message });
    setBarbers(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addBarber() {
    setAdding(true);
    const { error } = await supabase
      .from("barbers")
      .insert({ shop_id: userId, name: "新理髮師 / New barber" });
    setAdding(false);
    if (error) {
      toast.error("新增失敗 / Could not add barber", { description: error.message });
      return;
    }
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>我的理髮師 / My barbers</CardTitle>
            <CardDescription>
              一間店可以有多位理髮師。每位都有自己的服務、排班與作品照。
            </CardDescription>
          </div>
          <Button
            variant="pillOutline"
            size="sm"
            className="px-4"
            onClick={addBarber}
            disabled={adding}
          >
            <Plus className="h-4 w-4" /> 新增一位理髮師 / Add barber
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 讀取中…
          </div>
        ) : barbers.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            還沒有理髮師。點「新增一位理髮師」開始建立。
          </p>
        ) : (
          barbers.map((b) => <BarberCard key={b.id} barber={b} onChanged={load} />)
        )}
      </CardContent>
    </Card>
  );
}

function BarberCard({ barber, onChanged }: { barber: Barber; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(barber.name);
  const [intro, setIntro] = useState(barber.intro ?? "");
  const [address, setAddress] = useState(barber.address ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    name !== barber.name || intro !== (barber.intro ?? "") || address !== (barber.address ?? "");

  async function save() {
    if (!name.trim()) {
      toast.error("理髮師名稱必填 / Barber name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("barbers")
      .update({ name: name.trim(), intro: intro.trim() || null, address: address.trim() || null })
      .eq("id", barber.id);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗 / Could not save", { description: error.message });
      return;
    }
    await onChanged();
    toast.success("已儲存 / Saved");
  }

  async function remove() {
    if (!window.confirm(`刪除理髮師「${barber.name}」？服務、排班與作品照都會一併刪除。`)) return;
    setDeleting(true);
    const { error } = await supabase.from("barbers").delete().eq("id", barber.id);
    setDeleting(false);
    if (error) {
      toast.error("刪除失敗 / Could not delete", { description: error.message });
      return;
    }
    await onChanged();
    toast.success("已刪除 / Deleted");
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>名稱 Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>地址 Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label>簡介 Intro</Label>
        <Textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="簡短介紹一下這位理髮師 / a short bio"
          rows={2}
        />
      </div>

      <BarberPhotos barberId={barber.id} />

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="pill"
          size="sm"
          className="px-4"
          onClick={save}
          disabled={saving || !dirty}
        >
          {saving ? "儲存中…" : "儲存 / Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive"
          onClick={remove}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4" /> 刪除 / Delete
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── C. Sample photos ────────────────────────────── */

function BarberPhotos({ barberId }: { barberId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("barber_photos")
      .select("*")
      .eq("barber_id", barberId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error)
      toast.error("讀取作品照失敗 / Could not load photos", { description: error.message });
    setPhotos(data ?? []);
  }, [barberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = useCallback(
    (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    [],
  );

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      // Path MUST start with '<barber_id>/' — the Storage RLS policy keys on the first segment.
      const path = `${barberId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) {
        toast.error(`上傳失敗 / Upload failed: ${file.name}`, { description: up.error.message });
        continue;
      }
      const ins = await supabase
        .from("barber_photos")
        .insert({ barber_id: barberId, storage_path: path, sort_order: photos.length + ok });
      if (ins.error) {
        // roll back the orphaned storage object
        await supabase.storage.from(BUCKET).remove([path]);
        toast.error("寫入作品照資料失敗 / Could not save photo record", {
          description: ins.error.message,
        });
        continue;
      }
      ok++;
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) {
      toast.success(`已上傳 ${ok} 張作品照 / ${ok} photo(s) uploaded`);
      await load();
    }
  }

  async function toggleFeatured(photo: Photo) {
    const { error } = await supabase
      .from("barber_photos")
      .update({ is_featured: !photo.is_featured })
      .eq("id", photo.id);
    if (error) {
      toast.error("更新失敗 / Could not update", { description: error.message });
      return;
    }
    await load();
  }

  async function removePhoto(photo: Photo) {
    // Delete BOTH the Storage object and the metadata row.
    const del = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    if (del.error) {
      toast.error("刪除檔案失敗 / Could not delete file", { description: del.error.message });
      return;
    }
    const { error } = await supabase.from("barber_photos").delete().eq("id", photo.id);
    if (error) {
      toast.error("刪除資料失敗 / Could not delete record", { description: error.message });
      return;
    }
    await load();
  }

  return (
    <div className="mt-4 rounded-xl bg-secondary/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm">作品照 / Sample hairstyle photos</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          variant="pillOutline"
          size="sm"
          className="px-4"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          上傳 / Upload
        </Button>
      </div>
      {photos.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          還沒有作品照。上傳這位理髮師過去的髮型作品。
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-lg border bg-card">
              <img
                src={publicUrl(p.storage_path)}
                alt={p.caption ?? "作品照"}
                className="aspect-square w-full object-cover"
              />
              {p.is_featured && (
                <span className="absolute left-1 top-1 rounded-full bg-gold/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                  精選
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-card/85 p-1 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title="精選 / Featured"
                  onClick={() => toggleFeatured(p)}
                  className="rounded p-1 hover:bg-secondary"
                >
                  <Star
                    className={`h-4 w-4 ${p.is_featured ? "fill-gold text-gold" : "text-muted-foreground"}`}
                  />
                </button>
                <button
                  type="button"
                  title="刪除 / Delete"
                  onClick={() => removePhoto(p)}
                  className="rounded p-1 text-destructive hover:bg-secondary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
