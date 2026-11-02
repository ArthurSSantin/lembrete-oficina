"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContexto } from "@/lib/oficina";
import type { TipoServico } from "@/lib/types";
import {
  calcularProxima,
  estimarKmPorDia,
  hojeISO,
  normalizarPlaca,
  normalizarWhatsapp,
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
  const v = texto(form, campo).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
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
    })
    .eq("id", oficina.id);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: "Dados salvos." };
}

export async function salvarTipoServico(form: FormData) {
  const { supabase, oficina } = await getContexto();
  const id = texto(form, "id");
  const dados = {
    nome: texto(form, "nome"),
    intervalo_dias: inteiro(form, "intervalo_dias"),
    intervalo_km: inteiro(form, "intervalo_km"),
    ativo: form.get("ativo") === "on",
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

  if (placa.length < 7) return { erro: "Placa inválida." };
  if (!nome) return { erro: "Informe o nome do cliente." };
  if (whatsapp.length < 12) return { erro: "WhatsApp inválido. Use DDD + número." };
  if (tiposIds.length === 0) return { erro: "Marque pelo menos um serviço." };

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
    .in("id", tiposIds)
    .returns<Pick<TipoServico, "id" | "nome" | "intervalo_dias" | "intervalo_km">[]>();

  const valorPorServico =
    valorTotal != null ? Math.round((valorTotal / tiposIds.length) * 100) / 100 : null;

  // 4. Um registro por serviço feito
  for (const tipo of tipos ?? []) {
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

  revalidatePath("/", "layout");
  return { ok: `Atendimento do ${placa} salvo.` };
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
