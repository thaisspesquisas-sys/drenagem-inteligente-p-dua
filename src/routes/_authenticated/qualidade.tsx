import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, QualityBadge, Stat, Notice, fmt, QUALITY_LABEL } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { haversineDistanceM } from "@/lib/hydraulics";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade dos dados — Drenagem Inteligente Pádua" },
      { name: "description", content: "Auditoria automatizada de consistência topológica, altimétrica e documental." },
    ],
  }),
  component: Page,
});

type Finding = {
  severity: "erro" | "alerta" | "info";
  category: string;
  entity: string;
  message: string;
  linkTo: string;
};

function Page() {
  const [floods, setFloods] = useState<Tables<"flood_events">[]>([]);
  const [nodes, setNodes] = useState<Tables<"drainage_nodes">[]>([]);
  const [links, setLinks] = useState<Tables<"drainage_links">[]>([]);
  const [surveys, setSurveys] = useState<Tables<"topo_surveys">[]>([]);
  const [basins, setBasins] = useState<Tables<"basins">[]>([]);
  const [sources, setSources] = useState<Tables<"data_sources">[]>([]);
  const [sims, setSims] = useState<Tables<"simulation_runs">[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [fe, nd, lk, ts, bs, ds, sm] = await Promise.all([
      supabase.from("flood_events").select("*").is("deleted_at", null),
      supabase.from("drainage_nodes").select("*").is("deleted_at", null),
      supabase.from("drainage_links").select("*").is("deleted_at", null),
      supabase.from("topo_surveys").select("*").is("deleted_at", null),
      supabase.from("basins").select("*").is("deleted_at", null),
      supabase.from("data_sources").select("*"),
      supabase.from("simulation_runs").select("*"),
    ]);
    setFloods(fe.data ?? []);
    setNodes(nd.data ?? []);
    setLinks(lk.data ?? []);
    setSurveys(ts.data ?? []);
    setBasins(bs.data ?? []);
    setSources(ds.data ?? []);
    setSims(sm.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const findings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const connectedNodes = new Set(links.flatMap((l) => [l.from_node, l.to_node]).filter(Boolean));

    // 1. Flood events checks
    floods.forEach((f) => {
      if (f.latitude == null || f.longitude == null) {
        out.push({ severity: "alerta", category: "Georreferenciamento", entity: `Alagamento ${f.code}`, message: "Coordenadas geográficas ausentes.", linkTo: "/alagamentos" });
      }
      if (f.cause_confirmed && f.diagnosis_status === "nao_vistoriado") {
        out.push({ severity: "erro", category: "Consistência", entity: `Alagamento ${f.code}`, message: "Causa marcada como confirmada, mas status ainda é 'Não vistoriado'.", linkTo: "/alagamentos" });
      }
    });

    // 2. Nodes checks
    nodes.forEach((n) => {
      if (!connectedNodes.has(n.id) && links.length > 0) {
        out.push({ severity: "alerta", category: "Topologia da rede", entity: `Nó ${n.code}`, message: "Nó isolado sem conexão com nenhum trecho de galeria/manilha.", linkTo: "/infraestrutura" });
      }
      if ((n.cover_elev_m != null || n.invert_elev_m != null) && !n.vertical_datum) {
        out.push({ severity: "erro", category: "Referência altimétrica", entity: `Nó ${n.code}`, message: "Cota altimétrica informada sem datum vertical identificado.", linkTo: "/infraestrutura" });
      }
      if (n.cover_elev_m != null && n.invert_elev_m != null && Number(n.invert_elev_m) >= Number(n.cover_elev_m)) {
        out.push({ severity: "erro", category: "Geometria", entity: `Nó ${n.code}`, message: "Cota de fundo maior ou igual à cota da tampa.", linkTo: "/infraestrutura" });
      }
    });

    // 3. Links checks
    links.forEach((l) => {
      if (!l.from_node || !l.to_node) {
        out.push({ severity: "erro", category: "Topologia da rede", entity: `Trecho ${l.code}`, message: "Trecho sem nó de montante ou de jusante vinculado.", linkTo: "/infraestrutura" });
      }
      if (l.upstream_invert_m == null || l.downstream_invert_m == null) {
        out.push({ severity: "alerta", category: "Cotas ausentes", entity: `Trecho ${l.code}`, message: "Cotas de fundo de montante e/ou jusante ausentes.", linkTo: "/infraestrutura" });
      } else {
        if (!l.vertical_datum) {
          out.push({ severity: "erro", category: "Referência altimétrica", entity: `Trecho ${l.code}`, message: "Cotas de fundo informadas sem referência altimétrica (datum).", linkTo: "/infraestrutura" });
        }
        if (Number(l.upstream_invert_m) < Number(l.downstream_invert_m)) {
          out.push({ severity: "erro", category: "Declividade adversa", entity: `Trecho ${l.code}`, message: "Cota de montante inferior à cota de jusante (declividade negativa).", linkTo: "/infraestrutura" });
        }
      }
      const a = l.from_node ? nodeById.get(l.from_node) : null;
      const b = l.to_node ? nodeById.get(l.to_node) : null;
      if (a && b && a.vertical_datum && b.vertical_datum && a.vertical_datum !== b.vertical_datum) {
        out.push({ severity: "erro", category: "Sistemas diferentes", entity: `Trecho ${l.code}`, message: `Nós extremos possuem datums verticais distintos (${a.vertical_datum} vs ${b.vertical_datum}).`, linkTo: "/infraestrutura" });
      }
      if (a?.latitude != null && a?.longitude != null && b?.latitude != null && b?.longitude != null && l.length_m != null) {
        const distGeo = haversineDistanceM(a.latitude, a.longitude, b.latitude, b.longitude);
        const diff = Math.abs(distGeo - Number(l.length_m));
        if (distGeo > 5 && diff / distGeo > 0.35) {
          out.push({
            severity: "alerta",
            category: "Comprimento inconsistente",
            entity: `Trecho ${l.code}`,
            message: `Comprimento cadastrado (${fmt(Number(l.length_m), 1)} m) diverge mais de 35% da distância entre coordenadas dos nós (${fmt(distGeo, 1)} m).`,
            linkTo: "/infraestrutura",
          });
        }
      }
    });

    // 4. Topo surveys checks
    surveys.forEach((s) => {
      if (!s.vertical_datum) {
        out.push({ severity: "erro", category: "Referência altimétrica", entity: `Levantamento ${s.name}`, message: "Levantamento sem datum vertical registrado.", linkTo: "/topografia" });
      }
      if (s.equipment?.toLowerCase().includes("gps comum") && s.data_quality === "confirmado_levantamento") {
        out.push({ severity: "erro", category: "Precisão inadequada", entity: `Levantamento ${s.name}`, message: "GPS comum de celular classificado indevidamente como confirmado por levantamento.", linkTo: "/topografia" });
      }
    });

    // 5. Basins checks
    basins.forEach((b) => {
      if (!b.area_km2 || !b.runoff_c) {
        out.push({ severity: "alerta", category: "Parâmetros hidrológicos", entity: `Bacia ${b.code}`, message: "Área ou coeficiente de escoamento superficial (C) não documentado.", linkTo: "/bacias" });
      }
    });

    // 6. Simulations checks
    sims.forEach((s) => {
      if (!s.boundary_conditions) {
        out.push({ severity: "alerta", category: "Condições de contorno", entity: `Simulação ${s.name}`, message: "Cenário sem condições de contorno documentadas.", linkTo: "/simulacoes" });
      }
    });

    // 7. Data sources checks
    sources.forEach((ds) => {
      if (ds.integration_status === "pendente" && !ds.imported_at) {
        out.push({ severity: "info", category: "Fontes pendentes", entity: `${ds.institution} — ${ds.name}`, message: "Fonte oficial catalogada, aguardando importação manual de arquivos.", linkTo: "/central-dados" });
      }
    });

    return out;
  }, [floods, nodes, links, surveys, basins, sims, sources]);

  const qualityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(QUALITY_LABEL).forEach((k) => (counts[k] = 0));
    [...floods, ...nodes, ...links, ...surveys, ...basins].forEach((r) => {
      counts[r.data_quality] = (counts[r.data_quality] ?? 0) + 1;
    });
    return counts;
  }, [floods, nodes, links, surveys, basins]);

  const errCount = findings.filter((f) => f.severity === "erro").length;
  const warnCount = findings.filter((f) => f.severity === "alerta").length;

  return (
    <>
      <PageHeader
        title="Controle de qualidade e confiabilidade dos dados"
        description="Verificação automática de cotas ausentes, referências altimétricas, topologia de rede, comprimentos inconsistentes e origem da informação."
        actions={<Button variant="outline" onClick={load} disabled={loading}>{loading ? "Verificando…" : "Reexecutar verificação"}</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Inconsistências críticas (erros)" value={errCount} hint="Exigem correção técnica" />
        <Stat label="Alertas de completude" value={warnCount} hint="Cotas/conexões pendentes" />
        <Stat label="Confirmados em campo" value={qualityCounts.confirmado_levantamento ?? 0} />
        <Stat label="Pendentes de validação" value={qualityCounts.pendente_validacao ?? 0} />
      </div>

      <section className="mt-6 rounded-md border bg-card p-4">
        <h2 className="mb-3 font-semibold">Distribuição por classificação de origem</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          A classificação descreve a origem da informação e não substitui avaliação formal da precisão cartográfica ou topográfica.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(QUALITY_LABEL).map(([k, label]) => (
            <div key={k} className="rounded border p-3">
              <QualityBadge q={k} />
              <div className="num mt-2 text-xl font-semibold">{qualityCounts[k] ?? 0}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border bg-card p-4">
        <h2 className="mb-3 font-semibold">Relatório de verificação automática ({findings.length})</h2>
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma inconsistência encontrada nos registros atuais.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Severidade</th>
                  <th>Categoria</th>
                  <th>Item</th>
                  <th>Diagnóstico</th>
                  <th>Módulo</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <span
                        className={
                          f.severity === "erro"
                            ? "font-semibold text-destructive"
                            : f.severity === "alerta"
                              ? "font-medium text-warning-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {f.severity.toUpperCase()}
                      </span>
                    </td>
                    <td>{f.category}</td>
                    <td className="font-medium">{f.entity}</td>
                    <td>{f.message}</td>
                    <td>
                      <Link to={f.linkTo} className="text-xs text-water underline">
                        Abrir módulo
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6">
        <Notice tone="info">
          Todos os cálculos registrados no sistema preservam os valores de entrada e a versão exata do método (<code className="font-mono">method_version</code>), garantindo reprodutibilidade integral.
        </Notice>
      </div>
    </>
  );
}

