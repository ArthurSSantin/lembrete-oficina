"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { buscarPorPlaca, registrarAtendimento, type Estado } from "@/app/actions";
import type { TipoServico } from "@/lib/types";
import { formatarWhatsapp } from "@/lib/util";

const CAMPOS_VAZIOS = { modelo: "", ano: "", nome: "", whatsapp: "", consentimento: true };

export function FormAtendimento({
  tipos,
  hoje,
}: {
  tipos: Pick<TipoServico, "id" | "nome">[];
  hoje: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [campos, setCampos] = useState(CAMPOS_VAZIOS);

  // Só limpa o formulário quando salvar deu certo; em caso de erro, mantém o que foi digitado.
  const [estado, acao, pendente] = useActionState(async (anterior: Estado, form: FormData) => {
    const resultado = await registrarAtendimento(anterior, form);
    if (resultado?.ok) {
      formRef.current?.reset();
      setCampos(CAMPOS_VAZIOS);
      setAviso(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return resultado;
  }, null);

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => acao(form));
  }

  async function aoSairDaPlaca(placa: string) {
    if (placa.replace(/[^a-zA-Z0-9]/g, "").length < 7) return;
    const achado = await buscarPorPlaca(placa);
    if (achado) {
      setCampos({
        modelo: achado.modelo ?? "",
        ano: achado.ano ? String(achado.ano) : "",
        nome: achado.nome,
        whatsapp: formatarWhatsapp(achado.whatsapp),
        consentimento: achado.consentimento,
      });
      setAviso("Veículo já cadastrado. Dados preenchidos.");
    } else {
      setAviso(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={aoEnviar} className="space-y-5">
      {estado?.ok && (
        <p role="status" className="rounded-lg bg-verde-claro p-3 text-sm font-semibold text-verde">
          {estado.ok}
        </p>
      )}
      {estado?.erro && (
        <p role="alert" className="rounded-lg bg-vermelho-claro p-3 text-sm text-vermelho">{estado.erro}</p>
      )}

      <fieldset className="cartao space-y-4">
        <legend className="px-1 text-sm font-semibold text-tinta-2">Veículo</legend>
        <div>
          <label className="rotulo" htmlFor="placa">Placa</label>
          <input
            id="placa"
            name="placa"
            required
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC1D23"
            className="campo font-display text-lg font-bold tracking-wider uppercase"
            onBlur={(e) => aoSairDaPlaca(e.target.value)}
            onChange={(e) => {
              if (e.target.value.replace(/[^a-zA-Z0-9]/g, "").length === 7) aoSairDaPlaca(e.target.value);
            }}
          />
          {aviso && <p className="mt-1 text-xs text-verde">{aviso}</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="rotulo" htmlFor="modelo">Modelo</label>
            <input
              id="modelo"
              name="modelo"
              placeholder="Onix 1.0"
              className="campo"
              value={campos.modelo}
              onChange={(e) => setCampos({ ...campos, modelo: e.target.value })}
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="ano">Ano</label>
            <input
              id="ano"
              name="ano"
              inputMode="numeric"
              placeholder="2020"
              className="campo"
              value={campos.ano}
              onChange={(e) => setCampos({ ...campos, ano: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="cartao space-y-4">
        <legend className="px-1 text-sm font-semibold text-tinta-2">Cliente</legend>
        <div>
          <label className="rotulo" htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            required
            autoCapitalize="words"
            className="campo"
            value={campos.nome}
            onChange={(e) => setCampos({ ...campos, nome: e.target.value })}
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="whatsapp">WhatsApp</label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            required
            placeholder="(11) 99999-9999"
            className="campo"
            value={campos.whatsapp}
            onChange={(e) => setCampos({ ...campos, whatsapp: e.target.value })}
          />
        </div>
        <label className="flex min-h-11 items-start gap-3 py-1 text-sm text-tinta-2">
          <input
            type="checkbox"
            name="consentimento"
            className="mt-0.5 h-5 w-5 accent-tinta"
            checked={campos.consentimento}
            onChange={(e) => setCampos({ ...campos, consentimento: e.target.checked })}
          />
          Cliente autorizou receber lembretes pelo WhatsApp
        </label>
      </fieldset>

      <fieldset className="cartao space-y-4">
        <legend className="px-1 text-sm font-semibold text-tinta-2">Serviço feito</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="data">Data</label>
            <input id="data" name="data" type="date" defaultValue={hoje} className="campo" />
          </div>
          <div>
            <label className="rotulo" htmlFor="km">Km atual</label>
            <input id="km" name="km" inputMode="numeric" placeholder="45000" className="campo" />
          </div>
        </div>
        <div className="space-y-2">
          {tipos.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-linha px-3 py-3 has-[:checked]:border-tinta has-[:checked]:bg-fundo"
            >
              <input type="checkbox" name="tipos" value={t.id} className="h-5 w-5 accent-tinta" />
              <span>{t.nome}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="rotulo" htmlFor="valor">Valor total (opcional)</label>
          <input id="valor" name="valor" inputMode="decimal" placeholder="R$ 0,00" className="campo" />
          <p className="mt-1 text-xs text-tinta-3">Usado para mostrar quanto os retornos renderam.</p>
        </div>
      </fieldset>

      <details className="cartao group">
        <summary className="cursor-pointer list-none">
          <span className="font-semibold">O cliente deixou algum serviço para depois?</span>
          <span className="block text-sm text-tinta-2">
            Marque o que foi recomendado e não foi feito. O sistema lembra você de chamar o cliente.
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          {tipos.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-linha px-3 py-3 has-[:checked]:border-sinal has-[:checked]:bg-sinal-claro"
            >
              <input type="checkbox" name="recomendados" value={t.id} className="h-5 w-5 accent-tinta" />
              <span>{t.nome}</span>
            </label>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo" htmlFor="dias_recomendado">Chamar em</label>
              <select id="dias_recomendado" name="dias_recomendado" defaultValue="30" className="campo">
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="valor_recomendado">Orçamento</label>
              <input
                id="valor_recomendado"
                name="valor_recomendado"
                inputMode="decimal"
                placeholder="R$ 0,00"
                className="campo"
              />
            </div>
          </div>
        </div>
      </details>

      <button type="submit" disabled={pendente} className="botao sticky bottom-20 w-full shadow-lg md:static">
        {pendente ? "Salvando..." : "Salvar atendimento"}
      </button>
    </form>
  );
}
