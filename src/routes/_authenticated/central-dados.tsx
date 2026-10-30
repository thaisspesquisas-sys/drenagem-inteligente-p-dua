import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, fmtDate, Notice } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/central-dados")({
  head: () => ({ meta: [{ title: "Central de dados — Drenagem Inteligente Pádua" }, { name: "description", content: "Registro de fontes geográficas e hidrológicas, metadados e importação de arquivos." }] }),
  component: Page,
});

const FIELDS: [keyof Tables<"data_sources">, string][] = [
  ["published_at", "Data de publicação"],
  ["scale_resolution", "Escala / resolução"],
  ["crs", "Sistema de coordenadas"],
  ["unit", "Unidade"],
  ["declared_accuracy", "Precisão declarada"],
  ["license", "Licença"],
  ["coverage", "Cobertura"],
  ["limitations", "Limitações"],
];

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"data_sources">[]>([]);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [openNew, setOpenNew] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", institution: "", url: "", category: "Cartografia", crs: "SIRGAS 2000 (EPSG:4674)", scale_resolution: "", limitations: "" });
  const [importTarget, setImportTarget] = useState<"neighborhoods" | "flood_events" | "drainage_nodes">("neighborhoods");
  const [importSourceId, setImportSourceId] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("data_sources").select("*").order("institution");
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (id: string) => {
    const patch = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === "" ? null : v]));
    const { error } = await supabase.from("data_sources").update(patch as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Metadados atualizados."); setEdit(null); load();
  };

  const createSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("data_sources").insert({
      name: newSource.name,
      institution: newSource.institution,
      url: newSource.url || null,
      category: newSource.category || null,
      crs: newSource.crs || null,
      scale_resolution: newSource.scale_resolution || null,
      limitations: newSource.limitations || null,
      integration_status: "pendente",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Nova fonte de dados registrada.");
    setNewSource({ name: "", institution: "", url: "", category: "Cartografia", crs: "SIRGAS 2000 (EPSG:4674)", scale_resolution: "", limitations: "" });
    setOpenNew(false);
    load();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo excede o limite de segurança de 5 MB.");
      return;
    }
    try {
      const text = await file.text();
      let importedCount = 0;

      if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        const features = Array.isArray(json.features) ? json.features : Array.isArray(json) ? json : [];
        for (const feat of features) {
          const props = feat.properties ?? feat;
          const coords = feat.geometry?.type === "Point" ? feat.geometry.coordinates : null;
          const lon = coords ? Number(coords[0]) : props.longitude != null ? Number(props.longitude) : null;
          const lat = coords ? Number(coords[1]) : props.latitude != null ? Number(props.latitude) : null;
          if (importTarget === "neighborhoods" && props.name) {
            const { error } = await supabase.from("neighborhoods").insert({ name: String(props.name), source: file.name });
            if (!error) importedCount++;
          } else if (importTarget === "flood_events" && props.code) {
            const { error } = await supabase.from("flood_events").insert({
              code: String(props.code),
              address: props.address ? String(props.address) : null,
              neighborhood: props.neighborhood ? String(props.neighborhood) : null,
              latitude: lat,
              longitude: lon,
              data_quality: "fonte_oficial",
              notes: `Importado de ${file.name}`,
            });
            if (!error) importedCount++;
          } else if (importTarget === "drainage_nodes" && props.code) {
            const { error } = await supabase.from("drainage_nodes").insert({
              code: String(props.code),
              node_type: props.node_type ? String(props.node_type) : "poço de visita",
              latitude: lat,
              longitude: lon,
              vertical_datum: props.vertical_datum ? String(props.vertical_datum) : "SIRGAS 2000",
              source: file.name,
              data_quality: "fonte_oficial",
            });
            if (!error) importedCount++;
          }
        }
      } else {
        // CSV import
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
        const header = lines[0]?.split(/[;,]/).map((h) => h.trim().toLowerCase()) ?? [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/[;,]/).map((c) => c.trim());
          const rowObj: Record<string, string> = {};
          header.forEach((h, idx) => (rowObj[h] = cols[idx] ?? ""));
          if (importTarget === "neighborhoods" && (rowObj.name || rowObj.nome || cols[0])) {
            const { error } = await supabase.from("neighborhoods").insert({ name: rowObj.name || rowObj.nome || cols[0], source: file.name });
            if (!error) importedCount++;
          } else if (importTarget === "flood_events" && (rowObj.code || rowObj.codigo)) {
            const { error } = await supabase.from("flood_events").insert({
              code: rowObj.code || rowObj.codigo,
              address: rowObj.address || rowObj.endereco || null,
              neighborhood: rowObj.neighborhood || rowObj.bairro || null,
              latitude: rowObj.latitude ? Number(rowObj.latitude) : null,
              longitude: rowObj.longitude ? Number(rowObj.longitude) : null,
              data_quality: "fonte_oficial",
            });
            if (!error) importedCount++;
          } else if (importTarget === "drainage_nodes" && (rowObj.code || rowObj.codigo)) {
            const { error } = await supabase.from("drainage_nodes").insert({
              code: rowObj.code || rowObj.codigo,
              node_type: rowObj.node_type || rowObj.tipo || "poço de visita",
              latitude: rowObj.latitude ? Number(rowObj.latitude) : null,
              longitude: rowObj.longitude ? Number(rowObj.longitude) : null,
              source: file.name,
              data_quality: "fonte_oficial",
            });
            if (!error) importedCount++;
          }
        }
      }

      if (importSourceId) {
        await supabase.from("data_sources").update({ imported_at: new Date().toISOString(), integration_status: "ativa" }).eq("id", importSourceId);
      }
      toast.success(`Arquivo ${file.name} processado: ${importedCount} registro(s) importado(s).`);
      load();
    } catch (err) {
      toast.error(`Falha ao importar arquivo: ${(err as Error).message}`);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <>
      <PageHeader
        title="Central de dados geográficos e hidrológicos"
        description="Catálogo de fontes públicas (SGB/CPRM, IBGE, INPE TOPODATA, ANA HidroWeb, INEA-RJ, Prefeitura) e importação auditada de arquivos CSV/GeoJSON."
        actions={can.edit && <Button onClick={() => setOpenNew(!openNew)}>{openNew ? "Fechar" : "Nova fonte de dados"}</Button>}
      />

      {openNew && can.edit && (
        <form onSubmit={createSource} className="mb-6 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-3">
          <h3 className="font-semibold md:col-span-3">Cadastrar nova fonte oficial / municipal</h3>
          <div><Label className="text-xs">Nome da base / documento *</Label><Input required value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} /></div>
          <div><Label className="text-xs">Instituição produtora *</Label><Input required value={newSource.institution} onChange={(e) => setNewSource({ ...newSource, institution: e.target.value })} /></div>
          <div><Label className="text-xs">Categoria</Label><Input value={newSource.category} onChange={(e) => setNewSource({ ...newSource, category: e.target.value })} /></div>
          <div><Label className="text-xs">URL ou código do arquivo</Label><Input value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} /></div>
          <div><Label className="text-xs">Sistema de referência (CRS)</Label><Input value={newSource.crs} onChange={(e) => setNewSource({ ...newSource, crs: e.target.value })} /></div>
          <div><Label className="text-xs">Escala / Resolução</Label><Input value={newSource.scale_resolution} onChange={(e) => setNewSource({ ...newSource, scale_resolution: e.target.value })} /></div>
          <div className="md:col-span-3"><Label className="text-xs">Limitações conhecidas</Label><Input value={newSource.limitations} onChange={(e) => setNewSource({ ...newSource, limitations: e.target.value })} /></div>
          <Button type="submit" className="w-fit">Registrar fonte</Button>
        </form>
      )}

      {can.edit && (
        <section className="mb-6 rounded-md border bg-card p-4">
          <h2 className="mb-2 font-semibold">Importação manual de arquivos oficiais (GeoJSON / CSV)</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Importe dados georreferenciados em SIRGAS 2000 (EPSG:4674) e vincule-os à fonte correspondente para atualizar a data de importação.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Tabela de destino</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={importTarget} onChange={(e) => setImportTarget(e.target.value as never)}>
                <option value="neighborhoods">Bairros e localidades (name)</option>
                <option value="flood_events">Pontos de alagamento (code, address, neighborhood, latitude, longitude)</option>
                <option value="drainage_nodes">Nós de drenagem / estações (code, node_type, latitude, longitude)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Fonte documental associada</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={importSourceId} onChange={(e) => setImportSourceId(e.target.value)}>
                <option value="">Selecionar fonte catalogada…</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.institution} — {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Selecionar arquivo (.geojson, .json, .csv)</Label>
              <Input type="file" accept=".geojson,.json,.csv" onChange={handleFileImport} />
            </div>
          </div>
        </section>
      )}

      <div className="space-y-3">{rows.map((r) => (
        <div key={r.id} className="rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="text-xs uppercase text-muted-foreground">{r.institution} · {r.category}</div><div className="font-semibold">{r.name}</div>
              {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-water underline">{r.url}</a>}</div>
            <div className="text-right text-xs"><div className={r.integration_status === "ativa" ? "text-success" : "text-muted-foreground"}>{r.integration_status === "ativa" ? "Integração / Base ativa" : "Integração pendente — importação manual"}</div><div className="text-muted-foreground">Importado: {fmtDate(r.imported_at)}</div></div>
          </div>
          {edit === r.id ? (
            <div className="mt-3 grid gap-2 md:grid-cols-4">{FIELDS.map(([k, l]) => <div key={k}><div className="text-xs text-muted-foreground">{l}</div><Input type={k === "published_at" ? "date" : "text"} value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>)}
              <div className="flex gap-2 md:col-span-4"><Button size="sm" onClick={() => save(r.id)}>Salvar</Button><Button size="sm" variant="outline" onClick={() => setEdit(null)}>Cancelar</Button></div></div>
          ) : (
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs md:grid-cols-4">{FIELDS.map(([k, l]) => <div key={k}><dt className="text-muted-foreground">{l}</dt><dd>{(r[k] as string) ?? "—"}</dd></div>)}</dl>
          )}
          {can.edit && edit !== r.id && <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setEdit(r.id); setDraft(Object.fromEntries(FIELDS.map(([k]) => [k, (r[k] as string) ?? ""]))); }}>Editar metadados</Button>}
        </div>))}</div>
      <div className="mt-6">
        <Notice tone="info">Nunca misture coordenadas de referenciais distintos sem transformação explícita. Padrão adotado: SIRGAS 2000 (EPSG:4674) e projeção UTM 23S (EPSG:31983).</Notice>
      </div>
    </>
  );
}
