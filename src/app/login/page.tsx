import { FormLogin } from "@/components/FormLogin";

/** Adesivo de troca de óleo, o lembrete que todo motorista conhece. */
function Adesivo() {
  return (
    <div
      aria-hidden
      className="w-44 -rotate-3 rounded-md border-2 border-tinta bg-sinal p-3 font-display text-tinta shadow-[0_10px_24px_-6px_rgba(0,0,0,0.55)]"
    >
      <p className="text-sm font-semibold">Próxima troca</p>
      <p className="text-3xl leading-tight font-bold">45.000 km</p>
      <p className="text-sm font-semibold">ou em 15/05</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen md:grid md:grid-cols-2">
      <section className="flex flex-col justify-between gap-8 bg-asfalto px-6 pt-10 pb-8 text-white md:p-12">
        <p className="font-display text-xl font-bold">Lembrete Oficina</p>
        <div className="space-y-6">
          <Adesivo />
          <h1 className="max-w-md text-4xl leading-tight font-bold md:text-5xl">
            O adesivo no para-brisa ninguém lê. Sua mensagem no WhatsApp, sim.
          </h1>
          <p className="max-w-md text-white/75">
            Todo dia o sistema mostra quem precisa voltar para a troca de óleo, alinhamento ou
            freios, com a mensagem pronta para enviar.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <FormLogin />
        </div>
      </section>
    </main>
  );
}
