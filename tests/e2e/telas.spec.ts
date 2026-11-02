import { expect, test } from "@playwright/test";
import {
  celularAleatorio,
  criarContaEOficina,
  placaAleatoria,
  registrarAtendimento,
  supabaseComo,
} from "./ajudantes";

test("sem login: telas do app mandam para /login", async ({ page }) => {
  for (const rota of ["/", "/novo", "/clientes", "/resultados", "/config", "/onboarding"]) {
    await page.goto(rota);
    await expect(page, `rota ${rota}`).toHaveURL(/\/login$/);
  }
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
});

test("sem login: API de mensagem não devolve dados", async ({ request }) => {
  const r = await request.post("/api/mensagem", {
    data: { tipo: "lembrete", servicoId: "00000000-0000-0000-0000-000000000000" },
    maxRedirects: 0,
  });
  expect(r.status()).toBe(401);
  expect(r.headers()["content-type"]).toContain("application/json");
  expect(await r.text()).not.toContain("Oi,");
});

test("login com senha errada mostra erro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("ninguem@exemplo.test");
  await page.getByLabel("Senha").fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});

test("Clientes: busca por nome, placa e telefone", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Busca ${Date.now()}`);
  const placa = placaAleatoria();
  const cel = celularAleatorio();
  const nome = `Zuleide Buscável ${Date.now()}`;
  await registrarAtendimento(page, {
    placa,
    modelo: "Gol",
    nome,
    whatsapp: cel.digitado,
    servicos: ["Alinhamento e balanceamento"],
  });
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome: "Outro Cliente",
    whatsapp: celularAleatorio().digitado,
    servicos: ["Bateria"],
  });

  await page.goto("/clientes");
  await expect(page.getByText(nome)).toBeVisible();
  await expect(page.getByText("Outro Cliente")).toBeVisible();

  const busca = page.getByPlaceholder("Buscar por nome, placa ou telefone");
  const buscar = async (termo: string) => {
    await busca.fill(termo);
    await busca.press("Enter");
    await page.waitForURL((u) => u.searchParams.get("q") === termo);
  };

  await buscar("zuleide");
  await expect(page.getByText(nome)).toBeVisible();
  await expect(page.getByText("Outro Cliente")).toHaveCount(0);

  await buscar(`${placa.slice(0, 3)}-${placa.slice(3)}`.toLowerCase());
  await expect(page.getByText(nome)).toBeVisible();
  await expect(page.getByText("Outro Cliente")).toHaveCount(0);

  await buscar(cel.normalizado.slice(-8));
  await expect(page.getByText(nome)).toBeVisible();
  await expect(page.getByText("Outro Cliente")).toHaveCount(0);

  await buscar("nao-existe-xyz");
  await expect(page.getByText(/Nenhum cliente/)).toBeVisible();

  // Abre o cliente.
  await buscar("zuleide");
  await page.getByText(nome).click();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
  await expect(page.getByText(nome).first()).toBeVisible();
});

test("Ajustes: salva o nome da oficina", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Antiga ${Date.now()}`);
  await page.goto("/config");
  const form = page.locator("form").filter({ has: page.getByLabel("Nome da oficina") });
  const novoNome = `Oficina Renomeada ${Date.now()}`;
  await form.getByLabel("Nome da oficina").fill(novoNome);
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form.getByText("Dados salvos.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nome da oficina")).toHaveValue(novoNome);
  // O nome aparece no menu lateral.
  await expect(page.locator("aside")).toContainText(novoNome);
});

test("Novo atendimento: erros de validação mantêm o que foi digitado", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Validação ${Date.now()}`);
  await page.goto("/novo");
  await page.getByLabel("Placa").fill("ABC1D23");
  await page.getByLabel("Nome", { exact: true }).fill("Fulano");
  await page.getByLabel("WhatsApp", { exact: true }).fill("9999");
  await page.locator("label", { hasText: "Bateria" }).locator('input[name="tipos"]').check();
  await page.getByRole("button", { name: "Salvar atendimento" }).click();
  await expect(page.getByText("WhatsApp inválido")).toBeVisible();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Fulano");
  await expect(page.getByLabel("Placa")).toHaveValue("ABC1D23");

  await page.getByLabel("WhatsApp", { exact: true }).fill("(11) 91234-5678");
  await page.locator("label", { hasText: "Bateria" }).locator('input[name="tipos"]').uncheck();
  await page.getByRole("button", { name: "Salvar atendimento" }).click();
  await expect(page.getByText(/Marque pelo menos um serviço/)).toBeVisible();
});

test("uma oficina não vê os dados da outra", async ({ browser }) => {
  // Conta A com um cliente.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const emailA = await criarContaEOficina(pageA, `Oficina A ${Date.now()}`);
  const placaA = placaAleatoria();
  const nomeA = `Segredo da A ${Date.now()}`;
  await registrarAtendimento(pageA, {
    placa: placaA,
    modelo: "Civic",
    nome: nomeA,
    whatsapp: celularAleatorio().digitado,
    data: "2025-01-10",
    servicos: ["Troca de óleo e filtro"],
  });
  const sbA = await supabaseComo(emailA);
  const { data: servA } = await sbA.from("servicos").select("id").single();
  const { data: cliA } = await sbA.from("clientes").select("id").single();
  await ctxA.close();

  // Conta B.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const emailB = await criarContaEOficina(pageB, `Oficina B ${Date.now()}`);

  await expect(pageB.getByText(nomeA)).toHaveCount(0);

  await pageB.goto("/clientes");
  await expect(pageB.getByText(/Nenhum cliente/)).toBeVisible();
  await pageB.goto(`/clientes?q=${placaA}`);
  await expect(pageB.getByText(nomeA)).toHaveCount(0);

  // Abrir o cliente da A pelo endereço direto não mostra nada dele.
  await pageB.goto(`/clientes/${cliA!.id}`);
  await expect(pageB.getByText(nomeA)).toHaveCount(0);

  // A placa da A não é reconhecida no Novo atendimento da B.
  await pageB.goto("/novo");
  await pageB.getByLabel("Placa").fill(placaA);
  await pageB.getByLabel("Placa").blur();
  await pageB.waitForTimeout(1500);
  await expect(pageB.getByText("Veículo já cadastrado")).toHaveCount(0);
  await expect(pageB.getByLabel("Nome", { exact: true })).toHaveValue("");

  // A API de mensagem não monta mensagem com o serviço da A.
  const r = await pageB.request.post("/api/mensagem", {
    data: { tipo: "lembrete", servicoId: servA!.id },
  });
  expect(r.status()).toBe(404);

  // Direto no banco (RLS): B não lê nem altera nada da A.
  const sbB = await supabaseComo(emailB);
  for (const tabela of ["clientes", "veiculos", "servicos"]) {
    const { data } = await sbB.from(tabela).select("id");
    expect(data, tabela).toEqual([]);
  }
  const { data: alterados } = await sbB
    .from("servicos")
    .update({ lembrete_status: "ignorado" })
    .eq("id", servA!.id)
    .select("id");
  expect(alterados).toEqual([]);
  const { data: aindaPendente } = await sbA
    .from("servicos")
    .select("lembrete_status")
    .eq("id", servA!.id)
    .single();
  expect(aindaPendente?.lembrete_status).toBe("pendente");

  await ctxB.close();
});
