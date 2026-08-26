import { cn } from "@/lib/utils";

export function Logo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="asameet-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="0.55" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="asameet-logo-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M128 48 H384 Q464 48 464 128 V304 Q464 384 384 384 H240 L152 462 Q140 472 140 452 V384 H128 Q48 384 48 304 V128 Q48 48 128 48 Z"
        fill="url(#asameet-logo-g)"
      />
      <path d="M128 48 H384 Q464 48 464 128 V200 H48 V128 Q48 48 128 48 Z" fill="url(#asameet-logo-shine)" />
      <path d="M256 158 L352 342 H302 L256 246 L210 342 H160 Z" fill="#ffffff" />
      <circle cx="256" cy="118" r="22" fill="#ffffff" />
    </svg>
  );
}

export function LogoWordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Logo size={size} className="icon-3d" />
      <span className="flex flex-col leading-tight">
        <span className="text-lg font-black tracking-tight">آسامیت</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Asameet</span>
      </span>
    </span>
  );
}
