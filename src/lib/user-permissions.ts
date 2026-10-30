import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useAuth";

export type ToolRoute =
  | "/painel"
  | "/mapa"
  | "/previsao"
  | "/alagamentos"
  | "/vistorias"
  | "/infraestrutura"
  | "/topografia"
  | "/bacias"
  | "/calculos"
  | "/simulacoes"
  | "/alternativas"
  | "/qualidade"
  | "/relatorios"
  | "/revisao"
  | "/central-dados"
  | "/administracao";

export interface AppToolDefinition {
  to: ToolRoute;
  label: string;
  group: string;
  description: string;
  defaultRoles: AppRole[];
}

export const APP_TOOLS: AppToolDefinition[] = [
  {
    to: "/painel",
    label: "Dashboard Principal",
    group: "Monitoramento & Operação",
    description: "Visão consolidada da rede, indicadores e previsão oficial INMET",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
  },
  {
    to: "/mapa",
    label: "Mapa Geográfico",
    group: "Monitoramento & Operação",
    description: "Mapa SIG interativo com condutos, bacias, cotas e alagamentos",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
  },
  {
    to: "/previsao",
    label: "Previsão & Alertas",
    group: "Monitoramento & Operação",
    description: "Previsão oficial em tempo real INMET, estação A604 e regras de alerta",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
  },
  {
    to: "/alagamentos",
    label: "Pontos de Alagamento",
    group: "Cadastro & Campo",
    description: "Cadastro georreferenciado de ocorrências e manchas de inundação",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
  },
  {
    to: "/vistorias",
    label: "Vistorias de Campo",
    group: "Cadastro & Campo",
    description: "Ordens de serviço, inspeção de bocas de lobo, galerias e assoreamento",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst"],
  },
  {
    to: "/infraestrutura",
    label: "Rede de Drenagem",
    group: "Cadastro & Campo",
    description: "Cadastro técnico de trechos, galerias, poços de visita e lançamentos",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst"],
  },
  {
    to: "/topografia",
    label: "Relevo & Topografia",
    group: "Cadastro & Campo",
    description: "Levantamentos altimétricos, perfis longitudinais e declividade",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst"],
  },
  {
    to: "/bacias",
    label: "Bacias & Hidrologia",
    group: "Engenharia & Modelagem",
    description: "Delimitação de microbacias, Kirpich, Método Racional e SCS-CN",
    defaultRoles: ["admin", "engineer", "gis_analyst"],
  },
  {
    to: "/calculos",
    label: "Cálculos Hidráulicos",
    group: "Engenharia & Modelagem",
    description: "Dimensionamento por Manning, energia específica, Froude e submersão",
    defaultRoles: ["admin", "engineer", "technician"],
  },
  {
    to: "/simulacoes",
    label: "Simulações & Rio Pomba",
    group: "Engenharia & Modelagem",
    description: "Cenários de chuva extrema e remanso hidráulico do Rio Pomba",
    defaultRoles: ["admin", "engineer"],
  },
  {
    to: "/alternativas",
    label: "Alternativas de Obra",
    group: "Engenharia & Modelagem",
    description: "Estudo multicritério de intervenções, piscinões e macrodrenagem",
    defaultRoles: ["admin", "engineer"],
  },
  {
    to: "/qualidade",
    label: "Qualidade dos Dados",
    group: "Governança & Dados",
    description: "Auditoria topológica, consistência cadastral e índice de confiabilidade",
    defaultRoles: ["admin", "engineer", "gis_analyst"],
  },
  {
    to: "/relatorios",
    label: "Relatórios Técnicos",
    group: "Governança & Dados",
    description: "Emissão de laudos oficiais, memoriais de cálculo e impressão PDF",
    defaultRoles: ["admin", "engineer", "technician", "gis_analyst", "viewer"],
  },
  {
    to: "/revisao",
    label: "Revisão & Aprovação",
    group: "Governança & Dados",
    description: "Chancela técnica com registro CREA e homologação de estudos",
    defaultRoles: ["admin", "engineer"],
  },
  {
    to: "/central-dados",
    label: "Central de Dados",
    group: "Governança & Dados",
    description: "Catálogo de fontes oficiais (ANA, INMET, IBGE, CPRM) e metadados",
    defaultRoles: ["admin", "engineer", "gis_analyst"],
  },
  {
    to: "/administracao",
    label: "Administração",
    group: "Governança & Dados",
    description: "Gestão de contas de usuários, perfis, permissões de ferramentas e auditoria",
    defaultRoles: ["admin"],
  },
];

export type CapabilityKey =
  | "can_create_records"
  | "can_delete_records"
  | "can_run_simulations"
  | "can_approve_crea"
  | "can_export_reports";

export const CAPABILITY_DEFINITIONS: {
  key: CapabilityKey;
  label: string;
  description: string;
}[] = [
  {
    key: "can_create_records",
    label: "Cadastrar e Editar Dados",
    description: "Inserir e atualizar trechos de rede, vistorias, bacias e pontos de alagamento",
  },
  {
    key: "can_delete_records",
    label: "Excluir Registros Técnicos",
    description: "Remover cadastros incorretos ou obsoletos das tabelas operacionais",
  },
  {
    key: "can_run_simulations",
    label: "Executar Cálculos e Simulações",
    description: "Rodar dimensionamentos hidráulicos (Manning) e cenários de cheia do Rio Pomba",
  },
  {
    key: "can_approve_crea",
    label: "Homologar e Assinar Revisões (CREA)",
    description: "Aprovar ou reprovar estudos técnicos na fila de governança",
  },
  {
    key: "can_export_reports",
    label: "Emitir e Exportar Relatórios Oficiais",
    description: "Gerar laudos técnicos oficiais para impressão e exportação de dados",
  },
];

export type UserAccountStatus = "active" | "pending" | "suspended" | "deleted";

export interface UserManagedRecord {
  userId: string;
  email: string;
  fullName: string;
  crea: string;
  organization: string;
  phone?: string;
  jobTitle?: string;
  status: UserAccountStatus;
  allowedTools: ToolRoute[];
  capabilities: Record<CapabilityKey, boolean>;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface SystemUserAclStore {
  version: number;
  users: Record<string, UserManagedRecord>;
}

const ACL_STORAGE_KEY = "dip_system_user_acl_v1";
const ACL_SNAPSHOT_SOURCE = "system_user_acl_v1";

export function getDefaultToolsForRoles(roles: AppRole[]): ToolRoute[] {
  if (roles.includes("admin")) {
    return APP_TOOLS.map((t) => t.to);
  }
  if (roles.length === 0) {
    return ["/painel", "/previsao", "/mapa"];
  }
  const set = new Set<ToolRoute>();
  for (const tool of APP_TOOLS) {
    if (roles.some((r) => tool.defaultRoles.includes(r))) {
      set.add(tool.to);
    }
  }
  return Array.from(set);
}

export function getDefaultCapabilitiesForRoles(
  roles: AppRole[]
): Record<CapabilityKey, boolean> {
  const isAdmin = roles.includes("admin");
  const isEngineer = roles.includes("engineer");
  const isTech = roles.includes("technician");
  const isGis = roles.includes("gis_analyst");
  const isViewer = roles.includes("viewer");

  return {
    can_create_records: isAdmin || isEngineer || isTech || isGis,
    can_delete_records: isAdmin || isEngineer,
    can_run_simulations: isAdmin || isEngineer || isTech,
    can_approve_crea: isAdmin || isEngineer,
    can_export_reports: isAdmin || isEngineer || isTech || isGis || isViewer,
  };
}

export function readLocalAclStore(): SystemUserAclStore {
  if (typeof window === "undefined") {
    return { version: 1, users: {} };
  }
  try {
    const raw = window.localStorage.getItem(ACL_STORAGE_KEY);
    if (!raw) return { version: 1, users: {} };
    const parsed = JSON.parse(raw) as SystemUserAclStore;
    if (parsed && typeof parsed === "object" && parsed.users) {
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return { version: 1, users: {} };
}

export function writeLocalAclStore(store: SystemUserAclStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACL_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("dip-acl-updated"));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchSystemAclStore(): Promise<SystemUserAclStore> {
  const local = readLocalAclStore();
  try {
    const { data } = await supabase
      .from("weather_snapshots")
      .select("payload, fetched_at")
      .eq("source", ACL_SNAPSHOT_SOURCE)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.payload && typeof data.payload === "object") {
      const remote = data.payload as unknown as SystemUserAclStore;
      if (remote.users) {
        const merged: SystemUserAclStore = {
          version: 1,
          users: { ...local.users, ...remote.users },
        };
        writeLocalAclStore(merged);
        return merged;
      }
    }
  } catch {
    // fallback to local store
  }
  return local;
}

export async function saveSystemAclStore(store: SystemUserAclStore): Promise<void> {
  writeLocalAclStore(store);
  try {
    const validUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    await supabase.from("weather_snapshots").insert({
      source: ACL_SNAPSHOT_SOURCE,
      latitude: -21.5394,
      longitude: -42.1803,
      payload: store as unknown as any,
      valid_until: validUntil,
    });
  } catch {
    // Local store is already updated
  }
}

