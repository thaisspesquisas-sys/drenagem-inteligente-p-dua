import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso — Drenagem Inteligente Pádua" },
      { name: "description", content: "Acesso restrito à equipe técnica de drenagem urbana." },
      { property: "og:title", content: "Acesso — Drenagem Inteligente Pádua" },
      { property: "og:description", content: "Acesso restrito à equipe técnica de drenagem urbana." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } } });
        if (error) throw error;
        toast.success("Conta criada. Confirme pelo link enviado ao seu e-mail.");
        setMode("in");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Se o e-mail estiver cadastrado, você receberá um link de redefinição.");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Falha na operação"); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="text-xs uppercase tracking-widest opacity-70">Santo Antônio de Pádua — RJ</div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Drenagem Inteligente Pádua</h1>
          <p className="mt-4 max-w-md opacity-80">Inteligência geográfica, hidrológica e hidráulica para diagnóstico e planejamento da drenagem urbana.</p>
        </div>
        <p className="text-xs opacity-60">Acesso restrito a usuários autorizados. Todas as operações são registradas.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-semibold">{mode === "in" ? "Entrar" : mode === "up" ? "Solicitar acesso" : "Recuperar senha"}</h2>
          {mode === "up" && (<div><Label>Nome completo</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>)}
          <div><Label>E-mail</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "forgot" && (<div><Label>Senha</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>)}
          <Button className="w-full" disabled={busy}>{busy ? "Aguarde…" : mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}</Button>
          <div className="flex justify-between text-sm text-muted-foreground">
            {mode !== "in" ? <button type="button" onClick={() => setMode("in")}>Voltar ao login</button>
              : <><button type="button" onClick={() => setMode("up")}>Criar conta</button><button type="button" onClick={() => setMode("forgot")}>Esqueci a senha</button></>}
          </div>
          {mode === "up" && <p className="text-xs text-muted-foreground">Novas contas não recebem permissões automaticamente: um administrador deve atribuir o perfil.</p>}
        </form>
      </div>
    </div>
  );
}
