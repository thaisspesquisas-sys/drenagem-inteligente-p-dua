import { createFileRoute } from "@tanstack/react-router";
import { OpeningPortal } from "@/components/app/OpeningPortal";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Abertura & Acesso — Drenagem Inteligente Pádua" },
      {
        name: "description",
        content:
          "Portal de abertura e acesso técnico da Plataforma Drenagem Inteligente de Santo Antônio de Pádua — RJ.",
      },
      { property: "og:title", content: "Drenagem Inteligente Pádua" },
      {
        property: "og:description",
        content:
          "Plataforma técnica de drenagem urbana, hidrologia e previsão oficial INMET de Santo Antônio de Pádua — RJ.",
      },
    ],
  }),
  component: OpeningPortal,
});
