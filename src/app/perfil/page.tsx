import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { ProfileEditor } from "@/components/perfil/ProfileEditor";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Buscar perfil e organização
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .eq("id", user.id)
    .single();

  const org = profile?.organizations as any;
  const userMeta = user.user_metadata || {};

  const initialData = {
    fullName: profile?.full_name || userMeta.full_name || "",
    companyName: org?.name || userMeta.company_name || "Agência C&F — Correia e Fagundes",
    email: user.email || "",
    phone: (profile as any)?.phone || userMeta.phone || "",
    companyAddress: org?.address || userMeta.company_address || "",
    role: profile?.role === "admin" ? "Administrador" : "Consultor",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user.email} />

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Meu Perfil</h1>
          <p className="text-xs text-slate-500">
            Gerencie suas informações cadastrais, dados da empresa e credenciais de acesso
          </p>
        </div>

        <ProfileEditor initialData={initialData} />
      </main>
    </div>
  );
}
