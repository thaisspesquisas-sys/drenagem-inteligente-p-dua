import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PADUA } from "@/lib/weather.functions";
import { useWeatherTheme } from "@/components/app/WeatherBackdrop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Notice, Stat, Empty, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/previsao")({
  head: () => ({ meta: [{ title: "Previsão do tempo e alertas — Drenagem Inteligente Pádua" }, { name: "description", content: "Previsão meteorológica oficial INMET em tempo real, avisos ativos e triagem de risco." }] }),
  component: Page,
});

const METRICS: Record<string, string> = {
  rain_1h_mm: "Precipitação máxima horária prevista (mm/h)",
  rain_24h_mm: "Acumulado de chuva previsto em 24 h (mm)",
  rain_72h_mm: "Acumulado de chuva previsto em 72 h (mm)",
  precip_prob_pct: "Probabilidade máxima de chuva hoje (%)",
  river_level_m: "Nível observado do Rio Pomba (m)",
};

const LEVELS: Record<string, { label: string; cls: string; actions: string[] }> = {
  monitoramento: {
    label: "Nível 1 — Monitoramento",
    cls: "bg-accent text-accent-foreground",
    actions: ["Acompanhar atualização horária da previsão meteorológica INMET/Open-Meteo.", "Conferir disponibilidade das equipes de manutenção."],
  },
  atencao: {
    label: "Nível 2 — Atenção",
    cls: "bg-warning/20 text-warning-foreground",
    actions: ["Verificar possíveis obstruções em bocas de lobo e grelhas nos bairros historicamente críticos.", "Conferir pontos de lançamento no Rio Pomba."],
  },
  risco_elevado: {
    label: "Nível 3 — Risco elevado",
    cls: "bg-destructive/15 text-destructive",
    actions: ["Inspecionar preventivamente pontos críticos com histórico recorrente.", "Verificar dispositivos antirretorno, comportas e estações de bombeamento.", "Manter equipe de campo de prontidão para registro fotográfico e vistorias."],
  },
  situacao_critica: {
    label: "Nível 4 — Situação crítica",
    cls: "bg-destructive text-destructive-foreground",
    actions: ["Acionar imediatamente a coordenação técnica e consultar os canais oficiais da Defesa Civil.", "Avaliar condição de submersão dos lançamentos no Rio Pomba.", "Registrar ocorrências e cotas observadas após o evento para calibração."],
  },
};

const LEVEL_ORDER = ["monitoramento", "atencao", "risco_elevado", "situacao_critica"];

function compareOp(val: number, op: string, thr: number): boolean {
  if (op === ">=") return val >= thr;
  if (op === ">") return val > thr;
  if (op === "<=") return val <= thr;
  if (op === "=") return val === thr;
  return val >= thr;
}

function Page() {
  const { can, user } = useAuth();
  const { payload: p, fetchedAt, validUntil, fromCache, isStale, error, loading, refresh } = useWeatherTheme();
  const [rules, setRules] = useState<Tables<"alert_rules">[]>([]);
  const [events, setEvents] = useState<Tables<"alert_events">[]>([]);
  const [floods, setFloods] = useState<Tables<"flood_events">[]>([]);
  const [riverLevelM, setRiverLevelM] = useState<string>("");
  const [newRule, setNewRule] = useState({ name: "", metric: "rain_24h_mm", operator: ">=", threshold: "40", level: "atencao", notes: "" });

  const loadRulesAndEvents = async () => {
    const [rl, ev, fe] = await Promise.all([
      supabase.from("alert_rules").select("*").order("created_at", { ascending: false }),
      supabase.from("alert_events").select("*").order("triggered_at", { ascending: false }).limit(30),
      supabase.from("flood_events").select("*").is("deleted_at", null).order("code"),
    ]);
    setRules(rl.data ?? []);
    setEvents(ev.data ?? []);
    setFloods(fe.data ?? []);
  };

  useEffect(() => {
    loadRulesAndEvents();
  }, []);

  const refTimeMs = p?.current?.time ? new Date(p.current.time).getTime() : Date.now();
  const hourly = (p?.hourly?.time ?? [])
    .map((t, i) => ({ t, h: t.slice(5, 13).replace("T", " "), mm: p?.hourly?.precipitation?.[i] ?? null, prob: p?.hourly?.precipitation_probability?.[i] ?? null }))
    .filter((x) => new Date(x.t).getTime() >= refTimeMs - 3600000)
    .slice(0, 72);
  const acc = (h: number) => hourly.slice(0, h).reduce((s, x) => s + (x.mm ?? 0), 0);
  const max1h = hourly.slice(0, 24).reduce((m, x) => Math.max(m, x.mm ?? 0), 0);
  const daily = (p?.daily?.time ?? []).map((d, i) => ({
    d: d.slice(5),
    mm: p?.daily?.precipitation_sum?.[i] ?? null,
    prob: p?.daily?.precipitation_probability_max?.[i] ?? null,
    tmax: p?.daily?.temperature_2m_max?.[i],
    tmin: p?.daily?.temperature_2m_min?.[i],
  }));
  const na = (v: number | null | undefined, d = 1, u = "") => (v == null ? "Não disponível" : `${fmt(v, d)}${u}`);

  const inmet = p?.inmet;
  const station = inmet?.station;
  const officialAlerts = inmet?.alerts ?? [];

  const metricValues: Record<string, number | null> = {
    rain_1h_mm: p ? max1h : null,
    rain_24h_mm: p ? acc(24) : null,
    rain_72h_mm: p ? acc(72) : null,
    precip_prob_pct: daily[0]?.prob ?? null,
    river_level_m: riverLevelM.trim() !== "" ? Number(riverLevelM) : null,
  };

  const activeRules = rules.filter((r) => r.active);
  const triggeredRules = activeRules.filter((r) => {
    const val = metricValues[r.metric];
    return val != null && Number.isFinite(val) && compareOp(val, r.operator, Number(r.threshold));
  });

  const highestLevel = triggeredRules.reduce<string | null>((best, r) => {
    if (!best) return r.level;
    return LEVEL_ORDER.indexOf(r.level) > LEVEL_ORDER.indexOf(best) ? r.level : best;
  }, officialAlerts.length > 0 ? "atencao" : null);

  const evaluateAndRecordAlerts = async () => {
    if (isStale) {
      toast.error("Não é permitido gerar novos alertas com dados meteorológicos desatualizados.");
      return;
    }
    if (triggeredRules.length === 0) {
      toast.info("Nenhuma regra interna parametrizada foi atingida nas condições atuais.");
      return;
    }
    let inserted = 0;
    const twoHoursAgo = Date.now() - 2 * 3600 * 1000;
    for (const r of triggeredRules) {
      const val = metricValues[r.metric]!;
      const duplicate = events.some(
        (ev) => ev.rule_id === r.id && !ev.acknowledged_at && new Date(ev.triggered_at).getTime() > twoHoursAgo
      );
      if (duplicate) continue;
      const { error: insErr } = await supabase.from("alert_events").insert({
        rule_id: r.id,
        rule_name: r.name,
        metric: r.metric,
        value: val,
        threshold: r.threshold,
        level: r.level,
        source: r.metric === "river_level_m" ? "Leitura informada do Rio Pomba" : "INMET + Open-Meteo (Pádua)",
      });
      if (!insErr) inserted++;
    }
    toast.success(inserted > 0 ? `${inserted} alerta(s) preventivo(s) emitido(s).` : "Alertas já ativos e dentro da janela de deduplicação.");
    loadRulesAndEvents();
  };

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error: rErr } = await supabase.from("alert_rules").insert({
      name: newRule.name,
      metric: newRule.metric,
      operator: newRule.operator,
      threshold: Number(newRule.threshold),
      level: newRule.level,
      notes: newRule.notes || null,
      active: true,
    });
    if (rErr) {
      toast.error(rErr.message);
      return;
    }
    toast.success("Regra de alerta parametrizada.");
    setNewRule({ ...newRule, name: "", notes: "" });
    loadRulesAndEvents();
  };

  const toggleRule = async (r: Tables<"alert_rules">) => {
    const { error: tErr } = await supabase.from("alert_rules").update({ active: !r.active }).eq("id", r.id);
    if (tErr) toast.error(tErr.message);
    else loadRulesAndEvents();
  };

  const acknowledgeEvent = async (ev: Tables<"alert_events">) => {
    const { error: aErr } = await supabase
      .from("alert_events")
      .update({ acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq("id", ev.id);
    if (aErr) toast.error(aErr.message);
    else {
      toast.success("Recebimento do alerta confirmado.");
      loadRulesAndEvents();
    }
  };

  return (
    <>
      <PageHeader
        title="Previsão do tempo oficial (INMET) e alertas"
        description={`Integração em tempo real com o INMET (Instituto Nacional de Meteorologia — Santo Antônio de Pádua IBGE ${PADUA.ibge}), Estação Oficial INMET ${station?.codigo ?? "A604"} e modelo horário Open-Meteo (${PADUA.lat}, ${PADUA.lon}).`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={evaluateAndRecordAlerts} disabled={loading || isStale}>
              Avaliar regras internas
            </Button>
            <Button variant="default" onClick={() => refresh(true)} disabled={loading}>
              {loading ? "Consultando INMET…" : "Atualizar em tempo real"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice>
            Aviso de comunicação: {error}.{" "}
            {fetchedAt
              ? `Exibindo últimos dados armazenados (consultados em ${fmtDate(fetchedAt)}).`
              : "Não há dados armazenados."}
          </Notice>
        </div>
      )}

      {fetchedAt && (
        <p className="mb-4 text-xs text-muted-foreground">
          Fontes: <b>INMET Previsão Municipal (IBGE {PADUA.ibge})</b> · <b>INMET Avisos Ativos</b> · <b>Estação Automática INMET {station?.codigo ?? "A604"} ({station?.nome ?? "Cambuci"})</b> · <b>Open-Meteo</b> · Consultado em {fmtDate(fetchedAt)} · válido até {fmtDate(validUntil)} {fromCache && "(cache recente — clique em 'Atualizar em tempo real' para forçar nova leitura)"}
        </p>
      )}

      {/* Official INMET Active Warnings Section */}
      <section className="mb-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
        <h2 className="mb-2 font-semibold">Avisos Meteorológicos Oficiais Ativos — INMET (Santo Antônio de Pádua — RJ)</h2>
        {officialAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aviso meteorológico severo ativo no INMET para Santo Antônio de Pádua neste momento.
          </p>
        ) : (
          <div className="space-y-3">
            {officialAlerts.map((a) => (
              <div
                key={a.id}
                className="rounded-md border border-l-8 bg-background/80 p-3.5 text-sm"
                style={{ borderLeftColor: a.cor || "#FFFE00" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold">
                    {a.descricao} — <span className="uppercase">{a.severidade}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Vigência: {a.dataInicio} {a.horaInicio} até {a.dataFim} {a.horaFim}
                  </span>
                </div>
                {a.riscos.length > 0 && (
                  <div className="mt-2 text-xs">
                    <b>Riscos potenciais (INMET):</b>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {a.riscos.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {a.instrucoes.length > 0 && (
                  <div className="mt-2 text-xs">
                    <b>Instruções oficiais (INMET / Defesa Civil 199):</b>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {a.instrucoes.map((ins, i) => <li key={i}>{ins}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Official INMET Forecast by Period & 5 Days */}
      {inmet && inmet.days.length > 0 && (
        <section className="mb-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Previsão Oficial do INMET para Santo Antônio de Pádua (5 dias)</h2>
              <p className="text-xs text-muted-foreground">
                Condição oficial vigente ({inmet.currentPeriod}): <b>{inmet.currentSummary}</b>
              </p>
            </div>
            {station && (
              <div className="rounded border bg-background/70 px-3 py-1.5 text-xs">
                <b>Estação Oficial INMET {station.codigo} ({station.nome} · {station.distanciaKm} km):</b>{" "}
                Temp. observada: <b className="num">{fmt(station.tempInsC, 1)} °C</b> · Sensação:{" "}
                <b className="num">{fmt(station.sensacaoTermicaC, 1)} °C</b> · Umidade:{" "}
                <b className="num">{fmt(station.umidadeInsPct, 0)}%</b> · Chuva 1h:{" "}
                <b className="num">{fmt(station.chuvaHoraMm, 1)} mm</b>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Data</th>
                  <th>Manhã (INMET)</th>
                  <th>Tarde (INMET)</th>
                  <th>Noite (INMET)</th>
                  <th>Mín / Máx (°C)</th>
                </tr>
              </thead>
              <tbody>
                {inmet.days.map((d) => {
                  const pRef = d.tarde ?? d.manha ?? d.dia;
                  return (
                    <tr key={d.date} className="border-t">
                      <td className="p-2 font-semibold">{d.date}</td>
                      <td>{d.manha?.resumo ?? d.dia?.resumo ?? "—"}</td>
                      <td>{d.tarde?.resumo ?? d.dia?.resumo ?? "—"}</td>
                      <td>{d.noite?.resumo ?? d.dia?.resumo ?? "—"}</td>
                      <td className="num font-medium">
                        {pRef?.temp_min ?? "—"} °C / {pRef?.temp_max ?? "—"} °C
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {p && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <Stat label="Temp. observada (INMET)" value={na(station?.tempInsC ?? p.current?.temperature_2m, 1, " °C")} hint={station ? `Estação ${station.codigo} (${station.nome})` : "Modelo"} />
            <Stat label="Sensação térmica" value={na(station?.sensacaoTermicaC ?? p.current?.apparent_temperature, 1, " °C")} />
            <Stat label="Máxima horária (24 h)" value={`${fmt(max1h, 1)} mm/h`} />
            <Stat label="Acumulado previsto 24 h" value={`${fmt(acc(24), 1)} mm`} />
            <Stat label="Acumulado previsto 72 h" value={`${fmt(acc(72), 1)} mm`} />
            <Stat label="Prob. máx. de chuva hoje" value={na(daily[0]?.prob, 0, " %")} hint="Probabilidade ≠ volume" />
          </div>

          <section className="mt-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
            <h2 className="mb-3 font-semibold">Chuva prevista por hora (mm) e probabilidade (%) — Próximas 72 h</h2>
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="h" fontSize={10} interval={11} />
                  <YAxis yAxisId="mm" fontSize={10} />
                  <YAxis yAxisId="p" orientation="right" domain={[0, 100]} fontSize={10} />
                  <Tooltip />
                  <Bar yAxisId="mm" dataKey="mm" name="Precipitação (mm)" fill="var(--water)" />
                  <Line yAxisId="p" dataKey="prob" name="Probabilidade (%)" stroke="var(--primary)" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
            <h2 className="mb-3 font-semibold">Volumes diários previstos (7 dias — modelo numérico)</h2>
            <div className="h-44">
              <ResponsiveContainer>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="d" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="mm" name="Precipitação (mm)" fill="var(--water)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th>Dia</th><th>Chuva (mm)</th><th>Prob. (%)</th><th>Mín/Máx (°C)</th></tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.d} className="border-t">
                      <td className="py-1">{d.d}</td>
                      <td className="num">{na(d.mm)}</td>
                      <td className="num">{na(d.prob, 0)}</td>
                      <td className="num">{fmt(d.tmin, 0)} / {fmt(d.tmax, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Motor de triagem operacional e alertas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border bg-card/90 p-4 backdrop-blur-xs">
          <h2 className="mb-2 font-semibold">Motor de avaliação preventiva de risco (Triagem interna)</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Combina os avisos oficiais do INMET com as regras técnicas parametrizadas pela equipe municipal.
          </p>
          <div className="mb-3 flex items-end gap-2">
            <div>
              <Label className="text-xs">Nível atual observado do Rio Pomba (m, opcional p/ triagem)</Label>
              <Input type="number" step="any" className="w-48" placeholder="ex.: 3.80" value={riverLevelM} onChange={(e) => setRiverLevelM(e.target.value)} />
            </div>
          </div>

          {highestLevel ? (
            <div className="space-y-3 rounded-md border p-3">
              <div className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${LEVELS[highestLevel]?.cls ?? ""}`}>
                {LEVELS[highestLevel]?.label ?? highestLevel}
              </div>
              {officialAlerts.length > 0 && (
                <div className="text-xs">
                  <b>Aviso oficial INMET ativo:</b> {officialAlerts.map((a) => `${a.descricao} (${a.severidade})`).join(", ")}
                </div>
              )}
              {triggeredRules.length > 0 && (
                <div className="text-xs">
                  <b>Critérios internos atingidos ({triggeredRules.length}):</b>
                  <ul className="mt-1 list-disc pl-4">
                    {triggeredRules.map((r) => (
                      <li key={r.id}>
                        {r.name}: {METRICS[r.metric] ?? r.metric} = <b>{fmt(metricValues[r.metric], 1)}</b> ({r.operator} {r.threshold})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-xs">
                <b>Recomendações operacionais pré-aprovadas:</b>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {(LEVELS[highestLevel]?.actions ?? []).map((act) => (
                    <li key={act}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : activeRules.length === 0 ? (
            <Notice>
              Nenhuma regra interna customizada foi cadastrada ainda. Cadastre limites técnicos abaixo para disparo automático de alertas internos.
            </Notice>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <b>Condição normal:</b> Nenhuma das {activeRules.length} regras técnicas ativas foi ultrapassada.
            </div>
          )}
        </section>

        <section className="rounded-md border bg-card/90 p-4 backdrop-blur-xs">
          <h2 className="mb-2 font-semibold">Painel de alertas internos emitidos</h2>
          {events.length === 0 ? (
            <Empty>Nenhum alerta interno emitido até o momento.</Empty>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div key={ev.id} className="rounded border p-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded px-2 py-0.5 font-semibold ${LEVELS[ev.level]?.cls ?? ""}`}>
                      {LEVELS[ev.level]?.label ?? ev.level}
                    </span>
                    <span className="text-muted-foreground">{fmtDate(ev.triggered_at)}</span>
                  </div>
                  <div className="mt-1 font-medium">
                    {ev.rule_name} — Valor: {fmt(Number(ev.value), 1)} (Limite: {fmt(Number(ev.threshold), 1)})
                  </div>
                  <div className="text-muted-foreground">Fonte: {ev.source}</div>
                  <div className="mt-2 flex items-center justify-between">
                    {ev.acknowledged_at ? (
                      <span className="text-success">Recebido / confirmado em {fmtDate(ev.acknowledged_at)}</span>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledgeEvent(ev)}>
                        Confirmar recebimento
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Monitoramento específico por ponto de alagamento */}
      <section className="mt-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
        <h2 className="mb-2 font-semibold">Monitoramento preventivo por ponto de alagamento cadastrado</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Correlação entre a condição oficial INMET ({inmet?.currentSummary || "—"}), avisos ativos ({officialAlerts.length}) e os pontos críticos registrados.
        </p>
        {floods.length === 0 ? (
          <Empty>Nenhum ponto de alagamento cadastrado para correlação.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Ponto</th>
                  <th>Bairro</th>
                  <th>Previsão Oficial INMET</th>
                  <th>Obstruções conhecidas</th>
                  <th>Influência Rio Pomba</th>
                  <th>Triagem do ponto</th>
                </tr>
              </thead>
              <tbody>
                {floods.map((f) => {
                  const hasFactor = Boolean(f.obstructions || f.needs_inspection || f.river_condition);
                  const pointAttention = (acc(24) >= 20 || officialAlerts.length > 0) && hasFactor;
                  return (
                    <tr key={f.id} className="border-t">
                      <td className="p-2 font-medium">{f.code}</td>
                      <td>{f.neighborhood ?? "—"}</td>
                      <td className="text-xs">{inmet?.currentSummary || `${fmt(acc(24), 1)} mm (24h)`}</td>
                      <td>{f.obstructions ?? "Não informada"}</td>
                      <td>{f.river_condition ?? "Não informada"}</td>
                      <td>
                        {pointAttention ? (
                          <span className="font-medium text-destructive">Priorizar vistoria preventiva (aviso de chuva + fator local)</span>
                        ) : (
                          <span className="text-muted-foreground">{highestLevel ? LEVELS[highestLevel]?.label : "Acompanhamento de rotina"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Parametrização de regras de disparo */}
      <section className="mt-6 rounded-md border bg-card/90 p-4 backdrop-blur-xs">
        <h2 className="mb-3 font-semibold">Regras parametrizadas de disparo de alertas</h2>
        {can.edit && (
          <form onSubmit={addRule} className="mb-4 grid gap-2 border-b pb-4 md:grid-cols-6">
            <div>
              <Label className="text-xs">Nome da regra *</Label>
              <Input required value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="ex.: Chuva intensa 24h" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Variável monitorada</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={newRule.metric} onChange={(e) => setNewRule({ ...newRule, metric: e.target.value })}>
                {Object.entries(METRICS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Limite (&gt;=) *</Label>
              <Input type="number" step="any" required value={newRule.threshold} onChange={(e) => setNewRule({ ...newRule, threshold: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Categoria operacional</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={newRule.level} onChange={(e) => setNewRule({ ...newRule, level: e.target.value })}>
                {Object.entries(LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">Adicionar regra</Button>
            </div>
          </form>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra configurada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Regra</th>
                  <th>Métrica</th>
                  <th>Critério</th>
                  <th>Valor atual</th>
                  <th>Nível</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-medium">{r.name}</td>
                    <td>{METRICS[r.metric] ?? r.metric}</td>
                    <td className="num">{r.operator} {fmt(Number(r.threshold), 1)}</td>
                    <td className="num">{metricValues[r.metric] != null ? fmt(metricValues[r.metric], 1) : "—"}</td>
                    <td>{LEVELS[r.level]?.label ?? r.level}</td>
                    <td>{r.active ? "Ativa" : "Inativa"}</td>
                    <td>
                      {can.edit && (
                        <Button size="sm" variant="ghost" onClick={() => toggleRule(r)}>
                          {r.active ? "Desativar" : "Ativar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
