import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Santo Antônio de Pádua — RJ (Código IBGE: 3304706 | Sede municipal: -21.5394, -42.1803)
export const PADUA = { lat: -21.5394, lon: -42.1803, ibge: "3304706" };
const VALIDITY_MIN = 10; // 10-minute short cache; manual refresh bypasses cache completely

export type InmetPeriodForecast = {
  resumo: string;
  temp_max: number | null;
  temp_min: number | null;
  umidade_max?: number | null;
  umidade_min?: number | null;
  dir_vento?: string;
  int_vento?: string;
  nascer?: string;
  ocaso?: string;
};

export type InmetDayForecast = {
  date: string; // DD/MM/YYYY
  manha?: InmetPeriodForecast;
  tarde?: InmetPeriodForecast;
  noite?: InmetPeriodForecast;
  dia?: InmetPeriodForecast;
};

export type InmetStationReading = {
  codigo: string;
  nome: string;
  uf: string;
  distanciaKm: number;
  dtMedicao: string;
  hrMedicaoUtc: string;
  tempInsC: number | null;
  sensacaoTermicaC: number | null;
  tempMinHoraC: number | null;
  tempMaxHoraC: number | null;
  umidadeInsPct: number | null;
  chuvaHoraMm: number | null;
  pressaoHpa: number | null;
  ventoVelMs: number | null;
  ventoRajadaMs: number | null;
};

export type InmetOfficialAlert = {
  id: number | string;
  codigo: string;
  descricao: string;
  severidade: string;
  cor: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  riscos: string[];
  instrucoes: string[];
};

export type WeatherPayload = {
  inmet?: {
    municipality: string;
    ibge: string;
    currentPeriod: "manha" | "tarde" | "noite";
    currentSummary: string;
    days: InmetDayForecast[];
    station: InmetStationReading | null;
    alerts: InmetOfficialAlert[];
  };
  current?: {
    time: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time: string[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

function cleanPeriod(p: any): InmetPeriodForecast | undefined {
  if (!p || typeof p !== "object") return undefined;
  return {
    resumo: String(p.resumo ?? ""),
    temp_max: p.temp_max != null ? Number(p.temp_max) : null,
    temp_min: p.temp_min != null ? Number(p.temp_min) : null,
    umidade_max: p.umidade_max != null ? Number(p.umidade_max) : null,
    umidade_min: p.umidade_min != null ? Number(p.umidade_min) : null,
    dir_vento: p.dir_vento ? String(p.dir_vento) : undefined,
    int_vento: p.int_vento ? String(p.int_vento) : undefined,
    nascer: p.nascer ? String(p.nascer) : undefined,
    ocaso: p.ocaso ? String(p.ocaso) : undefined,
  };
}

function getCurrentBrazilPeriod(): "manha" | "tarde" | "noite" {
  const brHourStr = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const h = Number(brHourStr);
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "DrenagemInteligentePadua/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export const getWeather = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { forceRefresh?: boolean }) => input ?? {})
  .handler(async ({ context, data: input }) => {
    const { supabase } = context;
    const force = Boolean(input?.forceRefresh);

    if (!force) {
      const { data: cached } = await supabase
        .from("weather_snapshots")
        .select("*")
        .eq("source", "INMET + Open-Meteo")
        .gt("valid_until", new Date().toISOString())
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) {
        return {
          ok: true as const,
          fromCache: true,
          fetchedAt: cached.fetched_at,
          validUntil: cached.valid_until,
          payload: cached.payload as WeatherPayload,
        };
      }
    }

    const openMeteoUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${PADUA.lat}&longitude=${PADUA.lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,precipitation,precipitation_probability` +
      `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min` +
      `&timezone=America%2FSao_Paulo&forecast_days=7`;

    const inmetForecastUrl = `https://apiprevmet3.inmet.gov.br/previsao/${PADUA.ibge}`;
    const inmetStationUrl = `https://apiprevmet3.inmet.gov.br/estacao/proxima/${PADUA.ibge}`;
    const inmetAlertsUrl = `https://apiprevmet3.inmet.gov.br/avisos/ativos`;

    try {
      const [omRes, inmetPrevRes, inmetEstRes, inmetAvisosRes] = await Promise.allSettled([
        fetchJsonWithTimeout(openMeteoUrl, 8000),
        fetchJsonWithTimeout(inmetForecastUrl, 8000),
        fetchJsonWithTimeout(inmetStationUrl, 8000),
        fetchJsonWithTimeout(inmetAlertsUrl, 8000),
      ]);

      if (omRes.status === "rejected" && inmetPrevRes.status === "rejected") {
        throw new Error(
          `Falha nas fontes oficiais: INMET (${inmetPrevRes.reason}) / Open-Meteo (${omRes.reason})`
        );
      }

      const omPayload: Partial<WeatherPayload> = omRes.status === "fulfilled" ? omRes.value : {};
      const period = getCurrentBrazilPeriod();

      // Parse INMET official municipal forecast (IBGE 3304706)
      const days: InmetDayForecast[] = [];
      let currentSummary = "";
      if (inmetPrevRes.status === "fulfilled" && inmetPrevRes.value?.[PADUA.ibge]) {
        const rawDays = inmetPrevRes.value[PADUA.ibge];
        for (const [dateStr, val] of Object.entries<any>(rawDays)) {
          if (val?.manha || val?.tarde || val?.noite) {
            const dObj: InmetDayForecast = {
              date: dateStr,
              manha: cleanPeriod(val.manha),
              tarde: cleanPeriod(val.tarde),
              noite: cleanPeriod(val.noite),
            };
            days.push(dObj);
          } else if (val?.resumo) {
            days.push({ date: dateStr, dia: cleanPeriod(val) });
          }
        }
        if (days.length > 0) {
          const today = days[0];
          currentSummary =
            today[period]?.resumo ||
            today.tarde?.resumo ||
            today.manha?.resumo ||
            today.noite?.resumo ||
            today.dia?.resumo ||
            "";
        }
      }

      // Parse INMET nearest automatic weather station (A604 - Cambuci)
      let station: InmetStationReading | null = null;
      if (inmetEstRes.status === "fulfilled" && inmetEstRes.value?.dados) {
        const est = inmetEstRes.value.estacao ?? {};
        const d = inmetEstRes.value.dados ?? {};
        const numOrNull = (v: any) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
        station = {
          codigo: String(est.CODIGO ?? d.CD_ESTACAO ?? "A604"),
          nome: String(est.NOME ?? d.DC_NOME ?? "CAMBUCI"),
          uf: String(est.UF ?? d.UF ?? "RJ"),
          distanciaKm: Number(est.DISTANCIA_EM_KM ?? 24),
          dtMedicao: String(d.DT_MEDICAO ?? ""),
          hrMedicaoUtc: String(d.HR_MEDICAO ?? ""),
          tempInsC: numOrNull(d.TEM_INS),
          sensacaoTermicaC: numOrNull(d.TEM_SEN),
          tempMinHoraC: numOrNull(d.TEM_MIN),
          tempMaxHoraC: numOrNull(d.TEM_MAX),
          umidadeInsPct: numOrNull(d.UMD_INS),
          chuvaHoraMm: numOrNull(d.CHUVA),
          pressaoHpa: numOrNull(d.PRE_INS),
          ventoVelMs: numOrNull(d.VEN_VEL),
          ventoRajadaMs: numOrNull(d.VEN_RAJ),
        };
      }

      // Parse INMET active official warnings for Santo Antônio de Pádua (3304706)
      const alerts: InmetOfficialAlert[] = [];
      if (inmetAvisosRes.status === "fulfilled" && inmetAvisosRes.value) {
        const allAlerts = [
          ...(Array.isArray(inmetAvisosRes.value.hoje) ? inmetAvisosRes.value.hoje : []),
          ...(Array.isArray(inmetAvisosRes.value.futuro) ? inmetAvisosRes.value.futuro : []),
        ];
        const seen = new Set<string>();
        for (const a of allAlerts) {
          const munStr = String(a.municipios ?? "");
          const idMunStr = String(a.id_municipio ?? "");
          if (
            munStr.includes(PADUA.ibge) ||
            idMunStr.includes(PADUA.ibge) ||
            /Santo Ant.nio de P.dua/i.test(munStr)
          ) {
            const key = `${a.id ?? a.codigo}-${a.data_inicio}-${a.hora_inicio}`;
            if (seen.has(key)) continue;
            seen.add(key);
            alerts.push({
              id: a.id ?? a.id_aviso ?? key,
              codigo: String(a.codigo ?? ""),
              descricao: String(a.descricao ?? "Aviso Meteorológico Oficial"),
              severidade: String(a.severidade ?? ""),
              cor: String(a.aviso_cor ?? "#FFFE00"),
              dataInicio: String(a.data_inicio ?? "").slice(0, 10),
              horaInicio: String(a.hora_inicio ?? ""),
              dataFim: String(a.data_fim ?? "").slice(0, 10),
              horaFim: String(a.hora_fim ?? ""),
              riscos: Array.isArray(a.riscos) ? a.riscos.map(String) : [],
              instrucoes: Array.isArray(a.instrucoes) ? a.instrucoes.map(String) : [],
            });
          }
        }
      }

      const mergedCurrent = {
        time: omPayload.current?.time ?? new Date().toISOString(),
        // Prefer real observed temperature from INMET automatic station when available
        temperature_2m: station?.tempInsC ?? omPayload.current?.temperature_2m,
        apparent_temperature: station?.sensacaoTermicaC ?? omPayload.current?.apparent_temperature,
        relative_humidity_2m: station?.umidadeInsPct ?? omPayload.current?.relative_humidity_2m,
        precipitation:
          station?.chuvaHoraMm != null && station.chuvaHoraMm > 0
            ? station.chuvaHoraMm
            : omPayload.current?.precipitation ?? 0,
        weather_code: omPayload.current?.weather_code,
        wind_speed_10m:
          station?.ventoVelMs != null ? Number((station.ventoVelMs * 3.6).toFixed(1)) : omPayload.current?.wind_speed_10m,
      };

      const payload: WeatherPayload = {
        inmet: {
          municipality: "Santo Antônio de Pádua — RJ",
          ibge: PADUA.ibge,
          currentPeriod: period,
          currentSummary,
          days,
          station,
          alerts,
        },
        current: mergedCurrent,
        hourly: omPayload.hourly,
        daily: omPayload.daily,
      };

      const fetchedAt = new Date();
      const validUntil = new Date(fetchedAt.getTime() + VALIDITY_MIN * 60000);
      await supabase.from("weather_snapshots").insert({
        source: "INMET + Open-Meteo",
        fetched_at: fetchedAt.toISOString(),
        valid_until: validUntil.toISOString(),
        latitude: PADUA.lat,
        longitude: PADUA.lon,
        payload: payload as never,
      });

      return {
        ok: true as const,
        fromCache: false,
        fetchedAt: fetchedAt.toISOString(),
        validUntil: validUntil.toISOString(),
        payload,
      };
    } catch (e) {
      const { data: last } = await supabase
        .from("weather_snapshots")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
        stale: last ? { fetchedAt: last.fetched_at, payload: last.payload as WeatherPayload } : null,
      };
    }
  });
