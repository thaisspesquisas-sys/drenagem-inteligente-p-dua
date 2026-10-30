import { createFileRoute } from "@tanstack/react-router";
import { OpeningPortal } from "@/components/app/OpeningPortal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Drenagem Inteligente Pádua — Portal Oficial" },
      {
        name: "description",
        content:
          "Plataforma técnica de drenagem urbana, hidrologia e previsão oficial em tempo real de Santo Antônio de Pádua — RJ.",
      },
      { property: "og:title", content: "Drenagem Inteligente Pádua" },
      {
        property: "og:description",
        content:
          "Plataforma técnica de drenagem urbana de Santo Antônio de Pádua — RJ.",
      },
    ],
  }),
  component: OpeningPortal,
});
