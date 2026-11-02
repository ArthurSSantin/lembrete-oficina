import { FormLogin } from "@/components/FormLogin";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="cartao w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Lembrete Oficina</h1>
        <p className="mb-6 text-sm text-gray-600">
          Lembre seus clientes da próxima revisão e traga eles de volta.
        </p>
        <FormLogin />
      </div>
    </main>
  );
}
