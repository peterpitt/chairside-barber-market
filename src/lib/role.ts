// Canonical role values for the whole app: customer | shop | admin.
// The sign-up / "Become a shop" paths only ever write customer | shop;
// admin is promoted later via a one-off migration (M2.1 prereq), never self-served.
export type Role = "customer" | "shop" | "admin";

// Where to send a user after auth, branched on their profiles.role.
// M1.1 only routes shop vs customer — there is deliberately NO admin branch here
// (no admin can log in yet; the admin branch + /admin/payouts arrive in M2.1/M2.2).
export function roleHome(role: string | null | undefined): string {
  return role === "shop" ? "/shop" : "/barbers";
}
