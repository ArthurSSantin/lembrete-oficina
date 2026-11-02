import { redirect } from "next/navigation";
import { FormOnboarding } from "@/components/FormOnboarding";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("oficinas").select("id").limit(1);
  if (data && data.length > 0) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="cartao w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">Sua oficina</h1>
        <p className="mb-6 text-sm text-tinta-2">
          Já vamos cadastrar os serviços mais comuns (troca de óleo, alinhamento, freios...).
          Você pode ajustar os prazos depois.
        </p>
        <FormOnboarding />
      </div>
    </main>
  );
}
