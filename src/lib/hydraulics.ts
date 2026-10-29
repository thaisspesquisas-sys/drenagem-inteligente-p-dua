// Deterministic engineering calculations. Pure functions, versioned for reproducibility.
export const METHOD_VERSIONS = {
  slope: "declividade-v1.0",
  manningCircular: "manning-circular-v1.0",
  rational: "racional-v1.0",
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

/** Rational method Q = C·i·A / 360 (Q m³/s, i mm/h, A ha). */
export function rationalFlow(C: number, intensityMmH: number, areaHa: number): number {
  if (!(C > 0 && C <= 1)) throw new Error("Coeficiente C deve estar entre 0 e 1.");
  if (!(intensityMmH > 0)) throw new Error("Intensidade deve ser positiva.");
  if (!(areaHa > 0)) throw new Error("Área deve ser positiva.");
  return (C * intensityMmH * areaHa) / 360;
}
