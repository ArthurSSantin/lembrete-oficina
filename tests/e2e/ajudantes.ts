import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { SENHA_TESTE, SUPABASE_KEY, SUPABASE_URL } from "./ambiente";

let contador = 0;

export function emailTeste(prefixo = "teste") {
  contador += 1;
  return `${prefixo}+${Date.now()}${contador}@exemplo.test`;
}

/** Placa Mercosul aleatória (ABC1D23). */
export function placaAleatoria() {
  const letra = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = () => String(Math.floor(Math.random() * 10));
  return `${letra()}${letra()}${letra()}${num()}${letra()}${num()}${num()}`;
}

export function celularAleatorio() {
  const n = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return { digitado: `(11) 9${n.slice(0, 4)}-${n.slice(4)}`, normalizado: `55119${n}` };
}

/** Data AAAA-MM-DD no fuso de São Paulo, deslocada em dias. */
export function dataSP(deslocamentoDias = 0) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  const d = new Date(hoje + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + deslocamentoDias);
  return d.toISOString().slice(0, 10);
}

/** Cliente Supabase (local) logado como o usuário de teste, para conferir o banco. */
export async function supabaseComo(email: string) {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: SENHA_TESTE });
  if (error) throw new Error(`Login no Supabase local falhou para ${email}: ${error.message}`);
  return sb;
}

/** Cadastro pela tela de login + onboarding. Termina na tela Hoje. */
export async function criarContaEOficina(page: Page, nomeOficina: string, email = emailTeste()) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Criar conta/ }).first().click();
  await expect(page.getByRole("button", { name: "Criar conta", exact: true })).toBeVisible();
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();

  await page.waitForURL("**/onboarding", { timeout: 60_000 });
  await page.getByLabel("Nome da oficina").fill(nomeOficina);
  await page.getByLabel("WhatsApp da oficina").fill("(11) 98888-7777");
  await page.getByRole("button", { name: "Começar" }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 60_000 });
  return email;
}

export async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 60_000 });
}

export type Atendimento = {
  placa: string;
  modelo?: string;
  ano?: string;
  nome?: string;
  whatsapp?: string;
  km?: string;
  data?: string;
  servicos: string[];
  valor?: string;
  /** Serviços recomendados que ficaram para depois. */
  recomendados?: string[];
  diasRecomendado?: "7" | "15" | "30" | "60" | "90";
  orcamento?: string;
};

/** Preenche e salva o formulário de Novo atendimento. Devolve o tempo de salvar em ms. */
export async function registrarAtendimento(page: Page, a: Atendimento) {
  if (new URL(page.url()).pathname !== "/novo") await page.goto("/novo");
  await expect(page.getByLabel("Placa")).toBeVisible();
  await page.getByLabel("Placa").fill(a.placa);
  await page.getByLabel("Placa").blur();
  // Sem nome informado, o carro já existe: espera o preenchimento automático
  // (senão o navegador barra o envio porque Nome/WhatsApp são obrigatórios).
  if (!a.nome) await expect(page.getByText("Veículo já cadastrado")).toBeVisible();
  if (a.modelo) await page.getByLabel("Modelo").fill(a.modelo);
  if (a.ano) await page.getByLabel("Ano").fill(a.ano);
  if (a.nome) await page.getByLabel("Nome", { exact: true }).fill(a.nome);
  if (a.whatsapp) await page.getByLabel("WhatsApp", { exact: true }).fill(a.whatsapp);
  if (a.data) await page.getByLabel("Data", { exact: true }).fill(a.data);
  if (a.km) await page.getByLabel("Km atual").fill(a.km);
  for (const s of a.servicos) {
    await page.locator("label", { hasText: s }).locator('input[name="tipos"]').check();
  }
  if (a.valor) await page.getByLabel("Valor total (opcional)").fill(a.valor);
  if (a.recomendados?.length) {
    const secao = page.locator("details").filter({ hasText: "deixou algum serviço para depois" });
    if (!(await secao.evaluate((d) => (d as HTMLDetailsElement).open))) {
      await secao.locator("summary").click();
    }
    for (const s of a.recomendados) {
      await secao.locator("label", { hasText: s }).locator('input[name="recomendados"]').check();
    }
    if (a.diasRecomendado) await page.getByLabel("Chamar em").selectOption(a.diasRecomendado);
    if (a.orcamento) await page.getByLabel("Orçamento").fill(a.orcamento);
  }

  const inicio = Date.now();
  await page.getByRole("button", { name: "Salvar atendimento" }).click();
  await expect(page.getByText(new RegExp(`${a.placa}.*salvo`))).toBeVisible({ timeout: 60_000 });
  return Date.now() - inicio;
}

/** Valor de uma linha da lista de números em Resultados. */
export function numeroResultado(page: Page, rotulo: string) {
  return page
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${rotulo}$`) }) })
    .locator("dd");
}

/** Intercepta o wa.me (não sai para a internet) e guarda os links abertos. */
export async function interceptarWhatsapp(context: import("@playwright/test").BrowserContext) {
  const links: string[] = [];
  await context.route(/https:\/\/(api\.)?wa\.me\/.*/, (rota) => {
    links.push(rota.request().url());
    return rota.fulfill({ status: 200, contentType: "text/html", body: "<p>wa.me</p>" });
  });
  return links;
}

/** Cartão (article) da tela Hoje dentro de uma seção. */
export function cartaoNaSecao(page: Page, secao: string, texto: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: secao }) })
    .locator("article")
    .filter({ hasText: texto });
}
