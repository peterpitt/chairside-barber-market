// Service categories — mirrors the services.category CHECK constraint
// (cut | color | perm | beard) from M1.1.
export const CATEGORIES = [
  { value: "cut", label: "Cut 剪髮" },
  { value: "color", label: "Color 染髮" },
  { value: "perm", label: "Perm 燙髮" },
  { value: "beard", label: "Beard 修鬍" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
