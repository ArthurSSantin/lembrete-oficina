import { expect, test, type Page } from "@playwright/test";
import {
  cartaoNaSecao,
  celularAleatorio,
  criarContaEOficina,
  dataSP,
  placaAleatoria,
  supabaseComo,
} from "./ajudantes";

const br = (iso: string) => iso.split("-").reverse().join("/");

async function importar(page: Page, planilha: string, linhas: number, autorizaram = true) {
  await page.goto("/clientes/importar");
  await page.getByLabel("Planilha").fill(planilha);
  const n = linhas === 1 ? "1 linha" : `${linhas} linhas`;
  await expect(page.getByText(`${n} encontrada${linhas === 1 ? "" : "s"}`)).toBeVisible();
  if (autorizaram) {
    await page.getByLabel("Estes clientes autorizaram receber lembretes pelo WhatsApp").check();
  }
  await page.getByRole("button", { name: `Importar ${n}` }).click();
  await expect(page.getByRole("heading", { name: "Importação concluída" })).toBeVisible();
}

test("importar planilha: cria clientes/carros, gera lembrete e reimportar não duplica", async ({
  page,
}) => {
  const email = await criarContaEOficina(page, `Oficina Importa ${Date.now()}`);
  const sufixo = Date.now();
  const [p1, p2] = [placaAleatoria(), placaAleatoria()];
  const [c1, c2, c3] = [celularAleatorio(), celularAleatorio(), celularAleatorio()];
  const data = dataSP(-200);
  const planilha = [
    "Nome\tWhatsApp\tPlaca\tModelo\tAno\tServiço\tData\tKm\tValor",
    `Ana Import ${sufixo}\t${c1.digitado}\t${p1}\tOnix\t2019\tTroca de óleo e filtro\t${br(data)}\t40.000\tR$ 250,00`,
    `Bruno Import ${sufixo}\t${c2.digitado}\t${p2}\tGol\t\tLavagem especial\t${br(data)}\t\t`,
    `\t${celularAleatorio().digitado}\t\t\t\t\t\t\t`,
    `Carla Import ${sufixo}\t${c3.digitado}\t\t\t\t\t\t\t`,
  ].join("\n");

  // Link a partir da tela Clientes.
  await page.goto("/clientes");
  await page.getByRole("link", { name: "Importar planilha" }).click();
  await page.waitForURL("**/clientes/importar");

  await page.getByLabel("Planilha").fill(planilha);
  await expect(page.getByText("4 linhas encontradas")).toBeVisible();
  const previa = page.locator("table tbody tr");
  await expect(previa).toHaveCount(4);
  await expect(previa.first()).toContainText(`Ana Import ${sufixo}`);
  await expect(previa.first()).toContainText(br(data));

  await page.getByLabel("Estes clientes autorizaram receber lembretes pelo WhatsApp").check();
  await page.getByRole("button", { name: "Importar 4 linhas" }).click();
  await expect(page.getByRole("heading", { name: "Importação concluída" })).toBeVisible();
  await expect(page.getByText("3 clientes novos")).toBeVisible();
  await expect(page.getByText("2 carros novos")).toBeVisible();
  await expect(page.getByText("1 serviço com lembrete")).toBeVisible();
  await page.getByText("2 observações").click();
  await expect(page.getByText(/Linha 3: serviço "Lavagem especial" não bate com um único serviço/)).toBeVisible();
  await expect(page.getByText("Linha 4: sem nome")).toBeVisible();

  const sb = await supabaseComo(email);
  const { data: clientes } = await sb.from("clientes").select("nome, whatsapp, consentimento");
  expect(clientes).toHaveLength(3);
  expect(clientes!.every((c) => c.consentimento)).toBe(true);
  expect(clientes!.map((c) => c.whatsapp).sort()).toEqual(
    [c1.normalizado, c2.normalizado, c3.normalizado].sort(),
  );
  const { data: servicos } = await sb
    .from("servicos")
    .select("data, km, valor, proxima_data, proxima_km, lembrete_status, posvenda_em, tipos_servico(nome)");
  expect(servicos).toEqual([
    expect.objectContaining({
      data,
      km: 40000,
      valor: 250,
      proxima_data: dataSP(-20),
      proxima_km: 50000,
      lembrete_status: "pendente",
      tipos_servico: { nome: "Troca de óleo e filtro" },
    }),
  ]);
  expect(servicos![0].posvenda_em).not.toBeNull();

  // O lembrete aparece no Hoje.
  await page.getByRole("link", { name: "Ver quem chamar hoje" }).click();
  await expect(cartaoNaSecao(page, "Para chamar hoje", `Ana Import ${sufixo}`)).toBeVisible();

  // Reimportar a mesma planilha.
  await importar(page, planilha, 4);
  await expect(page.getByText("0 clientes novos")).toBeVisible();
  await expect(page.getByText("0 carros novos")).toBeVisible();
  await expect(page.getByText(/1 serviço já existia/)).toBeVisible();
  const { count: nClientes } = await sb.from("clientes").select("id", { count: "exact", head: true });
  const { count: nVeiculos } = await sb.from("veiculos").select("id", { count: "exact", head: true });
  expect(nClientes).toBe(3);
  expect(nVeiculos).toBe(2);

  // O mesmo serviço (mesmo carro, mesma data) não deve virar um segundo lembrete.
  const { data: depois } = await sb.from("servicos").select("id, lembrete_status");
  expect(depois, "serviços após reimportar").toHaveLength(1);
});

test("importar CSV com ; e aspas; serviço com nome parcial vira lembrete; valor 1.500,50", async ({
  page,
}) => {
  const email = await criarContaEOficina(page, `Oficina CSV ${Date.now()}`);
  const placa = placaAleatoria();
  const planilha = [
    "nome;telefone;placa;servico;data;valor",
    `"Souza; Davi";${celularAleatorio().digitado};${placa};Troca de óleo;${br(dataSP(-30))};1.500,50`,
    `Edu;${celularAleatorio().digitado};${placaAleatoria()};Alinhamento e balanceamento;${br(dataSP(-30))};250.00`,
  ].join("\n");
  await importar(page, planilha, 2, false);
  await expect(page.getByText("2 serviços com lembrete")).toBeVisible();

  const sb = await supabaseComo(email);
  const { data: clientes } = await sb.from("clientes").select("nome, consentimento").order("nome");
  expect(clientes).toEqual([
    { nome: "Edu", consentimento: false },
    { nome: "Souza; Davi", consentimento: false },
  ]);
  const { data: servicos } = await sb
    .from("servicos")
    .select("valor, tipos_servico(nome)")
    .order("valor");
  expect(servicos).toEqual(
    expect.arrayContaining([
      { valor: 1500.5, tipos_servico: { nome: "Troca de óleo e filtro" } },
      // Valor com ponto decimal (comum em CSV exportado de sistemas) deve ser 250.
      { valor: 250, tipos_servico: { nome: "Alinhamento e balanceamento" } },
    ]),
  );
});

test("reimportar com data mais nova substitui o lembrete antigo; data futura é recusada", async ({
  page,
}) => {
  const email = await criarContaEOficina(page, `Oficina Reimporta ${Date.now()}`);
  const placa = placaAleatoria();
  const cel = celularAleatorio();
  const nome = `Rui Reimporta ${Date.now()}`;
  const linha = (data: string) =>
    `${nome};${cel.digitado};${placa};Troca de óleo e filtro;${br(data)};40000`;
  const cab = "nome;whatsapp;placa;servico;data;km";

  await importar(page, [cab, linha(dataSP(-300))].join("\n"), 1);
  await expect(page.getByText("1 serviço com lembrete")).toBeVisible();

  // Planilha nova: a mesma visita antiga, uma mais nova e uma no futuro.
  await importar(
    page,
    [cab, linha(dataSP(-300)), linha(dataSP(-190)), linha(dataSP(10))].join("\n"),
    3,
  );
  await expect(page.getByText("0 clientes novos")).toBeVisible();
  await expect(page.getByText(/1 serviço já existia/)).toBeVisible();
  await page.getByText(/observaç/).click();
  await expect(page.getByText(/Linha 4: data no futuro/)).toBeVisible();

  const sb = await supabaseComo(email);
  const { data: servicos } = await sb
    .from("servicos")
    .select("data, lembrete_status, proxima_data")
    .order("data");
  expect(servicos).toEqual([
    { data: dataSP(-300), lembrete_status: "substituido", proxima_data: dataSP(-120) },
    { data: dataSP(-190), lembrete_status: "pendente", proxima_data: dataSP(-10) },
  ]);

  // No Hoje, um cartão só, com a visita mais nova.
  await page.goto("/");
  const cartoes = cartaoNaSecao(page, "Para chamar hoje", nome);
  await expect(cartoes).toHaveCount(1);
  await expect(cartoes).toContainText("10 dias de atraso");
  await expect(page.locator("article").filter({ hasText: nome })).toHaveCount(1);

  // Importar de novo uma visita mais antiga não reabre nada: ela entra já substituída.
  await importar(page, [cab, linha(dataSP(-250))].join("\n"), 1);
  const { data: fim } = await sb.from("servicos").select("data, lembrete_status").order("data");
  expect(fim?.filter((s) => s.lembrete_status === "pendente")).toEqual([
    { data: dataSP(-190), lembrete_status: "pendente" },
  ]);
});

test("Hoje vazio tem link para importar planilha", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Vazia ${Date.now()}`);
  await page.getByRole("link", { name: "Importar planilha" }).click();
  await expect(page).toHaveURL(/\/clientes\/importar$/);
  await expect(page.getByRole("heading", { name: "Importar clientes" })).toBeVisible();
});
