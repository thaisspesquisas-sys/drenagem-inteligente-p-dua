import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, QualityBadge, Empty, fmtDate, QUALITY_LABEL } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/alagamentos")({
  head: () => ({ meta: [{ title: "Pontos de alagamento — Drenagem Inteligente Pádua" }, { name: "description", content: "Cadastro de ocorrências de alagamento." }] }),
  component: Page,
});

const STATUS: Record<string, string> = { nao_vistoriado: "Não vistoriado", vistoria_agendada: "Vistoria agendada", em_investigacao: "Em investigação", diagnosticado: "Diagnosticado" };
const empty = { code: "", address: "", neighborhood: "", latitude: "", longitude: "", coord_method: "GPS de celular", occurred_at: "", water_depth_m: "", duration_min: "", observed_rain_mm: "", river_condition: "", obstructions: "", damages: "", cause_hypothesis: "", data_quality: "pendente_validacao", diagnosis_status: "nao_vistoriado", notes: "" };

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"flood_events">[]>([]);
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [print, setPrint] = useState<Tables<"flood_events"> | null>(null);
  const load = async () => {
    const { data, error } = await supabase.from("flood_events").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(error.message); setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = num(f.latitude), lon = num(f.longitude);
    if (lat != null && (lat < -22.5 || lat > -20.5 || lon == null || lon < -43 || lon > -41.5)) { toast.error("Coordenadas fora da região de Santo Antônio de Pádua (SIRGAS 2000, graus decimais)."); return; }
    const { error } = await supabase.from("flood_events").insert({
      code: f.code, address: f.address || null, neighborhood: f.neighborhood || null, latitude: lat, longitude: lon,
      coord_method: f.coord_method, occurred_at: f.occurred_at ? new Date(f.occurred_at).toISOString() : null,
      water_depth_m: num(f.water_depth_m), duration_min: num(f.duration_min), observed_rain_mm: num(f.observed_rain_mm),
      river_condition: f.river_condition || null, obstructions: f.obstructions || null, damages: f.damages || null,
      cause_hypothesis: f.cause_hypothesis || null, data_quality: f.data_quality as never, diagnosis_status: f.diagnosis_status, notes: f.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Ocorrência registrada."); setF(empty); setOpen(false); load();
  };
  const field = (k: keyof typeof empty, label: string, type = "text", step?: string) => (
    <div><Label className="text-xs">{label}</Label><Input type={type} step={step} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={k === "code"} /></div>
  );
  const shown = rows.filter((r) => !q || [r.code, r.address, r.neighborhood].join(" ").toLowerCase().includes(q.toLowerCase()));

  if (print) return (
    <div>
      <div className="no-print mb-4 flex gap-2"><Button onClick={() => window.print()}>Imprimir</Button><Button variant="outline" onClick={() => setPrint(null)}>Voltar</Button></div>
      <div className="rounded border bg-card p-6 text-sm">
        <p className="mb-2 font-bold text-destructive">ESTUDO PRELIMINAR — NÃO UTILIZAR COMO PROJETO EXECUTIVO</p>
        <h1 className="text-xl font-semibold">Ficha de vistoria — {print.code}</h1>
        <p className="text-muted-foreground">Gerada em {new Date().toLocaleString("pt-BR")}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2">
          {[["Endereço", print.address], ["Bairro", print.neighborhood], ["Coordenadas (SIRGAS 2000)", print.latitude != null ? `${print.latitude}, ${print.longitude}` : "—"], ["Método da coordenada", print.coord_method], ["Data do evento", fmtDate(print.occurred_at)], ["Profundidade observada (m)", print.water_depth_m], ["Duração (min)", print.duration_min], ["Obstruções", print.obstructions], ["Hipótese de causa (não confirmada)", print.cause_hypothesis], ["Qualidade do dado", QUALITY_LABEL[print.data_quality]]].map(([k, v]) => (
            <div key={String(k)} className="border-b py-1"><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v ?? "—"}</dd></div>))}
        </dl>
        <div className="mt-6 grid grid-cols-2 gap-6">{["Observações de campo", "Medições realizadas", "Vistoriador / data", "Assinatura"].map((s) => <div key={s} className="h-24 border p-2 text-xs text-muted-foreground">{s}</div>)}</div>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Pontos de alagamento" description="A causa permanece como hipótese até confirmação por investigação técnica."
        actions={can.edit && <Button onClick={() => setOpen(!open)}>{open ? "Fechar" : "Nova ocorrência"}</Button>} />
      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">1. Identificação e localização</h3>
          <div className="grid gap-3 md:grid-cols-3">{field("code", "Código único *")}{field("address", "Endereço")}{field("neighborhood", "Bairro / localidade")}
            {field("latitude", "Latitude (°, SIRGAS 2000)", "number", "any")}{field("longitude", "Longitude (°, SIRGAS 2000)", "number", "any")}
            <div><Label className="text-xs">Método da coordenada</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.coord_method} onChange={(e) => setF({ ...f, coord_method: e.target.value })}>{["GPS de celular", "GNSS de precisão", "Estação total", "Leitura em mapa"].map((o) => <option key={o}>{o}</option>)}</select></div></div>
          <h3 className="text-sm font-semibold">2. Evento observado</h3>
          <div className="grid gap-3 md:grid-cols-4">{field("occurred_at", "Data e hora", "datetime-local")}{field("water_depth_m", "Profundidade (m)", "number", "any")}{field("duration_min", "Duração (min)", "number", "any")}{field("observed_rain_mm", "Chuva observada (mm)", "number", "any")}</div>
          <div className="grid gap-3 md:grid-cols-3">{field("river_condition", "Condição do Rio Pomba")}{field("obstructions", "Possíveis obstruções")}{field("damages", "Danos observados")}</div>
          <h3 className="text-sm font-semibold">3. Diagnóstico</h3>
          <div className="grid gap-3 md:grid-cols-3">{field("cause_hypothesis", "Hipótese inicial da causa")}
            <div><Label className="text-xs">Qualidade do dado</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.data_quality} onChange={(e) => setF({ ...f, data_quality: e.target.value })}>{Object.entries(QUALITY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><Label className="text-xs">Situação</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.diagnosis_status} onChange={(e) => setF({ ...f, diagnosis_status: e.target.value })}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div></div>
          <div><Label className="text-xs">Observações</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button type="submit">Salvar ocorrência</Button>
        </form>
      )}
      <Input placeholder="Buscar por código, endereço ou bairro" className="mb-3 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 ? <Empty>Nenhuma ocorrência cadastrada.</Empty> : (
        <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Código</th><th>Bairro</th><th>Data</th><th>Prof. (m)</th><th>Situação</th><th>Qualidade</th><th></th></tr></thead>
          <tbody>{shown.map((r) => <tr key={r.id} className="border-t"><td className="p-2 font-medium">{r.code}</td><td>{r.neighborhood ?? "—"}</td><td>{fmtDate(r.occurred_at)}</td><td className="num">{r.water_depth_m ?? "—"}</td><td>{STATUS[r.diagnosis_status] ?? r.diagnosis_status}</td><td><QualityBadge q={r.data_quality} /></td><td><Button size="sm" variant="ghost" onClick={() => setPrint(r)}>Ficha</Button></td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}
