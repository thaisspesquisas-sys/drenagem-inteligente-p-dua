import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getWeather, PADUA, type WeatherPayload } from "@/lib/weather.functions";
import { PageHeader, Notice, Stat, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/previsao")({
  head: () => ({ meta: [{ title: "Previsão do tempo e alertas — Drenagem Inteligente Pádua" }, { name: "description", content: "Previsão meteorológica real e alertas internos." }] }),
  component: Page,
});

type Res = Awaited<ReturnType<typeof getWeather>>;

function Page() {
  const fn = useServerFn(getWeather);
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setRes(await fn()); } catch (e) { setRes({ ok: false, error: (e as Error).message, stale: null }); } setLoading(false); };
  useEffect(() => { load(); }, []);

  const p: WeatherPayload | undefined = res?.ok ? res.payload : res?.stale?.payload;
  const now = Date.now();
  const hourly = (p?.hourly?.time ?? []).map((t, i) => ({ t, h: t.slice(5, 13).replace("T", " "), mm: p?.hourly?.precipitation?.[i] ?? null, prob: p?.hourly?.precipitation_probability?.[i] ?? null }))
    .filter((x) => new Date(x.t).getTime() >= now - 3600000).slice(0, 72);
  const acc = (h: number) => hourly.slice(0, h).reduce((s, x) => s + (x.mm ?? 0), 0);
  const daily = (p?.daily?.time ?? []).map((d, i) => ({ d: d.slice(5), mm: p?.daily?.precipitation_sum?.[i] ?? null, prob: p?.daily?.precipitation_probability_max?.[i] ?? null, tmax: p?.daily?.temperature_2m_max?.[i], tmin: p?.daily?.temperature_2m_min?.[i] }));
  const na = (v: number | null | undefined, d = 1, u = "") => (v == null ? "Não disponível" : `${fmt(v, d)}${u}`);

  return (
    <>
      <PageHeader title="Previsão do tempo e alertas" description={`Fonte: Open-Meteo (modelo numérico) para o ponto ${PADUA.lat}, ${PADUA.lon} — sede municipal. Não representa todos os bairros.`}
        actions={<Button variant="outline" onClick={load} disabled={loading}>{loading ? "Consultando…" : "Atualizar"}</Button>} />
      {res && !res.ok && <div className="mb-4"><Notice>Dados temporariamente indisponíveis: {res.error}. {res.stale ? `Exibindo últimos dados armazenados (HISTÓRICOS, consultados em ${fmtDate(res.stale.fetchedAt)}) — não representam condições atuais.` : "Não há dados armazenados."}</Notice></div>}
      {res?.ok && <p className="mb-4 text-xs text-muted-foreground">Consultado em {fmtDate(res.fetchedAt)} · válido até {fmtDate(res.validUntil)} {res.fromCache && "(cache)"}</p>}
      {p && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Temperatura atual (prevista)" value={na(p.current?.temperature_2m, 1, " °C")} />
          <Stat label="Precipitação atual" value={na(p.current?.precipitation, 1, " mm")} hint="Estimativa do modelo, não medição" />
          <Stat label="Acumulado previsto 24 h" value={`${fmt(acc(24), 1)} mm`} />
          <Stat label="Acumulado previsto 72 h" value={`${fmt(acc(72), 1)} mm`} />
          <Stat label="Prob. máx. de chuva hoje" value={na(daily[0]?.prob, 0, " %")} hint="Probabilidade ≠ volume" />
        </div>
        <section className="mt-6 rounded-md border bg-card p-4"><h2 className="mb-3 font-semibold">Chuva prevista por hora (mm) e probabilidade (%)</h2>
          <div className="h-64"><ResponsiveContainer><ComposedChart data={hourly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="h" fontSize={10} interval={11} /><YAxis yAxisId="mm" fontSize={10} /><YAxis yAxisId="p" orientation="right" domain={[0, 100]} fontSize={10} /><Tooltip />
            <Bar yAxisId="mm" dataKey="mm" name="Precipitação (mm)" fill="var(--water)" /><Line yAxisId="p" dataKey="prob" name="Probabilidade (%)" stroke="var(--primary)" dot={false} /></ComposedChart></ResponsiveContainer></div></section>
        <section className="mt-6 rounded-md border bg-card p-4"><h2 className="mb-3 font-semibold">Previsão diária</h2>
          <div className="h-48"><ResponsiveContainer><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="mm" name="Precipitação (mm)" fill="var(--water)" /></BarChart></ResponsiveContainer></div>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th>Dia</th><th>Chuva (mm)</th><th>Prob. (%)</th><th>Mín/Máx (°C)</th></tr></thead>
            <tbody>{daily.map((d) => <tr key={d.d} className="border-t"><td className="py-1">{d.d}</td><td className="num">{na(d.mm)}</td><td className="num">{na(d.prob, 0)}</td><td className="num">{fmt(d.tmin, 0)} / {fmt(d.tmax, 0)}</td></tr>)}</tbody></table></div></section>
      </>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-card p-4 text-sm"><h3 className="font-semibold">Avisos oficiais</h3><p className="mt-1 text-muted-foreground">INMET, CEMADEN e Defesa Civil — <b>Integração pendente</b>. Nenhum aviso oficial é exibido até a integração ser configurada e validada.</p></div>
        <div className="rounded-md border bg-card p-4 text-sm"><h3 className="font-semibold">Risco de alagamento</h3><p className="mt-1 text-muted-foreground"><b>Risco não calculável com os dados disponíveis.</b> Faltam: critérios de risco aprovados pela equipe técnica, chuva observada (pluviômetros), níveis do Rio Pomba e capacidade da rede.</p></div>
      </div>
    </>
  );
}
