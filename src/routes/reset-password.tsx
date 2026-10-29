import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Redefinir senha — Drenagem Inteligente Pádua" },
    { name: "description", content: "Defina uma nova senha de acesso." },
    { property: "og:title", content: "Redefinir senha — Drenagem Inteligente Pádua" },
    { property: "og:description", content: "Defina uma nova senha de acesso." },
  ] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) return toast.error(error.message);
        toast.success("Senha atualizada."); navigate({ to: "/painel" });
      }}>
        <h1 className="text-2xl font-semibold">Nova senha</h1>
        <Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button className="w-full">Salvar</Button>
      </form>
    </div>
  );
}
