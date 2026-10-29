import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/painel" }); },
  head: () => ({
    meta: [
      { title: "Drenagem Inteligente Pádua" },
      { name: "description", content: "Plataforma técnica de drenagem urbana de Santo Antônio de Pádua — RJ." },
      { property: "og:title", content: "Drenagem Inteligente Pádua" },
      { property: "og:description", content: "Plataforma técnica de drenagem urbana de Santo Antônio de Pádua — RJ." },
    ],
  }),
});
