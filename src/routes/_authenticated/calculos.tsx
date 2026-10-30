import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Notice, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  computeSlope,
  validateSlope,
  evaluateManningDiagnostics,
  rationalFlow,
  kirpichTcMinutes,
  METHOD_VERSIONS,
} from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/calculos")({
  head: () => ({ meta: [{ title: "Cálculos hidráulicos — Drenagem Inteligente Pádua" }, { name: "description", content: "Calculadoras verificáveis de declividade, Manning, Kirpich e método racional." }] }),
  component: Page,
});

function F({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return <div><Label className="text-xs">{label}</Label><Input type="number" step="any" value={v} onChange={(e) => set(e.target.value)} /></div>;
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex justify-between border-b py-1 text-sm"><span>{k}</span><span className="num">{v}</span></div>; }

function Page() {
  const { can } = useAuth();
  const [links, setLinks] = useState<Tables<"drainage_links">[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [s, setS] = useState({ up: "", down: "", len: "", src: "" });
  const [m, setM] = useState({ d: "", slope: "", n: "0.013", y: "0.80", q: "", len: "", kLoss: "0.5" });
  const [r, setR] = useState({ c: "", i: "", a: "", lKm: "", dhM: "" });
  const [hist, setHist] = useState<{ id: string; calc_type: string; method_version: string; link_id: string | null; inputs: unknown; outputs: unknown; created_at: string }[]>([]);

  const loadHist = async () => {
    const [h, lk] = await Promise.all([
      supabase.from("calculation_runs").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("drainage_links").select("*").is("deleted_at", null).order("code"),
    ]);
    setHist(h.data ?? []);
    setLinks(lk.data ?? []);
  };
  useEffect(() => { loadHist(); }, []);

  const save = async (calc_type: string, method_version: string, inputs: object, outputs: object, link_id?: string | null) => {
    const { error } = await supabase.from("calculation_runs").insert({
      calc_type,
      method_version,
      inputs: inputs as never,
      outputs: outputs as never,
      link_id: link_id || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Cálculo registrado com entradas e versão do método.");
      loadHist();
    }
  };

  const applyLinkToManning = (linkId: string) => {
    setSelectedLinkId(linkId);
    const lk = links.find((x) => x.id === linkId);
    if (!lk) return;
    let slopePct = m.slope;
    if (lk.upstream_invert_m != null && lk.downstream_invert_m != null && lk.length_m && Number(lk.length_m) > 0) {
      try {
        const sr = computeSlope({
          upstreamElev: Number(lk.upstream_invert_m),
          downstreamElev: Number(lk.downstream_invert_m),
          horizontalLength: Number(lk.length_m),
        });
        if (sr.slopePercent > 0) slopePct = sr.slopePercent.toFixed(4);
      } catch { /* ignore */ }
    }
    setM({
      ...m,
      d: lk.diameter_mm != null ? String(lk.diameter_mm) : m.d,
      slope: slopePct,
      n: lk.manning_n != null ? String(lk.manning_n) : m.n,
      len: lk.length_m != null ? String(lk.length_m) : m.len,
    });
  };

  const sIn = { upstreamElev: s.up === "" ? NaN : +s.up, downstreamElev: s.down === "" ? NaN : +s.down, horizontalLength: s.len === "" ? NaN : +s.len };
  const sErr = validateSlope(sIn);
  const sRes = sErr.length ? null : computeSlope(sIn);

  let mRes: ReturnType<typeof evaluateManningDiagnostics> | null = null, mErr = "";
  try {
    if (m.d && m.slope) {
      mRes = evaluateManningDiagnostics({
        diameterM: +m.d / 1000,
        slope: +m.slope / 100,
        n: +m.n,
        fillRatio: +m.y,
        lengthM: m.len ? +m.len : undefined,
        localLossK: m.kLoss ? +m.kLoss : undefined,
        designFlowM3s: m.q ? +m.q : undefined,
      });
    }
  } catch (e) { mErr = (e as Error).message; }

  let rRes: number | null = null, rErr = "";
  try { if (r.c && r.i && r.a) rRes = rationalFlow(+r.c, +r.i, +r.a); } catch (e) { rErr = (e as Error).message; }

  let tcRes: number | null = null, tcErr = "";
  try { if (r.lKm && r.dhM) tcRes = kirpichTcMinutes(+r.lKm, +r.dhM); } catch (e) { tcErr = (e as Error).message; }

  return (
    <>
      <PageHeader title="Cálculos hidráulicos e hidrológicos" description="Cálculos determinísticos com fórmulas, entradas e unidades visíveis. Resultados são preliminares e dependem de verificação do engenheiro responsável." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Declividade e geometria</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">I = (Ci − Cf) / L × 100 · θ = arctan((Ci − Cf)/L)</p>
          <div className="grid grid-cols-2 gap-2">
            <F label="Cota inicial Ci (m)" v={s.up} set={(x) => setS({ ...s, up: x })} />
            <F label="Cota final Cf (m)" v={s.down} set={(x) => setS({ ...s, down: x })} />
            <F label="Comprimento horizontal L (m)" v={s.len} set={(x) => setS({ ...s, len: x })} />
            <div><Label className="text-xs">Fonte das cotas</Label><Input value={s.src} onChange={(e) => setS({ ...s, src: e.target.value })} placeholder="ex.: nivelamento geométrico" /></div>
          </div>
          {sRes ? (
            <div className="mt-3">
              <Row k="Δh (m)" v={fmt(sRes.deltaH, 3)} />
              <Row k="Declividade (%)" v={fmt(sRes.slopePercent, 4)} />
              <Row k="Ângulo (°)" v={fmt(sRes.angleDeg, 4)} />
              <Row k="Sentido geométrico" v={sRes.direction} />
              {!s.src && <p className="mt-2 text-xs text-destructive">Cotas sem fonte/referência informada.</p>}
              {can.edit && <Button size="sm" className="mt-3" onClick={() => save("declividade", METHOD_VERSIONS.slope, { ...sIn, source: s.src }, sRes)}>Registrar cálculo</Button>}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{sErr.join(" ")}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Ângulo geométrico não garante escoamento hidráulico adequado.</p>
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Manning — seção circular e perdas</h2>
          <p className="mb-2 font-mono text-xs text-muted-foreground">V = (1/n)·R^(2/3)·S^(1/2) · Q = V·A · hL = K·V²/(2g)</p>
          <div className="mb-2">
            <Label className="text-xs">Vincular trecho da rede (opcional)</Label>
            <select className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={selectedLinkId} onChange={(e) => applyLinkToManning(e.target.value)}>
              <option value="">Cálculo avulso (sem trecho vinculado)</option>
              {links.map((lk) => (
                <option key={lk.id} value={lk.id}>{lk.code} (DN {lk.diameter_mm ?? "?"} mm · L {lk.length_m ?? "?"} m)</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="Diâmetro interno (mm)" v={m.d} set={(x) => setM({ ...m, d: x })} />
            <F label="Declividade (%)" v={m.slope} set={(x) => setM({ ...m, slope: x })} />
            <F label="n de Manning" v={m.n} set={(x) => setM({ ...m, n: x })} />
            <F label="Lâmina y/D (0–1)" v={m.y} set={(x) => setM({ ...m, y: x })} />
            <F label="Comprimento L (m)" v={m.len} set={(x) => setM({ ...m, len: x })} />
            <F label="Coef. perda local K" v={m.kLoss} set={(x) => setM({ ...m, kLoss: x })} />
            <div className="col-span-2"><F label="Vazão de projeto Qproj (m³/s)" v={m.q} set={(x) => setM({ ...m, q: x })} /></div>
          </div>
          {mRes ? (
            <div className="mt-3">
              <Row k="Área molhada (m²)" v={fmt(mRes.area, 4)} />
              <Row k="Raio hidráulico (m)" v={fmt(mRes.hydraulicRadius, 4)} />
              <Row k="Velocidade (m/s)" v={fmt(mRes.velocity, 3)} />
              <Row k="Vazão capacidade (m³/s)" v={fmt(mRes.flow, 4)} />
              <Row k="Número de Froude (Fr)" v={mRes.flowRegime === "conduto_pleno" ? "Pleno" : `${fmt(mRes.froude, 2)} (${mRes.flowRegime})`} />
              <Row k="Perda de carga total (m)" v={`${fmt(mRes.totalHeadLossM, 3)} (cont.: ${fmt(mRes.frictionHeadLossM, 3)} + loc.: ${fmt(mRes.localHeadLossM, 3)})`} />
              {mRes.capacityRatio != null && <Row k="Razão Qprojeto / Qcalculada" v={fmt(mRes.capacityRatio, 3)} />}
              {mRes.warnings.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-xs text-destructive">
                  {mRes.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
              {can.edit && (
                <Button size="sm" className="mt-3" onClick={() => save("manning_circular", METHOD_VERSIONS.manningDiagnostics, m, mRes!, selectedLinkId || null)}>
                  Registrar cálculo
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{mErr || "Informe diâmetro e declividade."}</p>
          )}
        </section>

        <section className="rounded-md border bg-card p-4">
          <h2 className="font-semibold">Método racional e Kirpich</h2>
          <p className="mb-3 font-mono text-xs text-muted-foreground">tc = 57·(L³/Δh)^0,385 · Q = C·i·A / 360</p>
          <div className="grid grid-cols-2 gap-2">
            <F label="Talvegue L (km)" v={r.lKm} set={(x) => setR({ ...r, lKm: x })} />
            <F label="Desnível Δh (m)" v={r.dhM} set={(x) => setR({ ...r, dhM: x })} />
            <F label="Coeficiente C (0–1)" v={r.c} set={(x) => setR({ ...r, c: x })} />
            <F label="Intensidade i (mm/h)" v={r.i} set={(x) => setR({ ...r, i: x })} />
            <div className="col-span-2"><F label="Área de contribuição A (ha)" v={r.a} set={(x) => setR({ ...r, a: x })} /></div>
          </div>
          {tcRes != null && (
            <div className="mt-3">
              <Row k="Tempo de concentração tc (min)" v={fmt(tcRes, 2)} />
            </div>
          )}
          {tcErr && <p className="mt-1 text-xs text-destructive">{tcErr}</p>}
          {rRes != null ? (
            <div className="mt-2">
              <Row k="Vazão de pico Q (m³/s)" v={fmt(rRes, 4)} />
              {can.edit && (
                <Button size="sm" className="mt-3" onClick={() => save("racional", METHOD_VERSIONS.rational, r, { flow: rRes, tc_min: tcRes })}>
                  Registrar cálculo
                </Button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{rErr || "Informe C, i e A para calcular a vazão de pico."}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">A intensidade deve vir de curva IDF aceita pelo responsável técnico. O sistema não inventa curvas IDF.</p>
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
