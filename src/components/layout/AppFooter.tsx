import { ShieldCheck } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-3 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
        <span>&copy; {new Date().getFullYear()} Sourav Barui • Seller PDF Cropper</span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          100% browser processing — PDFs never leave your device
        </span>
      </div>
    </footer>
  );
}
