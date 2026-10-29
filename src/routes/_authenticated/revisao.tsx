import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Empty, Notice, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/revisao")({
  head: () => ({ meta: [{ title: "Revisão e aprovação — Drenagem Inteligente Pádua" }, { name: "description", content: "Fluxo formal de revisão técnica." }] }),
  component: Page,
});

const DEC: Record<string, string> = { pendente: "Aguardando revisão", aprovado: "Aprovado tecnicamente", rejeitado: "Rejeitado", correcoes: "Correções solicitadas" };

function Page() {
  const { can, user } = useAuth();
  const [rows, setRows] = useState<Tables<"technical_reviews">[]>([]);
  const [targets, setTargets] = useState<{ id: string; label: string; table: string }[]>([]);
  const [pick, setPick] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const load = async () => {
    const [r, f, s] = await Promise.all([supabase.from("technical_reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("flood_events").select("id,code").is("deleted_at", null), supabase.from("simulation_runs").select("id,name")]);
    setRows(r.data ?? []);
    setTargets([...(f.data ?? []).map((x) => ({ id: x.id, label: `Ocorrência ${x.code}`, table: "flood_events" })), ...(s.data ?? []).map((x) => ({ id: x.id, label: `Simulação ${x.name}`, table: "simulation_runs" }))]);
  };
  useEffect(() => { load(); }, []);
  const label = (id: string) => targets.find((t) => t.id === id)?.label ?? id.slice(0, 8);
  const request = async () => {
    const t = targets.find((x) => x.id === pick); if (!t) return;
    const { error } = await supabase.from("technical_reviews").insert({ target_table: t.table, target_id: t.id });
    if (error) { toast.error(error.message); return; } toast.success("Revisão solicitada."); load();
  };
  const decide = async (r: Tables<"technical_reviews">, decision: string) => {
    if (!comment[r.id]) { toast.error("Registre o parecer técnico antes de decidir."); return; }
    const { data: prof } = await supabase.from("profiles").select("crea").eq("id", user!.id).maybeSingle();
    if (decision === "aprovado" && !prof?.crea) { toast.error("Cadastre seu número de CREA no perfil (Administração) antes de aprovar."); return; }
    const { error } = await supabase.from("technical_reviews").update({ decision, comments: comment[r.id] ?? null, reviewer: user!.id, reviewer_crea: prof?.crea ?? null, decided_at: new Date().toISOString() }).eq("id", r.id);
    if (error) { toast.error(error.message); return; } toast.success("Decisão registrada."); load();
  };
  return (
    <>
      <PageHeader title="Revisão e aprovação" description="Somente engenheiros responsáveis decidem, e nunca sobre solicitações feitas por eles mesmos. A permissão é verificada no banco de dados." />
      <div className="mb-4"><Notice>A aprovação no sistema não substitui a responsabilidade técnica legal, a ART, licenças ou autorizações.</Notice></div>
      {can.edit && <div className="mb-6 flex flex-wrap gap-2 rounded-md border bg-card p-4">
        <select className="h-9 min-w-64 rounded-md border bg-background px-2 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Selecione o item para revisão…</option>{targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <Button onClick={request} disabled={!pick}>Solicitar revisão</Button></div>}
      {rows.length === 0 ? <Empty>Nenhuma revisão registrada.</Empty> : <div className="space-y-3">{rows.map((r) => (
        <div key={r.id} className="rounded-md border bg-card p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><b>{label(r.target_id)} · versão {r.target_version}</b><span>{DEC[r.decision] ?? r.decision}</span></div>
          <div className="text-xs text-muted-foreground">Solicitada em {fmtDate(r.created_at)}{r.decided_at && ` · decidida em ${fmtDate(r.decided_at)} · CREA ${r.reviewer_crea ?? "—"}`}</div>
          {r.comments && <p className="mt-2">{r.comments}</p>}
          {r.decision === "pendente" && can.approve && r.requested_by !== user?.id && <div className="mt-3 space-y-2">
            <Textarea placeholder="Parecer técnico" value={comment[r.id] ?? ""} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
            <div className="flex gap-2"><Button size="sm" onClick={() => decide(r, "aprovado")}>Aprovar</Button><Button size="sm" variant="outline" onClick={() => decide(r, "correcoes")}>Solicitar correções</Button><Button size="sm" variant="destructive" onClick={() => decide(r, "rejeitado")}>Rejeitar</Button></div></div>}
        </div>))}</div>}
    </>
  );
}
