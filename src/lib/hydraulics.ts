// Deterministic engineering calculations. Pure functions, versioned for reproducibility.
export const METHOD_VERSIONS = {
  slope: "declividade-v1.0",
  manningCircular: "manning-circular-v1.0",
  manningDiagnostics: "manning-diagnostico-v1.0",
  rational: "racional-v1.0",
  kirpichTc: "kirpich-tc-v1.0",
  outfallSubmergence: "submersao-lancamento-v1.0",
} as const;

export type SlopeInput = { upstreamElev: number; downstreamElev: number; horizontalLength: number };
export type SlopeResult = {
  deltaH: number; slopePercent: number; angleDeg: number;
  direction: "descendente" | "ascendente" | "nivelado";
};

export function validateSlope(i: Partial<SlopeInput>): string[] {
  const e: string[] = [];
  if (i.upstreamElev == null || !Number.isFinite(i.upstreamElev)) e.push("Cota inicial ausente ou inválida.");
  if (i.downstreamElev == null || !Number.isFinite(i.downstreamElev)) e.push("Cota final ausente ou inválida.");
  if (i.horizontalLength == null || !Number.isFinite(i.horizontalLength) || i.horizontalLength <= 0)
    e.push("Comprimento horizontal deve ser maior que zero.");
  return e;
}

export function computeSlope(i: SlopeInput): SlopeResult {
  const errs = validateSlope(i);
  if (errs.length) throw new Error(errs.join(" "));
  const deltaH = i.upstreamElev - i.downstreamElev;
  const ratio = deltaH / i.horizontalLength;
  return {
    deltaH,
    slopePercent: ratio * 100,
    angleDeg: (Math.atan(ratio) * 180) / Math.PI,
    direction: deltaH > 0 ? "descendente" : deltaH < 0 ? "ascendente" : "nivelado",
  };
}

export type ManningInput = { diameterM: number; slope: number; n: number; fillRatio: number };
export type ManningResult = {
  theta: number; area: number; wettedPerimeter: number; hydraulicRadius: number;
  velocity: number; flow: number; topWidth: number;
};

/** Manning for circular section, partially full (uniform flow). slope in m/m, fillRatio = y/D in (0,1]. */
export function manningCircular({ diameterM: D, slope: S, n, fillRatio }: ManningInput): ManningResult {
  if (!(D > 0)) throw new Error("Diâmetro deve ser maior que zero.");
  if (!(S > 0)) throw new Error("Declividade deve ser positiva para escoamento uniforme por gravidade.");
  if (!(n > 0)) throw new Error("Coeficiente de Manning deve ser positivo.");
  if (!(fillRatio > 0 && fillRatio <= 1)) throw new Error("Lâmina relativa y/D deve estar entre 0 e 1.");
  const theta = 2 * Math.acos(1 - 2 * fillRatio);
  const area = ((theta - Math.sin(theta)) * D * D) / 8;
  const wettedPerimeter = (theta * D) / 2;
  const hydraulicRadius = area / wettedPerimeter;
  const velocity = (1 / n) * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(S);
  const topWidth = fillRatio >= 1 ? 0 : D * Math.sin(theta / 2);
  return { theta, area, wettedPerimeter, hydraulicRadius, velocity, flow: velocity * area, topWidth };
}

export type ManningDiagnosticsInput = ManningInput & {
  lengthM?: number;
  localLossK?: number;
  designFlowM3s?: number;
};

export type ManningDiagnosticsResult = ManningResult & {
  froude: number;
  flowRegime: "subcritico" | "critico" | "supercritico" | "conduto_pleno";
  frictionHeadLossM: number;
  localHeadLossM: number;
  totalHeadLossM: number;
  capacityRatio: number | null;
  warnings: string[];
};

const GRAVITY = 9.80665;

/** Extended Manning evaluation with Froude number, head losses, and technical alerts. */
export function evaluateManningDiagnostics(input: ManningDiagnosticsInput): ManningDiagnosticsResult {
  const base = manningCircular(input);
  const hydraulicDepth = base.topWidth > 1e-6 ? base.area / base.topWidth : input.diameterM;
  const froude = input.fillRatio >= 1 ? 0 : base.velocity / Math.sqrt(GRAVITY * hydraulicDepth);
  const flowRegime =
    input.fillRatio >= 1
      ? "conduto_pleno"
      : froude < 0.95
        ? "subcritico"
        : froude <= 1.05
          ? "critico"
          : "supercritico";
  const lengthM = input.lengthM && input.lengthM > 0 ? input.lengthM : 0;
  const localLossK = input.localLossK && input.localLossK > 0 ? input.localLossK : 0;
  const frictionHeadLossM = lengthM * input.slope;
  const localHeadLossM = localLossK * ((base.velocity * base.velocity) / (2 * GRAVITY));
  const totalHeadLossM = frictionHeadLossM + localHeadLossM;
  const capacityRatio =
    input.designFlowM3s != null && input.designFlowM3s > 0 ? input.designFlowM3s / base.flow : null;

  const warnings: string[] = [];
  if (base.velocity < 0.6) {
    warnings.push("Velocidade inferior a 0,60 m/s: risco de deposição de sedimentos e assoreamento.");
  }
  if (base.velocity > 5.0) {
    warnings.push("Velocidade superior a 5,00 m/s: risco de abrasão/erosão e necessidade de dissipação de energia.");
  }
  if (input.fillRatio > 0.85) {
    warnings.push("Lâmina y/D > 0,85: proximidade de instabilidade de superfície livre e transição para pressão.");
  }
  if (flowRegime === "supercritico" && froude > 1.5) {
    warnings.push("Escoamento supercrítico elevado (Fr > 1,5): verificar controle de entrada e ressalto hidráulico.");
  }
  if (capacityRatio != null && capacityRatio > 1) {
    warnings.push("Vazão de projeto superior à capacidade calculada no trecho (Qproj > Qcalc).");
  }

  return {
    ...base,
    froude,
    flowRegime,
    frictionHeadLossM,
    localHeadLossM,
    totalHeadLossM,
    capacityRatio,
    warnings,
  };
}

/** Rational method Q = C·i·A / 360 (Q m³/s, i mm/h, A ha). */
export function rationalFlow(C: number, intensityMmH: number, areaHa: number): number {
  if (!(C > 0 && C <= 1)) throw new Error("Coeficiente C deve estar entre 0 e 1.");
  if (!(intensityMmH > 0)) throw new Error("Intensidade deve ser positiva.");
  if (!(areaHa > 0)) throw new Error("Área deve ser positiva.");
  return (C * intensityMmH * areaHa) / 360;
}

/**
 * Kirpich Time of Concentration (minutes):
 * tc = 57 * (L_km^3 / deltaH_m)^0.385
 */
export function kirpichTcMinutes(lengthKm: number, deltaHM: number): number {
  if (!(lengthKm > 0)) throw new Error("Comprimento do talvegue deve ser maior que zero.");
  if (!(deltaHM > 0)) throw new Error("Desnível Δh deve ser maior que zero.");
  return 57 * Math.pow((lengthKm * lengthKm * lengthKm) / deltaHM, 0.385);
}

export type OutfallSubmergenceInput = {
  outfallInvertElevM: number;
  diameterM: number;
  riverLevelElevM: number;
  upstreamGroundElevM?: number | null;
};

export type OutfallSubmergenceResult = {
  crownElevM: number;
  submergenceDepthM: number;
  condition: "descarga_livre" | "parcialmente_afogada" | "totalmente_afogada" | "risco_retorno_extravasamento";
  reverseFlowRisk: boolean;
  summary: string;
};

/** Evaluates outfall submergence and backwater risk from river stage elevation (same vertical datum required). */
export function evaluateOutfallSubmergence(i: OutfallSubmergenceInput): OutfallSubmergenceResult {
  if (!Number.isFinite(i.outfallInvertElevM) || !Number.isFinite(i.riverLevelElevM)) {
    throw new Error("Cotas de fundo do lançamento e do nível do rio são obrigatórias.");
  }
  if (!(i.diameterM > 0)) throw new Error("Diâmetro/altura da seção de saída deve ser maior que zero.");
  const crownElevM = i.outfallInvertElevM + i.diameterM;
  const submergenceDepthM = Math.max(0, i.riverLevelElevM - i.outfallInvertElevM);

  if (i.riverLevelElevM <= i.outfallInvertElevM) {
    return {
      crownElevM,
      submergenceDepthM: 0,
      condition: "descarga_livre",
      reverseFlowRisk: false,
      summary: "Nível do rio abaixo da geratriz inferior: descarga livre sem afogamento.",
    };
  }
  if (i.upstreamGroundElevM != null && Number.isFinite(i.upstreamGroundElevM) && i.riverLevelElevM >= i.upstreamGroundElevM) {
    return {
      crownElevM,
      submergenceDepthM,
      condition: "risco_retorno_extravasamento",
      reverseFlowRisk: true,
      summary: "Nível do rio igual ou superior à cota de superfície a montante: risco crítico de retorno pela rede e extravasamento.",
    };
  }
  if (i.riverLevelElevM >= crownElevM) {
    return {
      crownElevM,
      submergenceDepthM,
      condition: "totalmente_afogada",
      reverseFlowRisk: true,
      summary: "Saída totalmente submersa (nível do rio acima da geratriz superior): controle de saída por jusante, remanso e risco de refluxo.",
    };
  }
  return {
    crownElevM,
    submergenceDepthM,
    condition: "parcialmente_afogada",
    reverseFlowRisk: true,
    summary: "Saída parcialmente submersa: redução da capacidade de escoamento e possível entrada de água do rio.",
  };
}

/** Great-circle distance in meters between two geographic coordinates (WGS84 / SIRGAS 2000). */
export function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
