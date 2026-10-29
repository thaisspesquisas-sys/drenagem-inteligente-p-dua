import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/central-dados")({
  head: () => ({ meta: [{ title: "Central de dados — Drenagem Inteligente Pádua" }, { name: "description", content: "Registro de fontes geográficas e hidrológicas e seus metadados." }] }),
  component: Page,
});

const FIELDS: [keyof Tables<"data_sources">, string][] = [["published_at", "Data de publicação"], ["scale_resolution", "Escala / resolução"], ["crs", "Sistema de coordenadas"], ["unit", "Unidade"], ["declared_accuracy", "Precisão declarada"], ["license", "Licença"], ["coverage", "Cobertura"], ["limitations", "Limitações"]];

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"data_sources">[]>([]);
  const [edit, setEdit] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = async () => { const { data } = await supabase.from("data_sources").select("*").order("institution"); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const save = async (id: string) => {
    const patch = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v === "" ? null : v]));
    const { error } = await supabase.from("data_sources").update(patch).eq("id", id);
    if (error) return toast.error(error.message); toast.success("Metadados atualizados."); setEdit(null); load();
  };
  return (
    <>
      <PageHeader title="Central de dados geográficos" description="Fontes públicas e municipais. Nenhuma fonte possui dados importados automaticamente até que a importação seja realizada e documentada." />
      <div className="space-y-3">{rows.map((r) => (
        <div key={r.id} className="rounded-md border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="text-xs uppercase text-muted-foreground">{r.institution} · {r.category}</div><div className="font-semibold">{r.name}</div>
              {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-water underline">{r.url}</a>}</div>
            <div className="text-right text-xs"><div className={r.integration_status === "ativa" ? "text-success" : "text-muted-foreground"}>{r.integration_status === "ativa" ? "Integração ativa" : "Integração pendente — importação manual"}</div><div className="text-muted-foreground">Importado: {fmtDate(r.imported_at)}</div></div>
          </div>
          {edit === r.id ? (
            <div className="mt-3 grid gap-2 md:grid-cols-4">{FIELDS.map(([k, l]) => <div key={k}><div className="text-xs text-muted-foreground">{l}</div><Input type={k === "published_at" ? "date" : "text"} value={draft[k] ?? ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>)}
              <div className="flex gap-2 md:col-span-4"><Button size="sm" onClick={() => save(r.id)}>Salvar</Button><Button size="sm" variant="outline" onClick={() => setEdit(null)}>Cancelar</Button></div></div>
          ) : (
            <dl className="mt-3 grid gap-x-4 gap-y-1 text-xs md:grid-cols-4">{FIELDS.map(([k, l]) => <div key={k}><dt className="text-muted-foreground">{l}</dt><dd>{(r[k] as string) ?? "—"}</dd></div>)}</dl>
          )}
          {can.edit && edit !== r.id && <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setEdit(r.id); setDraft(Object.fromEntries(FIELDS.map(([k]) => [k, (r[k] as string) ?? ""]))); }}>Editar metadados</Button>}
        </div>))}</div>
    </>
  );
}
