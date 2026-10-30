import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Map,
  Droplets,
  Network,
  Calculator,
  Activity,
  CloudRain,
  Database,
  ClipboardCheck,
  Shield,
  LogOut,
  Menu,
  X,
  Mountain,
  Waves,
  FileText,
  GitCompare,
  ShieldCheck,
  ClipboardList,
  Search,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL } from "@/hooks/useAuth";
import { WeatherThemeProvider, WeatherBackdropControls } from "@/components/app/WeatherBackdrop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

const NAV_GROUPS = [
  {
    group: "Monitoramento & Operação",
    items: [
      { to: "/painel", label: "Dashboard Principal", icon: LayoutDashboard },
      { to: "/mapa", label: "Mapa Geográfico", icon: Map },
      { to: "/previsao", label: "Previsão & Alertas", icon: CloudRain },
    ],
  },
  {
    group: "Cadastro & Campo",
    items: [
      { to: "/alagamentos", label: "Pontos de Alagamento", icon: Droplets },
      { to: "/vistorias", label: "Vistorias de Campo", icon: ClipboardList },
      { to: "/infraestrutura", label: "Rede de Drenagem", icon: Network },
      { to: "/topografia", label: "Relevo & Topografia", icon: Mountain },
    ],
  },
  {
    group: "Engenharia & Modelagem",
    items: [
      { to: "/bacias", label: "Bacias & Hidrologia", icon: Waves },
      { to: "/calculos", label: "Cálculos Hidráulicos", icon: Calculator },
      { to: "/simulacoes", label: "Simulações & Rio Pomba", icon: Activity },
      { to: "/alternativas", label: "Alternativas de Obra", icon: GitCompare },
    ],
  },
  {
    group: "Governança & Dados",
    items: [
      { to: "/qualidade", label: "Qualidade dos Dados", icon: ShieldCheck },
      { to: "/relatorios", label: "Relatórios Técnicos", icon: FileText },
      { to: "/revisao", label: "Revisão & Aprovação", icon: ClipboardCheck },
      { to: "/central-dados", label: "Central de Dados", icon: Database },
      { to: "/administracao", label: "Administração", icon: Shield },
    ],
  },
] as const;

function AuthenticatedLayout() {
  return (
    <WeatherThemeProvider>
      <Shell />
    </WeatherThemeProvider>
  );
}

function Shell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  const userInitial = (user?.email?.[0] ?? "U").toUpperCase();

  const nav = (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Brand Header */}
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-water/20 text-water ring-1 ring-water/40">
            <Droplets className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
              Santo Antônio de Pádua · RJ
            </div>
            <div className="truncate text-base font-bold tracking-tight text-sidebar-foreground">
              Drenagem Inteligente
            </div>
          </div>
        </div>

        {/* Quick Module Search */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-sidebar-foreground/45" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar módulo…"
            className="h-7 w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 pl-8 pr-2 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/45 focus:border-water focus:outline-none"
          />
        </div>
      </div>

      {/* Grouped Navigation Items */}
      <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3 text-sm">
        {NAV_GROUPS.map(({ group, items }) => {
          const visible = items.filter(
            (i) => !filter.trim() || i.label.toLowerCase().includes(filter.toLowerCase())
          );
          if (visible.length === 0) return null;
          return (
            <div key={group}>
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                {group}
              </div>
              <div className="space-y-0.5">
                {visible.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-foreground font-semibold shadow-2xs ring-1 ring-white/10",
                    }}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="h-4 w-4 shrink-0 text-water transition-transform group-hover:scale-105" />
                      <span className="truncate">{label}</span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-sidebar-border bg-black/15 p-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent font-semibold text-sidebar-foreground ring-1 ring-white/15">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-sidebar-foreground">{user?.email}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/65">
              {roles.length ? roles.map((r) => ROLE_LABEL[r]).join(" · ") : "Sem perfil atribuído"}
            </div>
          </div>
        </div>
        <button
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-sidebar-border bg-sidebar-accent/40 py-1.5 text-xs font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="h-3.5 w-3.5" /> Encerrar sessão
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 shadow-lg lg:block">
        {nav}
      </aside>
      <div className={cn("fixed inset-0 z-[1000] lg:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-foreground/50 backdrop-blur-xs" onClick={() => setOpen(false)} />
        <aside className="relative h-full w-72 shadow-2xl">{nav}</aside>
      </div>
      <div className="min-w-0 flex-1">
        {/* Top Institutional & Weather Status Bar */}
        <header className="no-print sticky top-0 z-[900] flex flex-wrap items-center justify-between gap-2 border-b bg-card/80 px-4 py-2.5 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Menu"
              className="rounded-md border p-1.5 hover:bg-accent lg:hidden"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Prefeitura / Equipe Técnica</span>
              <span className="hidden sm:inline"> · Sistema Municipal de Drenagem Urbana e Hidrologia</span>
            </div>
          </div>
          <WeatherBackdropControls />
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
