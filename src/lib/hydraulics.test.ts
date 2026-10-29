import { describe, expect, it } from "vitest";
import { computeSlope, manningCircular, rationalFlow, validateSlope } from "./hydraulics";

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
});

describe("método racional", () => {
  it("C=0.8, i=100 mm/h, A=10 ha → 2.222 m³/s", () => {
    expect(rationalFlow(0.8, 100, 10)).toBeCloseTo(2.2222, 4);
  });
});
