import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, QualityBadge, Empty, Notice, fmt, QUALITY_LABEL } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kirpichTcMinutes, rationalFlow, METHOD_VERSIONS } from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/bacias")({
  head: () => ({
    meta: [
      { title: "Bacias e hidrologia — Drenagem Inteligente Pádua" },
      { name: "description", content: "Cadastro de bacias e sub-bacias hidrográficas, tempo de concentração e vazão de projeto." },
    ],
  }),
  component: Page,
});

const empty = {
  code: "",
  name: "",
  parent_id: "",
  area_km2: "",
  main_length_km: "",
  delta_h_m: "",
  runoff_c: "0.65",
  curve_number: "80",
  outlet_description: "",
  source: "",
  data_quality: "pendente_validacao",
  notes: "",
};

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"basins">[]>([]);
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const [intensity, setIntensity] = useState("110");
  const [returnPeriod, setReturnPeriod] = useState("10");

  const load = async () => {
    const { data, error } = await supabase.from("basins").select("*").is("deleted_at", null).order("code");
    if (error) toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const cVal = num(f.runoff_c);
    if (cVal != null && (cVal <= 0 || cVal > 1)) {
      toast.error("Coeficiente de escoamento superficial C deve estar entre 0 e 1.");
      return;
    }
    const { error } = await supabase.from("basins").insert({
      code: f.code,
      name: f.name,
      parent_id: f.parent_id || null,
      area_km2: num(f.area_km2),
      main_length_km: num(f.main_length_km),
      delta_h_m: num(f.delta_h_m),
      runoff_c: cVal,
      curve_number: num(f.curve_number),
      outlet_description: f.outlet_description || null,
      source: f.source || null,
      data_quality: f.data_quality as never,
      notes: f.notes || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bacia / sub-bacia cadastrada.");
    setF(empty);
    setOpen(false);
    load();
  };

  const recordHydrologicalRun = async (b: Tables<"basins">, tcMin: number | null, qM3s: number) => {
    const inputs = {
      basin_code: b.code,
      area_ha: Number(b.area_km2) * 100,
      runoff_c: Number(b.runoff_c),
      intensity_mm_h: Number(intensity),
      return_period_years: Number(returnPeriod),
      main_length_km: b.main_length_km,
      delta_h_m: b.delta_h_m,
    };
    const outputs = { tc_kirpich_min: tcMin, peak_flow_m3s: qM3s };
    const { error } = await supabase.from("calculation_runs").insert({
      calc_type: "hidrologia_bacia",
      method_version: `${METHOD_VERSIONS.rational}+${METHOD_VERSIONS.kirpichTc}`,
      inputs: inputs as never,
      outputs: outputs as never,
      notes: `Bacia ${b.code} (${b.name}) — TR=${returnPeriod} anos`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Memória de cálculo da bacia ${b.code} registrada.`);
  };

  return (
    <>
      <PageHeader
        title="Bacias hidrográficas e hidrologia"
        description="Caracterização morfométrica de bacias e sub-bacias urbanas, estimativa de tempo de concentração (Kirpich) e vazão de pico pelo Método Racional."
        actions={can.edit && <Button onClick={() => setOpen(!open)}>{open ? "Fechar" : "Nova bacia / sub-bacia"}</Button>}
      />

      <div className="mb-4">
        <Notice>
          O sistema não inventa curvas IDF nem parâmetros de infiltração. A intensidade de chuva (mm/h) e o período de retorno (TR) devem ser informados pelo engenheiro responsável com base em estudo pluviométrico aplicável à região.
        </Notice>
      </div>

      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">Cadastrar bacia ou sub-bacia de contribuição</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Código *</Label>
              <Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="ex.: BAC-01" />
            </div>
            <div>
              <Label className="text-xs">Nome da bacia *</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex.: Córrego Cidade Nova" />
            </div>
            <div>
              <Label className="text-xs">Bacia principal (se sub-bacia)</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.parent_id} onChange={(e) => setF({ ...f, parent_id: e.target.value })}>
                <option value="">Bacia principal</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Exutório / ponto de descarga</Label>
              <Input value={f.outlet_description} onChange={(e) => setF({ ...f, outlet_description: e.target.value })} placeholder="ex.: Rio Pomba — margem direita" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <Label className="text-xs">Área de contribuição (km²)</Label>
              <Input type="number" step="any" value={f.area_km2} onChange={(e) => setF({ ...f, area_km2: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Comprimento talvegue L (km)</Label>
              <Input type="number" step="any" value={f.main_length_km} onChange={(e) => setF({ ...f, main_length_km: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Desnível Δh (m)</Label>
              <Input type="number" step="any" value={f.delta_h_m} onChange={(e) => setF({ ...f, delta_h_m: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Coeficiente de runoff C (0–1)</Label>
              <Input type="number" step="any" value={f.runoff_c} onChange={(e) => setF({ ...f, runoff_c: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Curve Number (CN SCS)</Label>
              <Input type="number" step="any" value={f.curve_number} onChange={(e) => setF({ ...f, curve_number: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Fonte da delimitação</Label>
              <Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="ex.: Levantamento planialtimétrico / MDE" />
            </div>
            <div>
              <Label className="text-xs">Qualidade do dado</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.data_quality} onChange={(e) => setF({ ...f, data_quality: e.target.value })}>
                {Object.entries(QUALITY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </div>
          </div>

          <Button type="submit">Salvar bacia</Button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-md border bg-card p-3">
        <div>
          <Label className="text-xs">Intensidade de projeto i (mm/h) para simulação racional</Label>
          <Input type="number" step="any" className="w-44" value={intensity} onChange={(e) => setIntensity(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Período de retorno TR (anos)</Label>
          <Input type="number" step="1" className="w-36" value={returnPeriod} onChange={(e) => setReturnPeriod(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Fórmulas: <span className="font-mono">tc = 57 · (L³ / Δh)^0,385</span> (Kirpich, min) · <span className="font-mono">Q = C · i · A_ha / 360</span> (m³/s)
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty>Nenhuma bacia cadastrada.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Código</th>
                <th>Nome</th>
                <th>Área (km² / ha)</th>
                <th>L (km)</th>
                <th>Δh (m)</th>
                <th>tc Kirpich (min)</th>
                <th>C</th>
                <th>Q pico (m³/s)</th>
                <th>Qualidade</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                let tc: number | null = null;
                let q: number | null = null;
                try {
                  if (b.main_length_km && b.delta_h_m) tc = kirpichTcMinutes(Number(b.main_length_km), Number(b.delta_h_m));
                } catch { /* ignore */ }
                try {
                  if (b.runoff_c && b.area_km2 && +intensity > 0) q = rationalFlow(Number(b.runoff_c), +intensity, Number(b.area_km2) * 100);
                } catch { /* ignore */ }
                const missing = !b.area_km2 || !b.runoff_c;
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-2 font-medium">{b.code}</td>
                    <td>{b.name}</td>
                    <td className="num">{b.area_km2 != null ? `${fmt(Number(b.area_km2), 3)} (${fmt(Number(b.area_km2) * 100, 1)} ha)` : "—"}</td>
                    <td className="num">{fmt(b.main_length_km as number, 2)}</td>
                    <td className="num">{fmt(b.delta_h_m as number, 1)}</td>
                    <td className="num">{fmt(tc, 1)}</td>
                    <td className="num">{fmt(b.runoff_c as number, 2)}</td>
                    <td className="num">
                      {q != null ? (
                        <span className="font-medium">{fmt(q, 3)}</span>
                      ) : (
                        <span className="text-xs text-destructive">{missing ? "Parâmetros insuficientes" : "—"}</span>
                      )}
                    </td>
                    <td><QualityBadge q={b.data_quality} /></td>
                    <td>
                      {can.edit && q != null && (
                        <Button size="sm" variant="ghost" onClick={() => recordHydrologicalRun(b, tc, q!)}>
                          Registrar cálculo
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

