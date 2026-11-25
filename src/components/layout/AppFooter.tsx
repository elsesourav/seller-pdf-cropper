export function AppFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2 text-[11px] text-muted-foreground/80 sm:px-6">
        <span>&copy; {new Date().getFullYear()} Sourav Barui</span>
        <span>Client-side only</span>
      </div>
    </footer>
  );
}
