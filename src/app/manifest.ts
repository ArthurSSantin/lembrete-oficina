import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lembrete Oficina",
    short_name: "Lembrete",
    description: "Quem chamar hoje para voltar à oficina, com a mensagem pronta no WhatsApp.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#edefea",
    theme_color: "#1b2220",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
