import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches all 16 authenticated drainage platform modules", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = [
      "/painel",
      "/mapa",
      "/alagamentos",
      "/vistorias",
      "/infraestrutura",
      "/topografia",
      "/bacias",
      "/calculos",
      "/simulacoes",
      "/alternativas",
      "/previsao",
      "/qualidade",
      "/relatorios",
      "/revisao",
      "/central-dados",
      "/administracao",
    ];
    for (const p of paths) {
      const m = router.matchRoutes(p);
      expect(m.at(-1)?.routeId).toBe(`/_authenticated${p}`);
    }
  });
});
