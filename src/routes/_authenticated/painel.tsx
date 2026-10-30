import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Network,
  RefreshCw,
  ShieldCheck,
  Thermometer,
  Umbrella,
  Waves,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Notice, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import {
  CONDITION_META,
  useWeatherTheme,
  type WeatherCondition,
} from "@/components/app/WeatherBackdrop";
import { PADUA } from "@/lib/weather.functions";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard — Drenagem Inteligente Pádua" },
      { name: "description", content: "Painel principal com previsão meteorológica interativa e indicadores reais da drenagem urbana." },
    ],
  }),
  component: Painel,
});

type Counts = Record<string, number | null>;

function Painel() {
  const {
    condition,
    overrideCondition,
    setOverrideCondition,
    weatherLabel,
    payload,
    fetchedAt,
    isStale,
    loading: weatherLoading,
    refresh: refreshWeather,
  } = useWeatherTheme();

  const [c, setC] = useState<Counts>({});
  const [byHood, setByHood] = useState<[string, number][]>([]);
  const [sources, setSources] = useState<
    { name: string; institution: string; integration_status: string; updated_at: string; imported_at: string | null }[]
  >([]);

  useEffect(() => {
    const count = async (
      t:
        | "flood_events"
        | "drainage_links"
        | "drainage_nodes"
        | "simulation_runs"
        | "technical_reviews"
        | "field_inspections"
        | "reports"
        | "alert_events",
      f?: (q: any) => any
    ) => {
      let q: any = supabase.from(t).select("id", { count: "exact", head: true });
      if (f) q = f(q);
      const { count } = await q;
      return count ?? 0;
    };
    (async () => {
      const [
        floods,
        uninspected,
        riverInfluence,
        links,
        incomplete,
        nodes,
        simDone,
        simFail,
        simPend,
        revPend,
        revApproved,
        inspections,
        reportsCount,
        activeAlerts,
      ] = await Promise.all([
        count("flood_events", (q) => q.is("deleted_at", null)),
        count("flood_events", (q) => q.is("deleted_at", null).eq("diagnosis_status", "nao_vistoriado")),
        count("flood_events", (q) => q.is("deleted_at", null).not("river_condition", "is", null)),
        count("drainage_links", (q) => q.is("deleted_at", null)),
        count("drainage_links", (q) =>
          q.is("deleted_at", null).or("upstream_invert_m.is.null,downstream_invert_m.is.null,length_m.is.null")
        ),
        count("drainage_nodes", (q) => q.is("deleted_at", null)),
        count("simulation_runs", (q) => q.in("status", ["concluida", "concluida_alertas", "validada"])),
        count("simulation_runs", (q) => q.eq("status", "falhou")),
        count("simulation_runs", (q) => q.in("status", ["rascunho", "aguardando_dados", "pronta", "em_processamento"])),
        count("technical_reviews", (q) => q.eq("decision", "pendente")),
        count("technical_reviews", (q) => q.eq("decision", "aprovado")),
        count("field_inspections", (q) => q.is("deleted_at", null)),
        count("reports"),
        count("alert_events", (q) => q.is("acknowledged_at", null)),
      ]);
      setC({
        floods,
        uninspected,
        riverInfluence,
        links,
        incomplete,
        nodes,
        simDone,
        simFail,
        simPend,
        revPend,
        revApproved,
        inspections,
        reportsCount,
        activeAlerts,
      });
      const { data: fe } = await supabase.from("flood_events").select("neighborhood").is("deleted_at", null);
      const m = new Map<string, number>();
      (fe ?? []).forEach((r) =>
        m.set(r.neighborhood || "Sem bairro", (m.get(r.neighborhood || "Sem bairro") ?? 0) + 1)
      );
      setByHood([...m.entries()].sort((a, b) => b[1] - a[1]));
      const { data: ds } = await supabase
        .from("data_sources")
        .select("name,institution,integration_status,updated_at,imported_at")
        .order("institution");
      setSources(ds ?? []);
    })();
  }, []);

  const v = (k: string) => c[k] ?? "…";

  // Weather data processing for the Dashboard Forecast Panel
  const now = Date.now();
  const hourly = (payload?.hourly?.time ?? [])
    .map((t, i) => ({
      t,
      h: t.slice(11, 16),
      mm: payload?.hourly?.precipitation?.[i] ?? 0,
      prob: payload?.hourly?.precipitation_probability?.[i] ?? 0,
    }))
    .filter((x) => new Date(x.t).getTime() >= now - 3600000)
    .slice(0, 24);

  const acc24 = hourly.reduce((s, x) => s + (x.mm ?? 0), 0);
  const acc72 = (payload?.hourly?.time ?? [])
    .map((t, i) => ({ t, mm: payload?.hourly?.precipitation?.[i] ?? 0 }))
    .filter((x) => new Date(x.t).getTime() >= now - 3600000)
    .slice(0, 72)
    .reduce((s, x) => s + x.mm, 0);

  const daily = (payload?.daily?.time ?? []).slice(0, 5).map((d, i) => ({
    d: d.slice(5).split("-").reverse().join("/"),
    mm: payload?.daily?.precipitation_sum?.[i] ?? null,
    prob: payload?.daily?.precipitation_probability_max?.[i] ?? null,
    tmax: payload?.daily?.temperature_2m_max?.[i] ?? null,
    tmin: payload?.daily?.temperature_2m_min?.[i] ?? null,
  }));

  const WeatherIcon = CONDITION_META[condition].icon;

  return (
    <>
      <PageHeader
        title="Dashboard de Monitoramento e Drenagem"
        description="Visão integrada das condições meteorológicas de Santo Antônio de Pádua — RJ e indicadores reais do cadastro técnico municipal."
        actions={
          <div className="flex gap-2">
            <Link to="/previsao">
              <Button size="sm" variant="default" className="gap-1.5">
                <CloudRain className="h-4 w-4" /> Central de Alertas
              </Button>
            </Link>
            <Link to="/mapa">
              <Button size="sm" variant="outline">Abrir Mapa</Button>
            </Link>
          </div>
        }
      />

      {/* Interactive Weather Forecast Panel */}
      <section className="mb-6 rounded-xl border bg-card/85 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${CONDITION_META[condition].badgeCls}`}>
              <WeatherIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Previsão Meteorológica · Sede Municipal ({PADUA.lat}, {PADUA.lon})
                </span>
                {isStale && (
                  <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                    Cache histórico
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-3">
                <h2 className="text-xl font-bold">{weatherLabel}</h2>
                {payload?.current?.temperature_2m != null && (
                  <span className="num text-2xl font-bold text-primary">
                    {fmt(payload.current.temperature_2m, 1)} °C
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Fonte: Open-Meteo (modelo numérico) · Atualizado em {fmtDate(fetchedAt)} · O fundo da tela reage automaticamente ao clima vigente.
              </p>
            </div>
          </div>

          {/* Interactive Backdrop Theme Selector */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Fundo interativo:</span>
              <div className="inline-flex rounded-lg border bg-background/80 p-0.5 text-xs">
                {(
                  [
                    ["auto", "Automático (Clima Real)"],
                    ["sunny", "Ensolarado"],
                    ["cloudy", "Nublado"],
                    ["rainy", "Chuvoso"],
                    ["stormy", "Tempestade"],
                  ] as [WeatherCondition | "auto", string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setOverrideCondition(k)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      overrideCondition === k
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={refreshWeather}
                disabled={weatherLoading}
                title="Atualizar dados meteorológicos"
              >
                <RefreshCw className={`h-4 w-4 ${weatherLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Weather Metrics + 24h Hourly Chart + 5-day Strip */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 text-water" /> Chuva agora
                </div>
                <div className="num mt-1 text-lg font-bold">
                  {payload?.current?.precipitation != null ? `${fmt(payload.current.precipitation, 1)} mm` : "—"}
                </div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CloudRain className="h-3.5 w-3.5 text-water" /> Acumulado 24 h
                </div>
                <div className="num mt-1 text-lg font-bold">{fmt(acc24, 1)} mm</div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Waves className="h-3.5 w-3.5 text-primary" /> Acumulado 72 h
                </div>
                <div className="num mt-1 text-lg font-bold">{fmt(acc72, 1)} mm</div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Umbrella className="h-3.5 w-3.5 text-primary" /> Prob. máx. hoje
                </div>
                <div className="num mt-1 text-lg font-bold">
                  {daily[0]?.prob != null ? `${fmt(daily[0].prob, 0)}%` : "—"}
                </div>
              </div>
            </div>

            {/* 5-day compact forecast strip */}
            {daily.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {daily.map((d, idx) => (
                  <div key={d.d} className="rounded-lg border bg-background/60 p-2 text-center text-xs">
                    <div className="font-semibold">{idx === 0 ? "Hoje" : d.d}</div>
                    <div className="num mt-1 font-medium text-water">{fmt(d.mm, 1)} mm</div>
                    <div className="num text-[11px] text-muted-foreground">Prob. {fmt(d.prob, 0)}%</div>
                    <div className="num mt-0.5 flex items-center justify-center gap-0.5 text-[11px] text-muted-foreground">
                      <Thermometer className="h-3 w-3" />
                      {fmt(d.tmin, 0)}°/{fmt(d.tmax, 0)}°
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 24-Hour Precipitation & Probability Mini-Chart */}
          <div className="rounded-lg border bg-background/70 p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold">Evolução horária nas próximas 24 h (mm e %)</span>
              <Link to="/previsao" className="text-water underline">Ver 72 h e regras de risco</Link>
            </div>
            <div className="h-44">
              {hourly.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {weatherLoading ? "Carregando série horária…" : "Série horária indisponível"}
                </div>
              ) : (
                <ResponsiveContainer>
                  <ComposedChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="h" fontSize={10} interval={3} />
                    <YAxis yAxisId="mm" fontSize={10} />
                    <YAxis yAxisId="p" orientation="right" domain={[0, 100]} fontSize={10} />
                    <Tooltip />
                    <Bar yAxisId="mm" dataKey="mm" name="Chuva (mm)" fill="var(--water)" radius={[2, 2, 0, 0]} />
                    <Line yAxisId="p" dataKey="prob" name="Probabilidade (%)" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Engineering KPI Grid */}
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Network className="h-3.5 w-3.5" /> Indicadores Técnicos em Tempo Real (Banco de Dados)
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pontos de alagamento" value={v("floods")} hint="Ocorrências mapeadas" />
        <Stat label="Aguardando vistoria" value={v("uninspected")} hint="Status: não vistoriado" />
        <Stat label="Vistorias de campo" value={v("inspections")} hint="Inspeções registradas" />
        <Stat label="Influência do Rio Pomba" value={v("riverInfluence")} hint="Ocorrências c/ condição do rio" />
        <Stat label="Trechos de drenagem" value={v("links")} hint="Galerias, manilhas e canais" />
        <Stat label="Trechos incompletos" value={v("incomplete")} hint="Sem cota ou comprimento" />
        <Stat label="Nós cadastrados" value={v("nodes")} hint="PVs, bocas de lobo e lançamentos" />
        <Stat label="Simulações (Pend. / Concl.)" value={`${v("simPend")} / ${v("simDone")}`} hint={`Falhas: ${v("simFail")}`} />
        <Stat label="Relatórios técnicos" value={v("reportsCount")} hint="Estudos versionados" />
        <Stat label="Revisões pendentes" value={v("revPend")} hint="Aguardando engenheiro" />
        <Stat label="Aprovações técnicas" value={v("revApproved")} hint="Validados com CREA" />
        <Stat label="Alertas ativos" value={v("activeAlerts")} hint="Pendentes de confirmação" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card/90 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" /> Ocorrências por bairro
            </h2>
            <Link to="/alagamentos" className="text-xs text-water underline">Gerenciar ocorrências</Link>
          </div>
          {byHood.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ocorrência registrada.{" "}
              <Link to="/alagamentos" className="text-water underline">
                Cadastrar ponto
              </Link>
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {byHood.map(([n, k]) => (
                <li key={n} className="flex items-center justify-between rounded border-b px-2 py-1 hover:bg-muted/50">
                  <span className="font-medium">{n}</span>
                  <span className="num rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {k}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-card/90 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Estado das fontes de dados
            </h2>
            <Link to="/central-dados" className="text-xs text-water underline">Abrir Central de Dados</Link>
          </div>
          <ul className="space-y-1.5 text-sm">
            {sources.map((s) => (
              <li key={s.name} className="flex justify-between gap-2 border-b py-1">
                <span className="truncate">
                  <b>{s.institution}</b> — {s.name}
                </span>
                <span
                  className={
                    s.integration_status === "ativa"
                      ? "shrink-0 font-medium text-success"
                      : "shrink-0 text-xs text-muted-foreground"
                  }
                >
                  {s.integration_status === "ativa"
                    ? "Ativa"
                    : s.imported_at
                      ? `Importada ${fmtDate(s.imported_at)}`
                      : "Integração pendente"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6">
        <Notice>
          Os resultados desta plataforma apoiam estudos técnicos e não substituem projeto executivo, ART ou avaliação de profissional habilitado. A previsão meteorológica não implica certeza de alagamento.
        </Notice>
      </div>
    </>
  );
}
