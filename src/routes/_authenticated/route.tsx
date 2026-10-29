import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Map, Droplets, Network, Calculator, Activity, CloudRain, Database, ClipboardCheck, Shield, LogOut, Menu, X, Mountain, Waves, FileText, GitCompare, ShieldCheck, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/painel", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mapa", label: "Mapa da cidade", icon: Map },
  { to: "/alagamentos", label: "Pontos de alagamento", icon: Droplets },
  { to: "/infraestrutura", label: "Infraestrutura de drenagem", icon: Network },
  { to: "/calculos", label: "Cálculos hidráulicos", icon: Calculator },
  { to: "/simulacoes", label: "Simulações", icon: Activity },
  { to: "/previsao", label: "Previsão do tempo e alertas", icon: CloudRain },
  { to: "/central-dados", label: "Central de dados", icon: Database },
  { to: "/revisao", label: "Revisão e aprovação", icon: ClipboardCheck },
  { to: "/administracao", label: "Administração", icon: Shield },
] as const;

const NEXT = [
  { label: "Vistorias de campo", icon: ClipboardList },
  { label: "Relevo e topografia", icon: Mountain },
  { label: "Bacias e hidrologia", icon: Waves },
  { label: "Comparação de alternativas", icon: GitCompare },
  { label: "Qualidade dos dados", icon: ShieldCheck },
  { label: "Relatórios", icon: FileText },
];

function Shell() {
  const [open, setOpen] = useState(false);
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const nav = (
    <nav className="flex h-full flex-col gap-1 p-3 text-sm">
      <div className="mb-4 px-2 pt-2">
        <div className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Santo Antônio de Pádua — RJ</div>
        <div className="text-lg font-semibold text-sidebar-foreground">Drenagem Inteligente</div>
      </div>
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded px-2 py-2 text-sidebar-foreground/85 hover:bg-sidebar-accent"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground font-medium" }}>
          <Icon className="h-4 w-4" />{label}
        </Link>
      ))}
      <div className="mt-4 px-2 text-xs uppercase tracking-widest text-sidebar-foreground/50">Próximas fases</div>
      {NEXT.map(({ label, icon: Icon }) => (
        <div key={label} className="flex items-center gap-2 px-2 py-1.5 text-sidebar-foreground/40" title="Em desenvolvimento">
          <Icon className="h-4 w-4" />{label}
        </div>
      ))}
      <div className="mt-auto border-t border-sidebar-border px-2 pt-3 text-xs text-sidebar-foreground/70">
        <div className="truncate">{user?.email}</div>
        <div>{roles.length ? roles.map((r) => ROLE_LABEL[r]).join(", ") : "Sem perfil atribuído"}</div>
        <button className="mt-2 flex items-center gap-1 hover:text-sidebar-foreground"
          onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
          <LogOut className="h-3 w-3" /> Sair
        </button>
      </div>
    </nav>
  );
  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-sidebar lg:block">{nav}</aside>
      <div className={cn("fixed inset-0 z-[1000] lg:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
        <aside className="relative h-full w-72 overflow-y-auto bg-sidebar">{nav}</aside>
      </div>
      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-[900] flex items-center gap-3 border-b bg-card px-4 py-2 lg:hidden">
          <button aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <span className="font-semibold">Drenagem Inteligente Pádua</span>
        </header>
        <main className="mx-auto max-w-7xl p-4 md:p-8">
          {!roles.length && user && (
            <div className="mb-4 rounded-md border-l-4 border-warning bg-warning/15 p-3 text-sm text-warning-foreground">
              Sua conta ainda não possui perfil de acesso. Solicite a um administrador a atribuição de um perfil.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
