"use client";

import { useEffect, useState, useTransition } from "react";
import { removerInscricao, salvarInscricao } from "@/app/actions";

type Estado = "carregando" | "sem-suporte" | "bloqueado" | "desligado" | "ligado" | "instalar";

function chaveParaBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  return Uint8Array.from(bruto, (c) => c.charCodeAt(0));
}

const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalado = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function AvisoDiario({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // No iPhone, notificações só funcionam com o app instalado na tela inicial.
        setEstado(ehIOS() && !instalado() ? "instalar" : "sem-suporte");
        return;
      }
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const inscricao = await reg.pushManager.getSubscription();
      setEstado(inscricao ? "ligado" : "desligado");
    })().catch(() => setEstado("sem-suporte"));
  }, []);

  function ligar() {
    setErro(null);
    startTransition(async () => {
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setEstado(permissao === "denied" ? "bloqueado" : "desligado");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const inscricao = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaBytes(chavePublica),
        });
        const r = await salvarInscricao(JSON.parse(JSON.stringify(inscricao)));
        if (r?.erro) throw new Error(r.erro);
        setEstado("ligado");
      } catch {
        setErro("O aviso não foi ligado. Tente de novo.");
      }
    });
  }

  function desligar() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const inscricao = await reg.pushManager.getSubscription();
      if (inscricao) {
        await removerInscricao(inscricao.endpoint);
        await inscricao.unsubscribe();
      }
      setEstado("desligado");
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-tinta-2">
        Todo dia de manhã, entre 8h e 9h, o celular avisa quantos clientes há para chamar. Tocando no
        aviso, a fila abre direto.
      </p>
      {estado === "carregando" && <p className="text-tinta-3">Verificando o aparelho...</p>}
      {estado === "instalar" && (
        <p className="aviso">
          No iPhone, primeiro instale o app: toque em Compartilhar e depois em &quot;Adicionar à Tela de
          Início&quot;. Abra pelo ícone e volte aqui.
        </p>
      )}
      {estado === "sem-suporte" && (
        <p className="aviso">Este navegador não recebe avisos. Use o Chrome no Android ou o app instalado no iPhone.</p>
      )}
      {estado === "bloqueado" && (
        <p className="aviso">
          Os avisos estão bloqueados para este site. Libere nas configurações do navegador e volte
          aqui.
        </p>
      )}
      {estado === "desligado" && (
        <button onClick={ligar} disabled={pendente} className="botao w-full">
          {pendente ? "Ligando..." : "Ligar aviso diário neste aparelho"}
        </button>
      )}
      {estado === "ligado" && (
        <div className="space-y-2">
          <p className="font-semibold text-verde">Aviso diário ligado neste aparelho.</p>
          <button onClick={desligar} disabled={pendente} className="botao-sec w-full">
            Desligar aviso neste aparelho
          </button>
        </div>
      )}
      {erro && <p className="text-vermelho">{erro}</p>}
    </div>
  );
}
