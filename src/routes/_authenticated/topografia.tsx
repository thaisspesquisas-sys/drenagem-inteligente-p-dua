import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, QualityBadge, Empty, Notice, fmt, QUALITY_LABEL } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { computeSlope } from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/topografia")({
  head: () => ({
    meta: [
      { title: "Relevo e topografia — Drenagem Inteligente Pádua" },
      { name: "description", content: "Levantamentos topográficos, referências altimétricas e perfis longitudinais." },
    ],
  }),
  component: Page,
});

export type SurveyPoint = {
  dist_m: number;
  terrain_elev_m: number;
  invert_elev_m?: number | null;
  water_elev_m?: number | null;
  label?: string;
};

const EQUIPMENTS = [
  ["Estação total", "Estação total (precisão milimétrica)"],
  ["GNSS RTK/Pós-processado", "GNSS de precisão (RTK / pós-processado)"],
  ["Nivelamento geométrico", "Nivelamento geométrico"],
  ["MDE / TOPODATA", "Modelo Digital de Elevação (TOPODATA ~30m — preliminar)"],
  ["GPS comum de celular", "GPS comum de celular (inadequado para cotas de galeria)"],
];

function parsePointsCsv(raw: string): SurveyPoint[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.toLowerCase().startsWith("dist"));
  const pts: SurveyPoint[] = [];
  for (const line of lines) {
    const parts = line.split(/[;,]/).map((s) => s.trim());
    if (parts.length < 2) continue;
    const dist_m = Number(parts[0]);
    const terrain_elev_m = Number(parts[1]);
    if (!Number.isFinite(dist_m) || !Number.isFinite(terrain_elev_m)) continue;
    const invert_elev_m = parts[2] !== undefined && parts[2] !== "" ? Number(parts[2]) : null;
    const water_elev_m = parts[3] !== undefined && parts[3] !== "" ? Number(parts[3]) : null;
    const label = parts[4] || `Est. ${dist_m}m`;
    pts.push({ dist_m, terrain_elev_m, invert_elev_m, water_elev_m, label });
  }
  return pts.sort((a, b) => a.dist_m - b.dist_m);
}

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"topo_surveys">[]>([]);
  const [links, setLinks] = useState<Tables<"drainage_links">[]>([]);
  const [nodes, setNodes] = useState<Tables<"drainage_nodes">[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedLinkId, setSelectedLinkId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: "",
    surveyed_at: "",
    equipment: "Estação total",
    vertical_datum: "Imbituba (SGB/IBGE)",
    crs: "SIRGAS 2000 / UTM 23S",
    responsible: "",
    declared_accuracy: "±0.01 m",
    data_quality: "confirmado_levantamento",
    csvPoints: "0, 96.50, 94.80, 95.10, PV-01\n25, 96.20, 94.55, 94.85, Est-25m\n50, 95.90, 94.30, 94.60, PV-02",
    notes: "",
  });

  const load = async () => {
    const [ts, lk, nd] = await Promise.all([
      supabase.from("topo_surveys").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("drainage_links").select("*").is("deleted_at", null).order("code"),
      supabase.from("drainage_nodes").select("*").is("deleted_at", null),
    ]);
    if (ts.error) toast.error(ts.error.message);
    const list = ts.data ?? [];
    setRows(list);
    setLinks(lk.data ?? []);
    setNodes(nd.data ?? []);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
  };

  useEffect(() => {
    load();
  }, []);

  const isLowPrecision = f.equipment.includes("MDE") || f.equipment.includes("GPS comum");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.vertical_datum.trim()) {
      toast.error("A referência altimétrica (datum vertical) é obrigatória.");
      return;
    }
    const pts = parsePointsCsv(f.csvPoints);
    if (pts.length < 2) {
      toast.error("Informe ao menos 2 pontos válidos (distância, cota_terreno[, cota_fundo, cota_agua, rótulo]).");
      return;
    }
    const quality = isLowPrecision && f.data_quality === "confirmado_levantamento" ? "estimado_modelo" : f.data_quality;
    const { error } = await supabase.from("topo_surveys").insert({
      name: f.name,
      surveyed_at: f.surveyed_at || null,
      equipment: f.equipment,
      vertical_datum: f.vertical_datum,
      crs: f.crs,
      responsible: f.responsible || null,
      declared_accuracy: f.declared_accuracy || null,
      points: pts as never,
      notes: f.notes || null,
      data_quality: quality as never,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Levantamento topográfico cadastrado.");
    setOpen(false);
    load();
  };

  const selectedSurvey = rows.find((r) => r.id === selectedId);
  const surveyPoints: SurveyPoint[] = Array.isArray(selectedSurvey?.points) ? (selectedSurvey.points as unknown as SurveyPoint[]) : [];
  const surveySlope =
    surveyPoints.length >= 2 && surveyPoints[surveyPoints.length - 1].dist_m > surveyPoints[0].dist_m
      ? computeSlope({
          upstreamElev: surveyPoints[0].invert_elev_m ?? surveyPoints[0].terrain_elev_m,
          downstreamElev: surveyPoints[surveyPoints.length - 1].invert_elev_m ?? surveyPoints[surveyPoints.length - 1].terrain_elev_m,
          horizontalLength: surveyPoints[surveyPoints.length - 1].dist_m - surveyPoints[0].dist_m,
        })
      : null;

  const selectedLink = links.find((l) => l.id === selectedLinkId);
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const linkProfileData = (() => {
    if (!selectedLink || selectedLink.upstream_invert_m == null || selectedLink.downstream_invert_m == null || !selectedLink.length_m) return [];
    const upNode = selectedLink.from_node ? nodeById.get(selectedLink.from_node) : undefined;
    const downNode = selectedLink.to_node ? nodeById.get(selectedLink.to_node) : undefined;
    const D = (Number(selectedLink.diameter_mm) || 0) / 1000;
    return [
      {
        dist_m: 0,
        label: upNode?.code ?? "Montante",
        terrain_elev_m: upNode?.cover_elev_m != null ? Number(upNode.cover_elev_m) : null,
        invert_elev_m: Number(selectedLink.upstream_invert_m),
        crown_elev_m: D > 0 ? Number(selectedLink.upstream_invert_m) + D : null,
      },
      {
        dist_m: Number(selectedLink.length_m),
        label: downNode?.code ?? "Jusante",
        terrain_elev_m: downNode?.cover_elev_m != null ? Number(downNode.cover_elev_m) : null,
        invert_elev_m: Number(selectedLink.downstream_invert_m),
        crown_elev_m: D > 0 ? Number(selectedLink.downstream_invert_m) + D : null,
      },
    ];
  })();

  return (
    <>
      <PageHeader
        title="Relevo e levantamento topográfico"
        description="Importação de levantamentos de campo, referências altimétricas documentadas e geração de perfis longitudinais do terreno e das tubulações."
        actions={can.edit && <Button onClick={() => setOpen(!open)}>{open ? "Fechar" : "Novo levantamento"}</Button>}
      />

      <div className="mb-4">
        <Notice tone="warning">
          GPS comum de celular não possui precisão altimétrica suficiente para cotas de fundo de galeria. Quando as cotas provierem de Modelo Digital de Elevação (ex.: TOPODATA ~30 m), o resultado é classificado como <b>estimativa preliminar</b>.
        </Notice>
      </div>

      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">Cadastrar levantamento topográfico / perfil longitudinal</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Nome / Identificação *</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex.: Eixo Rua dos Leites — Trecho A" />
            </div>
            <div>
              <Label className="text-xs">Data do levantamento</Label>
              <Input type="date" value={f.surveyed_at} onChange={(e) => setF({ ...f, surveyed_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Método / equipamento *</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })}>
                {EQUIPMENTS.map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Referência altimétrica (Datum) *</Label>
              <Input required value={f.vertical_datum} onChange={(e) => setF({ ...f, vertical_datum: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Sistema de coordenadas (CRS)</Label>
              <Input value={f.crs} onChange={(e) => setF({ ...f, crs: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Precisão declarada</Label>
              <Input value={f.declared_accuracy} onChange={(e) => setF({ ...f, declared_accuracy: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Responsável técnico</Label>
              <Input value={f.responsible} onChange={(e) => setF({ ...f, responsible: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Qualidade do dado</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.data_quality} onChange={(e) => setF({ ...f, data_quality: e.target.value })}>
                {Object.entries(QUALITY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {isLowPrecision && (
            <Notice>
              Atenção: O método selecionado ({f.equipment}) fornece apenas estimativa preliminar e não deve ser usado para projeto executivo de galerias.
            </Notice>
          )}

          <div>
            <Label className="text-xs">Pontos do perfil longitudinal (CSV: dist_m, cota_terreno_m, cota_fundo_m, cota_agua_m, rotulo)</Label>
            <Textarea rows={4} className="font-mono text-xs" value={f.csvPoints} onChange={(e) => setF({ ...f, csvPoints: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <Button type="submit">Salvar levantamento</Button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Perfil longitudinal de levantamento</h2>
            {rows.length > 0 && (
              <select className="h-8 rounded-md border bg-background px-2 text-xs" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.equipment})</option>
                ))}
              </select>
            )}
          </div>
          {!selectedSurvey ? (
            <Empty>Nenhum levantamento cadastrado. Clique em "Novo levantamento" para importar pontos.</Empty>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Datum: <b>{selectedSurvey.vertical_datum ?? "—"}</b></span>
                <span>Equipamento: <b>{selectedSurvey.equipment ?? "—"}</b></span>
                <span>Precisão: <b>{selectedSurvey.declared_accuracy ?? "—"}</b></span>
                {surveySlope && (
                  <span>Δh total: <b>{fmt(surveySlope.deltaH, 3)} m</b> · Declividade média: <b>{fmt(surveySlope.slopePercent, 3)}%</b></span>
                )}
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <ComposedChart data={surveyPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dist_m" unit=" m" fontSize={11} />
                    <YAxis domain={["auto", "auto"]} unit=" m" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="terrain_elev_m" name="Cota do terreno (m)" stroke="var(--foreground)" strokeWidth={2} />
                    <Line type="monotone" dataKey="invert_elev_m" name="Cota de fundo tubulação (m)" stroke="var(--primary)" strokeWidth={2} />
                    <Line type="monotone" dataKey="water_elev_m" name="Nível d'água (m)" stroke="var(--water)" strokeDasharray="4 4" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Perfil longitudinal de trecho cadastrado</h2>
            <select className="h-8 rounded-md border bg-background px-2 text-xs" value={selectedLinkId} onChange={(e) => setSelectedLinkId(e.target.value)}>
              <option value="">Selecione um trecho da rede…</option>
              {links.map((l) => (
                <option key={l.id} value={l.id}>{l.code} (DN {l.diameter_mm ?? "?"} mm · L {l.length_m ?? "?"} m)</option>
              ))}
            </select>
          </div>
          {linkProfileData.length === 0 ? (
            <Empty>Selecione um trecho com cotas de montante/jusante e comprimento para visualizar o perfil da tubulação.</Empty>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={linkProfileData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dist_m" unit=" m" fontSize={11} />
                  <YAxis domain={["auto", "auto"]} unit=" m" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="linear" dataKey="terrain_elev_m" name="Cota tampa/terreno (m)" stroke="var(--foreground)" strokeWidth={2} />
                  <Line type="linear" dataKey="crown_elev_m" name="Geratriz superior (m)" stroke="var(--water)" strokeDasharray="4 4" />
                  <Line type="linear" dataKey="invert_elev_m" name="Cota fundo (m)" stroke="var(--primary)" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Levantamentos registrados</h2>
      {rows.length === 0 ? (
        <Empty>Nenhum levantamento cadastrado.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Nome</th>
                <th>Equipamento</th>
                <th>Datum vertical</th>
                <th>CRS</th>
                <th>Precisão</th>
                <th>Pontos</th>
                <th>Qualidade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td>{r.equipment ?? "—"}</td>
                  <td>{r.vertical_datum ?? "—"}</td>
                  <td>{r.crs ?? "—"}</td>
                  <td>{r.declared_accuracy ?? "—"}</td>
                  <td className="num">{Array.isArray(r.points) ? r.points.length : 0}</td>
                  <td><QualityBadge q={r.data_quality} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

