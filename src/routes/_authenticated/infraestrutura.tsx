import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, QualityBadge, Empty, fmt, Notice, QUALITY_LABEL } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeSlope } from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/infraestrutura")({
  head: () => ({ meta: [{ title: "Infraestrutura de drenagem — Drenagem Inteligente Pádua" }, { name: "description", content: "Cadastro georreferenciado da rede pluvial." }] }),
  component: Page,
});

const NODE_TYPES = ["poço de visita", "caixa coletora", "boca de lobo", "ponto de lançamento", "bueiro", "comporta", "válvula antirretorno", "bomba", "reservatório", "dissipador"];

const emptyNode = { code: "", node_type: "poço de visita", latitude: "", longitude: "", cover_elev_m: "", invert_elev_m: "", vertical_datum: "", elev_method: "", condition: "regular", source: "", data_quality: "pendente_validacao" };
const emptyLink = { code: "", link_type: "pipe", shape: "circular", from_node: "", to_node: "", length_m: "", material: "Concreto", diameter_mm: "", manning_n: "0.013", upstream_invert_m: "", downstream_invert_m: "", vertical_datum: "", elev_method: "", condition: "regular", operational_status: "operacional", data_quality: "pendente_validacao" };

function Page() {
  const { can } = useAuth();
  const [nodes, setNodes] = useState<Tables<"drainage_nodes">[]>([]);
  const [links, setLinks] = useState<Tables<"drainage_links">[]>([]);
  const [n, setN] = useState(emptyNode);
  const [l, setL] = useState(emptyLink);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [editLinkId, setEditLinkId] = useState<string | null>(null);

  const load = async () => {
    const [a, b] = await Promise.all([supabase.from("drainage_nodes").select("*").is("deleted_at", null).order("code"), supabase.from("drainage_links").select("*").is("deleted_at", null).order("code")]);
    setNodes(a.data ?? []); setLinks(b.data ?? []);
  };
  useEffect(() => { load(); }, []);
  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const issues = useMemo(() => {
    const out: string[] = [];
    const connected = new Set(links.flatMap((x) => [x.from_node, x.to_node]));
    nodes.forEach((x) => { if (!connected.has(x.id)) out.push(`Nó ${x.code} sem conexão com trechos.`); if (x.invert_elev_m != null && !x.vertical_datum) out.push(`Nó ${x.code}: cota sem referência altimétrica.`); });
    links.forEach((x) => {
      if (x.upstream_invert_m == null || x.downstream_invert_m == null) out.push(`Trecho ${x.code}: cotas de fundo ausentes.`);
      else if (Number(x.upstream_invert_m) < Number(x.downstream_invert_m)) out.push(`Trecho ${x.code}: cota de montante abaixo da jusante (sentido de fluxo inconsistente).`);
      if (x.length_m == null || Number(x.length_m) <= 0) out.push(`Trecho ${x.code}: comprimento ausente ou inválido.`);
      if (!x.from_node || !x.to_node) out.push(`Trecho ${x.code}: extremidade sem nó (desconectado).`);
    });
    return out;
  }, [nodes, links]);

  const saveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (num(n.invert_elev_m) != null && !n.vertical_datum) { toast.error("Informe a referência altimétrica da cota."); return; }
    const payload = { code: n.code, node_type: n.node_type, latitude: num(n.latitude), longitude: num(n.longitude), cover_elev_m: num(n.cover_elev_m), invert_elev_m: num(n.invert_elev_m), vertical_datum: n.vertical_datum || null, elev_method: n.elev_method || null, condition: n.condition || null, source: n.source || null, data_quality: n.data_quality as never };
    const { error } = editNodeId ? await supabase.from("drainage_nodes").update(payload).eq("id", editNodeId) : await supabase.from("drainage_nodes").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editNodeId ? "Nó atualizado." : "Nó cadastrado."); setN(emptyNode); setEditNodeId(null); load();
  };
  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((num(l.upstream_invert_m) != null || num(l.downstream_invert_m) != null) && !l.vertical_datum) { toast.error("Informe a referência altimétrica das cotas."); return; }
    const payload = { code: l.code, link_type: l.link_type, shape: l.shape, from_node: l.from_node || null, to_node: l.to_node || null, length_m: num(l.length_m), material: l.material || null, diameter_mm: num(l.diameter_mm), manning_n: num(l.manning_n), upstream_invert_m: num(l.upstream_invert_m), downstream_invert_m: num(l.downstream_invert_m), vertical_datum: l.vertical_datum || null, elev_method: l.elev_method || null, condition: l.condition || null, operational_status: l.operational_status || null, data_quality: l.data_quality as never };
    const { error } = editLinkId ? await supabase.from("drainage_links").update(payload).eq("id", editLinkId) : await supabase.from("drainage_links").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editLinkId ? "Trecho atualizado." : "Trecho cadastrado."); setL(emptyLink); setEditLinkId(null); load();
  };

  const softDeleteNode = async (id: string) => {
    const { error } = await supabase.from("drainage_nodes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Nó arquivado."); load(); }
  };
  const softDeleteLink = async (id: string) => {
    const { error } = await supabase.from("drainage_links").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Trecho arquivado."); load(); }
  };

  const inp = <T extends Record<string, string>>(s: T, set: (v: T) => void, k: keyof T & string, label: string, type = "text") => (
    <div><Label className="text-xs">{label}</Label><Input type={type} step="any" value={s[k]} required={k === "code"} onChange={(e) => set({ ...s, [k]: e.target.value })} /></div>);
  const sel = <T extends Record<string, string>>(s: T, set: (v: T) => void, k: keyof T & string, label: string, opts: [string, string][]) => (
    <div><Label className="text-xs">{label}</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={s[k]} onChange={(e) => set({ ...s, [k]: e.target.value })}><option value="">—</option>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>);
  const qOpts = Object.entries(QUALITY_LABEL) as [string, string][];
  const nodeOpts = nodes.map((x) => [x.id, x.code] as [string, string]);

  return (
    <>
      <PageHeader title="Infraestrutura de drenagem" description="Somente estruturas efetivamente verificadas ou documentadas devem ser cadastradas. A rede é tratada como grafo de nós e trechos." />
      {can.edit && <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveNode} className="space-y-3 rounded-md border bg-card p-4"><h3 className="font-semibold">{editNodeId ? "Editar nó" : "Novo nó / dispositivo"}</h3>
          <div className="grid grid-cols-2 gap-2">{inp(n, setN, "code", "Código *")}{sel(n, setN, "node_type", "Tipo", NODE_TYPES.map((t) => [t, t]))}{inp(n, setN, "latitude", "Latitude (°)", "number")}{inp(n, setN, "longitude", "Longitude (°)", "number")}{inp(n, setN, "cover_elev_m", "Cota da tampa (m)", "number")}{inp(n, setN, "invert_elev_m", "Cota de fundo (m)", "number")}{inp(n, setN, "vertical_datum", "Referência altimétrica")}{sel(n, setN, "elev_method", "Método", [["estacao_total", "Estação total"], ["gnss", "GNSS de precisão"], ["nivelamento", "Nivelamento geométrico"], ["mde", "Modelo digital (estimativa)"], ["outro", "Outro documentado"]])}{sel(n, setN, "condition", "Conservação", [["boa", "Boa"], ["regular", "Regular"], ["assoreado", "Assoreado/Obstruído"], ["danificado", "Danificado"]])}{sel(n, setN, "data_quality", "Qualidade", qOpts)}</div>
          <div className="flex gap-2"><Button type="submit">{editNodeId ? "Atualizar nó" : "Salvar nó"}</Button>{editNodeId && <Button type="button" variant="outline" onClick={() => { setEditNodeId(null); setN(emptyNode); }}>Cancelar</Button>}</div></form>
        <form onSubmit={saveLink} className="space-y-3 rounded-md border bg-card p-4"><h3 className="font-semibold">{editLinkId ? "Editar trecho" : "Novo trecho (galeria/manilha/canal)"}</h3>
          <div className="grid grid-cols-2 gap-2">{inp(l, setL, "code", "Código *")}{sel(l, setL, "link_type", "Tipo de conduto", [["pipe", "Galeria / Manilha"], ["culvert", "Bueiro"], ["channel", "Canal aberto"]])}{inp(l, setL, "material", "Material")}{inp(l, setL, "manning_n", "n de Manning", "number")}{sel(l, setL, "from_node", "Nó montante", nodeOpts)}{sel(l, setL, "to_node", "Nó jusante", nodeOpts)}{inp(l, setL, "length_m", "Comprimento horizontal (m)", "number")}{inp(l, setL, "diameter_mm", "Diâmetro interno (mm)", "number")}{inp(l, setL, "upstream_invert_m", "Cota fundo montante (m)", "number")}{inp(l, setL, "downstream_invert_m", "Cota fundo jusante (m)", "number")}{inp(l, setL, "vertical_datum", "Referência altimétrica")}{sel(l, setL, "elev_method", "Método", [["estacao_total", "Estação total"], ["gnss", "GNSS de precisão"], ["nivelamento", "Nivelamento geométrico"], ["mde", "Modelo digital (estimativa)"]])}{sel(l, setL, "operational_status", "Situação operacional", [["operacional", "Operacional"], ["obstruido_parcial", "Obstruído parcialmente"], ["afogado", "Afogado / Sob pressão"], ["inoperante", "Inoperante"]])}{sel(l, setL, "data_quality", "Qualidade", qOpts)}</div>
          <div className="flex gap-2"><Button type="submit">{editLinkId ? "Atualizar trecho" : "Salvar trecho"}</Button>{editLinkId && <Button type="button" variant="outline" onClick={() => { setEditLinkId(null); setL(emptyLink); }}>Cancelar</Button>}</div></form>
      </div>}
      <h2 className="mb-2 font-semibold">Verificação da rede</h2>
      {issues.length === 0 ? <p className="mb-6 text-sm text-muted-foreground">{nodes.length + links.length === 0 ? "Nenhum elemento cadastrado." : "Nenhuma inconsistência detectada."}</p> :
        <div className="mb-6"><Notice><ul className="list-disc pl-4">{issues.map((i) => <li key={i}>{i}</li>)}</ul></Notice></div>}
      <h2 className="mb-2 font-semibold">Trechos</h2>
      {links.length === 0 ? <Empty>Nenhum trecho cadastrado.</Empty> : <div className="mb-6 overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Código</th><th>DN (mm)</th><th>L (m)</th><th>Δh (m)</th><th>Declividade (%)</th><th>Método cota</th><th>Qualidade</th><th></th></tr></thead>
        <tbody>{links.map((x) => { let s: ReturnType<typeof computeSlope> | null = null; try { if (x.upstream_invert_m != null && x.downstream_invert_m != null && x.length_m) s = computeSlope({ upstreamElev: Number(x.upstream_invert_m), downstreamElev: Number(x.downstream_invert_m), horizontalLength: Number(x.length_m) }); } catch { /* invalid */ }
          return <tr key={x.id} className="border-t"><td className="p-2 font-medium">{x.code}</td><td className="num">{x.diameter_mm ?? "—"}</td><td className="num">{fmt(x.length_m as number)}</td><td className="num">{fmt(s?.deltaH, 3)}</td><td className="num">{fmt(s?.slopePercent, 3)}{x.elev_method === "mde" && s ? " (estimativa)" : ""}</td><td>{x.elev_method ?? "—"}</td><td><QualityBadge q={x.data_quality} /></td><td className="flex gap-1 py-1">{can.edit && <><Button size="sm" variant="ghost" onClick={() => { setEditLinkId(x.id); setL({ code: x.code, link_type: x.link_type ?? "pipe", shape: x.shape ?? "circular", from_node: x.from_node ?? "", to_node: x.to_node ?? "", length_m: x.length_m != null ? String(x.length_m) : "", material: x.material ?? "", diameter_mm: x.diameter_mm != null ? String(x.diameter_mm) : "", manning_n: x.manning_n != null ? String(x.manning_n) : "0.013", upstream_invert_m: x.upstream_invert_m != null ? String(x.upstream_invert_m) : "", downstream_invert_m: x.downstream_invert_m != null ? String(x.downstream_invert_m) : "", vertical_datum: x.vertical_datum ?? "", elev_method: x.elev_method ?? "", condition: x.condition ?? "regular", operational_status: x.operational_status ?? "operacional", data_quality: x.data_quality }); }}>Editar</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => softDeleteLink(x.id)}>Arquivar</Button></>}</td></tr>; })}</tbody></table></div>}
      <h2 className="mb-2 font-semibold">Nós</h2>
      {nodes.length === 0 ? <Empty>Nenhum nó cadastrado.</Empty> : <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Código</th><th>Tipo</th><th>Cota tampa</th><th>Cota fundo</th><th>Referência</th><th>Qualidade</th><th></th></tr></thead>
        <tbody>{nodes.map((x) => <tr key={x.id} className="border-t"><td className="p-2 font-medium">{x.code}</td><td>{x.node_type}</td><td className="num">{fmt(x.cover_elev_m as number, 3)}</td><td className="num">{fmt(x.invert_elev_m as number, 3)}</td><td>{x.vertical_datum ?? "—"}</td><td><QualityBadge q={x.data_quality} /></td><td className="flex gap-1 py-1">{can.edit && <><Button size="sm" variant="ghost" onClick={() => { setEditNodeId(x.id); setN({ code: x.code, node_type: x.node_type, latitude: x.latitude != null ? String(x.latitude) : "", longitude: x.longitude != null ? String(x.longitude) : "", cover_elev_m: x.cover_elev_m != null ? String(x.cover_elev_m) : "", invert_elev_m: x.invert_elev_m != null ? String(x.invert_elev_m) : "", vertical_datum: x.vertical_datum ?? "", elev_method: x.elev_method ?? "", condition: x.condition ?? "regular", source: x.source ?? "", data_quality: x.data_quality }); }}>Editar</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => softDeleteNode(x.id)}>Arquivar</Button></>}</td></tr>)}</tbody></table></div>}
    </>
  );
}
