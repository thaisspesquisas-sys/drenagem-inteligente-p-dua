import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  APP_TOOLS,
  fetchSystemAclStore,
  getDefaultCapabilitiesForRoles,
  getDefaultToolsForRoles,
  readLocalAclStore,
  type CapabilityKey,
  type ToolRoute,
  type UserAccountStatus,
} from "@/lib/user-permissions";

export type AppRole = "admin" | "engineer" | "technician" | "gis_analyst" | "viewer";
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  engineer: "Engenheiro responsável",
  technician: "Técnico de engenharia",
  gis_analyst: "Analista GIS",
  viewer: "Consulta técnica",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowedTools, setAllowedTools] = useState<ToolRoute[]>(
    APP_TOOLS.map((t) => t.to)
  );
  const [capabilities, setCapabilities] = useState<Record<CapabilityKey, boolean>>({
    can_create_records: true,
    can_delete_records: false,
    can_run_simulations: true,
    can_approve_crea: false,
    can_export_reports: true,
  });
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus>("active");

  const applyAclForUser = useCallback((uid: string | undefined, userRoles: AppRole[]) => {
    if (!uid) return;
    const store = readLocalAclStore();
    const record = store.users[uid];
    if (record) {
      setAccountStatus(record.status);
      // Always keep /painel and /administracao reachable if admin
      const tools = new Set<ToolRoute>(record.allowedTools ?? []);
      tools.add("/painel");
      if (userRoles.includes("admin")) {
        for (const t of APP_TOOLS) tools.add(t.to);
      }
      setAllowedTools(Array.from(tools));
      setCapabilities(
        record.capabilities ?? getDefaultCapabilitiesForRoles(userRoles)
      );
    } else {
      setAccountStatus(userRoles.length > 0 ? "active" : "pending");
      // When no custom tool restriction is saved, grant all default tools for their roles (or all tools if admin)
      setAllowedTools(
        userRoles.length > 0
          ? getDefaultToolsForRoles(userRoles)
          : APP_TOOLS.map((t) => t.to)
      );
      setCapabilities(getDefaultCapabilitiesForRoles(userRoles));
    }
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    let userRoles: AppRole[] = [];
    if (data.user) {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      userRoles = (r ?? []).map((x) => x.role as AppRole);
      setRoles(userRoles);
      await fetchSystemAclStore();
      applyAclForUser(data.user.id, userRoles);
    }
    setLoading(false);
  }, [applyAclForUser]);

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) setLoading(false);
    });
    const onAclUpdate = () => {
      if (user) applyAclForUser(user.id, roles);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dip-acl-updated", onAclUpdate);
    }
    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("dip-acl-updated", onAclUpdate);
      }
    };
  }, [load, user?.id, roles.join(",")]);

  const isAdmin = roles.includes("admin");
  const can = {
    edit:
      isAdmin ||
      roles.some((r) => r !== "viewer") ||
      capabilities.can_create_records,
    approve: isAdmin || roles.includes("engineer") || capabilities.can_approve_crea,
    admin: isAdmin,
    any: roles.length > 0,
    delete: isAdmin || capabilities.can_delete_records,
    simulate: isAdmin || capabilities.can_run_simulations,
    exportReports: isAdmin || capabilities.can_export_reports,
  };

  const hasToolAccess = (route: string): boolean => {
    if (isAdmin) return true;
    if (route === "/painel" || route === "/administracao") return true;
    return allowedTools.includes(route as ToolRoute);
  };

  return {
    user,
    roles,
    loading,
    can,
    allowedTools,
    capabilities,
    accountStatus,
    hasToolAccess,
    refreshAuth: load,
  };
}
