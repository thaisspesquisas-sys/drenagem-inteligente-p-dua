import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Santo Antônio de Pádua — RJ (sede municipal, aprox.)
export const PADUA = { lat: -21.539, lon: -42.18 };
const VALIDITY_MIN = 60;

export type WeatherPayload = {
  current?: { time: string; temperature_2m?: number; precipitation?: number; weather_code?: number };
  hourly?: { time: string[]; temperature_2m?: number[]; precipitation?: number[]; precipitation_probability?: number[] };
  daily?: { time: string[]; precipitation_sum?: number[]; precipitation_probability_max?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
};

export const getWeather = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: cached } = await supabase
      .from("weather_snapshots").select("*").eq("source", "Open-Meteo")
      .gt("valid_until", new Date().toISOString())
      .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
    if (cached) return { ok: true as const, fromCache: true, fetchedAt: cached.fetched_at, validUntil: cached.valid_until, payload: cached.payload as WeatherPayload };

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${PADUA.lat}&longitude=${PADUA.lon}` +
      `&current=temperature_2m,precipitation,weather_code` +
      `&hourly=temperature_2m,precipitation,precipitation_probability` +
      `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min` +
      `&timezone=America%2FSao_Paulo&forecast_days=7`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo respondeu ${res.status}: ${await res.text()}`);
      const payload = (await res.json()) as WeatherPayload;
      const fetchedAt = new Date();
      const validUntil = new Date(fetchedAt.getTime() + VALIDITY_MIN * 60000);
      await supabase.from("weather_snapshots").insert({
        source: "Open-Meteo", fetched_at: fetchedAt.toISOString(), valid_until: validUntil.toISOString(),
        latitude: PADUA.lat, longitude: PADUA.lon, payload: payload as never,
      });
      return { ok: true as const, fromCache: false, fetchedAt: fetchedAt.toISOString(), validUntil: validUntil.toISOString(), payload };
    } catch (e) {
      const { data: last } = await supabase.from("weather_snapshots").select("*").eq("source", "Open-Meteo")
        .order("fetched_at", { ascending: false }).limit(1).maybeSingle();
      return { ok: false as const, error: e instanceof Error ? e.message : String(e),
        stale: last ? { fetchedAt: last.fetched_at, payload: last.payload as WeatherPayload } : null };
    }
  });
