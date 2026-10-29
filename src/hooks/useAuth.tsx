import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "engineer" | "technician" | "gis_analyst" | "viewer";
export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador", engineer: "Engenheiro responsável", technician: "Técnico de engenharia",
  gis_analyst: "Analista GIS", viewer: "Consulta técnica",
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user);
      if (data.user) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        if (active) setRoles((r ?? []).map((x) => x.role as AppRole));
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);
  const can = {
    edit: roles.some((r) => r !== "viewer"),
    approve: roles.includes("engineer"),
    admin: roles.includes("admin"),
    any: roles.length > 0,
  };
  return { user, roles, loading, can };
}
