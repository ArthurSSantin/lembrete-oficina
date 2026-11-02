import { expect, test, type Page } from "@playwright/test";
import {
  cartaoNaSecao,
  celularAleatorio,
  criarContaEOficina,
  dataSP,
  interceptarWhatsapp,
  numeroResultado,
  placaAleatoria,
  registrarAtendimento,
  supabaseComo,
} from "./ajudantes";

/** Prepara a mensagem, envia no WhatsApp (popup interceptado) e devolve o link aberto. */
async function prepararEEnviar(page: Page, cartao: ReturnType<Page["locator"]>, links: string[]) {
  await cartao.getByRole("button", { name: "Preparar mensagem" }).click();
  const texto = await cartao.locator("textarea").inputValue({ timeout: 30_000 });
  const popupPromessa = page.waitForEvent("popup");
  await cartao.getByRole("button", { name: "Enviar no WhatsApp" }).click();
  const popup = await popupPromessa;
  await popup.waitForLoadState().catch(() => {});
  await popup.close();
  return { texto, link: links.at(-1) ?? "" };
}

test("recomendado: vence na data, é chamado e conta como recomendação que virou serviço", async ({
  page,
  context,
}) => {
  const links = await interceptarWhatsapp(context);
  const email = await criarContaEOficina(page, `Oficina Recomendado ${Date.now()}`);
  const placa = placaAleatoria();
  const nome = `Rita Recomendada ${Date.now()}`;

  // Só recomendação, sem serviço feito: veio há 10 dias, chamar em 7 -> venceu há 3 dias.
  await registrarAtendimento(page, {
    placa,
    modelo: "HB20",
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-10),
    km: "60000",
    servicos: [],
    recomendados: ["Revisão de freios"],
    diasRecomendado: "7",
    orcamento: "800",
  });
  await expect(page.getByText(/salvo: 1 recomendação/)).toBeVisible();

  const sb = await supabaseComo(email);
  const { data: rec } = await sb.from("servicos").select("origem, proxima_data, valor").single();
  expect(rec).toEqual({ origem: "recomendado", proxima_data: dataSP(-3), valor: 800 });

  await page.goto("/");
  const cartao = cartaoNaSecao(page, "Lembretes vencidos", nome);
  await expect(cartao).toContainText("Revisão de freios");
  await expect(cartao).toContainText("foi recomendado em");
  await expect(cartao).toContainText("3 dias de atraso");
  const { texto, link } = await prepararEEnviar(page, cartao, links);
  expect(texto).toContain("precisava de: Revisão de freios");
  expect(link).toContain("wa.me/55");
  await expect(cartaoNaSecao(page, "Já chamados", nome)).toContainText("Chamado");

  // Cliente voltou e fez a revisão.
  await registrarAtendimento(page, { placa, servicos: ["Revisão de freios"], valor: "750" });
  const { data: todos } = await sb.from("servicos").select("origem, lembrete_status").order("criado_em");
  expect(todos).toEqual([
    { origem: "recomendado", lembrete_status: "retornou" },
    { origem: "feito", lembrete_status: "pendente" },
  ]);

  await page.goto("/resultados");
  await expect(numeroResultado(page, "Voltaram depois da mensagem")).toHaveText("1");
  await expect(numeroResultado(page, "Recomendações que viraram serviço")).toHaveText("1");
  await expect(page.locator("section").filter({ hasText: "Voltou para o caixa" })).toContainText(
    "750,00",
  );
});

test("pós-venda: visita de ontem aparece em 'Agradecer a visita' com o link de avaliação", async ({
  page,
  context,
}) => {
  const links = await interceptarWhatsapp(context);
  await criarContaEOficina(page, `Oficina Posvenda ${Date.now()}`);

  await page.goto("/config");
  const form = page.locator("form").filter({ has: page.getByLabel("Nome da oficina") });
  await form.getByLabel("Link de avaliação no Google").fill("https://g.page/r/teste-avaliacao");
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form.getByText("Dados salvos.")).toBeVisible();

  const nome = `Paulo Posvenda ${Date.now()}`;
  const nomeHoje = `Hoje Nao ${Date.now()}`;
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-1),
    servicos: ["Troca de óleo e filtro", "Alinhamento e balanceamento"],
  });
  // Visita de hoje ainda não entra no pós-venda.
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome: nomeHoje,
    whatsapp: celularAleatorio().digitado,
    servicos: ["Bateria"],
  });

  await page.goto("/");
  const cartao = cartaoNaSecao(page, "Agradecer a visita", nome);
  await expect(cartao).toHaveCount(1); // dois serviços, uma visita só
  await expect(cartao).toContainText("Troca de óleo e filtro");
  await expect(cartao).toContainText("Alinhamento e balanceamento");
  await expect(page.getByText(nomeHoje)).toHaveCount(0);

  const { texto } = await prepararEEnviar(page, cartao, links);
  expect(texto).toContain("Obrigado por trazer");
  expect(texto).toContain("https://g.page/r/teste-avaliacao");
  await expect(cartaoNaSecao(page, "Agradecer a visita", nome)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(nome)).toHaveCount(0);
});

test("sumido: última visita há 400 dias sem lembrete em aberto aparece em 'Clientes sumidos'", async ({
  page,
  context,
}) => {
  const links = await interceptarWhatsapp(context);
  await criarContaEOficina(page, `Oficina Sumido ${Date.now()}`);

  // Serviço sem prazo -> não gera lembrete.
  await page.goto("/config");
  await page.getByPlaceholder("Ex: Troca de correia dentada").fill("Lavagem");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.locator('input[name="nome"][value="Lavagem"]')).toHaveCount(1);

  const nome = `Sueli Sumida ${Date.now()}`;
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    modelo: "Fiesta",
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-400),
    servicos: ["Lavagem"],
  });

  await page.goto("/");
  const cartao = cartaoNaSecao(page, "Clientes sumidos", nome);
  await expect(cartao).toContainText("Lavagem");
  const { texto } = await prepararEEnviar(page, cartao, links);
  expect(texto).toContain("não passa aqui desde");
  await page.reload();
  await expect(page.getByText(nome)).toHaveCount(0);
});

test("cliente com lembrete vencido há muito tempo não aparece duas vezes (vencido e sumido)", async ({
  page,
}) => {
  await criarContaEOficina(page, `Oficina Duplicado ${Date.now()}`);
  const nome = `Dario Duplicado ${Date.now()}`;
  // Troca de óleo há 400 dias: lembrete pendente venceu há 220 dias.
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-400),
    servicos: ["Troca de óleo e filtro"],
  });
  await page.goto("/");
  await expect(cartaoNaSecao(page, "Lembretes vencidos", nome)).toHaveCount(1);
  // A seção diz "não têm lembrete em aberto"; este cliente tem.
  await expect(cartaoNaSecao(page, "Clientes sumidos", nome)).toHaveCount(0);
});

test("'Cliente não quer mensagens' tira o cliente do Hoje e marca na lista de clientes", async ({
  page,
}) => {
  await criarContaEOficina(page, `Oficina LGPD ${Date.now()}`);
  const nome = `Nilo Naoquer ${Date.now()}`;
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-200),
    servicos: ["Troca de óleo e filtro"],
  });
  await page.goto("/");
  const cartao = cartaoNaSecao(page, "Lembretes vencidos", nome);
  await cartao.getByText("Mais").click();
  await cartao.getByRole("button", { name: "Cliente não quer mensagens" }).click();
  await expect(page.getByText(nome)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(nome)).toHaveCount(0);

  await page.goto("/clientes");
  const item = page.locator("li").filter({ hasText: nome }).first();
  await expect(item).toContainText("Não quer mensagens");
  await item.getByRole("link").first().click();
  await expect(page.getByRole("button", { name: "Voltar a mandar lembretes" })).toBeVisible();
});

test("adiar 7 dias tira do vencido e põe em 'Próximos 7 dias'", async ({ page }) => {
  await criarContaEOficina(page, `Oficina Adiar ${Date.now()}`);
  const nome = `Ada Adiada ${Date.now()}`;
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-200),
    servicos: ["Troca de óleo e filtro"],
  });
  await page.goto("/");
  const cartao = cartaoNaSecao(page, "Lembretes vencidos", nome);
  await cartao.getByText("Mais").click();
  await cartao.getByRole("button", { name: "Lembrar daqui a 7 dias" }).click();
  await expect(cartaoNaSecao(page, "Lembretes vencidos", nome)).toHaveCount(0);
  await expect(cartaoNaSecao(page, "Próximos 7 dias", nome)).toContainText("Em 7 dias");
});

test("fila /chamar passa por todos sem pular ninguém", async ({ page, context }) => {
  const links = await interceptarWhatsapp(context);
  const email = await criarContaEOficina(page, `Oficina Fila ${Date.now()}`);
  const nomes: string[] = [];
  for (let i = 0; i < 4; i++) {
    const nome = `Fila ${i} ${Date.now()}`;
    nomes.push(nome);
    await registrarAtendimento(page, {
      placa: placaAleatoria(),
      nome,
      whatsapp: celularAleatorio().digitado,
      data: dataSP(-200 - i),
      servicos: ["Troca de óleo e filtro"],
    });
  }
  // Uma visita de ontem: entra na fila como pós-venda.
  const nomePos = `Fila Posvenda ${Date.now()}`;
  await registrarAtendimento(page, {
    placa: placaAleatoria(),
    nome: nomePos,
    whatsapp: celularAleatorio().digitado,
    data: dataSP(-1),
    servicos: ["Bateria"],
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Chamar um por um" }).click();
  await page.waitForURL("**/chamar");
  await expect(page.getByText("1 de 5")).toBeVisible();

  const vistos: string[] = [];
  const acoes = ["enviar", "pular", "adiar", "enviar", "enviar"] as const;
  for (const [i, acao] of acoes.entries()) {
    await expect(page.getByText(`${i + 1} de 5`)).toBeVisible();
    const cartao = page.locator("article");
    vistos.push((await cartao.getByRole("heading", { level: 2 }).innerText()).trim());
    if (acao === "enviar") {
      const botao = cartao.getByRole("button", { name: "Enviar no WhatsApp e ir para o próximo" });
      await expect(botao).toBeEnabled();
      const popupPromessa = page.waitForEvent("popup");
      await botao.click();
      await (await popupPromessa).close();
    } else if (acao === "pular") {
      await cartao.getByRole("button", { name: "Pular" }).click();
    } else {
      await cartao.getByRole("button", { name: "Chamar em 7 dias" }).click();
    }
  }
  await expect(page.getByRole("heading", { name: "Fila concluída" })).toBeVisible();
  await expect(page.getByText("3 mensagens enviadas")).toBeVisible();
  expect(new Set(vistos).size).toBe(5);
  expect([...vistos].sort()).toEqual([...nomes, nomePos].sort());
  expect(links).toHaveLength(3);

  // Ordem da fila: os 4 lembretes vencidos e depois o pós-venda.
  expect(vistos[4]).toBe(nomePos);
  // Banco: 2 lembretes chamados, 1 adiado para daqui a 7 dias, 1 pendente (pulado), pós-venda marcado.
  const sb = await supabaseComo(email);
  await expect
    .poll(async () => {
      const { data } = await sb
        .from("servicos")
        .select("lembrete_status, proxima_data, posvenda_em, veiculos(clientes(nome))")
        .returns<
          {
            lembrete_status: string;
            proxima_data: string | null;
            posvenda_em: string | null;
            veiculos: { clientes: { nome: string } };
          }[]
        >();
      const lembretes = (data ?? []).filter((s) => s.veiculos.clientes.nome !== nomePos);
      return {
        contatados: lembretes.filter((s) => s.lembrete_status === "contatado").length,
        pendentesVencidos: lembretes.filter(
          (s) => s.lembrete_status === "pendente" && s.proxima_data! < dataSP(0),
        ).length,
        adiados: lembretes.filter((s) => s.proxima_data === dataSP(7)).length,
        posvenda: (data ?? []).some((s) => s.veiculos.clientes.nome === nomePos && s.posvenda_em),
      };
    })
    .toEqual({ contatados: 2, pendentesVencidos: 1, adiados: 1, posvenda: true });
});

test("PWA: manifest e ícones abrem sem login", async ({ request }) => {
  for (const rota of ["/manifest.webmanifest", "/icon", "/apple-icon"]) {
    const r = await request.get(rota, { maxRedirects: 0 });
    expect(r.status(), rota).toBe(200);
  }
  // Rota pública só no caminho exato: parecidas continuam exigindo login.
  for (const rota of ["/iconqualquer", "/login-x"]) {
    const r = await request.get(rota, { maxRedirects: 0 });
    expect(r.status(), rota).toBe(307);
    expect(r.headers()["location"], rota).toMatch(/\/login$/);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name ?? manifest.short_name).toBeTruthy();
});
