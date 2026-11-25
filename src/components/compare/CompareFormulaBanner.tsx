import type { CompareSetBucket } from "@/types";
import { formatCount } from "@/utils/format";
import { Badge, Card } from "@elsesourav/react-ui";

interface CompareFormulaBannerProps {
  sets: CompareSetBucket[];
}

export function CompareFormulaBanner({ sets }: CompareFormulaBannerProps) {
  const set1Pages = sets[0]?.files.reduce((s, f) => s + f.pageCount, 0) || 0;
  const excludePages = sets
    .slice(1)
    .reduce(
      (sum, bucket) =>
        sum + bucket.files.reduce((fs, f) => fs + f.pageCount, 0),
      0,
    );

  const formulaLabel =
    sets.length <= 2
      ? "Set 1 − Set 2"
      : `Set 1 − (${sets
          .slice(1)
          .map((_, i) => `Set ${i + 2}`)
          .join(" ∪ ")})`;

  return (
    <Card variant="subtle" className="border-border/80 px-3.5 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
          <Badge variant="primary" size="sm" className="font-mono font-bold">
            {formulaLabel}
          </Badge>
          <span className="text-muted-foreground">
            Outputs pages in <strong className="text-foreground">Set 1</strong>{" "}
            not found in {sets.length > 2 ? "any subtract set" : "Set 2"}.
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {formatCount(set1Pages)}p − {formatCount(excludePages)}p
        </span>
      </div>
    </Card>
  );
}
