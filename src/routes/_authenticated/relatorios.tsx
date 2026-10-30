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

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios técnicos — Drenagem Inteligente Pádua" },
      { name: "description", content: "Geração, versionamento e exportação PDF de relatórios técnicos de drenagem." },
    ],
  }),
  component: Page,
});

const REPORT_TYPES: Record<string, string> = {
  ocorrencia: "1. Relatório de ocorrência de alagamento",
  topografico: "2. Relatório topográfico e de perfis",
  galeria: "3. Relatório de trecho de galeria / rede",
  hidrologico_hidraulico: "4. Relatório hidrológico e hidráulico",
  simulacao_cheias: "5. Relatório de simulação e cheias do Rio Pomba",
  priorizacao_municipal: "6. Relatório de priorização municipal",
};

type ReportContent = {
  summary: string;
  methodology: string;
  dataSources: string;
  limitations: string;
  recommendations: string;
  snapshotStats?: Record<string, unknown>;
};

function Page() {
  const { can, user } = useAuth();
  const [rows, setRows] = useState<Tables<"reports">[]>([]);
  const [reviews, setReviews] = useState<Tables<"technical_reviews">[]>([]);
  const [open, setOpen] = useState(false);
  const [editReport, setEditReport] = useState<Tables<"reports"> | null>(null);
  const [printReport, setPrintReport] = useState<Tables<"reports"> | null>(null);

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("ocorrencia");
  const [summary, setSummary] = useState("");
  const [methodology, setMethodology] = useState("");
  const [dataSources, setDataSources] = useState("Cadastro Técnico Municipal / SIRGAS 2000");
  const [limitations, setLimitations] = useState("Estudo baseado nos dados cadastrados até a data de emissão. Não substitui levantamento topográfico de precisão onde pendente.");
  const [recommendations, setRecommendations] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const [rp, rv] = await Promise.all([
      supabase.from("reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("technical_reviews").select("*").eq("target_table", "reports").order("created_at", { ascending: false }),
    ]);
    if (rp.error) toast.error(rp.error.message);
    setRows(rp.data ?? []);
    setReviews(rv.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const prefillFromDatabase = async (type: string) => {
    setReportType(type);
    if (type === "ocorrencia") {
      const { data } = await supabase.from("flood_events").select("code,neighborhood,water_depth_m,diagnosis_status").is("deleted_at", null);
      const list = data ?? [];
      setTitle(`Diagnóstico de Ocorrências de Alagamento (${list.length} pontos)`);
      setSummary(`Síntese técnica de ${list.length} pontos de alagamento registrados no município. Pontos: ${list.map((x) => `${x.code} (${x.neighborhood ?? "S/B"})`).join(", ") || "nenhum ponto cadastrado"}.`);
      setMethodology("Consolidação de registros observados em campo e hipóteses diagnósticas submetidas à verificação técnica.");
    } else if (type === "topografico") {
      const { data } = await supabase.from("topo_surveys").select("name,equipment,vertical_datum,declared_accuracy").is("deleted_at", null);
      const list = data ?? [];
      setTitle(`Relatório Topográfico e Altimétrico (${list.length} levantamentos)`);
      setSummary(`Levantamentos analisados: ${list.map((x) => `${x.name} [${x.equipment}, Datum: ${x.vertical_datum}]`).join("; ") || "nenhum levantamento registrado"}.`);
      setMethodology("Nivelamento e transporte de cotas referenciados ao datum oficial indicado em cada levantamento.");
    } else if (type === "galeria") {
      const { data } = await supabase.from("drainage_links").select("code,diameter_mm,length_m,material").is("deleted_at", null);
      const list = data ?? [];
      setTitle(`Cadastro e Avaliação de Galerias Pluviais (${list.length} trechos)`);
      setSummary(`Trechos avaliados: ${list.map((x) => `${x.code} (DN ${x.diameter_mm ?? "?"} mm, L=${x.length_m ?? "?"} m)`).join(", ") || "nenhum trecho cadastrado"}.`);
      setMethodology("Verificação geométrica de declividade e conectividade do grafo da rede pluvial.");
    } else if (type === "hidrologico_hidraulico") {
      const [bs, cr] = await Promise.all([
        supabase.from("basins").select("code,name,area_km2,runoff_c").is("deleted_at", null),
        supabase.from("calculation_runs").select("calc_type,method_version").limit(20),
      ]);
      setTitle("Estudo Hidrológico e Dimensionamento Hidráulico Preliminar");
      setSummary(`Bacias analisadas: ${(bs.data ?? []).map((b) => `${b.code} (${b.name}, A=${b.area_km2 ?? "?"} km², C=${b.runoff_c ?? "?"})`).join("; ") || "nenhuma bacia"}. Cálculos reproduzíveis vinculados: ${(cr.data ?? []).length}.`);
      setMethodology("Método Racional (racional-v1.0), Tempo de Concentração de Kirpich (kirpich-tc-v1.0) e Equação de Manning para seção circular (manning-circular-v1.0).");
    } else if (type === "simulacao_cheias") {
      const { data } = await supabase.from("simulation_runs").select("name,engine,status,boundary_conditions");
      const list = data ?? [];
      setTitle("Relatório de Cenários de Simulação e Interação com o Rio Pomba");
      setSummary(`Cenários avaliados: ${list.map((s) => `${s.name} [${s.engine} — ${s.status}]`).join("; ") || "nenhum cenário"}.`);
      setMethodology("Análise de submersão de pontos de lançamento (submersao-lancamento-v1.0) e modelagem hidráulica conforme motor indicado.");
    } else if (type === "priorizacao_municipal") {
      const [fe, al] = await Promise.all([
        supabase.from("flood_events").select("code,neighborhood,needs_inspection").is("deleted_at", null),
        supabase.from("alternatives").select("name,problem,est_cost_brl,status").is("deleted_at", null),
      ]);
      setTitle("Relatório de Priorização Municipal de Intervenções em Drenagem");
      setSummary(`Pontos críticos mapeados: ${(fe.data ?? []).length}. Alternativas de intervenção em estudo: ${(al.data ?? []).map((a) => `${a.name} (${a.status})`).join("; ") || "nenhuma"}.`);
      setMethodology("Critérios multicritério de gravidade observada, recorrência, condição da infraestrutura e viabilidade técnica.");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const content: ReportContent = { summary, methodology, dataSources, limitations, recommendations };
    if (editReport) {
      const { error } = await supabase.from("reports").update({ title, report_type: reportType, content: content as never, notes: notes || null }).eq("id", editReport.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Relatório atualizado. O gatilho do banco incrementou a versão e invalidou aprovações anteriores.");
    } else {
      const { error } = await supabase.from("reports").insert({ title, report_type: reportType, content: content as never, notes: notes || null });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Relatório preliminar gerado.");
    }
    setEditReport(null);
    setOpen(false);
    load();
  };

  const startEdit = (r: Tables<"reports">) => {
    const c = (r.content ?? {}) as Partial<ReportContent>;
    setEditReport(r);
    setTitle(r.title);
    setReportType(r.report_type);
    setSummary(c.summary ?? "");
    setMethodology(c.methodology ?? "");
    setDataSources(c.dataSources ?? "");
    setLimitations(c.limitations ?? "");
    setRecommendations(c.recommendations ?? "");
    setNotes(r.notes ?? "");
    setOpen(true);
  };

  const requestReview = async (r: Tables<"reports">) => {
    const { error } = await supabase.from("technical_reviews").insert({
      target_table: "reports",
      target_id: r.id,
      target_version: r.version,
    });
    if (error) toast.error(error.message);
    else {
      await supabase.from("reports").update({ status: "aguardando_revisao" }).eq("id", r.id);
      toast.success(`Revisão técnica solicitada para a versão v${r.version}.`);
      load();
    }
  };

  const latestReviewFor = (r: Tables<"reports">) =>
    reviews.find((rv) => rv.target_id === r.id && rv.target_version === r.version);

  if (printReport) {
    const c = (printReport.content ?? {}) as Partial<ReportContent>;
    const rv = latestReviewFor(printReport);
    const isApproved = rv?.decision === "aprovado";
    return (
      <div>
        <div className="no-print mb-4 flex gap-2">
          <Button onClick={() => window.print()}>Imprimir / Exportar PDF</Button>
          <Button variant="outline" onClick={() => setPrintReport(null)}>Voltar</Button>
        </div>
        <div className="space-y-4 rounded border bg-card p-8 text-sm">
          {!isApproved && (
            <div className="border-2 border-destructive p-2 text-center font-bold text-destructive">
              ESTUDO PRELIMINAR — NÃO UTILIZAR COMO PROJETO EXECUTIVO
            </div>
          )}
          <div className="border-b pb-4">
            <div className="text-xs uppercase text-muted-foreground">Município de Santo Antônio de Pádua — RJ · Drenagem Inteligente Pádua</div>
            <h1 className="mt-1 text-2xl font-bold">{printReport.title}</h1>
            <div className="mt-1 text-xs text-muted-foreground">
              Tipo: {REPORT_TYPES[printReport.report_type] ?? printReport.report_type} · Versão dos dados: <b>v{printReport.version}</b> · Gerado em: {fmtDate(printReport.updated_at)}
            </div>
          </div>

          <section>
            <h2 className="font-semibold uppercase text-xs text-muted-foreground">1. Síntese e Diagnóstico</h2>
            <p className="mt-1 whitespace-pre-wrap">{c.summary || "—"}</p>
          </section>
          <section>
            <h2 className="font-semibold uppercase text-xs text-muted-foreground">2. Metodologia e Referências Técnicas</h2>
            <p className="mt-1 whitespace-pre-wrap">{c.methodology || "—"}</p>
          </section>
          <section>
            <h2 className="font-semibold uppercase text-xs text-muted-foreground">3. Fontes de Dados Utilizadas</h2>
            <p className="mt-1 whitespace-pre-wrap">{c.dataSources || "—"}</p>
          </section>
          <section>
            <h2 className="font-semibold uppercase text-xs text-muted-foreground">4. Limitações Conhecidas e Incertezas</h2>
            <p className="mt-1 whitespace-pre-wrap">{c.limitations || "—"}</p>
          </section>
          <section>
            <h2 className="font-semibold uppercase text-xs text-muted-foreground">5. Recomendações e Encaminhamentos</h2>
            <p className="mt-1 whitespace-pre-wrap">{c.recommendations || "—"}</p>
          </section>

          <div className="mt-6 border-t pt-4 text-xs">
            <div><b>Estado de validação:</b> {isApproved ? `Aprovado tecnicamente na versão v${printReport.version}` : `Preliminar / ${rv?.decision ?? printReport.status}`}</div>
            <div><b>Revisor técnico:</b> {rv?.reviewer_crea ? `CREA ${rv.reviewer_crea} em ${fmtDate(rv.decided_at)}` : "Aguardando revisão de engenheiro habilitado"}</div>
            {rv?.comments && <div><b>Parecer do revisor:</b> {rv.comments}</div>}
            <p className="mt-2 text-muted-foreground">
              Nota legal: A aprovação no sistema não substitui a responsabilidade técnica legal, o registro de ART, projetos executivos complementares ou licenças ambientais.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios técnicos e controle de versões"
        description="Geração dos 6 tipos de relatórios técnicos com exportação para impressão/PDF e versionamento automático no banco de dados (qualquer alteração no conteúdo incrementa a versão e invalida aprovações anteriores)."
        actions={
          can.edit && (
            <Button
              onClick={() => {
                setEditReport(null);
                setOpen(!open);
                if (!open) prefillFromDatabase("ocorrencia");
              }}
            >
              {open ? "Fechar" : "Novo relatório"}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <Notice>
          Relatórios sem aprovação técnica vigente exibem obrigatoriamente a marcação <b>“ESTUDO PRELIMINAR — NÃO UTILIZAR COMO PROJETO EXECUTIVO”</b>.
        </Notice>
      </div>

      {open && (
        <form onSubmit={save} className="mb-6 space-y-4 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">
            {editReport ? `Editar relatório (salvar criará a versão v${editReport.version + 1} e invalidará aprovações anteriores)` : "Elaborar relatório técnico"}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Tipo de relatório *</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={reportType}
                onChange={(e) => prefillFromDatabase(e.target.value)}
              >
                {Object.entries(REPORT_TYPES).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Título do documento *</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">1. Síntese técnica e resultados consolidados *</Label>
            <Textarea required rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">2. Metodologia e versões de fórmulas</Label>
              <Textarea rows={2} value={methodology} onChange={(e) => setMethodology(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">3. Fontes de dados e referências cartográficas</Label>
              <Textarea rows={2} value={dataSources} onChange={(e) => setDataSources(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">4. Limitações conhecidas *</Label>
              <Textarea required rows={2} value={limitations} onChange={(e) => setLimitations(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">5. Recomendações técnicas</Label>
              <Textarea rows={2} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Notas de versão / controle de alterações</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo da emissão ou revisão" />
          </div>

          <Button type="submit">{editReport ? `Salvar nova versão (v${editReport.version + 1})` : "Gerar relatório"}</Button>
        </form>
      )}

      {rows.length === 0 ? (
        <Empty>Nenhum relatório técnico gerado.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const rv = latestReviewFor(r);
            const invalidatedCount = reviews.filter((x) => x.target_id === r.id && x.decision === "invalidada").length;
            return (
              <div key={r.id} className="rounded-md border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">{REPORT_TYPES[r.report_type] ?? r.report_type}</div>
                    <div className="text-base font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Versão atual: <b>v{r.version}</b> · Atualizado em {fmtDate(r.updated_at)}
                      {invalidatedCount > 0 && ` · (${invalidatedCount} revisão(ões) anterior(es) invalidada(s) por alteração material)`}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={rv?.decision === "aprovado" ? "rounded bg-success/15 px-2 py-0.5 text-xs font-medium text-success" : "rounded bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground"}>
                      {rv?.decision === "aprovado" ? `Aprovado v${r.version} (CREA ${rv.reviewer_crea})` : rv?.decision === "pendente" ? "Aguardando revisão" : "Estudo Preliminar"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setPrintReport(r)}>Visualizar / PDF</Button>
                    {can.edit && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Editar (nova versão)</Button>
                        {(!rv || rv.decision !== "pendente") && (
                          <Button size="sm" variant="ghost" onClick={() => requestReview(r)}>Solicitar revisão</Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

