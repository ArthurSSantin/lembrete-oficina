import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { expect, request as novoRequest, test } from "@playwright/test";
import {
  celularAleatorio,
  contaViaApi,
  dataSP,
  entrar,
  placaAleatoria,
  semearCliente,
  supabaseAdmin,
} from "./ajudantes";
import { CRON_SECRET, PUSH_FALSO } from "./ambiente";

/** Chaves de inscrição válidas (P-256 + auth de 16 bytes), como as de um navegador. */
function chavesPush() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    p256dh: ecdh.getPublicKey().toString("base64url"),
    auth: randomBytes(16).toString("base64url"),
  };
}

async function recebidosNoPushFalso() {
  const api = await novoRequest.newContext({ ignoreHTTPSErrors: true });
  const r = await api.get(`${PUSH_FALSO}/recebidos`);
  const lista = (await r.json()) as string[];
  await api.dispose();
  return lista;
}

test.describe("rotina diária /api/cron/diario", () => {
  test.setTimeout(300_000);

  test("401 sem o segredo ou com segredo errado", async ({ request }) => {
    expect((await request.get("/api/cron/diario")).status()).toBe(401);
    const errado = await request.get("/api/cron/diario", {
      headers: { Authorization: "Bearer errado" },
    });
    expect(errado.status()).toBe(401);
    const semBearer = await request.get("/api/cron/diario", {
      headers: { Authorization: CRON_SECRET },
    });
    expect(semBearer.status()).toBe(401);
  });

  test("push: 201 conta em enviados, 410 é removida, oficina sem pendências não recebe", async ({
    request,
  }) => {
    // A: tem um lembrete vencido e dois aparelhos (um válido, um que já foi desinstalado).
    const a = await contaViaApi(`Oficina Push A ${Date.now()}`);
    await semearCliente(
      a,
      { nome: "Cliente Push", whatsapp: celularAleatorio().normalizado, placa: placaAleatoria() },
      [
        {
          tipo_servico_id: a.tipo("Troca de óleo e filtro"),
          data: dataSP(-200),
          proxima_data: dataSP(-20),
          posvenda_em: new Date().toISOString(),
        },
      ],
    );
    const okA = `${PUSH_FALSO}/201/${randomUUID()}`;
    const vencidaA = `${PUSH_FALSO}/410/${randomUUID()}`;
    for (const endpoint of [okA, vencidaA]) {
      const { error } = await a.sb
        .from("push_inscricoes")
        .insert({ oficina_id: a.oficinaId, endpoint, ...chavesPush() });
      expect(error).toBeNull();
    }

    // C: sem pendências, com um aparelho.
    const c = await contaViaApi(`Oficina Push C ${Date.now()}`);
    const okC = `${PUSH_FALSO}/201/${randomUUID()}`;
    expect(
      (await c.sb.from("push_inscricoes").insert({ oficina_id: c.oficinaId, endpoint: okC, ...chavesPush() }))
        .error,
    ).toBeNull();

    const r = await request.get("/api/cron/diario", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      timeout: 240_000,
    });
    const corpo = await r.json();
    expect(r.status(), JSON.stringify(corpo)).toBe(200);
    expect(corpo.aviso.enviados).toBeGreaterThanOrEqual(1);
    expect(corpo.aviso.removidos).toBeGreaterThanOrEqual(1);

    const recebidos = await recebidosNoPushFalso();
    expect(recebidos).toContain(new URL(okA).pathname);
    expect(recebidos).toContain(new URL(vencidaA).pathname);
    expect(recebidos).not.toContain(new URL(okC).pathname);

    const { data: restantesA } = await a.sb.from("push_inscricoes").select("endpoint");
    expect(restantesA).toEqual([{ endpoint: okA }]);
    const { data: restantesC } = await c.sb.from("push_inscricoes").select("endpoint");
    expect(restantesC).toEqual([{ endpoint: okC }]);

    // Limpa para não pesar nas próximas rodadas.
    await a.sb.from("push_inscricoes").delete().eq("endpoint", okA);
    await c.sb.from("push_inscricoes").delete().eq("endpoint", okC);
  });

  test("?backup=1 grava o JSON da oficina no bucket e guarda no máximo 8", async ({ request }) => {
    const a = await contaViaApi(`Oficina Backup ${Date.now()}`);
    const nome = `Cliente Backup ${Date.now()}`;
    await semearCliente(a, { nome, whatsapp: celularAleatorio().normalizado, placa: placaAleatoria() });

    // 9 cópias antigas já guardadas.
    const admin = supabaseAdmin();
    const balde = admin.storage.from("backups");
    for (let i = 1; i <= 9; i++) {
      const { error } = await balde.upload(`${a.oficinaId}/2020-01-0${i}.json`, "{}", {
        contentType: "application/json",
        upsert: true,
      });
      expect(error, "upload no bucket backups (storage local ligado?)").toBeNull();
    }

    const r = await request.get("/api/cron/diario?backup=1", {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      timeout: 240_000,
    });
    const corpo = await r.json();
    expect(r.status(), JSON.stringify(corpo)).toBe(200);
    expect(corpo.backup.arquivos).toBeGreaterThanOrEqual(1);

    const { data: arquivos } = await balde.list(a.oficinaId, {
      sortBy: { column: "name", order: "desc" },
    });
    const nomes = (arquivos ?? []).map((f) => f.name);
    expect(nomes).toEqual([
      `${dataSP(0)}.json`,
      "2020-01-09.json",
      "2020-01-08.json",
      "2020-01-07.json",
      "2020-01-06.json",
      "2020-01-05.json",
      "2020-01-04.json",
      "2020-01-03.json",
    ]);

    const { data: blob } = await balde.download(`${a.oficinaId}/${dataSP(0)}.json`);
    const copia = JSON.parse(await blob!.text());
    expect(copia.oficina.id).toBe(a.oficinaId);
    expect(copia.clientes.map((x: { nome: string }) => x.nome)).toEqual([nome]);
    expect(copia.veiculos).toHaveLength(1);
    expect(copia.tipos_servico.length).toBeGreaterThan(0);

    // O bucket é privado: a chave pública não lê.
    const anonimo = (await import("@supabase/supabase-js")).createClient(
      "http://127.0.0.1:54321",
      "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    );
    const { data: semAcesso } = await anonimo.storage.from("backups").download(
      `${a.oficinaId}/${dataSP(0)}.json`,
    );
    expect(semAcesso).toBeNull();
    const { data: comoDono } = await a.sb.storage.from("backups").download(
      `${a.oficinaId}/${dataSP(0)}.json`,
    );
    expect(comoDono).toBeNull();

    await balde.remove(nomes.map((n) => `${a.oficinaId}/${n}`));
  });
});

test("RLS de push_inscricoes: B não vê nem apaga a inscrição de A", async () => {
  const a = await contaViaApi(`Oficina RLS Push A ${Date.now()}`);
  const b = await contaViaApi(`Oficina RLS Push B ${Date.now()}`);
  const endpoint = `${PUSH_FALSO}/201/${randomUUID()}`;
  expect(
    (await a.sb.from("push_inscricoes").insert({ oficina_id: a.oficinaId, endpoint, ...chavesPush() })).error,
  ).toBeNull();

  const { data: vistoPorB } = await b.sb.from("push_inscricoes").select("id").eq("endpoint", endpoint);
  expect(vistoPorB).toEqual([]);
  const { data: apagadoPorB } = await b.sb
    .from("push_inscricoes")
    .delete()
    .eq("endpoint", endpoint)
    .select("id");
  expect(apagadoPorB).toEqual([]);
  const { data: aindaLa } = await a.sb.from("push_inscricoes").select("endpoint");
  expect(aindaLa).toEqual([{ endpoint }]);

  // B não consegue inscrever um aparelho na oficina de A.
  const { error: naOficinaDeA } = await b.sb
    .from("push_inscricoes")
    .insert({ oficina_id: a.oficinaId, endpoint: `${PUSH_FALSO}/201/${randomUUID()}`, ...chavesPush() });
  expect(naOficinaDeA).not.toBeNull();

  await a.sb.from("push_inscricoes").delete().eq("endpoint", endpoint);
});

test("mesmo aparelho inscrito por outra conta troca de dono (como salvarInscricao promete)", async () => {
  // salvarInscricao apaga a linha antiga com a chave do servidor (o RLS impede B de
  // apagar a de A) e depois insere como B.
  const a = await contaViaApi(`Oficina Aparelho A ${Date.now()}`);
  const b = await contaViaApi(`Oficina Aparelho B ${Date.now()}`);
  const endpoint = `${PUSH_FALSO}/201/${randomUUID()}`;
  await a.sb.from("push_inscricoes").insert({ oficina_id: a.oficinaId, endpoint, ...chavesPush() });

  // Sozinho, B não consegue apagar a inscrição de A.
  await b.sb.from("push_inscricoes").delete().eq("endpoint", endpoint);
  const { count: aindaDeA } = await supabaseAdmin()
    .from("push_inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("endpoint", endpoint);
  expect(aindaDeA).toBe(1);

  await supabaseAdmin().from("push_inscricoes").delete().eq("endpoint", endpoint);
  const { error } = await b.sb
    .from("push_inscricoes")
    .insert({ oficina_id: b.oficinaId, endpoint, ...chavesPush() });

  await a.sb.from("push_inscricoes").delete().eq("endpoint", endpoint);
  await b.sb.from("push_inscricoes").delete().eq("endpoint", endpoint);
  expect(error?.message ?? null).toBeNull();
});

test("exportar: CSV com BOM e ';', recomendado marcado, e reimportar recria clientes e carros", async ({
  page,
  browser,
  request,
}) => {
  const a = await contaViaApi(`Oficina Exporta ${Date.now()}`);
  const sufixo = Date.now();
  const placa1 = placaAleatoria();
  const placa2 = placaAleatoria();
  const zap1 = celularAleatorio().normalizado;
  const zap2 = celularAleatorio().normalizado;
  const zap3 = celularAleatorio().normalizado;
  await semearCliente(
    a,
    { nome: `Ana; Exporta ${sufixo}`, whatsapp: zap1, placa: placa1, modelo: 'Onix "LT"', ano: 2020 },
    [
      {
        tipo_servico_id: a.tipo("Troca de óleo e filtro"),
        data: dataSP(-30),
        km: 45000,
        valor: 250.5,
        proxima_data: dataSP(150),
        posvenda_em: new Date().toISOString(),
      },
      {
        tipo_servico_id: a.tipo("Revisão de freios"),
        origem: "recomendado",
        data: dataSP(-30),
        km: 45000,
        valor: 800,
        proxima_data: dataSP(0),
      },
    ],
  );
  // Carro sem nenhum serviço registrado e cliente sem carro.
  await semearCliente(a, { nome: `Bia Carro ${sufixo}`, whatsapp: zap2, placa: placa2, modelo: "Gol" });
  await semearCliente(a, { nome: `Caio Semcarro ${sufixo}`, whatsapp: zap3 });

  await entrar(page, a.email);
  await page.goto("/config");
  const link = page.getByRole("link", { name: "Baixar planilha com meus dados" });
  await expect(link).toHaveAttribute("href", "/api/exportar");
  const download = page.waitForEvent("download");
  await link.click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toBe(`lembrete-oficina-${dataSP(0)}.csv`);

  const r = await page.request.get("/api/exportar");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("text/csv");
  const bytes = await r.body();
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM
  const csv = bytes.toString("utf8").replace(/^﻿/, "");
  const linhas = csv.split("\r\n");
  expect(linhas[0]).toBe("nome;whatsapp;placa;modelo;ano;servico;data;km;valor;situacao");
  const br = dataSP(-30).split("-").reverse().join("/");
  expect(linhas).toContain(
    `"Ana; Exporta ${sufixo}";${zap1};${placa1};"Onix ""LT""";2020;Troca de óleo e filtro;${br};45000;250,5;feito`,
  );
  expect(linhas).toContain(
    `"Ana; Exporta ${sufixo}";${zap1};${placa1};"Onix ""LT""";2020;Revisão de freios;${br};45000;800;recomendado`,
  );
  expect(csv).toContain(`Caio Semcarro ${sufixo};${zap3};`);

  // Sem login: 401.
  const semLogin = await request.get("/api/exportar", { maxRedirects: 0 });
  expect(semLogin.status()).toBe(401);

  // Reimporta numa conta nova.
  const b = await contaViaApi(`Oficina Reimporta ${Date.now()}`);
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await entrar(pageB, b.email);
  await pageB.goto("/clientes/importar");
  await pageB.getByLabel("Planilha").fill(bytes.toString("utf8"));
  await pageB.getByRole("button", { name: /^Importar \d+ linhas?$/ }).click();
  await expect(pageB.getByRole("heading", { name: "Importação concluída" })).toBeVisible();
  await ctxB.close();

  const resumo = async (sb: typeof a.sb) => {
    const { data: cs } = await sb.from("clientes").select("nome, whatsapp").order("whatsapp");
    const { data: vs } = await sb.from("veiculos").select("placa, modelo, ano").order("placa");
    return { clientes: cs, veiculos: vs };
  };
  expect(await resumo(b.sb)).toEqual(await resumo(a.sb));
});

test("Ajustes: seção do aviso diário renderiza sem erro", async ({ page, context }) => {
  const a = await contaViaApi(`Oficina Aviso ${Date.now()}`);
  await context.grantPermissions(["notifications"]);
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await entrar(page, a.email);
  await page.goto("/config");
  const secao = page.locator("section").filter({ hasText: "Aviso diário no celular" });
  await expect(secao).toBeVisible();
  await expect(secao.getByText("Verificando o aparelho...")).toHaveCount(0, { timeout: 15_000 });

  const botao = secao.getByRole("button", { name: "Ligar aviso diário neste aparelho" });
  let resultado = (await secao.innerText()).replace(/\s+/g, " ");
  if (await botao.isVisible()) {
    await botao.click();
    await expect(secao.getByRole("button", { name: /Ligando/ })).toHaveCount(0, { timeout: 30_000 });
    resultado = (await secao.innerText()).replace(/\s+/g, " ");
    const { data } = await a.sb.from("push_inscricoes").select("endpoint");
    test.info().annotations.push({
      type: "aviso",
      description: `depois de ligar: "${resultado}" | inscrições no banco: ${data?.length ?? 0}`,
    });
    await a.sb.from("push_inscricoes").delete().eq("oficina_id", a.oficinaId);
  } else {
    test.info().annotations.push({ type: "aviso", description: `sem botão: "${resultado}"` });
  }
  console.log(`[aviso diário] ${test.info().annotations.map((x) => x.description).join(" ")}`);
  expect(erros).toEqual([]);
});
