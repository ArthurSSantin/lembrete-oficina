"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { criarAdmin } from "@/lib/supabase/admin";
import { getContexto } from "@/lib/oficina";
import type { LinhaImportada } from "@/lib/importacao";
import type { TipoServico } from "@/lib/types";
import {
  calcularProxima,
  estimarKmPorDia,
  hojeISO,
  lerDecimal,
  normalizarPlaca,
  somarDias,
  normalizarWhatsapp,
  whatsappValido,
} from "@/lib/util";

export type Estado = { erro?: string; ok?: string } | null;

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? "").trim();
}

function inteiro(form: FormData, campo: string): number | null {
  const v = texto(form, campo).replace(/\D/g, "");
  return v ? parseInt(v, 10) : null;
}

function decimal(form: FormData, campo: string): number | null {
  return lerDecimal(texto(form, campo));
}

// ===================== LOGIN =====================

export async function entrar(_: Estado, form: FormData): Promise<Estado> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(form, "email"),
    password: texto(form, "senha"),
  });
  if (error) return { erro: "E-mail ou senha inválidos." };
  redirect("/");
}

export async function cadastrar(_: Estado, form: FormData): Promise<Estado> {
  const senha = texto(form, "senha");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: texto(form, "email"),
    password: senha,
  });
  if (error) return { erro: error.message };
  if (!data.session) {
    return { ok: "Conta criada. Confirme o e-mail que enviamos e depois entre." };
  }
  redirect("/onboarding");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ===================== OFICINA =====================

export async function criarOficina(_: Estado, form: FormData): Promise<Estado> {
  const nome = texto(form, "nome");
  if (!nome) return { erro: "Informe o nome da oficina." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("criar_oficina", {
    p_nome: nome,
    p_whatsapp: normalizarWhatsapp(texto(form, "whatsapp")) || null,
  });
  if (error) return { erro: "Não foi possível criar a oficina: " + error.message };
  redirect("/");
}

export async function salvarOficina(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, oficina } = await getContexto();
  const { error } = await supabase
    .from("oficinas")
    .update({
      nome: texto(form, "nome") || oficina.nome,
      whatsapp: normalizarWhatsapp(texto(form, "whatsapp")) || null,
      assinatura_texto: texto(form, "assinatura") || null,
      link_avaliacao: texto(form, "link_avaliacao") || null,
      dias_sumido: Math.max(60, inteiro(form, "dias_sumido") ?? oficina.dias_sumido),
    })
    .eq("id", oficina.id);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: "Dados salvos." };
}

export async function salvarTipoServico(form: FormData) {
  const { supabase, oficina } = await getContexto();
  const id = texto(form, "tipo_id");
  const dados = {
    nome: texto(form, "nome"),
    intervalo_dias: inteiro(form, "intervalo_dias"),
    intervalo_km: inteiro(form, "intervalo_km"),
    ativo: form.get("ativo") === "on",
    ...(form.has("modelo_mensagem") && {
      modelo_mensagem: texto(form, "modelo_mensagem") || null,
    }),
  };
  if (!dados.nome) return;

  if (id) {
    await supabase.from("tipos_servico").update(dados).eq("id", id);
  } else {
    await supabase
      .from("tipos_servico")
      .insert({ ...dados, ativo: true, oficina_id: oficina.id, ordem: 99 });
  }
  revalidatePath("/config");
}

// ===================== ATENDIMENTO =====================

export async function registrarAtendimento(
  _: Estado,
  form: FormData,
): Promise<Estado> {
  const { supabase, oficina } = await getContexto();

  const placa = normalizarPlaca(texto(form, "placa"));
  const modelo = texto(form, "modelo") || null;
  const ano = inteiro(form, "ano");
  const nome = texto(form, "nome");
  const whatsapp = normalizarWhatsapp(texto(form, "whatsapp"));
  const consentimento = form.get("consentimento") === "on";
  const data = texto(form, "data") || hojeISO();
  const km = inteiro(form, "km");
  const valorTotal = decimal(form, "valor");
  const tiposIds = form.getAll("tipos").map(String).filter(Boolean);
  const recomendadosIds = form
    .getAll("recomendados")
    .map(String)
    .filter((id) => id && !tiposIds.includes(id));
  const diasRecomendado = Math.min(365, Math.max(1, inteiro(form, "dias_recomendado") ?? 30));
  const valorRecomendado = decimal(form, "valor_recomendado");

  if (placa.length < 7) return { erro: "Placa inválida." };
  if (!nome) return { erro: "Informe o nome do cliente." };
  if (!whatsappValido(whatsapp)) return { erro: "WhatsApp inválido. Use DDD + número." };
  if (tiposIds.length === 0 && recomendadosIds.length === 0) {
    return { erro: "Marque pelo menos um serviço feito ou recomendado." };
  }

  // 1. Cliente: procura pelo WhatsApp, senão cria
  let clienteId: string;
  const { data: clienteExistente } = await supabase
    .from("clientes")
    .select("id, consentimento")
    .eq("oficina_id", oficina.id)
    .eq("whatsapp", whatsapp)
    .maybeSingle();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
    const atualizar: Record<string, unknown> = { nome };
    if (consentimento && !clienteExistente.consentimento) {
      atualizar.consentimento = true;
      atualizar.consentimento_em = new Date().toISOString();
    }
    await supabase.from("clientes").update(atualizar).eq("id", clienteId);
  } else {
    const { data: novo, error } = await supabase
      .from("clientes")
      .insert({
        oficina_id: oficina.id,
        nome,
        whatsapp,
        consentimento,
        consentimento_em: consentimento ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !novo) return { erro: "Erro ao salvar cliente: " + error?.message };
    clienteId = novo.id;
  }

  // 2. Veículo: procura pela placa, senão cria
  let veiculoId: string;
  const { data: veiculoExistente } = await supabase
    .from("veiculos")
    .select("id")
    .eq("oficina_id", oficina.id)
    .eq("placa", placa)
    .maybeSingle();

  if (veiculoExistente) {
    veiculoId = veiculoExistente.id;
    await supabase
      .from("veiculos")
      .update({ cliente_id: clienteId, ...(modelo && { modelo }), ...(ano && { ano }) })
      .eq("id", veiculoId);
  } else {
    const { data: novo, error } = await supabase
      .from("veiculos")
      .insert({ oficina_id: oficina.id, cliente_id: clienteId, placa, modelo, ano })
      .select("id")
      .single();
    if (error || !novo) return { erro: "Erro ao salvar veículo: " + error?.message };
    veiculoId = novo.id;
  }

  // 3. Média de km/dia com base no histórico do veículo
  const { data: historico } = await supabase
    .from("servicos")
    .select("id, data, km, tipo_servico_id, lembrete_status")
    .eq("veiculo_id", veiculoId);

  const kmPorDia = estimarKmPorDia([...(historico ?? []), { data, km }]);

  const { data: tipos } = await supabase
    .from("tipos_servico")
    .select("id, nome, intervalo_dias, intervalo_km")
    .in("id", [...tiposIds, ...recomendadosIds])
    .returns<Pick<TipoServico, "id" | "nome" | "intervalo_dias" | "intervalo_km">[]>();

  const valorPorServico =
    valorTotal != null && tiposIds.length
      ? Math.round((valorTotal / tiposIds.length) * 100) / 100
      : null;

  // 4. Um registro por serviço feito
  const feitos = (tipos ?? []).filter((t) => tiposIds.includes(t.id));
  const recomendados = (tipos ?? []).filter((t) => recomendadosIds.includes(t.id));
  const valorPorRecomendado =
    valorRecomendado != null && recomendados.length
      ? Math.round((valorRecomendado / recomendados.length) * 100) / 100
      : null;

  for (const tipo of feitos) {
    const { proximaData, proximaKm } = calcularProxima({
      data,
      km,
      intervaloDias: tipo.intervalo_dias,
      intervaloKm: tipo.intervalo_km,
      kmPorDia,
    });

    const { data: novo, error } = await supabase
      .from("servicos")
      .insert({
        oficina_id: oficina.id,
        veiculo_id: veiculoId,
        tipo_servico_id: tipo.id,
        data,
        km,
        valor: valorPorServico,
        proxima_data: proximaData,
        proxima_km: proximaKm,
      })
      .select("id")
      .single();
    if (error || !novo) return { erro: "Erro ao salvar serviço: " + error?.message };

    // Lembretes anteriores do mesmo serviço: se o cliente foi chamado,
    // conta como retorno; se não, só é substituído pelo novo.
    const anteriores = (historico ?? []).filter(
      (s) =>
        s.tipo_servico_id === tipo.id &&
        (s.lembrete_status === "pendente" || s.lembrete_status === "contatado"),
    );
    for (const ant of anteriores) {
      await supabase
        .from("servicos")
        .update({
          lembrete_status: ant.lembrete_status === "contatado" ? "retornou" : "substituido",
          retorno_servico_id: novo.id,
        })
        .eq("id", ant.id);
    }
  }

  // 5. Serviços recomendados que o cliente não quis fazer agora:
  // viram um lembrete em poucos dias. Substituem recomendações antigas do mesmo serviço.
  for (const tipo of recomendados) {
    const antigos = (historico ?? []).filter(
      (s) => s.tipo_servico_id === tipo.id && s.lembrete_status === "pendente",
    );
    const { data: novo, error } = await supabase
      .from("servicos")
      .insert({
        oficina_id: oficina.id,
        veiculo_id: veiculoId,
        tipo_servico_id: tipo.id,
        origem: "recomendado",
        data,
        km,
        valor: valorPorRecomendado,
        proxima_data: somarDias(data, diasRecomendado),
      })
      .select("id")
      .single();
    if (error || !novo) return { erro: "Erro ao salvar recomendação: " + error?.message };
    if (antigos.length) {
      await supabase
        .from("servicos")
        .update({ lembrete_status: "substituido", retorno_servico_id: novo.id })
        .in(
          "id",
          antigos.map((a) => a.id),
        );
    }
  }

  revalidatePath("/", "layout");
  const partes = [
    feitos.length && `${feitos.length} serviço(s)`,
    recomendados.length && `${recomendados.length} recomendação(ões)`,
  ].filter(Boolean);
  return { ok: `${placa} salvo: ${partes.join(" e ")}.` };
}

export async function buscarPorPlaca(placaEntrada: string) {
  const { supabase, oficina } = await getContexto();
  const placa = normalizarPlaca(placaEntrada);
  if (placa.length < 7) return null;

  const { data } = await supabase
    .from("veiculos")
    .select("placa, modelo, ano, clientes(nome, whatsapp, consentimento)")
    .eq("oficina_id", oficina.id)
    .eq("placa", placa)
    .maybeSingle();

  if (!data) return null;
  const cliente = Array.isArray(data.clientes) ? data.clientes[0] : data.clientes;
  return {
    modelo: data.modelo as string | null,
    ano: data.ano as number | null,
    nome: (cliente?.nome as string) ?? "",
    whatsapp: (cliente?.whatsapp as string) ?? "",
    consentimento: Boolean(cliente?.consentimento),
  };
}

// ===================== LEMBRETES =====================

export async function marcarContatado(servicoId: string) {
  const { supabase } = await getContexto();
  await supabase
    .from("servicos")
    .update({ lembrete_status: "contatado", contatado_em: new Date().toISOString() })
    .eq("id", servicoId)
    .eq("lembrete_status", "pendente");
  revalidatePath("/");
}

export async function ignorarLembrete(servicoId: string) {
  const { supabase } = await getContexto();
  await supabase
    .from("servicos")
    .update({ lembrete_status: "ignorado" })
    .eq("id", servicoId);
  revalidatePath("/");
}

export async function reabrirLembrete(servicoId: string) {
  const { supabase } = await getContexto();
  await supabase
    .from("servicos")
    .update({ lembrete_status: "pendente", contatado_em: null })
    .eq("id", servicoId)
    .in("lembrete_status", ["contatado", "ignorado"]);
  revalidatePath("/");
}

/** Joga o lembrete para daqui a alguns dias (cliente pediu para chamar depois). */
export async function adiarLembrete(servicoId: string, dias: number) {
  const { supabase } = await getContexto();
  const n = Math.min(365, Math.max(1, Math.round(dias)));
  await supabase
    .from("servicos")
    .update({
      proxima_data: somarDias(hojeISO(), n),
      lembrete_status: "pendente",
      contatado_em: null,
    })
    .eq("id", servicoId)
    .in("lembrete_status", ["pendente", "contatado"]);
  revalidatePath("/", "layout");
}

/** Cliente pediu para não receber mais mensagens (LGPD). Pode ser desfeito. */
export async function definirNaoContatar(clienteId: string, naoContatar: boolean) {
  const { supabase } = await getContexto();
  await supabase.from("clientes").update({ nao_contatar: naoContatar }).eq("id", clienteId);
  if (naoContatar) {
    const { data: veiculos } = await supabase
      .from("veiculos")
      .select("id")
      .eq("cliente_id", clienteId);
    const ids = (veiculos ?? []).map((v) => v.id);
    if (ids.length) {
      await supabase
        .from("servicos")
        .update({ lembrete_status: "ignorado" })
        .in("veiculo_id", ids)
        .eq("lembrete_status", "pendente");
    }
  }
  revalidatePath("/", "layout");
}

/** Marca a visita (carro + dia) como já agradecida no pós-venda. */
export async function marcarPosvenda(veiculoId: string, data: string) {
  const { supabase } = await getContexto();
  await supabase
    .from("servicos")
    .update({ posvenda_em: new Date().toISOString() })
    .eq("veiculo_id", veiculoId)
    .eq("data", data)
    .is("posvenda_em", null);
  revalidatePath("/");
}

/** Marca que o cliente sumido foi chamado (some da lista por 90 dias). */
export async function marcarReativacao(clienteId: string) {
  const { supabase } = await getContexto();
  await supabase
    .from("clientes")
    .update({ reativacao_em: new Date().toISOString() })
    .eq("id", clienteId);
  revalidatePath("/");
}

export async function salvarModelos(_: Estado, form: FormData): Promise<Estado> {
  const { supabase, oficina } = await getContexto();
  const { error } = await supabase
    .from("oficinas")
    .update({
      modelo_lembrete: texto(form, "modelo_lembrete") || null,
      modelo_recomendado: texto(form, "modelo_recomendado") || null,
      modelo_posvenda: texto(form, "modelo_posvenda") || null,
      modelo_reativacao: texto(form, "modelo_reativacao") || null,
    })
    .eq("id", oficina.id);
  if (error) return { erro: error.message };
  revalidatePath("/config");
  return { ok: "Mensagens salvas." };
}

// ===================== IMPORTAÇÃO =====================

function pedacos<T>(lista: T[], tamanho: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < lista.length; i += tamanho) r.push(lista.slice(i, i + tamanho));
  return r;
}

function chaveNome(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export type ResultadoImportacao = {
  erro?: string;
  clientesNovos?: number;
  veiculosNovos?: number;
  servicos?: number;
  repetidos?: number;
  ignoradas?: { linha: number; motivo: string }[];
};

/**
 * Importa clientes, carros e o último serviço de uma planilha.
 * Em lote: poucas consultas, mesmo com centenas de linhas.
 */
export async function importarClientes(
  linhas: LinhaImportada[],
  autorizaram: boolean,
): Promise<ResultadoImportacao> {
  const { supabase, oficina } = await getContexto();
  if (!Array.isArray(linhas) || linhas.length === 0) return { erro: "A planilha está vazia." };
  if (linhas.length > 2000) return { erro: "Importe no máximo 2.000 linhas por vez." };

  const ignoradas: { linha: number; motivo: string }[] = [];
  const validas = linhas
    .map((l, i) => ({
      n: i + 2, // linha 1 é o cabeçalho
      nome: String(l.nome ?? "").trim(),
      whatsapp: normalizarWhatsapp(String(l.whatsapp ?? "")),
      placa: normalizarPlaca(String(l.placa ?? "")),
      modelo: String(l.modelo ?? "").trim() || null,
      ano: parseInt(String(l.ano ?? "").replace(/\D/g, ""), 10) || null,
      servico: String(l.servico ?? "").trim(),
      data: /^\d{4}-\d{2}-\d{2}$/.test(String(l.data ?? "")) ? String(l.data) : "",
      km: parseInt(String(l.km ?? "").replace(/\D/g, ""), 10) || null,
      valor: lerDecimal(String(l.valor ?? "")),
      recomendado: chaveNome(String(l.situacao ?? "")) === "recomendado",
    }))
    .filter((l) => {
      if (!l.nome) ignoradas.push({ linha: l.n, motivo: "sem nome" });
      else if (!whatsappValido(l.whatsapp)) ignoradas.push({ linha: l.n, motivo: "WhatsApp inválido" });
      else return true;
      return false;
    });

  if (validas.length === 0) return { erro: "Nenhuma linha válida.", ignoradas };

  // 1. Clientes: os que já existem ficam como estão; os novos são criados.
  const zaps = [...new Set(validas.map((l) => l.whatsapp))];
  const idPorZap = new Map<string, string>();
  for (const p of pedacos(zaps, 150)) {
    const { data } = await supabase
      .from("clientes")
      .select("id, whatsapp")
      .eq("oficina_id", oficina.id)
      .in("whatsapp", p);
    for (const c of data ?? []) idPorZap.set(c.whatsapp, c.id);
  }
  const agora = new Date().toISOString();
  const novosClientes = zaps
    .filter((z) => !idPorZap.has(z))
    .map((z) => ({
      oficina_id: oficina.id,
      whatsapp: z,
      nome: validas.find((l) => l.whatsapp === z)!.nome,
      consentimento: autorizaram,
      consentimento_em: autorizaram ? agora : null,
    }));
  for (const p of pedacos(novosClientes, 300)) {
    const { data, error } = await supabase.from("clientes").insert(p).select("id, whatsapp");
    if (error) return { erro: "Erro ao salvar clientes: " + error.message };
    for (const c of data ?? []) idPorZap.set(c.whatsapp, c.id);
  }

  // 2. Veículos
  const comPlaca = validas.filter((l) => l.placa.length >= 7);
  const placas = [...new Set(comPlaca.map((l) => l.placa))];
  const idPorPlaca = new Map<string, string>();
  for (const p of pedacos(placas, 150)) {
    const { data } = await supabase
      .from("veiculos")
      .select("id, placa")
      .eq("oficina_id", oficina.id)
      .in("placa", p);
    for (const v of data ?? []) idPorPlaca.set(v.placa, v.id);
  }
  const novosVeiculos = placas
    .filter((pl) => !idPorPlaca.has(pl))
    .map((pl) => {
      const l = comPlaca.find((x) => x.placa === pl)!;
      return {
        oficina_id: oficina.id,
        cliente_id: idPorZap.get(l.whatsapp)!,
        placa: pl,
        modelo: l.modelo,
        ano: l.ano,
      };
    });
  for (const p of pedacos(novosVeiculos, 300)) {
    const { data, error } = await supabase.from("veiculos").insert(p).select("id, placa");
    if (error) return { erro: "Erro ao salvar veículos: " + error.message };
    for (const v of data ?? []) idPorPlaca.set(v.placa, v.id);
  }

  // 3. Último serviço de cada linha, com o lembrete calculado
  const { data: tipos } = await supabase
    .from("tipos_servico")
    .select("id, nome, intervalo_dias, intervalo_km")
    .eq("oficina_id", oficina.id)
    .returns<Pick<TipoServico, "id" | "nome" | "intervalo_dias" | "intervalo_km">[]>();
  // Nome igual vale; nome parcial só quando aponta para um único serviço.
  const acharTipo = (nome: string) => {
    const k = chaveNome(nome);
    if (!k) return undefined;
    const exato = (tipos ?? []).find((t) => chaveNome(t.nome) === k);
    if (exato) return exato;
    const parciais = (tipos ?? []).filter(
      (t) => chaveNome(t.nome).includes(k) || k.includes(chaveNome(t.nome)),
    );
    return parciais.length === 1 ? parciais[0] : undefined;
  };

  // Serviços que já existem nesses carros: evita duplicar ao reimportar
  // e permite substituir o lembrete antigo do mesmo serviço.
  const veiculoIds = [...new Set(comPlaca.map((l) => idPorPlaca.get(l.placa)!))];
  const existentes: { id: string; veiculo_id: string; tipo_servico_id: string; data: string; lembrete_status: string }[] = [];
  for (const p of pedacos(veiculoIds, 150)) {
    const { data } = await supabase
      .from("servicos")
      .select("id, veiculo_id, tipo_servico_id, data, lembrete_status")
      .in("veiculo_id", p);
    existentes.push(...(data ?? []));
  }
  const jaTem = new Set(existentes.map((e) => `${e.veiculo_id}|${e.tipo_servico_id}|${e.data}`));
  const hoje = hojeISO();

  const servicos = [];
  let repetidos = 0;
  for (const l of comPlaca) {
    if (!l.servico && !l.data) continue;
    const tipo = acharTipo(l.servico);
    const motivo = !l.data
      ? "serviço sem data ou com data inválida"
      : l.data > hoje
        ? "data no futuro"
        : !tipo
          ? `serviço "${l.servico}" não bate com um único serviço de Ajustes`
          : null;
    if (motivo || !tipo) {
      ignoradas.push({ linha: l.n, motivo: `${motivo} (cliente e carro foram salvos)` });
      continue;
    }
    const veiculoId = idPorPlaca.get(l.placa)!;
    const chave = `${veiculoId}|${tipo.id}|${l.data}`;
    if (jaTem.has(chave)) {
      repetidos++;
      continue;
    }
    jaTem.add(chave);
    const { proximaData, proximaKm } = l.recomendado
      ? { proximaData: somarDias(l.data, 30), proximaKm: null }
      : calcularProxima({
          data: l.data,
          km: l.km,
          intervaloDias: tipo.intervalo_dias,
          intervaloKm: tipo.intervalo_km,
          kmPorDia: null,
        });
    servicos.push({
      origem: l.recomendado ? ("recomendado" as const) : ("feito" as const),
      oficina_id: oficina.id,
      veiculo_id: veiculoId,
      tipo_servico_id: tipo.id,
      data: l.data,
      km: l.km,
      valor: l.valor,
      proxima_data: proximaData,
      proxima_km: proximaKm,
      // Visita antiga importada não pede pós-venda.
      posvenda_em: agora,
    });
  }
  // Só o serviço mais recente de cada carro/tipo fica com lembrete em aberto.
  const maisRecente = new Map<string, string>();
  for (const sv of [...existentes, ...servicos]) {
    const k = `${sv.veiculo_id}|${sv.tipo_servico_id}`;
    if (!maisRecente.has(k) || sv.data > maisRecente.get(k)!) maisRecente.set(k, sv.data);
  }
  const novos = servicos.map((sv) =>
    sv.data < maisRecente.get(`${sv.veiculo_id}|${sv.tipo_servico_id}`)!
      ? { ...sv, lembrete_status: "substituido" }
      : sv,
  );
  for (const p of pedacos(novos, 300)) {
    const { error } = await supabase.from("servicos").insert(p);
    if (error) return { erro: "Erro ao salvar serviços: " + error.message };
  }
  const antigos = existentes.filter(
    (e) =>
      e.lembrete_status === "pendente" &&
      e.data < maisRecente.get(`${e.veiculo_id}|${e.tipo_servico_id}`)!,
  );
  for (const p of pedacos(antigos.map((a) => a.id), 150)) {
    await supabase.from("servicos").update({ lembrete_status: "substituido" }).in("id", p);
  }
  for (const l of validas) {
    if (l.placa.length < 7 && (l.placa || l.servico)) {
      ignoradas.push({ linha: l.n, motivo: "placa ausente ou inválida (cliente foi salvo)" });
    }
  }

  revalidatePath("/", "layout");
  return {
    clientesNovos: novosClientes.length,
    veiculosNovos: novosVeiculos.length,
    servicos: novos.filter((sv) => !("lembrete_status" in sv)).length,
    repetidos,
    ignoradas: ignoradas.sort((a, b) => a.linha - b.linha),
  };
}

// ===================== SENHA =====================

export async function pedirNovaSenha(_: Estado, form: FormData): Promise<Estado> {
  const email = texto(form, "email");
  if (!email.includes("@")) return { erro: "Digite um e-mail válido." };
  const origem = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirmar?next=/nova-senha`,
  });
  // Mesma resposta exista ou não a conta, para não revelar quem é cliente.
  if (error && error.status === 429) {
    return { erro: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." };
  }
  return {
    ok: "Se esse e-mail tiver conta, o link chega em instantes. Confira também o spam.",
  };
}

export async function definirNovaSenha(_: Estado, form: FormData): Promise<Estado> {
  const senha = texto(form, "senha");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    return {
      erro:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da anterior."
          : "Não foi possível trocar a senha. Abra o link do e-mail de novo.",
    };
  }
  redirect("/");
}

// ===================== AVISO DIÁRIO =====================

type InscricaoPush = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function salvarInscricao(inscricao: InscricaoPush): Promise<Estado> {
  const { supabase, oficina } = await getContexto();
  const endpoint = inscricao?.endpoint;
  const p256dh = inscricao?.keys?.p256dh;
  const auth = inscricao?.keys?.auth;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) return { erro: "Inscrição inválida." };
  // O mesmo aparelho pode ter sido inscrito por outra conta. O RLS não deixa este
  // usuário apagar a linha do outro, então a troca de dono usa a chave do servidor,
  // e só depois de confirmar quem está logado (getContexto acima).
  if (process.env.SUPABASE_SECRET_KEY) {
    await criarAdmin().from("push_inscricoes").delete().eq("endpoint", endpoint);
  } else {
    await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
  }
  const { error } = await supabase
    .from("push_inscricoes")
    .insert({ oficina_id: oficina.id, endpoint, p256dh, auth });
  if (error) return { erro: error.message };
  return { ok: "Aviso ligado." };
}

export async function removerInscricao(endpoint: string) {
  const { supabase } = await getContexto();
  await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
}
