import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Notice, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeSlope, validateSlope, manningCircular, rationalFlow, METHOD_VERSIONS } from "@/lib/hydraulics";

export const Route = createFileRoute("/_authenticated/calculos")({
  head: () => ({ meta: [{ title: "Cálculos hidráulicos — Drenagem Inteligente Pádua" }, { name: "description", content: "Calculadoras verificáveis de declividade, Manning e método racional." }] }),
  component: Page,
});

function F({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input type="number" step="any" value={v} onChange={(e) => set(e.target.value)} /></div>;
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex justify-between border-b py-1 text-sm"><span>{k}</span><span className="num">{v}</span></div>; }

function Page() {
  const { can } = useAuth();
  const [s, setS] = useState({ up: "", down: "", len: "", src: "" });
  const [m, setM] = useState({ d: "", slope: "", n: "0.013", y: "1", q: "" });
  const [r, setR] = useState({ c: "", i: "", a: "" });
  const [hist, setHist] = useState<{ id: string; calc_type: string; method_version: string; inputs: unknown; outputs: unknown; created_at: string }[]>([]);
  const loadHist = async () => { const { data } = await supabase.from("calculation_runs").select("*").order("created_at", { ascending: false }).limit(15); setHist(data ?? []); };
  useEffect(() => { loadHist(); }, []);
  const save = async (calc_type: string, method_version: string, inputs: object, outputs: object) => {
    const { error } = await supabase.from("calculation_runs").insert({ calc_type, method_version, inputs: inputs as never, outputs: outputs as never });
    if (error) toast.error(error.message); else { toast.success("Cálculo registrado com entradas e versão do método."); loadHist(); }
  };

  const sIn = { upstreamElev: s.up === "" ? NaN : +s.up, downstreamElev: s.down === "" ? NaN : +s.down, horizontalLength: s.len === "" ? NaN : +s.len };
  const sErr = validateSlope(sIn); const sRes = sErr.length ? null : computeSlope(sIn);
  let mRes: ReturnType<typeof manningCircular> | null = null, mErr = "";
  try { if (m.d && m.slope) mRes = manningCircular({ diameterM: +m.d / 1000, slope: +m.slope / 100, n: +m.n, fillRatio: +m.y }); } catch (e) { mErr = (e as Error).message; }
  let rRes: number | null = null, rErr = "";
  try { if (r.c && r.i && r.a) rRes = rationalFlow(+r.c, +r.i, +r.a); } catch (e) { rErr = (e as Error).message; }

  return (
    <>
      <PageHeader title="Cálculos hidráulicos" description="Cálculos determinísticos com fórmulas, entradas e unidades visíveis. Resultados são preliminares e dependem de verificação do engenheiro responsável." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Declividade e geometria</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">I = (Ci − Cf) / L × 100 · θ = arctan((Ci − Cf)/L)</p>
          <div className="grid grid-cols-2 gap-2"><F label="Cota inicial Ci (m)" v={s.up} set={(x) => setS({ ...s, up: x })} /><F label="Cota final Cf (m)" v={s.down} set={(x) => setS({ ...s, down: x })} /><F label="Comprimento horizontal L (m)" v={s.len} set={(x) => setS({ ...s, len: x })} />
            <div><Label className="text-xs">Fonte das cotas</Label><Input value={s.src} onChange={(e) => setS({ ...s, src: e.target.value })} placeholder="ex.: nivelamento geométrico" /></div></div>
          {sRes ? <div className="mt-3"><Row k="Δh (m)" v={fmt(sRes.deltaH, 3)} /><Row k="Declividade (%)" v={fmt(sRes.slopePercent, 4)} /><Row k="Ângulo (°)" v={fmt(sRes.angleDeg, 4)} /><Row k="Sentido geométrico" v={sRes.direction} />
            {!s.src && <p className="mt-2 text-xs text-destructive">Cotas sem fonte/referência informada.</p>}
            {can.edit && <Button size="sm" className="mt-3" onClick={() => save("declividade", METHOD_VERSIONS.slope, { ...sIn, source: s.src }, sRes)}>Registrar cálculo</Button>}</div>
            : <p className="mt-3 text-xs text-muted-foreground">{sErr.join(" ")}</p>}
          <p className="mt-3 text-xs text-muted-foreground">Ângulo geométrico não garante escoamento hidráulico adequado.</p>
        </section>
        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Manning — seção circular</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">V = (1/n)·R^(2/3)·S^(1/2) · Q = V·A</p>
          <div className="grid grid-cols-2 gap-2"><F label="Diâmetro interno (mm)" v={m.d} set={(x) => setM({ ...m, d: x })} /><F label="Declividade (%)" v={m.slope} set={(x) => setM({ ...m, slope: x })} /><F label="n de Manning" v={m.n} set={(x) => setM({ ...m, n: x })} /><F label="Lâmina y/D (0–1)" v={m.y} set={(x) => setM({ ...m, y: x })} /><F label="Vazão de projeto (m³/s)" v={m.q} set={(x) => setM({ ...m, q: x })} /></div>
          {mRes ? <div className="mt-3"><Row k="Área molhada (m²)" v={fmt(mRes.area, 4)} /><Row k="Perímetro molhado (m)" v={fmt(mRes.wettedPerimeter, 4)} /><Row k="Raio hidráulico (m)" v={fmt(mRes.hydraulicRadius, 4)} /><Row k="Velocidade (m/s)" v={fmt(mRes.velocity, 3)} /><Row k="Vazão (m³/s)" v={fmt(mRes.flow, 4)} />
            {m.q && <Row k="Razão Qprojeto / Qcalculada" v={fmt(+m.q / mRes.flow, 3)} />}
            {can.edit && <Button size="sm" className="mt-3" onClick={() => save("manning_circular", METHOD_VERSIONS.manningCircular, m, mRes!)}>Registrar cálculo</Button>}</div>
            : <p className="mt-3 text-xs text-muted-foreground">{mErr || "Informe diâmetro e declividade."}</p>}
          <p className="mt-3 text-xs text-muted-foreground">Escoamento uniforme. Não considera controle de entrada/saída, perdas localizadas, afogamento nem nível do rio.</p>
        </section>
        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Método racional</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">Q = C·i·A / 360 (Q m³/s, i mm/h, A ha)</p>
          <div className="grid grid-cols-2 gap-2"><F label="Coeficiente C" v={r.c} set={(x) => setR({ ...r, c: x })} /><F label="Intensidade i (mm/h)" v={r.i} set={(x) => setR({ ...r, i: x })} /><F label="Área A (ha)" v={r.a} set={(x) => setR({ ...r, a: x })} /></div>
          {rRes != null ? <div className="mt-3"><Row k="Vazão de pico (m³/s)" v={fmt(rRes, 4)} />{can.edit && <Button size="sm" className="mt-3" onClick={() => save("racional", METHOD_VERSIONS.rational, r, { flow: rRes })}>Registrar cálculo</Button>}</div>
            : <p className="mt-3 text-xs text-muted-foreground">{rErr || "Informe C, i e A."}</p>}
          <p className="mt-3 text-xs text-muted-foreground">A intensidade deve vir de curva IDF aceita pelo responsável técnico. O sistema não fornece curvas IDF.</p>
        </section>
      </div>
      <div className="mt-6"><Notice>Nenhum resultado desta tela é dimensionamento definitivo. Alternativas não são aprovadas automaticamente.</Notice></div>
      <h2 className="mb-2 mt-6 font-semibold">Histórico de cálculos (reproduzíveis)</h2>
      <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-xs">
        <thead className="bg-muted text-left uppercase text-muted-foreground"><tr><th className="p-2">Data</th><th>Tipo</th><th>Método</th><th>Entradas</th><th>Resultados</th></tr></thead>
        <tbody>{hist.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum cálculo registrado.</td></tr> : hist.map((h) => <tr key={h.id} className="border-t align-top"><td className="p-2">{fmtDate(h.created_at)}</td><td>{h.calc_type}</td><td>{h.method_version}</td><td className="num max-w-xs break-all">{JSON.stringify(h.inputs)}</td><td className="num max-w-xs break-all">{JSON.stringify(h.outputs)}</td></tr>)}</tbody></table></div>
    </>
  );
}
