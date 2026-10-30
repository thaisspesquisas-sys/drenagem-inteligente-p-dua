import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Empty, Notice, fmt } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/alternativas")({
  head: () => ({
    meta: [
      { title: "Comparação de alternativas — Drenagem Inteligente Pádua" },
      { name: "description", content: "Avaliação técnica e comparativa de propostas de intervenção em drenagem urbana." },
    ],
  }),
  component: Page,
});

const STATUS_LABEL: Record<string, string> = {
  em_estudo: "Em estudo preliminar",
  pre_selecionada: "Pré-selecionada para detalhamento",
  aguardando_revisao: "Aguardando revisão do engenheiro",
  aprovada_tecnicamente: "Validada tecnicamente",
  descartada: "Descartada",
};

const empty = {
  name: "",
  problem: "",
  description: "",
  est_cost_brl: "",
  est_capacity_m3s: "",
  implementation_months: "",
  benefit_score: "3",
  risk_score: "3",
  status: "em_estudo",
  notes: "",
};

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"alternatives">[]>([]);
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [problemFilter, setProblemFilter] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("alternatives").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const num = (s: string) => (s.trim() === "" ? null : Number(s));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: f.name,
      problem: f.problem || null,
      description: f.description || null,
      est_cost_brl: num(f.est_cost_brl),
      est_capacity_m3s: num(f.est_capacity_m3s),
      implementation_months: num(f.implementation_months),
      benefit_score: num(f.benefit_score),
      risk_score: num(f.risk_score),
      status: f.status,
      notes: f.notes || null,
    };

    const { error } = editId
      ? await supabase.from("alternatives").update(payload).eq("id", editId)
      : await supabase.from("alternatives").insert(payload);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editId ? "Alternativa atualizada." : "Alternativa registrada.");
    setF(empty);
    setEditId(null);
    setOpen(false);
    load();
  };

  const startEdit = (r: Tables<"alternatives">) => {
    setEditId(r.id);
    setF({
      name: r.name,
      problem: r.problem ?? "",
      description: r.description ?? "",
      est_cost_brl: r.est_cost_brl != null ? String(r.est_cost_brl) : "",
      est_capacity_m3s: r.est_capacity_m3s != null ? String(r.est_capacity_m3s) : "",
      implementation_months: r.implementation_months != null ? String(r.implementation_months) : "",
      benefit_score: r.benefit_score != null ? String(r.benefit_score) : "3",
      risk_score: r.risk_score != null ? String(r.risk_score) : "3",
      status: r.status,
      notes: r.notes ?? "",
    });
    setOpen(true);
  };

  const softDelete = async (id: string) => {
    const { error } = await supabase.from("alternatives").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Alternativa arquivada.");
      load();
    }
  };

  const problems = Array.from(new Set(rows.map((r) => r.problem).filter(Boolean))) as string[];
  const shown = rows.filter((r) => !problemFilter || r.problem === problemFilter);

  return (
    <>
      <PageHeader
        title="Comparador de alternativas de intervenção"
        description="Avaliação lado a lado de propostas para pontos críticos (readequação de galeria, bacia de retenção, válvulas antirretorno, bombeamento, ampliação de bueiro)."
        actions={
          can.edit && (
            <Button
              onClick={() => {
                setEditId(null);
                setF(empty);
                setOpen(!open);
              }}
            >
              {open ? "Fechar" : "Nova alternativa"}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Notice>
          Não direcionar escoamento suplementar ao Rio Pomba sem verificar a condição de submersão da descarga, o risco de erosão e possíveis impactos a jusante. Custos informados são estimativas preliminares e não substituem orçamento com quantitativos e composições oficiais (SINAPI/EMOP).
        </Notice>
      </div>

      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">{editId ? "Editar alternativa" : "Cadastrar proposta de intervenção"}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Nome da alternativa *</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex.: Alt. A — Duplicação Galeria DN 1000" />
            </div>
            <div>
              <Label className="text-xs">Ponto crítico / Problema alvo</Label>
              <Input value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} placeholder="ex.: Alagamento recorrente Bairro Centro (ALAG-01)" />
            </div>
            <div>
              <Label className="text-xs">Estado da proposta</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <Label className="text-xs">Capacidade estimada (m³/s)</Label>
              <Input type="number" step="any" value={f.est_capacity_m3s} onChange={(e) => setF({ ...f, est_capacity_m3s: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Custo preliminar estimado (R$)</Label>
              <Input type="number" step="any" value={f.est_cost_brl} onChange={(e) => setF({ ...f, est_cost_brl: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Prazo de implantação (meses)</Label>
              <Input type="number" step="1" value={f.implementation_months} onChange={(e) => setF({ ...f, implementation_months: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Índice de benefício hidráulico (1–5)</Label>
              <Input type="number" min="1" max="5" value={f.benefit_score} onChange={(e) => setF({ ...f, benefit_score: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Grau de restrição / risco (1–5)</Label>
              <Input type="number" min="1" max="5" value={f.risk_score} onChange={(e) => setF({ ...f, risk_score: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Descrição técnica, materiais e geometria</Label>
              <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Material previsto, diâmetro/seção, extensão, condição de lançamento…" />
            </div>
            <div>
              <Label className="text-xs">Restrições, interferências, impactos a montante/jusante e licenças</Label>
              <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Interferência com rede de água/esgoto, outorga INEA, necessidade de bombeamento…" />
            </div>
          </div>

          <Button type="submit">{editId ? "Salvar alterações" : "Registrar alternativa"}</Button>
        </form>
      )}

      {problems.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Label className="text-xs">Filtrar por ponto crítico:</Label>
          <select className="h-8 rounded-md border bg-background px-2 text-xs" value={problemFilter} onChange={(e) => setProblemFilter(e.target.value)}>
            <option value="">Todos os pontos ({rows.length})</option>
            {problems.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {shown.length === 0 ? (
        <Empty>Nenhuma alternativa cadastrada.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Alternativa</th>
                <th>Problema / Ponto</th>
                <th>Capacidade (m³/s)</th>
                <th>Custo est. (R$)</th>
                <th>R$ / (m³/s)</th>
                <th>Prazo (meses)</th>
                <th>Benefício / Risco</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const costPerFlow =
                  r.est_cost_brl != null && r.est_capacity_m3s != null && Number(r.est_capacity_m3s) > 0
                    ? Number(r.est_cost_brl) / Number(r.est_capacity_m3s)
                    : null;
                return (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2">
                      <div className="font-medium">{r.name}</div>
                      {r.description && <div className="mt-0.5 text-xs text-muted-foreground">{r.description}</div>}
                      {r.notes && <div className="mt-0.5 text-xs text-warning-foreground">Restrições: {r.notes}</div>}
                    </td>
                    <td>{r.problem ?? "—"}</td>
                    <td className="num">{fmt(r.est_capacity_m3s as number, 2)}</td>
                    <td className="num">{r.est_cost_brl != null ? `R$ ${fmt(Number(r.est_cost_brl), 2)}` : "Não estimado"}</td>
                    <td className="num">{costPerFlow != null ? `R$ ${fmt(costPerFlow, 0)}` : "—"}</td>
                    <td className="num">{r.implementation_months ?? "—"}</td>
                    <td className="num">{r.benefit_score ?? "—"}/5 · {r.risk_score ?? "—"}/5</td>
                    <td>{STATUS_LABEL[r.status] ?? r.status}</td>
                    <td className="flex gap-1 py-1">
                      {can.edit && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Editar</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => softDelete(r.id)}>Arquivar</Button>
                        </>
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

