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
  Gauge,
  Network,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Umbrella,
  Waves,
  Wind,
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
import { InstallAppButton } from "@/components/app/InstallAppPrompt";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard — Drenagem Inteligente Pádua" },
      { name: "description", content: "Painel principal com previsão oficial INMET em tempo real e indicadores da drenagem urbana." },
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

  // Anchor hourly slice to the API's current time so clock differences never zero out the chart
  const refTimeMs = payload?.current?.time ? new Date(payload.current.time).getTime() : Date.now();
  const hourly = (payload?.hourly?.time ?? [])
    .map((t, i) => ({
      t,
      h: t.slice(11, 16),
      mm: payload?.hourly?.precipitation?.[i] ?? 0,
      prob: payload?.hourly?.precipitation_probability?.[i] ?? 0,
    }))
    .filter((x) => new Date(x.t).getTime() >= refTimeMs - 3600000)
    .slice(0, 24);

  const acc24 = hourly.reduce((s, x) => s + (x.mm ?? 0), 0);
  const acc72 = (payload?.hourly?.time ?? [])
    .map((t, i) => ({ t, mm: payload?.hourly?.precipitation?.[i] ?? 0 }))
    .filter((x) => new Date(x.t).getTime() >= refTimeMs - 3600000)
    .slice(0, 72)
    .reduce((s, x) => s + x.mm, 0);

  const inmetDays = payload?.inmet?.days ?? [];
  const inmetStation = payload?.inmet?.station ?? null;
  const inmetAlerts = payload?.inmet?.alerts ?? [];
  const todayInmet = inmetDays[0];

  const WeatherIcon = CONDITION_META[condition].icon;

  return (
    <>
      <PageHeader
        title="Dashboard de Monitoramento e Drenagem"
        description="Integração oficial em tempo real com o INMET (Instituto Nacional de Meteorologia — IBGE 3304706), Estação Automática A604 e modelo horário Open-Meteo."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/previsao">
              <Button size="sm" variant="default" className="gap-1.5">
                <CloudRain className="h-4 w-4" /> Previsão e Alertas
              </Button>
            </Link>
            <Link to="/mapa">
              <Button size="sm" variant="outline">Abrir Mapa</Button>
            </Link>
          </div>
        }
      />

      {/* Multi-Platform App Installation Banner */}
      <InstallAppButton variant="banner" className="mb-5" />

      {/* Official INMET Active Warnings Banner */}
      {inmetAlerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {inmetAlerts.map((al) => (
            <div
              key={al.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border-l-8 bg-card/95 p-4 shadow-xs backdrop-blur-md"
              style={{ borderLeftColor: al.cor || "#FFFE00" }}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-warning/30 px-2 py-0.5 text-xs font-bold uppercase text-warning-foreground">
                    <ShieldAlert className="h-3.5 w-3.5" /> Aviso Oficial INMET Ativo · {al.severidade}
                  </span>
                  <span className="text-sm font-bold">{al.descricao} — Santo Antônio de Pádua (RJ)</span>
                </div>
                {al.riscos[0] && <p className="text-xs text-muted-foreground">{al.riscos[0]}</p>}
                <div className="text-[11px] text-muted-foreground">
                  Vigência: {al.dataInicio} {al.horaInicio} até {al.dataFim} {al.horaFim} · Código: {al.codigo}
                </div>
              </div>
              <Link to="/previsao">
                <Button size="sm" variant="outline" className="text-xs">Ver instruções oficiais</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Official Real-Time Weather Forecast Panel */}
      <section className="mb-6 rounded-xl border bg-card/88 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${CONDITION_META[condition].badgeCls}`}>
              <WeatherIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Radio className="h-3 w-3" /> Fonte Oficial: INMET (IBGE {PADUA.ibge})
                </span>
                {inmetStation && (
                  <span className="text-xs text-muted-foreground">
                    Estação INMET {inmetStation.codigo} ({inmetStation.nome} · {inmetStation.distanciaKm} km)
                  </span>
                )}
                {isStale && (
                  <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning-foreground">
                    Cache histórico
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className="text-lg font-bold md:text-xl">{weatherLabel}</h2>
                {(inmetStation?.tempInsC ?? payload?.current?.temperature_2m) != null && (
                  <span className="num text-2xl font-bold text-primary">
                    {fmt(inmetStation?.tempInsC ?? payload?.current?.temperature_2m, 1)} °C
                  </span>
                )}
                {inmetStation?.sensacaoTermicaC != null && (
                  <span className="text-xs text-muted-foreground">
                    (Sensação térmica: <b className="num">{fmt(inmetStation.sensacaoTermicaC, 1)} °C</b>)
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Consultado em tempo real em {fmtDate(fetchedAt)} · O fundo da tela reflete automaticamente a condição meteorológica oficial do INMET.
              </p>
            </div>
          </div>

          {/* Interactive Backdrop Theme Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg border bg-background/80 p-0.5 text-xs">
              {(
                [
                  ["auto", "Automático (INMET Real)"],
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
              variant="outline"
              onClick={() => refreshWeather(true)}
              disabled={weatherLoading}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${weatherLoading ? "animate-spin" : ""}`} />
              Atualizar Agora
            </Button>
          </div>
        </div>

        {/* Today's INMET Official Period Breakdown (Manhã / Tarde / Noite) */}
        {todayInmet && (todayInmet.manha || todayInmet.tarde || todayInmet.noite) && (
          <div className="mt-4 grid gap-2.5 md:grid-cols-3">
            {(
              [
                ["manha", "Manhã (Hoje)", todayInmet.manha],
                ["tarde", "Tarde (Hoje)", todayInmet.tarde],
                ["noite", "Noite (Hoje)", todayInmet.noite],
              ] as const
            ).map(([key, title, p]) =>
              p ? (
                <div
                  key={key}
                  className={`rounded-lg border p-3 text-xs ${
                    payload?.inmet?.currentPeriod === key
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "bg-background/65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">
                      {title} {payload?.inmet?.currentPeriod === key && "· AGORA"}
                    </span>
                    <span className="num font-semibold">
                      {p.temp_min ?? "—"}°C a {p.temp_max ?? "—"}°C
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-foreground">{p.resumo}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {p.umidade_min != null && (
                      <span>Umidade: {p.umidade_min}%–{p.umidade_max}%</span>
                    )}
                    {p.dir_vento && (
                      <span>Vento: {p.dir_vento} ({p.int_vento})</span>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Telemetry + 5-day INMET Forecast + 24h Hourly Model */}
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 text-water" /> Umidade / Chuva 1h
                </div>
                <div className="num mt-1 text-base font-bold">
                  {inmetStation?.umidadeInsPct != null ? `${fmt(inmetStation.umidadeInsPct, 0)}%` : "—"} ·{" "}
                  {fmt(inmetStation?.chuvaHoraMm ?? payload?.current?.precipitation ?? 0, 1)} mm
                </div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CloudRain className="h-3.5 w-3.5 text-water" /> Acumulado 24 h
                </div>
                <div className="num mt-1 text-base font-bold">{fmt(acc24, 1)} mm</div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Waves className="h-3.5 w-3.5 text-primary" /> Acumulado 72 h
                </div>
                <div className="num mt-1 text-base font-bold">{fmt(acc72, 1)} mm</div>
              </div>
              <div className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Wind className="h-3.5 w-3.5 text-primary" /> Vento / Pressão
                </div>
                <div className="num mt-1 text-base font-bold">
                  {inmetStation?.ventoVelMs != null ? `${fmt(inmetStation.ventoVelMs * 3.6, 1)} km/h` : "—"}
                </div>
              </div>
            </div>

            {/* 5-day official INMET forecast strip */}
            {inmetDays.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {inmetDays.slice(0, 5).map((d, idx) => {
                  const p = d.tarde ?? d.manha ?? d.dia;
                  const mmModel = payload?.daily?.precipitation_sum?.[idx];
                  const probModel = payload?.daily?.precipitation_probability_max?.[idx];
                  return (
                    <div key={d.date} className="rounded-lg border bg-background/60 p-2.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{idx === 0 ? "Hoje" : d.date.slice(0, 5)}</span>
                        <span className="num text-[11px] text-primary">
                          {p?.temp_min ?? "—"}°/{p?.temp_max ?? "—"}°
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 min-h-[2rem] text-[11px] text-foreground" title={p?.resumo}>
                        {p?.resumo ?? "—"}
                      </div>
                      <div className="num mt-1 flex items-center justify-between border-t pt-1 text-[10px] text-muted-foreground">
                        <span>{mmModel != null ? `${fmt(mmModel, 1)} mm` : "—"}</span>
                        <span>{probModel != null ? `Prob. ${fmt(probModel, 0)}%` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 24-Hour Precipitation & Probability Mini-Chart */}
          <div className="rounded-lg border bg-background/70 p-3">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold">Modelo horário próximas 24 h (mm e prob. %)</span>
              <Link to="/previsao" className="text-water underline">Detalhes e alertas</Link>
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
        <Stat label="Alertas internos ativos" value={v("activeAlerts")} hint="Pendentes de confirmação" />
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
