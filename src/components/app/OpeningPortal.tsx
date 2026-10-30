import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CloudRain,
  Map,
  Activity,
  ShieldCheck,
  ArrowRight,
  Award,
  Sparkles,
  Lock,
  UserPlus,
  KeyRound,
  Compass,
  Waves,
  CheckCircle2,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLogo, CREATOR_SIGNATURE } from "@/components/app/AppLogo";
import { InstallAppButton } from "@/components/app/InstallAppPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWeather, type WeatherPayload } from "@/lib/weather.functions";
import { ROLE_LABEL, type AppRole } from "@/hooks/useAuth";
import {
  fetchSystemAclStore,
  getDefaultCapabilitiesForRoles,
  getDefaultToolsForRoles,
  saveSystemAclStore,
} from "@/lib/user-permissions";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    icon: CloudRain,
    title: "Meteorologia Oficial INMET",
    desc: "Previsão por turno (Manhã, Tarde e Noite), telemetria da Estação A604 e avisos ativos para Santo Antônio de Pádua.",
    color: "text-sky-400 bg-sky-500/15 border-sky-400/30",
  },
  {
    icon: Map,
    title: "SIG & Rede de Drenagem",
    desc: "Mapa interativo de condutos, galerias, poços de visita, pontos críticos de alagamento e vistorias de campo.",
    color: "text-emerald-400 bg-emerald-500/15 border-emerald-400/30",
  },
  {
    icon: Activity,
    title: "Hidráulica & Rio Pomba",
    desc: "Equações de Manning, Kirpich e Método Racional auditáveis, com simulação de remanso e submersão de lançamento.",
    color: "text-amber-400 bg-amber-500/15 border-amber-400/30",
  },
  {
    icon: ShieldCheck,
    title: "Governança & Controle de Acesso",
    desc: "Revisão técnica com CREA, emissão de relatórios oficiais e administração granular de usuários e ferramentas.",
    color: "text-indigo-400 bg-indigo-500/15 border-indigo-400/30",
  },
];

export function OpeningPortal() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [crea, setCrea] = useState("");
  const [organization, setOrganization] = useState(
    "Prefeitura Municipal de Santo Antônio de Pádua"
  );
  const [requestedRole, setRequestedRole] = useState<AppRole>("engineer");
  const [busy, setBusy] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    fullName?: string;
  } | null>(null);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name as string | undefined,
        });
      }
    });

    getWeather({ data: {} })
      .then((res) => {
        if (res?.payload) setWeather(res.payload);
      })
      .catch(() => undefined);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo(a) à plataforma Drenagem Inteligente Pádua!");
        navigate({ to: "/painel" });
      } else if (mode === "up") {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;

        // Register the new account in the administrative ACL directory so admins see their requested profile & details immediately
        if (signUpData.user?.id) {
          const store = await fetchSystemAclStore();
          store.users[signUpData.user.id] = {
            userId: signUpData.user.id,
            email: email.trim(),
            fullName: name.trim(),
            crea: crea.trim(),
            organization: organization.trim(),
            jobTitle: ROLE_LABEL[requestedRole],
            status: "pending",
            allowedTools: getDefaultToolsForRoles([requestedRole]),
            capabilities: getDefaultCapabilitiesForRoles([requestedRole]),
            notes: `Perfil solicitado no cadastro: ${ROLE_LABEL[requestedRole]}`,
            updatedAt: new Date().toISOString(),
          };
          await saveSystemAclStore(store);
        }

        toast.success(
          "Conta criada com sucesso! Confirme seu e-mail ou aguarde a liberação na Administração."
        );
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(
          "Se o e-mail estiver cadastrado, você receberá um link de redefinição."
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na operação");
    } finally {
      setBusy(false);
    }
  };

  const tempDisplay =
    weather?.inmet?.station?.temperaturaC ??
    weather?.current?.temperature_2m ??
    null;
  const summaryDisplay =
    weather?.inmet?.currentSummary ||
    "Monitoramento Meteorológico INMET Ativo";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient Animated Hydrological Backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 20%, rgba(14, 165, 233, 0.22) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(2, 132, 199, 0.18) 0%, transparent 50%), linear-gradient(155deg, #040d1a 0%, #091e38 52%, #061527 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(56, 189, 248, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.18) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Top Institutional Bar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 font-semibold text-sky-300">
              <Compass className="h-3.5 w-3.5" />
              IBGE 3304706 · Santo Antônio de Pádua — RJ
            </span>
            <span className="hidden md:inline text-slate-400">
              21°32&prime;22&Prime; S · 42°10&prime;49&Prime; W · Bacia Hidrográfica do Rio Pomba
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
              <CloudRain className="h-3.5 w-3.5 text-sky-400" />
              <span className="max-w-[240px] truncate">{summaryDisplay}</span>
              {tempDisplay !== null && (
                <span className="font-mono font-bold text-sky-300">
                  {tempDisplay.toFixed(1)} °C
                </span>
              )}
            </div>
            <InstallAppButton variant="header" className="border-sky-400/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30" />
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.25fr_0.85fr] lg:items-center lg:py-14">
        {/* Left Column: Brand Identity, Mission & 4 Engineering Pillars */}
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-300">
            <Sparkles className="h-3.5 w-3.5" />
            Plataforma Integrada de Engenharia Hidráulica, Hidrologia e Defesa Civil
          </div>

          <div className="space-y-4">
            <AppLogo size="xl" badge="OFICIAL" className="text-white" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.15]">
              Gestão Inteligente de{" "}
              <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-sky-400 bg-clip-text text-transparent">
                Drenagem Urbana e Cheias
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Sistema técnico georreferenciado para monitoramento pluviométrico oficial em tempo real (INMET), modelagem de microbacias, dimensionamento de galerias pluviais e análise de remanso do Rio Pomba em Santo Antônio de Pádua — RJ.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="group rounded-xl border border-white/10 bg-slate-900/65 p-4 backdrop-blur-md transition-all hover:border-sky-400/40 hover:bg-slate-900/90"
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                        p.color
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-bold text-sm text-white">{p.title}</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300/90">
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Creator & Series Institutional Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/30 bg-gradient-to-r from-sky-950/80 via-slate-900/90 to-sky-950/80 px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40">
                <Award className="h-4 w-4" />
              </div>
              <div className="text-xs font-semibold text-sky-100">
                {CREATOR_SIGNATURE}
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Sistema Verificado · 16 Módulos
            </span>
          </div>
        </div>

        {/* Right Column: Access Portal / Authenticated Executive Card */}
        <div className="rounded-2xl border border-white/15 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {currentUser ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Sessão Autenticada Ativa
                  </div>
                  <div className="text-base font-bold text-white">
                    {currentUser.fullName || currentUser.email}
                  </div>
                  <div className="text-xs text-slate-400">{currentUser.email}</div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-300">
                Sua sessão está ativa. Acesse diretamente o painel principal de operação ou gerencie contas e permissões de ferramentas.
              </p>

              <div className="space-y-2.5">
                <Link to="/painel" className="block">
                  <Button className="w-full h-11 bg-sky-500 hover:bg-sky-400 text-white font-bold gap-2 text-sm">
                    <LayoutDashboard className="h-4 w-4" />
                    Entrar no Dashboard Principal
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link to="/previsao">
                    <Button
                      variant="outline"
                      className="w-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 text-xs gap-1.5"
                    >
                      <CloudRain className="h-3.5 w-3.5 text-sky-400" />
                      Previsão INMET
                    </Button>
                  </Link>
                  <Link to="/mapa">
                    <Button
                      variant="outline"
                      className="w-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 text-xs gap-1.5"
                    >
                      <Waves className="h-3.5 w-3.5 text-emerald-400" />
                      Mapa SIG
                    </Button>
                  </Link>
                </div>

                <Link to="/administracao" className="block pt-1">
                  <Button
                    variant="outline"
                    className="w-full border-sky-400/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 text-xs gap-1.5"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Administrar Contas de Usuários e Ferramentas
                  </Button>
                </Link>
              </div>

              <div className="border-t border-white/10 pt-4">
                <InstallAppButton
                  variant="auth"
                  className="border-white/15 bg-slate-950/60 text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-950/80 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode("in")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                    mode === "in"
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Entrar na Plataforma
                </button>
                <button
                  type="button"
                  onClick={() => setMode("up")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all",
                    mode === "up"
                      ? "bg-sky-500 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Criar Nova Conta
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  {mode === "in"
                    ? "Acesso Técnico Autorizado"
                    : mode === "up"
                      ? "Cadastro de Novo Usuário"
                      : "Recuperação de Senha"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {mode === "in"
                    ? "Informe suas credenciais para acessar os módulos de drenagem e hidrologia."
                    : mode === "up"
                      ? "Preencha seus dados profissionais. O administrador poderá gerenciar suas ferramentas autorizadas."
                      : "Enviaremos um link seguro de redefinição para o seu e-mail cadastrado."}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-3.5">
                {mode === "up" && (
                  <>
                    <div>
                      <Label className="text-xs text-slate-200">
                        Nome Completo *
                      </Label>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Eng. Thais dos Santos Pinheiro Ildebrando"
                        className="mt-1 border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-slate-200">
                          CREA / CAU (opcional)
                        </Label>
                        <Input
                          value={crea}
                          onChange={(e) => setCrea(e.target.value)}
                          placeholder="Registro profissional"
                          className="mt-1 border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-200">
                          Função Solicitada
                        </Label>
                        <select
                          value={requestedRole}
                          onChange={(e) =>
                            setRequestedRole(e.target.value as AppRole)
                          }
                          className="mt-1 flex h-9 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-1 text-xs text-white"
                        >
                          {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                            <option key={r} value={r} className="bg-slate-900">
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-200">
                        Órgão / Secretaria / Instituição
                      </Label>
                      <Input
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="mt-1 border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-xs text-slate-200">
                    E-mail Profissional *
                  </Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@padua.rj.gov.br"
                    className="mt-1 border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                  />
                </div>

                {mode !== "forgot" && (
                  <div>
                    <Label className="text-xs text-slate-200">Senha *</Label>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      className="mt-1 border-white/15 bg-slate-950/70 text-white placeholder:text-slate-500"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 bg-sky-500 hover:bg-sky-400 text-white font-bold gap-2"
                  disabled={busy}
                >
                  {busy
                    ? "Processando…"
                    : mode === "in"
                      ? "Acessar Plataforma"
                      : mode === "up"
                        ? "Cadastrar Conta"
                        : "Enviar Link de Recuperação"}
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                  {mode !== "in" ? (
                    <button
                      type="button"
                      onClick={() => setMode("in")}
                      className="text-sky-400 hover:underline font-medium"
                    >
                      ← Voltar ao login
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMode("up")}
                        className="text-sky-400 hover:underline font-medium"
                      >
                        Solicitar nova conta
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="hover:text-slate-200"
                      >
                        <KeyRound className="inline h-3 w-3 mr-1" />
                        Esqueci a senha
                      </button>
                    </>
                  )}
                </div>
              </form>

              <div className="border-t border-white/10 pt-4">
                <InstallAppButton
                  variant="auth"
                  className="border-white/15 bg-slate-950/70 text-white"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

