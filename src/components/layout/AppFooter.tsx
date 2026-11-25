import { Copyright, Globe, Mail } from "lucide-react";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card/50 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-xs text-muted-foreground sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <Copyright className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>elsesourav {year}</span>
        </span>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <a
            href="https://elsesourav.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>elsesourav.com</span>
          </a>

          <a
            href="mailto:contact@elsesourav.com"
            className="inline-flex items-center gap-1.5 transition-colors duration-150 hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>contact@elsesourav.com</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
