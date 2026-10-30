import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Empty, Notice, fmt, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { evaluateOutfallSubmergence, METHOD_VERSIONS } from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/simulacoes")({
  head: () => ({ meta: [{ title: "Simulações e Rio Pomba — Drenagem Inteligente Pádua" }, { name: "description", content: "Central de cenários hidráulicos e avaliação de submersão de lançamentos no Rio Pomba." }] }),
  component: Page,
});

const ST: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_dados: "Aguardando dados",
  pronta: "Pronta para execução",
  em_processamento: "Em processamento",
  concluida: "Concluída",
  concluida_alertas: "Concluída com alertas",
  falhou: "Falhou",
  aguardando_revisao: "Aguardando revisão",
  validada: "Validada tecnicamente",
  rejeitada: "Rejeitada",
};

function Page() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Tables<"simulation_runs">[]>([]);
  const [outfalls, setOutfalls] = useState<Tables<"drainage_nodes">[]>([]);
  const [f, setF] = useState({ name: "", objective: "", engine: "EPA SWMM", engine_version: "", boundary_conditions: "", assumptions: "", status: "rascunho", logs: "", error_message: "" });
  const [editId, setEditId] = useState<string | null>(null);

  // Rio Pomba Outfall Submergence Evaluator state
  const [pomba, setPomba] = useState({ outfallInvert: "89.20", diameterMm: "1000", riverElev: "90.50", upstreamGround: "92.00", datum: "Imbituba (IBGE)", scenarioType: "Cheia histórica selecionada" });

  const load = async () => {
    const [sm, nd] = await Promise.all([
      supabase.from("simulation_runs").select("*").order("created_at", { ascending: false }),
      supabase.from("drainage_nodes").select("*").is("deleted_at", null).eq("node_type", "ponto de lançamento"),
    ]);
    setRows(sm.data ?? []);
    setOutfalls(nd.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const status = editId ? f.status : f.boundary_conditions ? "rascunho" : "aguardando_dados";
    const payload = {
      name: f.name,
      objective: f.objective || null,
      engine: f.engine,
      engine_version: f.engine_version || null,
      boundary_conditions: f.boundary_conditions || null,
      assumptions: f.assumptions || null,
      status,
      logs: f.logs || null,
      error_message: f.error_message || null,
    };
    const { error } = editId
      ? await supabase.from("simulation_runs").update(payload).eq("id", editId)
      : await supabase.from("simulation_runs").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? "Cenário de simulação atualizado." : "Cenário criado.");
    setF({ name: "", objective: "", engine: "EPA SWMM", engine_version: "", boundary_conditions: "", assumptions: "", status: "rascunho", logs: "", error_message: "" });
    setEditId(null);
    load();
  };

  const startEdit = (r: Tables<"simulation_runs">) => {
    setEditId(r.id);
    setF({
      name: r.name,
      objective: r.objective ?? "",
      engine: r.engine ?? "EPA SWMM",
      engine_version: r.engine_version ?? "",
      boundary_conditions: r.boundary_conditions ?? "",
      assumptions: r.assumptions ?? "",
      status: r.status,
      logs: r.logs ?? "",
      error_message: r.error_message ?? "",
    });
  };

  let pombaRes: ReturnType<typeof evaluateOutfallSubmergence> | null = null, pombaErr = "";
  try {
    if (pomba.outfallInvert && pomba.diameterMm && pomba.riverElev) {
      pombaRes = evaluateOutfallSubmergence({
        outfallInvertElevM: +pomba.outfallInvert,
        diameterM: +pomba.diameterMm / 1000,
        riverLevelElevM: +pomba.riverElev,
        upstreamGroundElevM: pomba.upstreamGround ? +pomba.upstreamGround : null,
      });
    }
  } catch (e) { pombaErr = (e as Error).message; }

  const recordPombaCalc = async () => {
    if (!pombaRes) return;
    const { error } = await supabase.from("calculation_runs").insert({
      calc_type: "submersao_rio_pomba",
      method_version: METHOD_VERSIONS.outfallSubmergence,
      inputs: pomba as never,
      outputs: pombaRes as never,
    });
    if (error) toast.error(error.message);
    else toast.success("Avaliação de submersão no Rio Pomba registrada no histórico de cálculos.");
  };

  return (
    <>
      <PageHeader title="Simulações hidráulicas e cheias do Rio Pomba" description="Central de cenários de modelagem (EPA SWMM / HEC-RAS) e avaliação determinística de submersão de lançamentos pelo nível do Rio Pomba." />
      <div className="mb-6">
        <Notice>
          O banco de dados possui trava de integridade (<code className="font-mono">guard_simulation</code>): uma simulação somente pode receber o estado <b>"Concluída"</b> se o motor, a versão e o log real de processamento forem anexados. A instalação de válvula antirretorno impede o retorno do rio, mas pode reter o escoamento pluvial urbano se não houver volume de reservação ou bombeamento.
        </Notice>
      </div>

      {/* Avaliador de Cheias do Rio Pomba e Submersão de Lançamento */}
      <section className="mb-6 rounded-md border bg-card p-4">
        <h2 className="mb-1 font-semibold">Interação Rio Pomba × Pontos de Lançamento (Submersão e Remanso)</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Avalie se o nível do Rio Pomba no ponto de descarga afoga a saída da galeria. Todas as cotas devem estar na mesma referência altimétrica (datum vertical). Não misture leitura de régua linimétrica com cota altimétrica sem conversão documentada.
        </p>
        {outfalls.length > 0 && (
          <div className="mb-3">
            <Label className="text-xs">Preencher a partir de ponto de lançamento cadastrado:</Label>
            <select
              className="h-8 w-full max-w-md rounded-md border bg-background px-2 text-xs"
              onChange={(e) => {
                const nd = outfalls.find((x) => x.id === e.target.value);
                if (nd) {
                  setPomba({
                    ...pomba,
                    outfallInvert: nd.invert_elev_m != null ? String(nd.invert_elev_m) : pomba.outfallInvert,
                    upstreamGround: nd.cover_elev_m != null ? String(nd.cover_elev_m) : pomba.upstreamGround,
                    datum: nd.vertical_datum ?? pomba.datum,
                  });
                }
              }}
            >
              <option value="">Selecionar ponto de lançamento…</option>
              {outfalls.map((o) => (
                <option key={o.id} value={o.id}>{o.code} (Cota fundo: {o.invert_elev_m ?? "?"} m · Datum: {o.vertical_datum ?? "?"})</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-6">
          <div>
            <Label className="text-xs">Tipo de cenário</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-xs" value={pomba.scenarioType} onChange={(e) => setPomba({ ...pomba, scenarioType: e.target.value })}>
              {["Nível habitual do rio", "Nível elevado", "Cheia histórica selecionada", "Cenário de projeto (Eng.)", "Cenário hipotético"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Cota fundo saída (m)</Label>
            <Input type="number" step="any" value={pomba.outfallInvert} onChange={(e) => setPomba({ ...pomba, outfallInvert: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Diâmetro / Altura saída (mm)</Label>
            <Input type="number" step="any" value={pomba.diameterMm} onChange={(e) => setPomba({ ...pomba, diameterMm: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Cota nível Rio Pomba (m)</Label>
            <Input type="number" step="any" value={pomba.riverElev} onChange={(e) => setPomba({ ...pomba, riverElev: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Cota tampa/terreno montante (m)</Label>
            <Input type="number" step="any" value={pomba.upstreamGround} onChange={(e) => setPomba({ ...pomba, upstreamGround: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Datum vertical</Label>
            <Input value={pomba.datum} onChange={(e) => setPomba({ ...pomba, datum: e.target.value })} />
          </div>
        </div>
        {pombaRes ? (
          <div className="mt-3 rounded border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span><b>Diagnóstico ({pomba.scenarioType}):</b> {pombaRes.summary}</span>
              <span className="num text-xs">Geratriz superior: <b>{fmt(pombaRes.crownElevM, 2)} m</b> · Lâmina acima da soleira: <b>{fmt(pombaRes.submergenceDepthM, 2)} m</b></span>
            </div>
            {pombaRes.reverseFlowRisk && (
              <p className="mt-1 text-xs text-destructive">
                Alerta técnico: Possibilidade de refluxo do rio para a galeria e efeito de remanso. Avaliar comporta/válvula antirretorno combinada com reservação ou bombeamento pluvial.
              </p>
            )}
            {can.edit && (
              <Button size="sm" variant="outline" className="mt-2" onClick={recordPombaCalc}>
                Registrar avaliação no histórico de cálculos
              </Button>
            )}
          </div>
        ) : (
          pombaErr && <p className="mt-2 text-xs text-destructive">{pombaErr}</p>
        )}
      </section>

      {can.edit && (
        <form onSubmit={save} className="mb-6 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-3">
          <h3 className="font-semibold md:col-span-3">{editId ? "Editar cenário / Anexar logs de execução" : "Novo cenário de simulação hidráulica"}</h3>
          <div>
            <Label className="text-xs">Nome do cenário *</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Motor hidráulico</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.engine} onChange={(e) => setF({ ...f, engine: e.target.value })}>
              <option>EPA SWMM</option>
              <option>HEC-RAS</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Versão do motor (ex.: 5.2.4 / 6.5)</Label>
            <Input value={f.engine_version} onChange={(e) => setF({ ...f, engine_version: e.target.value })} placeholder="Obrigatório se executada" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Objetivo do estudo</Label>
            <Input value={f.objective} onChange={(e) => setF({ ...f, objective: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Estado de execução</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {Object.entries(ST).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Condições de contorno (nível do rio, hietograma…)</Label>
            <Textarea value={f.boundary_conditions} onChange={(e) => setF({ ...f, boundary_conditions: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Hipóteses adotadas</Label>
            <Textarea value={f.assumptions} onChange={(e) => setF({ ...f, assumptions: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Log real de processamento (SWMM .rpt / HEC-RAS log)</Label>
            <Textarea value={f.logs} onChange={(e) => setF({ ...f, logs: e.target.value })} placeholder="Cole o resumo do relatório de balanço de massa e continuidade do motor…" />
          </div>
          <div className="flex gap-2 md:col-span-3">
            <Button type="submit" className="w-fit">{editId ? "Salvar alterações" : "Criar cenário"}</Button>
            {editId && (
              <Button type="button" variant="outline" onClick={() => { setEditId(null); setF({ name: "", objective: "", engine: "EPA SWMM", engine_version: "", boundary_conditions: "", assumptions: "", status: "rascunho", logs: "", error_message: "" }); }}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <Empty>Nenhum cenário criado.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Cenário</th>
                <th>Motor</th>
                <th>Estado</th>
                <th>Contorno</th>
                <th>Logs</th>
                <th>Criado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">
                    <div>{r.name}</div>
                    {r.objective && <div className="text-xs text-muted-foreground">{r.objective}</div>}
                  </td>
                  <td>{r.engine} {r.engine_version ?? "(não informado)"}</td>
                  <td>{ST[r.status] ?? r.status}</td>
                  <td>{r.boundary_conditions ? "Definido" : <span className="text-destructive">Ausente</span>}</td>
                  <td>{r.logs ? <span className="text-xs text-success">Registrado</span> : <span className="text-xs text-muted-foreground">Não executada</span>}</td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>
                    {can.edit && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                        Editar / Logs
                      </Button>
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
