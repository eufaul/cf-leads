import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";

export default async function PipelinePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: leads } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      cycle,
      next_action,
      next_action_at,
      companies (
        id,
        name,
        phone_e164,
        city,
        niche,
        google_rating
      ),
      contacts (
        name,
        is_decision_maker
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline de Prospecção</h1>
          <p className="text-xs text-slate-500">Fluxo visual com movimentação rápida entre estados</p>
        </div>

        <KanbanBoard initialLeads={(leads as any) || []} />
      </main>
    </div>
  );
}
