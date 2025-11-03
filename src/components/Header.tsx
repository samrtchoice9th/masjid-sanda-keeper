import { Building2 } from "lucide-react";

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = false }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-elegant flex-shrink-0">
            <Building2 className="h-5 w-5 sm:h-7 sm:w-7 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-foreground truncate">Masjid Sanda Register</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Monthly Donation Tracking</p>
          </div>
        </div>
      </div>
    </header>
  );
}
