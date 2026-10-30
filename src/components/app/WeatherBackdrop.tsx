import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react";
import { getWeather, type WeatherPayload } from "@/lib/weather.functions";

export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "stormy";

export type WeatherContextValue = {
  condition: WeatherCondition;
  overrideCondition: WeatherCondition | "auto";
  setOverrideCondition: (c: WeatherCondition | "auto") => void;
  weatherLabel: string;
  payload: WeatherPayload | null;
  fetchedAt: string | null;
  validUntil: string | null;
  fromCache: boolean;
  isStale: boolean;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const WeatherCtx = createContext<WeatherContextValue | null>(null);

export function useWeatherTheme() {
  const ctx = useContext(WeatherCtx);
  if (!ctx) throw new Error("useWeatherTheme must be used within WeatherThemeProvider");
  return ctx;
}

export function classifyWmoWeather(code?: number | null, precipMm?: number | null): { condition: WeatherCondition; label: string } {
  if (code != null) {
    if (code >= 95) return { condition: "stormy", label: "Tempestade / Trovoadas" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return code >= 63 || code === 82
        ? { condition: "rainy", label: "Chuva moderada a forte" }
        : { condition: "rainy", label: "Chuva leve / Aguaceiros" };
    }
    if (code === 45 || code === 48) return { condition: "cloudy", label: "Neblina / Nevoeiro" };
    if (code === 3) return { condition: "cloudy", label: "Céu encoberto (nublado)" };
    if (code === 2) return { condition: "cloudy", label: "Parcialmente nublado" };
    if (code === 1) return { condition: "sunny", label: "Predominantemente ensolarado" };
    if (code === 0) return { condition: "sunny", label: "Céu limpo e ensolarado" };
  }
  if ((precipMm ?? 0) >= 8) return { condition: "stormy", label: "Chuva intensa" };
  if ((precipMm ?? 0) > 0.1) return { condition: "rainy", label: "Tempo chuvoso" };
  return { condition: "sunny", label: "Céu claro / Ensolarado" };
}

export const CONDITION_META: Record<
  WeatherCondition,
  { title: string; badgeCls: string; icon: typeof Sun }
> = {
  sunny: {
    title: "Ensolarado",
    badgeCls: "bg-amber-500/20 text-amber-900 border-amber-400/40",
    icon: Sun,
  },
  cloudy: {
    title: "Nublado",
    badgeCls: "bg-slate-500/20 text-slate-800 border-slate-400/40",
    icon: CloudSun,
  },
  rainy: {
    title: "Chuvoso",
    badgeCls: "bg-sky-500/20 text-sky-900 border-sky-400/40",
    icon: CloudRain,
  },
  stormy: {
    title: "Tempestade",
    badgeCls: "bg-indigo-600/25 text-indigo-950 border-indigo-500/40",
    icon: CloudLightning,
  },
};

const RAIN_DROPS = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left: `${(i * 2.43) % 100}%`,
  delay: `${(i * 0.17) % 2.4}s`,
  duration: `${0.65 + (i % 5) * 0.12}s`,
  opacity: 0.25 + (i % 4) * 0.12,
}));

export function WeatherThemeProvider({ children }: { children: ReactNode }) {
  const fn = useServerFn(getWeather);
  const [overrideCondition, setOverrideCondition] = useState<WeatherCondition | "auto">("auto");
  const [payload, setPayload] = useState<WeatherPayload | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fn();
      if (r.ok) {
        setPayload(r.payload);
        setFetchedAt(r.fetchedAt);
        setValidUntil(r.validUntil);
        setFromCache(r.fromCache);
        setIsStale(false);
        setError(null);
      } else {
        setError(r.error);
        setIsStale(true);
        if (r.stale) {
          setPayload(r.stale.payload);
          setFetchedAt(r.stale.fetchedAt);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const autoClassified = useMemo(
    () => classifyWmoWeather(payload?.current?.weather_code, payload?.current?.precipitation),
    [payload]
  );

  const condition: WeatherCondition =
    overrideCondition === "auto" ? autoClassified.condition : overrideCondition;

  const weatherLabel =
    overrideCondition === "auto"
      ? autoClassified.label
      : `${CONDITION_META[overrideCondition].title} (simulação visual)`;

  return (
    <WeatherCtx.Provider
      value={{
        condition,
        overrideCondition,
        setOverrideCondition,
        weatherLabel,
        payload,
        fetchedAt,
        validUntil,
        fromCache,
        isStale,
        error,
        loading,
        refresh,
      }}
    >
      <div className={`weather-stage weather-${condition} relative min-h-screen transition-colors duration-700`}>
        <WeatherCanvas condition={condition} />
        <div className="relative z-10">{children}</div>
      </div>
    </WeatherCtx.Provider>
  );
}

function WeatherCanvas({ condition }: { condition: WeatherCondition }) {
  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {condition === "sunny" && (
        <>
          <div className="weather-sun-orb" />
          <div className="weather-sun-glow" />
          <div className="weather-cloud weather-cloud-light top-14 left-[12%] opacity-35" />
          <div className="weather-cloud weather-cloud-light top-28 left-[62%] scale-75 opacity-25" />
        </>
      )}

      {condition === "cloudy" && (
        <>
          <div className="weather-cloud weather-cloud-dense top-10 left-[8%] opacity-65" />
          <div className="weather-cloud weather-cloud-dense top-24 left-[45%] scale-110 opacity-55" />
          <div className="weather-cloud weather-cloud-dense top-16 left-[75%] scale-90 opacity-60" />
        </>
      )}

      {(condition === "rainy" || condition === "stormy") && (
        <>
          <div className="weather-cloud weather-cloud-dark top-6 left-[5%] scale-110 opacity-75" />
          <div className="weather-cloud weather-cloud-dark top-14 left-[38%] scale-125 opacity-80" />
          <div className="weather-cloud weather-cloud-dark top-8 left-[72%] opacity-75" />
          {condition === "stormy" && <div className="weather-lightning-flash" />}
          <div className="absolute inset-0">
            {RAIN_DROPS.map((d) => (
              <span
                key={d.id}
                className="weather-raindrop"
                style={{
                  left: d.left,
                  animationDelay: d.delay,
                  animationDuration: condition === "stormy" ? "0.48s" : d.duration,
                  opacity: condition === "stormy" ? Math.min(0.85, d.opacity + 0.2) : d.opacity,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function WeatherBackdropControls({ compact = false }: { compact?: boolean }) {
  const { condition, overrideCondition, setOverrideCondition, weatherLabel, payload } = useWeatherTheme();
  const Icon = CONDITION_META[condition].icon;
  const temp = payload?.current?.temperature_2m;

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium ${CONDITION_META[condition].badgeCls}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{weatherLabel}</span>
        {temp != null && <span className="num font-semibold">· {temp.toFixed(1)} °C</span>}
      </span>
      {!compact && (
        <div className="inline-flex items-center rounded-full border bg-card/80 p-0.5 shadow-2xs backdrop-blur-xs">
          {(
            [
              ["auto", "Tempo Real"],
              ["sunny", "Sol"],
              ["cloudy", "Nublado"],
              ["rainy", "Chuva"],
              ["stormy", "Tempestade"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setOverrideCondition(k)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                overrideCondition === k
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

