import { expect, test } from "@playwright/test";
import {
  celularAleatorio,
  criarContaEOficina,
  dataSP,
  numeroResultado,
  placaAleatoria,
  registrarAtendimento,
  supabaseComo,
} from "./ajudantes";

const SERVICO = "Troca de óleo e filtro";

test("cadastro → atendimento antigo → lembrete → WhatsApp → retorno em Resultados", async ({
  page,
  context,
}) => {
  // Não sai para a internet: o wa.me vira uma página vazia.
  const linksWhats: string[] = [];
  await context.route(/https:\/\/(api\.)?wa\.me\/.*/, (rota) => {
    linksWhats.push(rota.request().url());
    return rota.fulfill({ status: 200, contentType: "text/html", body: "<p>wa.me</p>" });
  });

  const oficina = `Oficina Teste ${Date.now()}`;
  const email = await criarContaEOficina(page, oficina);

  // A conta foi criada no Supabase LOCAL (e não no de produção).
  const sb = await supabaseComo(email);
  const { data: oficinas } = await sb.from("oficinas").select("nome");
  expect(oficinas?.map((o) => o.nome)).toEqual([oficina]);

  // Atendimento de 200 dias atrás: troca de óleo vence em 180 dias -> lembrete vencido.
  const placa = placaAleatoria();
  const cel = celularAleatorio();
  const cliente = `Cliente Fluxo ${Date.now()}`;
  await registrarAtendimento(page, {
    placa,
    modelo: "Onix 1.0",
    ano: "2020",
    nome: cliente,
    whatsapp: cel.digitado,
    km: "45000",
    data: dataSP(-200),
    servicos: [SERVICO],
    valor: "250,00",
  });

  const { data: servicos } = await sb
    .from("servicos")
    .select("data, km, proxima_data, proxima_km, lembrete_status");
  expect(servicos).toEqual([
    expect.objectContaining({
      data: dataSP(-200),
      km: 45000,
      proxima_data: dataSP(-20),
      proxima_km: 55000,
      lembrete_status: "pendente",
    }),
  ]);

  // Tela Hoje mostra o lembrete vencido.
  await page.goto("/");
  const cartao = page.locator("article").filter({ hasText: cliente });
  await expect(cartao).toBeVisible();
  await expect(cartao).toContainText(SERVICO);
  await expect(cartao).toContainText("20 dias de atraso");

  // Preparar mensagem (sem chave da IA -> mensagem padrão).
  await cartao.getByRole("button", { name: "Preparar mensagem" }).click();
  const texto = cartao.locator("textarea");
  await expect(texto).toHaveValue(/Oi, Cliente! [\s\S]*troca de óleo e filtro[\s\S]*Onix 1\.0 2020/);

  // Enviar abre o wa.me numa nova aba.
  const popupPromessa = page.waitForEvent("popup");
  await cartao.getByRole("button", { name: "Enviar no WhatsApp" }).click();
  const popup = await popupPromessa;
  await popup.waitForLoadState().catch(() => {});
  const urlPopup = popup.url() !== "about:blank" ? popup.url() : (linksWhats[0] ?? "");
  expect(urlPopup).toContain(`wa.me/${cel.normalizado}`);
  expect(decodeURIComponent(urlPopup)).toContain("troca de óleo e filtro");
  await popup.close();

  // Status vira "Chamado".
  await expect(page.locator("article").filter({ hasText: cliente })).toContainText("Chamado");
  await page.reload();
  await expect(page.locator("article").filter({ hasText: cliente })).toContainText("Chamado");

  // Cliente voltou: mesma placa preenche os dados e registra o mesmo serviço.
  await page.goto("/novo");
  await page.getByLabel("Placa").fill(placa.toLowerCase());
  await page.getByLabel("Placa").blur();
  await expect(page.getByText("Veículo já cadastrado")).toBeVisible();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue(cliente);
  await expect(page.getByLabel("WhatsApp", { exact: true })).toHaveValue(cel.digitado);
  await expect(page.getByLabel("Modelo")).toHaveValue("Onix 1.0");
  await expect(page.getByLabel("Ano")).toHaveValue("2020");
  await registrarAtendimento(page, { placa, km: "52000", servicos: [SERVICO], valor: "300" });

  const { data: depois } = await sb
    .from("servicos")
    .select("lembrete_status, data")
    .order("data");
  expect(depois?.map((s) => s.lembrete_status)).toEqual(["retornou", "pendente"]);

  // Resultados: 1 chamado, 1 retorno, 100%, R$ 300.
  await page.goto("/resultados");
  await expect(numeroResultado(page, "Clientes chamados")).toHaveText("1");
  await expect(numeroResultado(page, "Voltaram depois da mensagem")).toHaveText("1");
  await expect(numeroResultado(page, "Taxa de retorno")).toHaveText("100%");
  await expect(page.locator("section").filter({ hasText: "Voltou para o caixa" })).toContainText(
    "300,00",
  );
});
