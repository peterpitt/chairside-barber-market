// Money is stored as a whole integer in platform_settings.currency (NO ×100 in the DB —
// that scaling only happens at the Stripe boundary in M2.1). Display it as-is.
export function money(amount: number, currency: string): string {
  return `${currency.toUpperCase()} ${amount.toLocaleString()}`;
}
