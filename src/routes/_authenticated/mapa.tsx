import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, QUALITY_LABEL, QUALITY_VAR, Notice, fmt } from "@/components/app/ui-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PADUA } from "@/lib/weather.functions";
import { haversineDistanceM } from "@/lib/hydraulics";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({ meta: [{ title: "Mapa da cidade — Drenagem Inteligente Pádua" }, { name: "description", content: "Mapa interativo com camadas de drenagem, busca e medição de distâncias." }] }),
  component: Page,
});

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v.replace(/var\((.*)\)/, "$1")).trim();

function Page() {
  const el = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState({ floods: true, nodes: true, links: true, inspections: true });
  const [coord, setCoord] = useState<string>("");
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchableItems, setSearchableItems] = useState<{ label: string; lat: number; lon: number }[]>([]);
  const [sources, setSources] = useState<{ name: string; institution: string; imported_at: string | null; integration_status: string }[]>([]);
  const ref = useRef<{ map: any; L: any; groups: Record<string, any>; measureLine?: any } | null>(null);
  const measureModeRef = useRef(false);
  measureModeRef.current = measureMode;

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !el.current) return;
      const map = L.map(el.current).setView([PADUA.lat, PADUA.lon], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap (base de referência, não oficial)", maxZoom: 19 }).addTo(map);
      L.control.scale({ imperial: false }).addTo(map);
      map.on("click", (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setCoord(`${lat.toFixed(6)}, ${lng.toFixed(6)} (WGS84/SIRGAS 2000 ≈; precisão limitada ao zoom do mapa)`);
        if (measureModeRef.current) {
          setMeasurePts((prev) => [...prev, [lat, lng]]);
        }
      });
      const groups = {
        floods: L.layerGroup().addTo(map),
        nodes: L.layerGroup().addTo(map),
        links: L.layerGroup().addTo(map),
        inspections: L.layerGroup().addTo(map),
        measure: L.layerGroup().addTo(map),
      };
      ref.current = { map, L, groups };
      const [fe, nd, lk, vi, ds] = await Promise.all([
        supabase.from("flood_events").select("*").is("deleted_at", null).not("latitude", "is", null),
        supabase.from("drainage_nodes").select("*").is("deleted_at", null).not("latitude", "is", null),
        supabase.from("drainage_links").select("*").is("deleted_at", null),
        supabase.from("field_inspections").select("*").is("deleted_at", null).not("latitude", "is", null),
        supabase.from("data_sources").select("name,institution,imported_at,integration_status"),
      ]);
      setSources(ds.data ?? []);
      const items: { label: string; lat: number; lon: number }[] = [];
      const esc = (s: unknown) => String(s ?? "—").replace(/[<>&]/g, "");
      (fe.data ?? []).forEach((f) => {
        items.push({ label: `Alagamento ${f.code} — ${f.address ?? ""} (${f.neighborhood ?? ""})`, lat: f.latitude!, lon: f.longitude! });
        L.circleMarker([f.latitude!, f.longitude!], { radius: 9, color: css("var(--risk-4)"), fillColor: css(QUALITY_VAR[f.data_quality] ?? ""), fillOpacity: 0.9, weight: 3 })
          .bindPopup(`<b>${esc(f.code)}</b><br/>${esc(f.address)} — ${esc(f.neighborhood)}<br/>Profundidade: ${esc(f.water_depth_m)} m<br/>Hipótese: ${esc(f.cause_hypothesis)}<br/>Origem: ${QUALITY_LABEL[f.data_quality]}`).addTo(groups.floods);
      });
      const byId = new Map((nd.data ?? []).map((n) => [n.id, n]));
      (nd.data ?? []).forEach((n) => {
        items.push({ label: `Nó ${n.code} (${n.node_type})`, lat: n.latitude!, lon: n.longitude! });
        L.circleMarker([n.latitude!, n.longitude!], { radius: 5, color: css("var(--primary)"), fillColor: css(QUALITY_VAR[n.data_quality] ?? ""), fillOpacity: 1, weight: 2 })
          .bindPopup(`<b>${esc(n.code)}</b> (${esc(n.node_type)})<br/>Cota fundo: ${esc(n.invert_elev_m)} m [${esc(n.vertical_datum)}]<br/>Origem: ${QUALITY_LABEL[n.data_quality]}`).addTo(groups.nodes);
      });
      (lk.data ?? []).forEach((l) => {
        const a = l.from_node ? byId.get(l.from_node) : null, b = l.to_node ? byId.get(l.to_node) : null;
        if (a && b) L.polyline([[a.latitude!, a.longitude!], [b.latitude!, b.longitude!]], { color: css("var(--water)"), weight: 4, dashArray: l.data_quality === "pendente_validacao" ? "6 6" : undefined })
          .bindPopup(`<b>${esc(l.code)}</b><br/>DN ${esc(l.diameter_mm)} mm · L ${esc(l.length_m)} m`).addTo(groups.links);
      });
      (vi.data ?? []).forEach((v) => {
        items.push({ label: `Vistoria ${v.code} (${v.team ?? ""})`, lat: v.latitude!, lon: v.longitude! });
        L.circleMarker([v.latitude!, v.longitude!], { radius: 6, color: css("var(--q-field)"), fillColor: css("var(--q-field)"), fillOpacity: 0.85, weight: 2 })
          .bindPopup(`<b>Vistoria ${esc(v.code)}</b><br/>Equipe: ${esc(v.team)}<br/>Condição: ${esc(v.structure_condition)} · Obstrução: ${esc(v.obstruction_level)}<br/>Constatações: ${esc(v.findings)}`).addTo(groups.inspections);
      });
      setSearchableItems(items);
    })();
    return () => { disposed = true; ref.current?.map.remove(); ref.current = null; };
  }, []);

  useEffect(() => {
    const r = ref.current; if (!r) return;
    (Object.keys(layers) as (keyof typeof layers)[]).forEach((k) => { if (layers[k]) r.groups[k].addTo(r.map); else r.groups[k].remove(); });
  }, [layers]);

  useEffect(() => {
    const r = ref.current; if (!r) return;
    r.groups.measure.clearLayers();
    if (measurePts.length >= 1) {
      measurePts.forEach((pt) => r.L.circleMarker(pt, { radius: 4, color: "#111" }).addTo(r.groups.measure));
    }
    if (measurePts.length >= 2) {
      r.L.polyline(measurePts, { color: "#111", weight: 2, dashArray: "4 4" }).addTo(r.groups.measure);
    }
  }, [measurePts]);

  const totalDistanceM = measurePts.reduce((acc, pt, idx) => {
    if (idx === 0) return 0;
    const prev = measurePts[idx - 1];
    return acc + haversineDistanceM(prev[0], prev[1], pt[0], pt[1]);
  }, 0);

  const matchingSearch = searchQuery.trim()
    ? searchableItems.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  return (
    <>
      <PageHeader title="Mapa da cidade" description="Camadas interativas do cadastro técnico, busca por rua/bairro/identificador e ferramenta de medição de distâncias horizontais." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Input placeholder="Buscar rua, bairro ou código…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          {matchingSearch.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-[1000] rounded-md border bg-card p-1 shadow-md">
              {matchingSearch.map((m) => (
                <button
                  key={m.label}
                  className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                  onClick={() => {
                    ref.current?.map.setView([m.lat, m.lon], 17);
                    setSearchQuery("");
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button size="sm" variant={measureMode ? "default" : "outline"} onClick={() => setMeasureMode(!measureMode)}>
          {measureMode ? "Medindo distância (clique no mapa)" : "Medir distância"}
        </Button>
        {measurePts.length > 0 && (
          <>
            <span className="num text-xs font-medium">
              Distância acumulada ({measurePts.length} pts): <b>{fmt(totalDistanceM, 1)} m</b> (esférica aproximada)
            </span>
            <Button size="sm" variant="ghost" onClick={() => setMeasurePts([])}>Limpar medição</Button>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div ref={el} className="h-[65vh] min-h-[400px] rounded-md border" />
        <aside className="space-y-4 text-sm">
          <div className="rounded-md border bg-card p-3"><h3 className="mb-2 font-semibold">Camadas vetoriais</h3>
            {([
              ["floods", "Pontos de alagamento"],
              ["nodes", "Nós e lançamentos da rede"],
              ["links", "Galerias / manilhas"],
              ["inspections", "Vistorias de campo"],
            ] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 py-1"><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{l}</label>))}
            <div className="mt-2 border-t pt-2 text-xs font-semibold text-muted-foreground">Bases externas (Central de dados)</div>
            {sources.slice(0, 4).map((s) => (
              <div key={s.name} className="py-0.5 text-xs text-muted-foreground">
                {s.imported_at || s.integration_status === "ativa" ? "☑" : "☐"} {s.institution}: {s.imported_at ? "Importada" : "Pendente"}
              </div>
            ))}
          </div>
          <div className="rounded-md border bg-card p-3"><h3 className="mb-2 font-semibold">Legenda de origem</h3>
            {Object.entries(QUALITY_LABEL).map(([k, l]) => <div key={k} className="flex items-center gap-2 py-0.5"><span className="h-3 w-3 rounded-full" style={{ background: QUALITY_VAR[k] }} />{l}</div>)}
            <div className="mt-2 text-xs text-muted-foreground">Trecho tracejado = pendente de validação.</div></div>
          {coord && <div className="rounded-md border bg-card p-3 text-xs"><b>Coordenada consultada:</b><br />{coord}</div>}
        </aside>
      </div>
      <div className="mt-4"><Notice tone="info">O mapa base (OpenStreetMap) é apenas referência visual e não substitui base cartográfica oficial.</Notice></div>
    </>
  );
}
