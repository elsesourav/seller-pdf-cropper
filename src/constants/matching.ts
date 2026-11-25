export interface MatchMethodOption {
  value: "smart" | "od-id" | "fuzzy" | "exact";
  label: string;
  hint: string;
}

export const MATCH_METHOD_ITEMS: MatchMethodOption[] = [
  { value: "smart", label: "Smart ID + Text", hint: "OD / Tracking / 80% Text" },
  { value: "od-id", label: "OD ID Only", hint: "Extract OD* order numbers" },
  { value: "fuzzy", label: "Fuzzy Text (80%)", hint: "Word similarity" },
  { value: "exact", label: "Exact Text", hint: "Strict normalized match" },
];
