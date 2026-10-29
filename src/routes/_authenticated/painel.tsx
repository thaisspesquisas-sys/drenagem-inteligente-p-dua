import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Stat, Notice, fmtDate } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Dashboard — Drenagem Inteligente Pádua" }, { name: "description", content: "Indicadores reais da drenagem urbana." }] }),
  component: Painel,
});

type Counts = Record<string, number | null>;

function Painel() {
  const [c, setC] = useState<Counts>({});
  const [byHood, setByHood] = useState<[string, number][]>([]);
  const [sources, setSources] = useState<{ name: string; institution: string; integration_status: string; updated_at: string; imported_at: string | null }[]>([]);
  useEffect(() => {
    const count = async (t: "flood_events" | "drainage_links" | "drainage_nodes" | "simulation_runs" | "technical_reviews", f?: (q: any) => any) => {
      let q: any = supabase.from(t).select("id", { count: "exact", head: true });
      if (f) q = f(q);
      const { count } = await q; return count ?? 0;
    };
    (async () => {
      const [floods, uninspected, links, incomplete, nodes, simDone, simFail, simPend, revPend] = await Promise.all([
        count("flood_events", (q) => q.is("deleted_at", null)),
        count("flood_events", (q) => q.is("deleted_at", null).eq("diagnosis_status", "nao_vistoriado")),
        count("drainage_links", (q) => q.is("deleted_at", null)),
        count("drainage_links", (q) => q.is("deleted_at", null).or("upstream_invert_m.is.null,downstream_invert_m.is.null,length_m.is.null")),
        count("drainage_nodes", (q) => q.is("deleted_at", null)),
        count("simulation_runs", (q) => q.in("status", ["concluida", "concluida_alertas", "validada"])),
        count("simulation_runs", (q) => q.eq("status", "falhou")),
        count("simulation_runs", (q) => q.in("status", ["rascunho", "aguardando_dados", "pronta", "em_processamento"])),
        count("technical_reviews", (q) => q.eq("decision", "pendente")),
      ]);
      setC({ floods, uninspected, links, incomplete, nodes, simDone, simFail, simPend, revPend });
      const { data: fe } = await supabase.from("flood_events").select("neighborhood").is("deleted_at", null);
      const m = new Map<string, number>();
      (fe ?? []).forEach((r) => m.set(r.neighborhood || "Sem bairro", (m.get(r.neighborhood || "Sem bairro") ?? 0) + 1));
      setByHood([...m.entries()].sort((a, b) => b[1] - a[1]));
      const { data: ds } = await supabase.from("data_sources").select("name,institution,integration_status,updated_at,imported_at").order("institution");
      setSources(ds ?? []);
    })();
  }, []);
  const v = (k: string) => (c[k] ?? "…");
  return (
    <>
      <PageHeader title="Dashboard" description="Todos os indicadores são contados diretamente do banco de dados. Valores zero indicam ausência de registros." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pontos de alagamento" value={v("floods")} />
        <Stat label="Sem vistoria" value={v("uninspected")} />
        <Stat label="Trechos de drenagem" value={v("links")} />
        <Stat label="Trechos com dados incompletos" value={v("incomplete")} hint="Sem cota ou comprimento" />
        <Stat label="Nós cadastrados" value={v("nodes")} />
        <Stat label="Simulações concluídas" value={v("simDone")} />
        <Stat label="Simulações com falha" value={v("simFail")} />
        <Stat label="Revisões pendentes" value={v("revPend")} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border bg-card p-4">
          <h2 className="mb-3 font-semibold">Ocorrências por bairro</h2>
          {byHood.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ocorrência registrada. <Link to="/alagamentos" className="text-water underline">Cadastrar ponto</Link></p> :
            <ul className="space-y-1 text-sm">{byHood.map(([n, k]) => <li key={n} className="flex justify-between border-b py-1"><span>{n}</span><span className="num">{k}</span></li>)}</ul>}
        </section>
        <section className="rounded-md border bg-card p-4">
          <h2 className="mb-3 font-semibold">Fontes de dados</h2>
          <ul className="space-y-1 text-sm">{sources.map((s) => (
            <li key={s.name} className="flex justify-between gap-2 border-b py-1">
              <span className="truncate">{s.institution} — {s.name}</span>
              <span className={s.integration_status === "ativa" ? "text-success" : "text-muted-foreground"}>{s.integration_status === "ativa" ? "Ativa" : s.imported_at ? `Importada ${fmtDate(s.imported_at)}` : "Integração pendente"}</span>
            </li>))}</ul>
        </section>
      </div>
      <div className="mt-6"><Notice>Os resultados desta plataforma apoiam estudos técnicos e não substituem projeto executivo, ART ou avaliação de profissional habilitado.</Notice></div>
    </>
  );
}
