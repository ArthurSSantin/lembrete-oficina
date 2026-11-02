import { expect, request as novoRequest, test } from "@playwright/test";
import { contaViaApi, emailTeste } from "./ajudantes";
import { MAILPIT, SENHA_TESTE } from "./ambiente";

/** Espera o e-mail chegar no Mailpit do Supabase local e devolve o link de recuperação. */
async function linkDoEmail(email: string) {
  const api = await novoRequest.newContext({ baseURL: MAILPIT });
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const r = await api.get(`/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
        const j = (await r.json()) as { messages?: { ID: string }[] };
        id = j.messages?.[0]?.ID;
        return Boolean(id);
      },
      { timeout: 30_000, message: `e-mail para ${email} não chegou no Mailpit` },
    )
    .toBe(true);
  const msg = (await (await api.get(`/api/v1/message/${id}`)).json()) as { HTML: string; Text: string };
  await api.dispose();
  const bruto = `${msg.Text}\n${msg.HTML}`.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/);
  if (!bruto) throw new Error("link de recuperação não encontrado no e-mail");
  return bruto[0].replace(/&amp;/g, "&");
}

test("esqueci a senha: pedir → e-mail → nova senha → entra → sai → entra com a nova", async ({
  page,
}) => {
  const { email } = await contaViaApi(`Oficina Senha ${Date.now()}`);
  const novaSenha = "Nova-senha-456";

  await page.goto("/login");
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(page).toHaveURL(/\/esqueci$/);
  await page.getByLabel("E-mail da conta").fill(email);
  await page.getByRole("button", { name: "Enviar link para criar nova senha" }).click();
  await expect(page.getByText(/Se esse e-mail tiver conta, o link chega em instantes/)).toBeVisible();

  const link = await linkDoEmail(email);
  expect(link).toContain("type=recovery");
  expect(decodeURIComponent(link)).toContain("localhost:3100/auth/confirmar");

  await page.goto(link);
  await page.waitForURL("**/nova-senha", { timeout: 30_000 });
  await page.getByLabel("Nova senha").fill(novaSenha);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname === "/onboarding");

  // Sai pelo Ajustes.
  await page.goto("/config");
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");

  // Senha antiga não entra mais.
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA_TESTE);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();

  // Nova senha entra. (O e-mail é apagado depois do erro: ver o teste em telas.spec.ts.)
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(novaSenha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/");

  // O link é de uso único.
  await page.context().clearCookies();
  await page.goto(link);
  // O Supabase devolve o erro no #hash; a rota manda para /esqueci?erro=link.
  await expect(page).toHaveURL(/\/esqueci\?erro=link(#.*)?$/);
  await expect(page.getByText(/O link venceu ou já foi usado/)).toBeVisible();
});

test("esqueci a senha: e-mail sem conta recebe a mesma resposta neutra", async ({ page }) => {
  await page.goto("/esqueci");
  await page.getByLabel("E-mail da conta").fill(emailTeste("ninguem"));
  await page.getByRole("button", { name: "Enviar link para criar nova senha" }).click();
  await expect(page.getByText(/Se esse e-mail tiver conta, o link chega em instantes/)).toBeVisible();
});

test("link inválido ou vazio volta para /esqueci com o aviso", async ({ page }) => {
  for (const url of [
    "/auth/confirmar?code=codigo-invalido&next=/nova-senha",
    "/auth/confirmar?token_hash=hash-invalido&type=recovery&next=/nova-senha",
    "/auth/confirmar",
  ]) {
    await page.goto(url);
    await expect(page, url).toHaveURL(/\/esqueci\?erro=link$/);
    await expect(page.getByText(/O link venceu ou já foi usado/)).toBeVisible();
  }
});

test("/esqueci e /auth/confirmar abrem sem login; /nova-senha sem sessão não", async ({ request }) => {
  const esqueci = await request.get("/esqueci", { maxRedirects: 0 });
  expect(esqueci.status()).toBe(200);
  const confirmar = await request.get("/auth/confirmar?code=x", { maxRedirects: 0 });
  expect(confirmar.status()).toBe(307);
  expect(confirmar.headers()["location"]).toMatch(/\/esqueci\?erro=link$/);
  // Redirecionamento aberto: next para outro site é ignorado.
  const fora = await request.get("/auth/confirmar?code=x&next=//evil.example", { maxRedirects: 0 });
  expect(fora.headers()["location"]).not.toContain("evil.example");
  const nova = await request.get("/nova-senha", { maxRedirects: 0 });
  expect(nova.status()).toBe(307);
  expect(nova.headers()["location"]).toMatch(/\/login$/);
});
