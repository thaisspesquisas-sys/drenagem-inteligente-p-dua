import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Empty, Notice, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/simulacoes")({
  head: () => ({ meta: [{ title: "Simulações — Drenagem Inteligente Pádua" }, { name: "description", content: "Preparação de cenários de simulação hidráulica." }] }),
  component: Page,
});

const ST: Record<string, string> = { rascunho: "Rascunho", aguardando_dados: "Aguardando dados", pronta: "Pronta para execução", em_processamento: "Em processamento", concluida: "Concluída", concluida_alertas: "Concluída com alertas", falhou: "Falhou", aguardando_revisao: "Aguardando revisão", validada: "Validada tecnicamente", rejeitada: "Rejeitada" };

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"simulation_runs">[]>([]);
  const [f, setF] = useState({ name: "", objective: "", engine: "EPA SWMM", boundary_conditions: "", assumptions: "" });
  const load = async () => { const { data } = await supabase.from("simulation_runs").select("*").order("created_at", { ascending: false }); setRows(data ?? []); };
  useEffect(() => { load(); }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const status = f.boundary_conditions ? "rascunho" : "aguardando_dados";
    const { error } = await supabase.from("simulation_runs").insert({ ...f, status });
    if (error) return toast.error(error.message); toast.success("Cenário criado."); setF({ ...f, name: "", objective: "" }); load();
  };
  return (
    <>
      <PageHeader title="Simulações" description="Central de cenários. O motor hidráulico (EPA SWMM / HEC-RAS) ainda não está integrado: apenas a preparação de cenários está disponível." />
      <div className="mb-6"><Notice>Simulação hidráulica ainda não executada. O banco de dados bloqueia o estado "Concluída" sem motor e logs reais de execução.</Notice></div>
      {can.edit && <form onSubmit={save} className="mb-6 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-2">
        <div><Label className="text-xs">Nome do cenário *</Label><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><Label className="text-xs">Motor previsto</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.engine} onChange={(e) => setF({ ...f, engine: e.target.value })}><option>EPA SWMM</option><option>HEC-RAS</option></select></div>
        <div className="md:col-span-2"><Label className="text-xs">Objetivo</Label><Input value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} /></div>
        <div><Label className="text-xs">Condições de contorno (nível do rio, chuva de projeto…)</Label><Textarea value={f.boundary_conditions} onChange={(e) => setF({ ...f, boundary_conditions: e.target.value })} /></div>
        <div><Label className="text-xs">Hipóteses</Label><Textarea value={f.assumptions} onChange={(e) => setF({ ...f, assumptions: e.target.value })} /></div>
        <Button type="submit" className="w-fit">Criar cenário</Button>
      </form>}
      {rows.length === 0 ? <Empty>Nenhum cenário criado.</Empty> : <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Cenário</th><th>Motor</th><th>Estado</th><th>Contorno</th><th>Criado</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="p-2">{r.name}</td><td>{r.engine} {r.engine_version ?? "(não integrado)"}</td><td>{ST[r.status] ?? r.status}</td><td>{r.boundary_conditions ? "Definido" : <span className="text-destructive">Ausente</span>}</td><td>{fmtDate(r.created_at)}</td></tr>)}</tbody></table></div>}
    </>
  );
}
