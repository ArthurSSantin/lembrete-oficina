export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 text-tinta">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p>
        Este sistema guarda nome, WhatsApp, dados do veículo e histórico de serviços dos clientes
        da oficina, apenas para enviar lembretes de manutenção.
      </p>
      <p>
        Os dados de cada oficina ficam separados e só podem ser vistos pelos usuários dessa
        oficina. Nenhum dado é vendido ou compartilhado com terceiros.
      </p>
      <p>
        O cliente pode pedir a qualquer momento para não receber mais mensagens ou para ter seus
        dados apagados, falando diretamente com a oficina.
      </p>
      <p className="text-sm text-tinta-3">
        Texto base. Revise com um profissional antes de oferecer o sistema para outras oficinas.
      </p>
    </main>
  );
}
