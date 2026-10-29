import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type AppRole } from "@/hooks/useAuth";
import { PageHeader, fmtDate } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/administracao")({
  head: () => ({ meta: [{ title: "Administração — Drenagem Inteligente Pádua" }, { name: "description", content: "Usuários, perfis e auditoria." }] }),
  component: Page,
});

function Page() {
  const { can, user } = useAuth();
  const [profiles, setProfiles] = useState<Tables<"profiles">[]>([]);
  const [roles, setRoles] = useState<Tables<"user_roles">[]>([]);
  const [audit, setAudit] = useState<Tables<"audit_logs">[]>([]);
  const [me, setMe] = useState({ full_name: "", crea: "", organization: "" });
  const load = async () => {
    const [p, r, a] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*"), supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50)]);
    setProfiles(p.data ?? []); setRoles(r.data ?? []); setAudit(a.data ?? []);
    const mine = (p.data ?? []).find((x) => x.id === user?.id); if (mine) setMe({ full_name: mine.full_name ?? "", crea: mine.crea ?? "", organization: mine.organization ?? "" });
  };
  useEffect(() => { if (user) load(); }, [user]);
  const toggle = async (uid: string, role: AppRole, has: boolean) => {
    const { error } = has ? await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: uid, role, granted_by: user!.id });
    if (error) return toast.error(error.message); load();
  };
  const saveMe = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: me.full_name, crea: me.crea || null, organization: me.organization || null }).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado.");
  };
  return (
    <>
      <PageHeader title="Administração" description="Gestão de perfis com menor privilégio. Ninguém pode alterar os próprios perfis de acesso." />
      <form onSubmit={saveMe} className="mb-6 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-4">
        <h2 className="font-semibold md:col-span-4">Meu perfil profissional</h2>
        <div><Label className="text-xs">Nome</Label><Input value={me.full_name} onChange={(e) => setMe({ ...me, full_name: e.target.value })} /></div>
        <div><Label className="text-xs">CREA (quando aplicável)</Label><Input value={me.crea} onChange={(e) => setMe({ ...me, crea: e.target.value })} /></div>
        <div><Label className="text-xs">Órgão</Label><Input value={me.organization} onChange={(e) => setMe({ ...me, organization: e.target.value })} /></div>
        <Button type="submit" className="self-end">Salvar</Button>
      </form>
      {can.admin ? <>
        <h2 className="mb-2 font-semibold">Usuários e perfis</h2>
        <div className="mb-6 overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Usuário</th>{(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => <th key={r} className="px-2">{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{profiles.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{p.full_name || "—"}<div className="text-xs text-muted-foreground">{p.email}</div></td>
            {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => { const has = roles.some((x) => x.user_id === p.id && x.role === r);
              return <td key={r} className="px-2 text-center"><input type="checkbox" checked={has} disabled={p.id === user?.id} onChange={() => toggle(p.id, r, has)} /></td>; })}</tr>)}</tbody></table></div>
        <h2 className="mb-2 font-semibold">Auditoria (últimas 50 operações)</h2>
        <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-xs">
          <thead className="bg-muted text-left uppercase text-muted-foreground"><tr><th className="p-2">Data</th><th>Tabela</th><th>Ação</th><th>Usuário</th><th>Registro</th></tr></thead>
          <tbody>{audit.map((a) => <tr key={a.id} className="border-t"><td className="p-2">{fmtDate(a.created_at)}</td><td>{a.table_name}</td><td>{a.action}</td><td>{profiles.find((p) => p.id === a.actor)?.email ?? a.actor?.slice(0, 8) ?? "sistema"}</td><td className="num">{a.record_id?.slice(0, 8)}</td></tr>)}</tbody></table></div>
      </> : <p className="text-sm text-muted-foreground">Gestão de usuários disponível apenas para administradores.</p>}
    </>
  );
}
