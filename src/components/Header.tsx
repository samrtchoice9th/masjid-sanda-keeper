import ahsanLogo from "@/assets/ahsan-logo.png";

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = false }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center flex-shrink-0">
            <img src={ahsanLogo} alt="Ahsan Jumma Masjid Logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Ahsan Jumma Masjid</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Masjid Sanda Register</p>
          </div>
        </div>
      </div>
    </header>
  );
}
