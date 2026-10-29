import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export const QUALITY_LABEL: Record<string, string> = {
  confirmado_levantamento: "Confirmado em campo",
  fonte_oficial: "Fonte oficial",
  estimado_modelo: "Estimado por modelo",
  informado_terceiro: "Informado por terceiro",
  pendente_validacao: "Pendente de validação",
};
const QUALITY_CLS: Record<string, string> = {
  confirmado_levantamento: "bg-q-field text-primary-foreground",
  fonte_oficial: "bg-q-official text-primary-foreground",
  estimado_modelo: "bg-q-model text-primary-foreground",
  informado_terceiro: "bg-q-third text-foreground",
  pendente_validacao: "bg-q-pending text-primary-foreground",
};
export const QUALITY_VAR: Record<string, string> = {
  confirmado_levantamento: "var(--q-field)", fonte_oficial: "var(--q-official)",
  estimado_modelo: "var(--q-model)", informado_terceiro: "var(--q-third)", pendente_validacao: "var(--q-pending)",
};
export function QualityBadge({ q }: { q: string }) {
  return <Badge className={cn("border-0 font-normal", QUALITY_CLS[q])}>{QUALITY_LABEL[q] ?? q}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="num mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "info" }) {
  return (
    <div className={cn("rounded-md border-l-4 p-3 text-sm",
      tone === "warning" ? "border-warning bg-warning/15 text-warning-foreground" : "border-water bg-accent text-accent-foreground")}>
      {children}
    </div>
  );
}

export const fmt = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(Number(v)) ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }));
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
