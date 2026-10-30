import { cn } from "@/lib/utils";

export function AppLogoMark({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-label="Logotipo Drenagem Inteligente Pádua"
    >
      <defs>
        <linearGradient id="dip-shield" x1="10" y1="6" x2="110" y2="114" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#071324" />
          <stop offset="52%" stopColor="#0f294a" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="dip-rim" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#0284c7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="dip-drop" x1="60" y1="20" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="42%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="dip-wave" x1="18" y1="84" x2="102" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Crest */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="28"
        fill="url(#dip-shield)"
        stroke="url(#dip-rim)"
        strokeWidth="3"
      />

      {/* Topographic & Compass Precision Ring */}
      <circle
        cx="60"
        cy="56"
        r="39"
        stroke="#38bdf8"
        strokeOpacity="0.22"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle
        cx="60"
        cy="56"
        r="31"
        stroke="#7dd3fc"
        strokeOpacity="0.14"
        strokeWidth="1.2"
      />

      {/* Subtle Mountain/Basin Contour in background */}
      <path
        d="M22 68 L40 48 L53 59 L74 42 L98 68"
        stroke="#38bdf8"
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Hydrodynamic Water Drop */}
      <path
        d="M60 20 C60 20 35 49 35 66.5 C35 80.3 46.2 91.5 60 91.5 C73.8 91.5 85 80.3 85 66.5 C85 49 60 20 60 20 Z"
        fill="url(#dip-drop)"
      />

      {/* Inner Highlight Reflection */}
      <path
        d="M48 61 C51 52 56 44 59 33 C51 43 43 53 43 65 C43 73 48 80 55 83 C49 78 46 71 48 61 Z"
        fill="#ffffff"
        fillOpacity="0.38"
      />

      {/* Hydraulic Network Nodes & Links Inside Drop */}
      <path
        d="M52 67 L60 57 L70 64 M60 57 L60 76"
        stroke="#082f49"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.75"
      />
      <circle cx="60" cy="57" r="3.2" fill="#e0f2fe" stroke="#082f49" strokeWidth="1.5" />
      <circle cx="52" cy="67" r="2.6" fill="#e0f2fe" stroke="#082f49" strokeWidth="1.5" />
      <circle cx="70" cy="64" r="2.6" fill="#e0f2fe" stroke="#082f49" strokeWidth="1.5" />
      <circle cx="60" cy="76" r="2.8" fill="#38bdf8" stroke="#082f49" strokeWidth="1.5" />

      {/* Rio Pomba Dual Hydrology Waves */}
      <path
        d="M22 89 Q41 81 60 89 T98 89"
        stroke="url(#dip-wave)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M29 98 Q45 92 60 98 T91 98"
        stroke="#7dd3fc"
        strokeOpacity="0.8"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppLogo({
  size = "md",
  subtitle = "Santo Antônio de Pádua · RJ",
  badge,
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
  badge?: string;
  className?: string;
}) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };
  const titleSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <AppLogoMark className={cn(iconSizes[size], "drop-shadow-md")} />
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-65" />
          <span className="relative inline-flex h-3 w-3 rounded-full border border-slate-900 bg-emerald-400" />
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-sky-400/90">
            {subtitle}
          </span>
          {badge && (
            <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-sky-300 ring-1 ring-sky-400/30">
              {badge}
            </span>
          )}
        </div>
        <div className={cn("truncate font-bold tracking-tight", titleSizes[size])}>
          Drenagem Inteligente
        </div>
      </div>
    </div>
  );
}

export const CREATOR_SIGNATURE =
  "Creator: Thais dos Santos Pinheiro Ildebrando. Série: 3-2026.10.30";

