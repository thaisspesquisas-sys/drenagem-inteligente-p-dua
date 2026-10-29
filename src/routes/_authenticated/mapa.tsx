import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, QUALITY_LABEL, QUALITY_VAR, Notice } from "@/components/app/ui-bits";
import { PADUA } from "@/lib/weather.functions";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({ meta: [{ title: "Mapa da cidade — Drenagem Inteligente Pádua" }, { name: "description", content: "Mapa interativo com camadas de drenagem." }] }),
  component: Page,
});

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v.replace(/var\((.*)\)/, "$1")).trim();

function Page() {
  const el = useRef<HTMLDivElement>(null);
  const [layers, setLayers] = useState({ floods: true, nodes: true, links: true });
  const [coord, setCoord] = useState<string>("");
  const ref = useRef<{ map: any; groups: Record<string, any> } | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !el.current) return;
      const map = L.map(el.current).setView([PADUA.lat, PADUA.lon], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap (base de referência, não oficial)", maxZoom: 19 }).addTo(map);
      L.control.scale({ imperial: false }).addTo(map);
      map.on("click", (e: any) => setCoord(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)} (WGS84/SIRGAS 2000 ≈; precisão limitada ao zoom do mapa)`));
      const groups = { floods: L.layerGroup().addTo(map), nodes: L.layerGroup().addTo(map), links: L.layerGroup().addTo(map) };
      ref.current = { map, groups };
      const [fe, nd, lk] = await Promise.all([
        supabase.from("flood_events").select("*").is("deleted_at", null).not("latitude", "is", null),
        supabase.from("drainage_nodes").select("*").is("deleted_at", null).not("latitude", "is", null),
        supabase.from("drainage_links").select("*").is("deleted_at", null),
      ]);
      const esc = (s: unknown) => String(s ?? "—").replace(/[<>&]/g, "");
      (fe.data ?? []).forEach((f) => L.circleMarker([f.latitude!, f.longitude!], { radius: 9, color: css("var(--risk-4)"), fillColor: css(QUALITY_VAR[f.data_quality]), fillOpacity: 0.9, weight: 3 })
        .bindPopup(`<b>${esc(f.code)}</b><br/>${esc(f.address)} — ${esc(f.neighborhood)}<br/>Profundidade: ${esc(f.water_depth_m)} m<br/>Hipótese: ${esc(f.cause_hypothesis)}<br/>Origem: ${QUALITY_LABEL[f.data_quality]}`).addTo(groups.floods));
      const byId = new Map((nd.data ?? []).map((n) => [n.id, n]));
      (nd.data ?? []).forEach((n) => L.circleMarker([n.latitude!, n.longitude!], { radius: 5, color: css("var(--primary)"), fillColor: css(QUALITY_VAR[n.data_quality]), fillOpacity: 1, weight: 2 })
        .bindPopup(`<b>${esc(n.code)}</b> (${esc(n.node_type)})<br/>Cota fundo: ${esc(n.invert_elev_m)} m [${esc(n.vertical_datum)}]<br/>Origem: ${QUALITY_LABEL[n.data_quality]}`).addTo(groups.nodes));
      (lk.data ?? []).forEach((l) => { const a = l.from_node ? byId.get(l.from_node) : null, b = l.to_node ? byId.get(l.to_node) : null;
        if (a && b) L.polyline([[a.latitude!, a.longitude!], [b.latitude!, b.longitude!]], { color: css("var(--water)"), weight: 4, dashArray: l.data_quality === "pendente_validacao" ? "6 6" : undefined })
          .bindPopup(`<b>${esc(l.code)}</b><br/>DN ${esc(l.diameter_mm)} mm · L ${esc(l.length_m)} m`).addTo(groups.links); });
    })();
    return () => { disposed = true; ref.current?.map.remove(); ref.current = null; };
  }, []);

  useEffect(() => {
    const r = ref.current; if (!r) return;
    (Object.keys(layers) as (keyof typeof layers)[]).forEach((k) => { if (layers[k]) r.groups[k].addTo(r.map); else r.groups[k].remove(); });
  }, [layers]);

  return (
    <>
      <PageHeader title="Mapa da cidade" description="Camadas carregadas exclusivamente do cadastro. Limites, DEM e camadas oficiais serão exibidos após importação na Central de dados." />
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div ref={el} className="h-[65vh] min-h-[400px] rounded-md border" />
        <aside className="space-y-4 text-sm">
          <div className="rounded-md border bg-card p-3"><h3 className="mb-2 font-semibold">Camadas</h3>
            {([["floods", "Pontos de alagamento"], ["nodes", "Nós da rede"], ["links", "Galerias / manilhas"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 py-1"><input type="checkbox" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />{l}</label>))}
            {["Limite municipal (IBGE)", "Modelo digital de elevação (TOPODATA)", "Suscetibilidade (SGB)", "Estações hidrológicas (ANA)"].map((l) => <div key={l} className="py-1 text-muted-foreground">☐ {l} — importação pendente</div>)}
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
