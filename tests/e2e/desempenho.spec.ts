import { expect, test } from "@playwright/test";
import { celularAleatorio, criarContaEOficina, placaAleatoria, registrarAtendimento } from "./ajudantes";

// Mede no `next dev` local: os números servem para comparar, não refletem produção.
const ABAS = [
  { href: "/", titulo: "Hoje" },
  { href: "/novo", titulo: "Novo atendimento" },
  { href: "/clientes", titulo: "Clientes" },
  { href: "/resultados", titulo: "Resultados" },
  { href: "/config", titulo: "Ajustes" },
];

test("desempenho: navegação entre abas e salvar atendimento", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Desempenho ${Date.now()}`);
  for (let i = 0; i < 3; i++) {
    await registrarAtendimento(page, {
      placa: placaAleatoria(),
      nome: `Cliente Perf ${i}`,
      whatsapp: celularAleatorio().digitado,
      km: String(30000 + i * 1000),
      data: "2025-06-01",
      servicos: ["Troca de óleo e filtro", "Revisão de freios"],
    });
  }

  const tempos: Record<string, number[]> = {};
  const menu = page.locator("aside");
  for (let rodada = 0; rodada < 3; rodada++) {
    for (const aba of ABAS) {
      if (rodada === 0 && aba.href === "/") continue; // já estamos/estivemos nela
      const inicio = Date.now();
      await menu.locator(`a[href="${aba.href}"]`).click();
      await page.waitForURL((u) => u.pathname === aba.href);
      await expect(page.getByRole("heading", { level: 1, name: aba.titulo })).toBeVisible({
        timeout: 60_000,
      });
      (tempos[aba.href] ??= []).push(Date.now() - inicio);
    }
  }

  const salvar: number[] = [];
  for (let i = 0; i < 3; i++) {
    await page.goto("/novo");
    salvar.push(
      await registrarAtendimento(page, {
        placa: placaAleatoria(),
        nome: `Cliente Salvar ${i}`,
        whatsapp: celularAleatorio().digitado,
        km: "40000",
        servicos: ["Troca de óleo e filtro"],
      }),
    );
  }

  const linhas = Object.entries(tempos).map(
    ([href, ms]) => `  ${href.padEnd(12)} ${ms.map((x) => `${x} ms`).join(" | ")}`,
  );
  const relatorio = [
    "Navegação (clique no menu até o título aparecer), rodadas 1 | 2 | 3:",
    ...linhas,
    `Salvar atendimento (clique até a confirmação): ${salvar.map((x) => `${x} ms`).join(" | ")}`,
  ].join("\n");
  console.log("\n" + relatorio + "\n");
  test.info().annotations.push({ type: "desempenho", description: relatorio });
});
