// Supabase returns a PostgrestError — a plain object { message, details, hint, code },
// NOT an Error instance. So `err instanceof Error` is always false for a failed RPC /
// query and the real message ("those times were just taken", "…has a gap", an RLS
// denial, …) gets swallowed into a generic string. Read `.message` off the
// PostgrestError shape first, then fall back to a real Error, then a default.
export function errMessage(
  err: unknown,
  fallback = "發生錯誤，請稍後再試 / Something went wrong",
): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
