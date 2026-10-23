import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { GoogleMapsSearch } from "@/components/search/GoogleMapsSearch";

export default async function BuscarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Buscar histórico de jobs recentes
  const { data: recentJobs } = await supabase
    .from("search_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <GoogleMapsSearch recentJobs={recentJobs || []} />
      </main>
    </div>
  );
}
