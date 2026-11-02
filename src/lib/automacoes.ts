import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeISO, plural, somarDias } from "@/lib/util";

type Inscricao = { id: string; oficina_id: string; endpoint: string; p256dh: string; auth: string };

/** Conta o que cada oficina tem para fazer hoje. */
async function pendenciasDaOficina(admin: SupabaseClient, oficinaId: string, hoje: string) {
  const [vencidos, recentes] = await Promise.all([
    admin
      .from("servicos")
      .select("id, veiculos!inner(clientes!inner(nao_contatar))", { count: "exact", head: true })
      .eq("oficina_id", oficinaId)
      .eq("lembrete_status", "pendente")
      .lte("proxima_data", hoje)
      .eq("veiculos.clientes.nao_contatar", false),
    admin
      .from("servicos")
      .select("veiculo_id, data, veiculos!inner(clientes!inner(nao_contatar))")
      .eq("oficina_id", oficinaId)
      .eq("origem", "feito")
      .is("posvenda_em", null)
      .gte("data", somarDias(hoje, -7))
      .lte("data", somarDias(hoje, -1))
      .eq("veiculos.clientes.nao_contatar", false)
      .limit(500),
  ]);
  const visitas = new Set((recentes.data ?? []).map((r) => `${r.veiculo_id}|${r.data}`));
  return { lembretes: vencidos.count ?? 0, posvenda: visitas.size };
}

export function textoDoAviso(p: { lembretes: number; posvenda: number }) {
  const total = p.lembretes + p.posvenda;
  const partes = [
    p.lembretes > 0 && plural(p.lembretes, "lembrete", "lembretes"),
    p.posvenda > 0 && plural(p.posvenda, "agradecimento de visita", "agradecimentos de visita"),
  ].filter(Boolean);
  return {
    titulo: `${plural(total, "cliente", "clientes")} para chamar hoje`,
    corpo: `${partes.join(" e ")}. Toque para abrir a fila com as mensagens prontas.`,
    url: "/chamar",
  };
}

/** Manda o aviso da manhã para todos os aparelhos inscritos. */
export async function enviarAvisoDiario(admin: SupabaseClient) {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return { enviados: 0, removidos: 0, motivo: "chaves VAPID ausentes" };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "https://lembrete-oficina.vercel.app",
    publica,
    privada,
  );

  const { data } = await admin.from("push_inscricoes").select("id, oficina_id, endpoint, p256dh, auth");
  const inscricoes = (data ?? []) as Inscricao[];
  const hoje = hojeISO();
  const porOficina = new Map<string, Inscricao[]>();
  for (const i of inscricoes) porOficina.set(i.oficina_id, [...(porOficina.get(i.oficina_id) ?? []), i]);

  let enviados = 0;
  const vencidas: string[] = [];
  for (const [oficinaId, lista] of porOficina) {
    const p = await pendenciasDaOficina(admin, oficinaId, hoje);
    if (p.lembretes + p.posvenda === 0) continue;
    const carga = JSON.stringify(textoDoAviso(p));
    await Promise.all(
      lista.map(async (i) => {
        try {
          await webpush.sendNotification(
            { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
            carga,
            { TTL: 6 * 3600, urgency: "normal" },
          );
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // Aparelho desinstalou o app ou revogou a permissão.
          if (status === 404 || status === 410) vencidas.push(i.id);
          else console.error("Falha no aviso diário:", status, (e as Error).message);
        }
      }),
    );
  }
  if (vencidas.length) await admin.from("push_inscricoes").delete().in("id", vencidas);
  return { enviados, removidos: vencidas.length };
}

const TABELAS = ["tipos_servico", "clientes", "veiculos", "servicos"] as const;
const BACKUPS_GUARDADOS = 8;

async function lerTudo(admin: SupabaseClient, tabela: string, oficinaId: string) {
  const linhas: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await admin
      .from(tabela)
      .select("*")
      .eq("oficina_id", oficinaId)
      .order("id")
      .range(de, de + 999);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...(data ?? []));
    if (!data || data.length < 1000) return linhas;
  }
}

/** Cópia de todos os dados de cada oficina no bucket privado "backups". Guarda as 8 últimas. */
export async function fazerBackup(admin: SupabaseClient) {
  const hoje = hojeISO();
  const { data: oficinas, error } = await admin.from("oficinas").select("*");
  if (error) throw new Error(error.message);

  let arquivos = 0;
  for (const oficina of oficinas ?? []) {
    const copia: Record<string, unknown> = { gerado_em: new Date().toISOString(), oficina };
    for (const t of TABELAS) copia[t] = await lerTudo(admin, t, oficina.id);

    const pasta = oficina.id as string;
    const { error: erroUpload } = await admin.storage
      .from("backups")
      .upload(`${pasta}/${hoje}.json`, JSON.stringify(copia), {
        contentType: "application/json",
        upsert: true,
      });
    if (erroUpload) throw new Error(`upload: ${erroUpload.message}`);
    arquivos++;

    const { data: existentes } = await admin.storage.from("backups").list(pasta, {
      sortBy: { column: "name", order: "desc" },
    });
    const sobras = (existentes ?? []).slice(BACKUPS_GUARDADOS).map((f) => `${pasta}/${f.name}`);
    if (sobras.length) await admin.storage.from("backups").remove(sobras);
  }
  return { arquivos };
}

/** Segunda-feira no horário de São Paulo. */
export function ehDiaDeBackup(agora = new Date()) {
  const dia = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(agora);
  return dia === "Mon";
}
