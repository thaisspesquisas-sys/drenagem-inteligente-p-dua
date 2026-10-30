import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Shield,
  UserPlus,
  UserCheck,
  UserX,
  Pencil,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Lock,
  Unlock,
  RotateCcw,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type AppRole } from "@/hooks/useAuth";
import { PageHeader, Stat, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  APP_TOOLS,
  CAPABILITY_DEFINITIONS,
  fetchSystemAclStore,
  getDefaultCapabilitiesForRoles,
  getDefaultToolsForRoles,
  saveSystemAclStore,
  type CapabilityKey,
  type SystemUserAclStore,
  type ToolRoute,
  type UserAccountStatus,
  type UserManagedRecord,
} from "@/lib/user-permissions";
import { CREATOR_SIGNATURE } from "@/components/app/AppLogo";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/administracao")({
  head: () => ({
    meta: [
      { title: "Administração de Contas e Ferramentas — Drenagem Inteligente Pádua" },
      {
        name: "description",
        content:
          "Gestão completa de contas de novos usuários, edição cadastral, exclusão e matriz de autorizações para uso das ferramentas do aplicativo.",
      },
    ],
  }),
  component: AdministracaoPage,
});

interface UnifiedUserRow {
  id: string;
  email: string;
  full_name: string;
  crea: string;
  organization: string;
  jobTitle: string;
  created_at: string;
  roles: AppRole[];
  status: UserAccountStatus;
  allowedTools: ToolRoute[];
  capabilities: Record<CapabilityKey, boolean>;
  notes: string;
}

const STATUS_BADGE: Record<
  UserAccountStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Ativo",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  pending: {
    label: "Novo · Pendente",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  suspended: {
    label: "Suspenso",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
  deleted: {
    label: "Excluído",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
};

function AdministracaoPage() {
  const { user, refreshAuth } = useAuth();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [roles, setRoles] = useState<Tables<"user_roles">[]>([]);
  const [audit, setAudit] = useState<Tables<"audit_logs">[]>([]);
  const [aclStore, setAclStore] = useState<SystemUserAclStore>({
    version: 1,
    users: {},
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "pending" | "suspended" | "deleted"
  >("all");
  const [activeSection, setActiveSection] = useState<
    "users" | "pending" | "matrix" | "audit"
  >("users");

  // My Profile state
  const [me, setMe] = useState({
    full_name: "",
    crea: "",
    organization: "",
  });

  // Create New User Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    fullName: string;
    email: string;
    password: string;
    crea: string;
    organization: string;
    jobTitle: string;
    roles: AppRole[];
    allowedTools: ToolRoute[];
    capabilities: Record<CapabilityKey, boolean>;
  }>({
    fullName: "",
    email: "",
    password: "",
    crea: "",
    organization: "Prefeitura Municipal de Santo Antônio de Pádua",
    jobTitle: "Engenheiro / Técnico",
    roles: ["engineer"],
    allowedTools: getDefaultToolsForRoles(["engineer"]),
    capabilities: getDefaultCapabilitiesForRoles(["engineer"]),
  });

  // Edit User & Tool Permissions Modal
  const [editingUser, setEditingUser] = useState<UnifiedUserRow | null>(null);
  const [editTab, setEditTab] = useState<"profile" | "tools">("profile");

  // Delete Confirmation Modal
  const [deletingUser, setDeletingUser] = useState<UnifiedUserRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [p, r, a, store] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      fetchSystemAclStore(),
    ]);

    const profList = p.data ?? [];
    setProfiles(profList);
    setRoles(r.data ?? []);
    setAudit(a.data ?? []);
    setAclStore(store);

    const mine = profList.find((x) => x.id === user?.id);
    if (mine) {
      setMe({
        full_name: mine.full_name ?? "",
        crea: mine.crea ?? "",
        organization: mine.organization ?? "",
      });
    } else if (user) {
      setMe({
        full_name: (user.user_metadata?.full_name as string) ?? "",
        crea: "",
        organization: "Prefeitura Municipal de Santo Antônio de Pádua",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  // Combine Supabase `profiles` + `user_roles` + `aclStore.users` (including admin-created accounts)
  const unifiedUsers = useMemo<UnifiedUserRow[]>(() => {
    const map = new Map<string, UnifiedUserRow>();

    for (const p of profiles) {
      const userRoles = roles
        .filter((r) => r.user_id === p.id)
        .map((r) => r.role as AppRole);
      const acl = aclStore.users[p.id];
      const defaultStatus: UserAccountStatus =
        userRoles.length > 0 ? "active" : "pending";

      map.set(p.id, {
        id: p.id,
        email: acl?.email || p.email || "—",
        full_name: acl?.fullName || p.full_name || "Usuário sem nome",
        crea: acl?.crea ?? p.crea ?? "",
        organization: acl?.organization ?? p.organization ?? "",
        jobTitle: acl?.jobTitle ?? "",
        created_at: p.created_at,
        roles: userRoles,
        status: acl?.status ?? defaultStatus,
        allowedTools: acl?.allowedTools ?? getDefaultToolsForRoles(userRoles),
        capabilities:
          acl?.capabilities ?? getDefaultCapabilitiesForRoles(userRoles),
        notes: acl?.notes ?? "",
      });
    }

    // Also include any accounts in aclStore not yet returned by profiles query
    for (const [uid, rec] of Object.entries(aclStore.users)) {
      if (!map.has(uid)) {
        const userRoles = roles
          .filter((r) => r.user_id === uid)
          .map((r) => r.role as AppRole);
        map.set(uid, {
          id: uid,
          email: rec.email,
          full_name: rec.fullName,
          crea: rec.crea,
          organization: rec.organization,
          jobTitle: rec.jobTitle ?? "",
          created_at: rec.updatedAt,
          roles: userRoles,
          status: rec.status,
          allowedTools: rec.allowedTools,
          capabilities: rec.capabilities,
          notes: rec.notes ?? "",
        });
      }
    }

    // Ensure current logged-in user is always represented
    if (user && !map.has(user.id)) {
      const userRoles = roles
        .filter((r) => r.user_id === user.id)
        .map((r) => r.role as AppRole);
      const acl = aclStore.users[user.id];
      map.set(user.id, {
        id: user.id,
        email: user.email ?? "—",
        full_name:
          acl?.fullName ||
          (user.user_metadata?.full_name as string) ||
          user.email?.split("@")[0] ||
          "Usuário Atual",
        crea: acl?.crea ?? "",
        organization:
          acl?.organization ?? "Prefeitura Municipal de Santo Antônio de Pádua",
        jobTitle: acl?.jobTitle ?? "Administrador / Responsável",
        created_at: user.created_at ?? new Date().toISOString(),
        roles: userRoles,
        status: acl?.status ?? "active",
        allowedTools: acl?.allowedTools ?? APP_TOOLS.map((t) => t.to),
        capabilities:
          acl?.capabilities ?? getDefaultCapabilitiesForRoles(["admin"]),
        notes: acl?.notes ?? "",
      });
    }

    return Array.from(map.values());
  }, [profiles, roles, aclStore, user]);

  const pendingUsers = useMemo(
    () => unifiedUsers.filter((u) => u.status === "pending"),
    [unifiedUsers]
  );

  const visibleUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      if (statusFilter === "all" && u.status === "deleted") return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.crea.toLowerCase().includes(q) ||
        u.organization.toLowerCase().includes(q)
      );
    });
  }, [unifiedUsers, statusFilter, search]);

  const toggleRole = async (targetUser: UnifiedUserRow, role: AppRole) => {
    const has = targetUser.roles.includes(role);
    const { error } = has
      ? await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUser.id)
          .eq("role", role)
      : await supabase
          .from("user_roles")
          .insert({ user_id: targetUser.id, role, granted_by: user?.id ?? null });

    const nextRoles = has
      ? targetUser.roles.filter((r) => r !== role)
      : [...targetUser.roles, role];

    // Also update ACL store so tools & status stay synchronized even if RLS restricts direct role table writes
    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [targetUser.id]: {
          userId: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          crea: targetUser.crea,
          organization: targetUser.organization,
          jobTitle: targetUser.jobTitle,
          status: nextRoles.length > 0 ? "active" : targetUser.status,
          allowedTools: getDefaultToolsForRoles(nextRoles),
          capabilities: getDefaultCapabilitiesForRoles(nextRoles),
          notes: targetUser.notes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);

    if (error) {
      toast.info(
        `Autorizações de ferramentas atualizadas para ${targetUser.full_name}. (Nota RLS banco: ${error.message})`
      );
    } else {
      toast.success(
        `Perfil "${ROLE_LABEL[role]}" ${has ? "removido de" : "concedido a"} ${targetUser.full_name}.`
      );
    }
    await load();
    await refreshAuth();
  };

  const quickApproveUser = async (
    targetUser: UnifiedUserRow,
    initialRole: AppRole
  ) => {
    await supabase.from("user_roles").insert({
      user_id: targetUser.id,
      role: initialRole,
      granted_by: user?.id ?? null,
    });

    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [targetUser.id]: {
          userId: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          crea: targetUser.crea,
          organization: targetUser.organization,
          jobTitle: targetUser.jobTitle,
          status: "active",
          allowedTools: getDefaultToolsForRoles([initialRole]),
          capabilities: getDefaultCapabilitiesForRoles([initialRole]),
          notes: targetUser.notes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);
    toast.success(
      `Conta de ${targetUser.full_name} aprovada com perfil ${ROLE_LABEL[initialRole]}!`
    );
    await load();
    await refreshAuth();
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.email || !newUserForm.fullName) {
      toast.error("Preencha o nome completo e o e-mail do novo usuário.");
      return;
    }
    setCreating(true);
    try {
      let createdUserId = `usr_${Date.now()}`;

      // Create real Supabase Auth account using an isolated non-persisting client
      // so the current Admin session is never interrupted
      if (newUserForm.password && newUserForm.password.length >= 8) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const tempClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          });
          const { data: signUpData, error: signUpErr } =
            await tempClient.auth.signUp({
              email: newUserForm.email.trim(),
              password: newUserForm.password,
              options: {
                data: { full_name: newUserForm.fullName.trim() },
              },
            });
          if (signUpErr) {
            toast.warning(
              `Aviso Auth: ${signUpErr.message}. Registrando conta no diretório administrativo.`
            );
          } else if (signUpData.user?.id) {
            createdUserId = signUpData.user.id;
          }
        }
      }

      // Insert roles if possible
      for (const r of newUserForm.roles) {
        await supabase.from("user_roles").insert({
          user_id: createdUserId,
          role: r,
          granted_by: user?.id ?? null,
        });
      }

      // Save profile fields
      await supabase
        .from("profiles")
        .upsert({
          id: createdUserId,
          email: newUserForm.email.trim(),
          full_name: newUserForm.fullName.trim(),
          crea: newUserForm.crea.trim() || null,
          organization: newUserForm.organization.trim() || null,
        })
        .select();

      // Save complete record in ACL store
      const record: UserManagedRecord = {
        userId: createdUserId,
        email: newUserForm.email.trim(),
        fullName: newUserForm.fullName.trim(),
        crea: newUserForm.crea.trim(),
        organization: newUserForm.organization.trim(),
        jobTitle: newUserForm.jobTitle.trim(),
        status: "active",
        allowedTools: newUserForm.allowedTools,
        capabilities: newUserForm.capabilities,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email ?? undefined,
      };

      const nextStore: SystemUserAclStore = {
        ...aclStore,
        users: {
          ...aclStore.users,
          [createdUserId]: record,
        },
      };
      setAclStore(nextStore);
      await saveSystemAclStore(nextStore);

      toast.success(
        `Conta de "${newUserForm.fullName}" criada e autorizada com ${newUserForm.allowedTools.length} ferramentas!`
      );
      setCreateOpen(false);
      setNewUserForm({
        fullName: "",
        email: "",
        password: "",
        crea: "",
        organization: "Prefeitura Municipal de Santo Antônio de Pádua",
        jobTitle: "Engenheiro / Técnico",
        roles: ["engineer"],
        allowedTools: getDefaultToolsForRoles(["engineer"]),
        capabilities: getDefaultCapabilitiesForRoles(["engineer"]),
      });
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cadastrar novo usuário"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Update profile in Postgres
    await supabase
      .from("profiles")
      .update({
        full_name: editingUser.full_name.trim(),
        email: editingUser.email.trim(),
        crea: editingUser.crea.trim() || null,
        organization: editingUser.organization.trim() || null,
      })
      .eq("id", editingUser.id);

    // Sync ACL record
    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [editingUser.id]: {
          userId: editingUser.id,
          email: editingUser.email.trim(),
          fullName: editingUser.full_name.trim(),
          crea: editingUser.crea.trim(),
          organization: editingUser.organization.trim(),
          jobTitle: editingUser.jobTitle.trim(),
          status: editingUser.status,
          allowedTools: editingUser.allowedTools,
          capabilities: editingUser.capabilities,
          notes: editingUser.notes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);

    toast.success(
      `Dados e autorizações de ferramentas de "${editingUser.full_name}" salvos com sucesso!`
    );
    setEditingUser(null);
    await load();
    await refreshAuth();
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === user?.id) {
      toast.error("Você não pode excluir sua própria conta ativa.");
      return;
    }

    // 1. Revoke all database roles immediately
    await supabase.from("user_roles").delete().eq("user_id", deletingUser.id);

    // 2. Attempt to delete profile row
    await supabase.from("profiles").delete().eq("id", deletingUser.id);

    // 3. Mark as deleted & strip all tools in ACL store so it's removed from active accounts
    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [deletingUser.id]: {
          userId: deletingUser.id,
          email: deletingUser.email,
          fullName: deletingUser.full_name,
          crea: deletingUser.crea,
          organization: deletingUser.organization,
          jobTitle: deletingUser.jobTitle,
          status: "deleted",
          allowedTools: [],
          capabilities: {
            can_create_records: false,
            can_delete_records: false,
            can_run_simulations: false,
            can_approve_crea: false,
            can_export_reports: false,
          },
          notes: "Conta excluída pelo administrador",
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);

    toast.success(
      `Conta de "${deletingUser.full_name}" excluída e todas as autorizações revogadas.`
    );
    setDeletingUser(null);
    await load();
  };

  const handleToggleSuspend = async (targetUser: UnifiedUserRow) => {
    const nextStatus: UserAccountStatus =
      targetUser.status === "suspended" ? "active" : "suspended";
    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [targetUser.id]: {
          userId: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.full_name,
          crea: targetUser.crea,
          organization: targetUser.organization,
          jobTitle: targetUser.jobTitle,
          status: nextStatus,
          allowedTools: targetUser.allowedTools,
          capabilities: targetUser.capabilities,
          notes: targetUser.notes,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);
    toast.success(
      nextStatus === "suspended"
        ? `Conta de "${targetUser.full_name}" suspensa temporariamente.`
        : `Conta de "${targetUser.full_name}" reativada!`
    );
    await load();
    await refreshAuth();
  };

  const saveMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: me.full_name,
        crea: me.crea || null,
        organization: me.organization || null,
      })
      .eq("id", user.id);

    const currentAcl = aclStore.users[user.id];
    const nextStore: SystemUserAclStore = {
      ...aclStore,
      users: {
        ...aclStore.users,
        [user.id]: {
          userId: user.id,
          email: user.email ?? "",
          fullName: me.full_name,
          crea: me.crea,
          organization: me.organization,
          status: "active",
          allowedTools:
            currentAcl?.allowedTools ?? APP_TOOLS.map((t) => t.to),
          capabilities:
            currentAcl?.capabilities ??
            getDefaultCapabilitiesForRoles(["admin"]),
          updatedAt: new Date().toISOString(),
          updatedBy: user.email ?? undefined,
        },
      },
    };
    setAclStore(nextStore);
    await saveSystemAclStore(nextStore);

    if (error) toast.info("Perfil salvo localmente.");
    else toast.success("Meu perfil profissional atualizado!");
    await load();
  };

  const activeCount = unifiedUsers.filter((u) => u.status === "active").length;
  const adminEngineerCount = unifiedUsers.filter(
    (u) =>
      u.status !== "deleted" &&
      (u.roles.includes("admin") || u.roles.includes("engineer"))
  ).length;

  return (
    <>
      <PageHeader
        title="Administração de Contas, Usuários e Autorizações"
        description="Gerencie contas de novos usuários, edite cadastros profissionais, exclua ou suspenda acessos e configure quais ferramentas do aplicativo cada usuário pode utilizar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={load}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar Novo Usuário
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Contas Ativas"
          value={activeCount}
          hint="Com acesso liberado ao sistema"
        />
        <Stat
          label="Novos Usuários Pendentes"
          value={pendingUsers.length}
          hint="Aguardando aprovação ou atribuição de perfil"
        />
        <Stat
          label="Admins & Engenheiros"
          value={adminEngineerCount}
          hint="Habilitados para homologação e gestão"
        />
        <Stat
          label="Ferramentas Controladas"
          value={APP_TOOLS.length}
          hint="Módulos com controle granular de acesso"
        />
      </div>

      {/* Pending New Users Callout Banner */}
      {pendingUsers.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Novas Contas Aguardando Aprovação ({pendingUsers.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Aprove rapidamente atribuindo o perfil inicial ou clique em Configurar Ferramentas para personalizar os módulos permitidos.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {pendingUsers.map((pu) => (
              <div
                key={pu.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div>
                  <div className="font-semibold text-sm">{pu.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {pu.email} · Cadastrado em {fmtDate(pu.created_at)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={() => quickApproveUser(pu, "engineer")}
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" /> Aprovar Engenheiro
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => quickApproveUser(pu, "technician")}
                  >
                    Aprovar Técnico
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => quickApproveUser(pu, "viewer")}
                  >
                    Aprovar Consulta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditingUser(pu);
                      setEditTab("tools");
                    }}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" /> Ferramentas
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingUser(pu)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSection("users")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              activeSection === "users"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Contas de Usuários ({unifiedUsers.filter((u) => u.status !== "deleted").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("matrix")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              activeSection === "matrix"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Matriz de Autorizações das Ferramentas
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("audit")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
              activeSection === "audit"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Meu Perfil & Auditoria ({audit.length})
          </button>
        </div>
      </div>

      {/* SECTION 1: USER ACCOUNTS MANAGEMENT */}
      {activeSection === "users" && (
        <div className="space-y-4">
          {/* Search & Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuário por nome, e-mail, CREA ou secretaria…"
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["all", "Todos Ativos/Pendentes"],
                  ["active", "Ativos"],
                  ["pending", "Novos / Pendentes"],
                  ["suspended", "Suspensos"],
                  ["deleted", "Excluídos"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    statusFilter === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border bg-card shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-muted/70 text-left uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Usuário / Credenciais</th>
                  <th className="p-3">Status</th>
                  {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => (
                    <th key={r} className="px-2 py-3 text-center">
                      {ROLE_LABEL[r]}
                    </th>
                  ))}
                  <th className="p-3 text-center">Ferramentas Liberadas</th>
                  <th className="p-3 text-right">Ações Administrativas</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => {
                  const badge = STATUS_BADGE[u.status];
                  return (
                    <tr key={u.id} className="border-t hover:bg-muted/25">
                      <td className="p-3">
                        <div className="font-semibold text-sm text-foreground">
                          {u.full_name}
                        </div>
                        <div className="text-muted-foreground">{u.email}</div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          {u.crea && (
                            <span className="rounded bg-muted px-1.5 py-0.2 font-mono">
                              CREA: {u.crea}
                            </span>
                          )}
                          {u.organization && <span>{u.organization}</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </td>
                      {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => {
                        const has = u.roles.includes(r);
                        return (
                          <td key={r} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={has}
                              onChange={() => toggleRole(u, r)}
                              className="h-4 w-4 accent-sky-600 cursor-pointer"
                              title={`Alternar perfil ${ROLE_LABEL[r]} para ${u.full_name}`}
                            />
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditTab("tools");
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-500/20 dark:text-sky-300"
                        >
                          <KeyRound className="h-3 w-3" />
                          {u.allowedTools.length} / {APP_TOOLS.length} módulos
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                              setEditingUser(u);
                              setEditTab("profile");
                            }}
                            title="Editar dados cadastrais do usuário"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => {
                              setEditingUser(u);
                              setEditTab("tools");
                            }}
                            title="Administrar autorizações para uso das ferramentas do app"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Autorizações
                          </Button>
                          {u.status !== "deleted" && u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleToggleSuspend(u)}
                              title={
                                u.status === "suspended"
                                  ? "Reativar conta"
                                  : "Suspender conta temporariamente"
                              }
                            >
                              {u.status === "suspended" ? (
                                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-amber-600" />
                              )}
                            </Button>
                          )}
                          {u.id !== user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingUser(u)}
                              title="Excluir conta de usuário"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum usuário encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: GLOBAL TOOL AUTHORIZATION MATRIX */}
      {activeSection === "matrix" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-bold">
              Matriz de Autorizações das 16 Ferramentas por Usuário
            </h3>
            <p className="text-xs text-muted-foreground">
              Marque ou desmarque diretamente quais ferramentas cada usuário está autorizado a utilizar no aplicativo.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/70 text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5 min-w-[180px]">Ferramenta / Módulo</th>
                    <th className="p-2.5">Grupo</th>
                    {unifiedUsers
                      .filter((u) => u.status !== "deleted")
                      .map((u) => (
                        <th key={u.id} className="p-2.5 text-center min-w-[110px]">
                          <div className="truncate font-semibold text-foreground">
                            {u.full_name.split(" ")[0]}
                          </div>
                          <div className="truncate text-[10px] lowercase font-normal">
                            {u.email.split("@")[0]}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {APP_TOOLS.map((tool) => (
                    <tr key={tool.to} className="border-t hover:bg-muted/20">
                      <td className="p-2.5 font-medium">{tool.label}</td>
                      <td className="p-2.5 text-muted-foreground">{tool.group}</td>
                      {unifiedUsers
                        .filter((u) => u.status !== "deleted")
                        .map((u) => {
                          const has = u.allowedTools.includes(tool.to);
                          return (
                            <td key={u.id} className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={has}
                                onChange={async () => {
                                  const nextTools = has
                                    ? u.allowedTools.filter((t) => t !== tool.to)
                                    : [...u.allowedTools, tool.to];
                                  const nextStore: SystemUserAclStore = {
                                    ...aclStore,
                                    users: {
                                      ...aclStore.users,
                                      [u.id]: {
                                        userId: u.id,
                                        email: u.email,
                                        fullName: u.full_name,
                                        crea: u.crea,
                                        organization: u.organization,
                                        jobTitle: u.jobTitle,
                                        status: u.status,
                                        allowedTools: nextTools,
                                        capabilities: u.capabilities,
                                        notes: u.notes,
                                        updatedAt: new Date().toISOString(),
                                        updatedBy: user?.email ?? undefined,
                                      },
                                    },
                                  };
                                  setAclStore(nextStore);
                                  await saveSystemAclStore(nextStore);
                                  await refreshAuth();
                                  toast.success(
                                    `${tool.label} ${has ? "bloqueado" : "liberado"} para ${u.full_name}`
                                  );
                                }}
                                className="h-4 w-4 accent-sky-600 cursor-pointer"
                              />
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MY PROFILE & AUDIT LOGS */}
      {activeSection === "audit" && (
        <div className="space-y-6">
          <form
            onSubmit={saveMe}
            className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-4"
          >
            <h2 className="font-semibold md:col-span-4">
              Meu Perfil Profissional ({user?.email})
            </h2>
            <div>
              <Label className="text-xs">Nome Completo</Label>
              <Input
                value={me.full_name}
                onChange={(e) => setMe({ ...me, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">CREA / CAU (quando aplicável)</Label>
              <Input
                value={me.crea}
                onChange={(e) => setMe({ ...me, crea: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Órgão / Secretaria</Label>
              <Input
                value={me.organization}
                onChange={(e) => setMe({ ...me, organization: e.target.value })}
              />
            </div>
            <Button type="submit" className="self-end">
              Salvar Meu Perfil
            </Button>
          </form>

          <div>
            <h2 className="mb-2 font-semibold">
              Trilha de Auditoria (últimas 60 operações no banco)
            </h2>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-xs">
                <thead className="bg-muted text-left uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Data / Hora</th>
                    <th className="p-2.5">Tabela</th>
                    <th className="p-2.5">Ação</th>
                    <th className="p-2.5">Operador</th>
                    <th className="p-2.5">ID Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2.5">{fmtDate(a.created_at)}</td>
                      <td className="p-2.5 font-mono">{a.table_name}</td>
                      <td className="p-2.5">{a.action}</td>
                      <td className="p-2.5">
                        {profiles.find((p) => p.id === a.actor)?.email ??
                          a.actor?.slice(0, 8) ??
                          "sistema"}
                      </td>
                      <td className="p-2.5 font-mono">
                        {a.record_id?.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Signature */}
      <div className="mt-8 flex items-center justify-between rounded-xl border bg-card/70 px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Award className="h-4 w-4 text-primary" />
          {CREATOR_SIGNATURE}
        </span>
        <span>Governança RBAC + Controle Granular de Ferramentas</span>
      </div>

      {/* MODAL 1: CREATE NEW USER */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Cadastrar e Autorizar Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Crie uma nova conta para membro da equipe técnica e defina imediatamente seus perfis e ferramentas liberadas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewUser} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Nome Completo *</Label>
                <Input
                  required
                  value={newUserForm.fullName}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, fullName: e.target.value })
                  }
                  placeholder="Ex.: Eng. Carlos Eduardo Silva"
                />
              </div>
              <div>
                <Label className="text-xs">E-mail de Acesso *</Label>
                <Input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  placeholder="carlos.silva@padua.rj.gov.br"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Senha Inicial (mín. 8 caracteres)
                </Label>
                <Input
                  type="password"
                  minLength={8}
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  placeholder="Senha para login imediato"
                />
              </div>
              <div>
                <Label className="text-xs">Registro CREA / CAU</Label>
                <Input
                  value={newUserForm.crea}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, crea: e.target.value })
                  }
                  placeholder="Ex.: RJ-20261030/D"
                />
              </div>
              <div>
                <Label className="text-xs">Órgão / Secretaria</Label>
                <Input
                  value={newUserForm.organization}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      organization: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Cargo / Função</Label>
                <Input
                  value={newUserForm.jobTitle}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, jobTitle: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Roles Selection */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-bold">
                Perfis de Acesso (preenchem automaticamente as ferramentas padrão)
              </Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROLE_LABEL) as AppRole[]).map((role) => {
                  const selected = newUserForm.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        const nextRoles = selected
                          ? newUserForm.roles.filter((r) => r !== role)
                          : [...newUserForm.roles, role];
                        setNewUserForm({
                          ...newUserForm,
                          roles: nextRoles,
                          allowedTools: getDefaultToolsForRoles(nextRoles),
                          capabilities:
                            getDefaultCapabilitiesForRoles(nextRoles),
                        });
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-semibold transition-all",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {ROLE_LABEL[role]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tools Selection */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">
                  Ferramentas do Aplicativo Autorizadas ({newUserForm.allowedTools.length}/{APP_TOOLS.length})
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNewUserForm({
                        ...newUserForm,
                        allowedTools: APP_TOOLS.map((t) => t.to),
                      })
                    }
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Marcar todas
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewUserForm({
                        ...newUserForm,
                        allowedTools: ["/painel", "/previsao", "/mapa"],
                      })
                    }
                    className="text-[11px] font-semibold text-muted-foreground hover:underline"
                  >
                    Apenas consulta básica
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {APP_TOOLS.map((tool) => {
                  const checked = newUserForm.allowedTools.includes(tool.to);
                  return (
                    <label
                      key={tool.to}
                      className="flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? newUserForm.allowedTools.filter((t) => t !== tool.to)
                            : [...newUserForm.allowedTools, tool.to];
                          setNewUserForm({ ...newUserForm, allowedTools: next });
                        }}
                        className="h-3.5 w-3.5 accent-sky-600"
                      />
                      <span className="truncate font-medium">{tool.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Cadastrando…" : "Criar Conta e Liberar Acesso"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT USER & GRANULAR TOOL AUTHORIZATIONS */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(v) => !v && setEditingUser(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Administrar Conta e Ferramentas: {editingUser.full_name}
                </DialogTitle>
                <DialogDescription>
                  Edite os dados cadastrais, status da conta e personalize quais ferramentas e operações este usuário tem autorização para usar.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setEditTab("profile")}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-all",
                    editTab === "profile"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  1. Dados da Conta & Status
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("tools")}
                  className={cn(
                    "rounded-md py-1.5 text-xs font-semibold transition-all",
                    editTab === "tools"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  2. Autorizações de Ferramentas ({editingUser.allowedTools.length}/{APP_TOOLS.length})
                </button>
              </div>

              <form onSubmit={handleSaveEditedUser} className="space-y-4">
                {editTab === "profile" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Nome Completo</Label>
                      <Input
                        required
                        value={editingUser.full_name}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            full_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        type="email"
                        required
                        value={editingUser.email}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Registro CREA / CAU</Label>
                      <Input
                        value={editingUser.crea}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            crea: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Órgão / Secretaria</Label>
                      <Input
                        value={editingUser.organization}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            organization: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cargo / Função</Label>
                      <Input
                        value={editingUser.jobTitle}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            jobTitle: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Status da Conta</Label>
                      <select
                        value={editingUser.status}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            status: e.target.value as UserAccountStatus,
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
                      >
                        <option value="active">Ativo (Acesso Liberado)</option>
                        <option value="pending">Novo / Pendente de Aprovação</option>
                        <option value="suspended">Suspenso / Bloqueado</option>
                        <option value="deleted">Excluído / Arquivado</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Observações Administrativas</Label>
                      <Input
                        value={editingUser.notes}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            notes: e.target.value,
                          })
                        }
                        placeholder="Ex.: Autorizado pela Secretaria de Obras conforme Portaria…"
                      />
                    </div>
                  </div>
                )}

                {editTab === "tools" && (
                  <div className="space-y-4">
                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2.5">
                      <span className="text-xs font-semibold">
                        Modelos Rápidos de Autorização:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditingUser({
                              ...editingUser,
                              allowedTools: APP_TOOLS.map((t) => t.to),
                              capabilities: getDefaultCapabilitiesForRoles([
                                "admin",
                              ]),
                            })
                          }
                        >
                          Liberar Tudo (16/16)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditingUser({
                              ...editingUser,
                              allowedTools: getDefaultToolsForRoles([
                                "engineer",
                              ]),
                              capabilities: getDefaultCapabilitiesForRoles([
                                "engineer",
                              ]),
                            })
                          }
                        >
                          Padrão Engenharia
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditingUser({
                              ...editingUser,
                              allowedTools: getDefaultToolsForRoles([
                                "technician",
                              ]),
                              capabilities: getDefaultCapabilitiesForRoles([
                                "technician",
                              ]),
                            })
                          }
                        >
                          Equipe de Campo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditingUser({
                              ...editingUser,
                              allowedTools: getDefaultToolsForRoles(["viewer"]),
                              capabilities: getDefaultCapabilitiesForRoles([
                                "viewer",
                              ]),
                            })
                          }
                        >
                          Somente Leitura
                        </Button>
                      </div>
                    </div>

                    {/* Operational Capabilities */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">
                        Permissões Operacionais nas Ferramentas
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CAPABILITY_DEFINITIONS.map((cap) => {
                          const checked =
                            editingUser.capabilities[cap.key] ?? false;
                          return (
                            <label
                              key={cap.key}
                              className="flex items-start gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer hover:bg-muted/30"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setEditingUser({
                                    ...editingUser,
                                    capabilities: {
                                      ...editingUser.capabilities,
                                      [cap.key]: !checked,
                                    },
                                  })
                                }
                                className="mt-0.5 h-4 w-4 accent-sky-600"
                              />
                              <div>
                                <div className="font-semibold">{cap.label}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {cap.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 16 Modules Checkboxes */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">
                        Módulos e Ferramentas Liberadas no Menu ({editingUser.allowedTools.length}/{APP_TOOLS.length})
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {APP_TOOLS.map((tool) => {
                          const checked = editingUser.allowedTools.includes(
                            tool.to
                          );
                          return (
                            <label
                              key={tool.to}
                              className="flex items-start gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer hover:bg-muted/30"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? editingUser.allowedTools.filter(
                                        (t) => t !== tool.to
                                      )
                                    : [...editingUser.allowedTools, tool.to];
                                  setEditingUser({
                                    ...editingUser,
                                    allowedTools: next,
                                  });
                                }}
                                className="mt-0.5 h-4 w-4 accent-sky-600"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {tool.label}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {tool.group}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Salvar Alterações e Autorizações
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: DELETE USER CONFIRMATION */}
      <Dialog
        open={Boolean(deletingUser)}
        onOpenChange={(v) => !v && setDeletingUser(null)}
      >
        <DialogContent className="max-w-md">
          {deletingUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <UserX className="h-5 w-5" />
                  Excluir Conta de Usuário
                </DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir a conta de{" "}
                  <strong>{deletingUser.full_name}</strong> ({deletingUser.email}
                  )? Todos os perfis de banco de dados e autorizações de ferramentas serão imediatamente revogados.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingUser(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDeleteUser}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Confirmar Exclusão
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
