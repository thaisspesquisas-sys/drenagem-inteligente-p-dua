import { describe, expect, it } from "vitest";
import {
  computeSlope,
  evaluateManningDiagnostics,
  evaluateOutfallSubmergence,
  haversineDistanceM,
  kirpichTcMinutes,
  manningCircular,
  rationalFlow,
  validateSlope,
} from "./hydraulics";

describe("declividade", () => {
  it("100.50 → 100.00 em 50 m = 1% e 0.5729°", () => {
    const r = computeSlope({ upstreamElev: 100.5, downstreamElev: 100, horizontalLength: 50 });
    expect(r.deltaH).toBeCloseTo(0.5, 10);
    expect(r.slopePercent).toBeCloseTo(1, 10);
    expect(r.angleDeg).toBeCloseTo(0.572939, 5);
    expect(r.direction).toBe("descendente");
  });
  it("rejeita comprimento zero", () => {
    expect(validateSlope({ upstreamElev: 1, downstreamElev: 0, horizontalLength: 0 }).length).toBe(1);
  });
  it("sentido ascendente quando cota final é maior", () => {
    expect(computeSlope({ upstreamElev: 10, downstreamElev: 11, horizontalLength: 100 }).direction).toBe("ascendente");
  });
});

describe("Manning seção circular", () => {
  it("D=1 m seção plena, S=0.001, n=0.013 → Q≈0.7582 m³/s, V≈0.9654 m/s", () => {
    const r = manningCircular({ diameterM: 1, slope: 0.001, n: 0.013, fillRatio: 1 });
    expect(r.area).toBeCloseTo(Math.PI / 4, 6);
    expect(r.hydraulicRadius).toBeCloseTo(0.25, 6);
    expect(r.velocity).toBeCloseTo(0.9654, 3);
    expect(r.flow).toBeCloseTo(0.7582, 3);
  });
  it("meia seção tem R = D/4 e metade da área", () => {
    const r = manningCircular({ diameterM: 0.6, slope: 0.005, n: 0.013, fillRatio: 0.5 });
    expect(r.area).toBeCloseTo((Math.PI * 0.36) / 8, 6);
    expect(r.hydraulicRadius).toBeCloseTo(0.15, 6);
  });
  it("recusa declividade não positiva", () => {
    expect(() => manningCircular({ diameterM: 1, slope: 0, n: 0.013, fillRatio: 1 })).toThrow();
  });
  it("avalia diagnósticos de velocidade baixa, perdas de carga e Froude", () => {
    const d = evaluateManningDiagnostics({
      diameterM: 0.4,
      slope: 0.0005,
      n: 0.015,
      fillRatio: 0.5,
      lengthM: 100,
      localLossK: 1.5,
      designFlowM3s: 0.5,
    });
    expect(d.velocity).toBeLessThan(0.6);
    expect(d.warnings.some((w) => w.includes("0,60 m/s"))).toBe(true);
    expect(d.warnings.some((w) => w.includes("Qproj > Qcalc"))).toBe(true);
    expect(d.frictionHeadLossM).toBeCloseTo(0.05, 5);
    expect(d.totalHeadLossM).toBeGreaterThan(d.frictionHeadLossM);
  });
});

describe("método racional e Kirpich", () => {
  it("C=0.8, i=100 mm/h, A=10 ha → 2.222 m³/s", () => {
    expect(rationalFlow(0.8, 100, 10)).toBeCloseTo(2.2222, 4);
  });
  it("Kirpich L=2 km, Δh=40 m → tc ≈ 29.00 min", () => {
    // 57 * (8 / 40)^0.385 = 57 * (0.2)^0.385 = 30.6776
    expect(kirpichTcMinutes(2, 40)).toBeCloseTo(57 * Math.pow(0.2, 0.385), 4);
  });
});

describe("submersão de lançamento e Haversine", () => {
  it("detecta descarga livre, parcial e totalmente afogada", () => {
    const livre = evaluateOutfallSubmergence({ outfallInvertElevM: 90, diameterM: 1, riverLevelElevM: 89.5 });
    expect(livre.condition).toBe("descarga_livre");
    expect(livre.reverseFlowRisk).toBe(false);

    const parcial = evaluateOutfallSubmergence({ outfallInvertElevM: 90, diameterM: 1, riverLevelElevM: 90.4 });
    expect(parcial.condition).toBe("parcialmente_afogada");
    expect(parcial.submergenceDepthM).toBeCloseTo(0.4, 5);

    const total = evaluateOutfallSubmergence({ outfallInvertElevM: 90, diameterM: 1, riverLevelElevM: 91.5, upstreamGroundElevM: 93 });
    expect(total.condition).toBe("totalmente_afogada");
    expect(total.reverseFlowRisk).toBe(true);
  });
  it("calcula distância Haversine em metros", () => {
    const d = haversineDistanceM(-21.5394, -42.1803, -21.5404, -42.1803);
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(115);
  });
});
