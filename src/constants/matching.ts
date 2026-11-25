export interface MatchMethodOption {
  value: "smart" | "od-id" | "fuzzy" | "exact";
  label: string;
}

export const MATCH_METHOD_ITEMS: MatchMethodOption[] = [
  { value: "smart", label: "Smart ID + Text" },
  { value: "od-id", label: "OD ID Only" },
  { value: "fuzzy", label: "Fuzzy (80%)" },
  { value: "exact", label: "Exact Text" },
];
