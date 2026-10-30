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

export const Route = createFileRoute("/_authenticated/vistorias")({
  head: () => ({
    meta: [
      { title: "Vistorias de campo — Drenagem Inteligente Pádua" },
      { name: "description", content: "Registro de vistorias técnicas, fotografias e constatações em campo." },
    ],
  }),
  component: Page,
});

const empty = {
  code: "",
  flood_event_id: "",
  node_id: "",
  inspected_at: "",
  team: "",
  latitude: "",
  longitude: "",
  structure_condition: "regular",
  obstruction_level: "parcial",
  findings: "",
  recommendations: "",
  data_quality: "confirmado_levantamento",
  confirm_flood_cause: false,
};

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"field_inspections">[]>([]);
  const [floods, setFloods] = useState<Tables<"flood_events">[]>([]);
  const [nodes, setNodes] = useState<Tables<"drainage_nodes">[]>([]);
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});
  const [printItem, setPrintItem] = useState<Tables<"field_inspections"> | null>(null);

  const load = async () => {
    const [vi, fe, nd] = await Promise.all([
      supabase.from("field_inspections").select("*").is("deleted_at", null).order("inspected_at", { ascending: false }),
      supabase.from("flood_events").select("*").is("deleted_at", null).order("code"),
      supabase.from("drainage_nodes").select("*").is("deleted_at", null).order("code"),
    ]);
    if (vi.error) toast.error(vi.error.message);
    const list = vi.data ?? [];
    setRows(list);
    setFloods(fe.data ?? []);
    setNodes(nd.data ?? []);

    // Resolve signed URLs for private photos
    const urlMap: Record<string, string[]> = {};
    for (const r of list) {
      if (r.photo_paths?.length) {
        const signed: string[] = [];
        for (const p of r.photo_paths) {
          const { data } = await supabase.storage.from("fotos").createSignedUrl(p, 3600);
          if (data?.signedUrl) signed.push(data.signedUrl);
        }
        urlMap[r.id] = signed;
      }
    }
    setPhotoUrls(urlMap);
  };

  useEffect(() => {
    load();
  }, []);

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const uploadedPaths: string[] = [];
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const safeName = `${f.code.replace(/[^a-zA-Z0-9_-]/g, "_")}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("fotos").upload(safeName, file, { upsert: false });
        if (upErr) {
          toast.warning(`Aviso no armazenamento de foto (${file.name}): ${upErr.message}`);
        } else {
          uploadedPaths.push(safeName);
        }
      }
    }

    const payload = {
      code: f.code,
      flood_event_id: f.flood_event_id || null,
      node_id: f.node_id || null,
      inspected_at: f.inspected_at ? new Date(f.inspected_at).toISOString() : new Date().toISOString(),
      team: f.team || null,
      latitude: num(f.latitude),
      longitude: num(f.longitude),
      structure_condition: f.structure_condition || null,
      obstruction_level: f.obstruction_level || null,
      findings: f.findings || null,
      recommendations: f.recommendations || null,
      data_quality: f.data_quality as never,
      ...(uploadedPaths.length > 0 ? { photo_paths: uploadedPaths } : {}),
    };

    const { error } = editId
      ? await supabase.from("field_inspections").update(payload).eq("id", editId)
      : await supabase.from("field_inspections").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (f.flood_event_id) {
      await supabase
        .from("flood_events")
        .update({
          diagnosis_status: f.confirm_flood_cause ? "diagnosticado" : "em_investigacao",
          cause_confirmed: f.confirm_flood_cause,
          needs_inspection: false,
          data_quality: "confirmado_levantamento",
        })
        .eq("id", f.flood_event_id);
    }

    toast.success(editId ? "Vistoria atualizada." : "Vistoria de campo registrada.");
    setF(empty);
    setEditId(null);
    setFiles(null);
    setOpen(false);
    load();
  };

  const startEdit = (r: Tables<"field_inspections">) => {
    setEditId(r.id);
    setF({
      code: r.code,
      flood_event_id: r.flood_event_id ?? "",
      node_id: r.node_id ?? "",
      inspected_at: r.inspected_at ? r.inspected_at.slice(0, 16) : "",
      team: r.team ?? "",
      latitude: r.latitude != null ? String(r.latitude) : "",
      longitude: r.longitude != null ? String(r.longitude) : "",
      structure_condition: r.structure_condition ?? "regular",
      obstruction_level: r.obstruction_level ?? "parcial",
      findings: r.findings ?? "",
      recommendations: r.recommendations ?? "",
      data_quality: r.data_quality,
      confirm_flood_cause: false,
    });
    setOpen(true);
  };

  const softDelete = async (id: string) => {
    const { error } = await supabase.from("field_inspections").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Vistoria arquivada (exclusão lógica).");
      load();
    }
  };

  const floodCode = (id: string | null) => floods.find((x) => x.id === id)?.code ?? "—";
  const nodeCode = (id: string | null) => nodes.find((x) => x.id === id)?.code ?? "—";

  if (printItem) {
    return (
      <div>
        <div className="no-print mb-4 flex gap-2">
          <Button onClick={() => window.print()}>Imprimir</Button>
          <Button variant="outline" onClick={() => setPrintItem(null)}>Voltar</Button>
        </div>
        <div className="rounded border bg-card p-6 text-sm">
          <p className="mb-2 font-bold text-destructive">ESTUDO PRELIMINAR — NÃO UTILIZAR COMO PROJETO EXECUTIVO</p>
          <h1 className="text-xl font-semibold">Relatório de Vistoria de Campo — {printItem.code}</h1>
          <p className="text-muted-foreground">Data da vistoria: {fmtDate(printItem.inspected_at)} · Equipe: {printItem.team ?? "—"}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Ocorrência associada</dt><dd>{floodCode(printItem.flood_event_id)}</dd></div>
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Estrutura / Nó inspecionado</dt><dd>{nodeCode(printItem.node_id)}</dd></div>
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Coordenadas (SIRGAS 2000)</dt><dd>{printItem.latitude != null ? `${printItem.latitude}, ${printItem.longitude}` : "—"}</dd></div>
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Condição estrutural</dt><dd>{printItem.structure_condition ?? "—"}</dd></div>
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Nível de obstrução</dt><dd>{printItem.obstruction_level ?? "—"}</dd></div>
            <div className="border-b py-1"><dt className="text-xs text-muted-foreground">Qualidade do dado</dt><dd>{QUALITY_LABEL[printItem.data_quality]}</dd></div>
          </dl>
          <div className="mt-4 space-y-2">
            <div><b className="text-xs uppercase text-muted-foreground">Constatações de campo:</b><p>{printItem.findings ?? "—"}</p></div>
            <div><b className="text-xs uppercase text-muted-foreground">Recomendações técnicas:</b><p>{printItem.recommendations ?? "—"}</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Vistorias de campo"
        description="Inspeções presenciais em pontos de alagamento e estruturas de drenagem, com armazenamento privado de fotografias e confirmação de hipóteses diagnósticas."
        actions={
          can.edit && (
            <Button
              onClick={() => {
                setEditId(null);
                setF(empty);
                setOpen(!open);
              }}
            >
              {open ? "Fechar" : "Nova vistoria"}
            </Button>
          )
        }
      />

      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">{editId ? "Editar vistoria" : "Registrar vistoria de campo"}</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Código da vistoria *</Label>
              <Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="ex.: VIST-2026-001" />
            </div>
            <div>
              <Label className="text-xs">Data e hora</Label>
              <Input type="datetime-local" value={f.inspected_at} onChange={(e) => setF({ ...f, inspected_at: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Equipe / responsável</Label>
              <Input value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} placeholder="Eng. / Téc. responsável" />
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

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Ponto de alagamento vinculado</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={f.flood_event_id}
                onChange={(e) => {
                  const fe = floods.find((x) => x.id === e.target.value);
                  setF({
                    ...f,
                    flood_event_id: e.target.value,
                    latitude: fe?.latitude != null ? String(fe.latitude) : f.latitude,
                    longitude: fe?.longitude != null ? String(fe.longitude) : f.longitude,
                  });
                }}
              >
                <option value="">Nenhum</option>
                {floods.map((x) => (
                  <option key={x.id} value={x.id}>{x.code} — {x.neighborhood ?? x.address ?? "Sem endereço"}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Nó / dispositivo inspecionado</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.node_id} onChange={(e) => setF({ ...f, node_id: e.target.value })}>
                <option value="">Nenhum</option>
                {nodes.map((x) => (
                  <option key={x.id} value={x.id}>{x.code} ({x.node_type})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Latitude (°, SIRGAS 2000)</Label>
              <Input type="number" step="any" value={f.latitude} onChange={(e) => setF({ ...f, latitude: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Longitude (°, SIRGAS 2000)</Label>
              <Input type="number" step="any" value={f.longitude} onChange={(e) => setF({ ...f, longitude: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Condição da estrutura</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.structure_condition} onChange={(e) => setF({ ...f, structure_condition: e.target.value })}>
                {["boa", "regular", "danificada", "colapsada", "inexistente"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Grau de obstrução observado</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.obstruction_level} onChange={(e) => setF({ ...f, obstruction_level: e.target.value })}>
                {["desobstruido", "leve", "parcial", "severa", "total"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Fotografias de campo (bucket privado 'fotos')</Label>
              <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
            </div>
          </div>

          {f.flood_event_id && (
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={f.confirm_flood_cause} onChange={(e) => setF({ ...f, confirm_flood_cause: e.target.checked })} />
              Confirmar tecnicamente a hipótese de causa da ocorrência vinculada e marcar situação como "Diagnosticado"
            </label>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Constatações e medições de campo</Label>
              <Textarea value={f.findings} onChange={(e) => setF({ ...f, findings: e.target.value })} placeholder="Descreva assoreamento, recalques, dimensões conferidas…" />
            </div>
            <div>
              <Label className="text-xs">Recomendações imediatas / manutenção</Label>
              <Textarea value={f.recommendations} onChange={(e) => setF({ ...f, recommendations: e.target.value })} placeholder="Desobstrução, limpeza de boca de lobo, levantamento topográfico…" />
            </div>
          </div>

          <Button type="submit">{editId ? "Salvar alterações" : "Registrar vistoria"}</Button>
        </form>
      )}

      {rows.length === 0 ? (
        <Empty>Nenhuma vistoria de campo registrada.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Código</th>
                <th>Data</th>
                <th>Ocorrência</th>
                <th>Nó</th>
                <th>Estrutura / Obstrução</th>
                <th>Equipe</th>
                <th>Fotos</th>
                <th>Qualidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.code}</td>
                  <td>{fmtDate(r.inspected_at)}</td>
                  <td>{floodCode(r.flood_event_id)}</td>
                  <td>{nodeCode(r.node_id)}</td>
                  <td>{r.structure_condition ?? "—"} / {r.obstruction_level ?? "—"}</td>
                  <td>{r.team ?? "—"}</td>
                  <td>
                    {(photoUrls[r.id] ?? []).length > 0 ? (
                      <div className="flex gap-1">
                        {photoUrls[r.id].map((u, idx) => (
                          <a key={u} href={u} target="_blank" rel="noreferrer" className="text-xs text-water underline">
                            Foto {idx + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.photo_paths?.length ? `${r.photo_paths.length} arq.` : "0"}</span>
                    )}
                  </td>
                  <td><QualityBadge q={r.data_quality} /></td>
                  <td className="flex gap-1 py-1">
                    <Button size="sm" variant="ghost" onClick={() => setPrintItem(r)}>Ficha</Button>
                    {can.edit && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Editar</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => softDelete(r.id)}>Arquivar</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

