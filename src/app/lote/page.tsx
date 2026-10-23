import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { BatchPlanner } from "@/components/batch/BatchPlanner";
import { getMondayOfWeek, getBatchSuggestionsAction } from "@/server/actions/batch";

export default async function LotePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentMonday = await getMondayOfWeek();
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Sexta = 5, Sábado = 6, Domingo = 0
  const isFridayOrWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;

  // 1. Buscar se há lote anterior pendente de revisão
  const { data: pendingBatches } = await supabase
    .from("weekly_batches")
    .select(`
      id,
      week_start,
      status,
      batch_items (
        id,
        lead_id,
        destination,
        leads (
          id,
          cycle,
          status,
          companies (
            id,
            name,
            city,
            niche
          )
        )
      )
    `)
    .eq("owner_id", user?.id || "")
    .neq("status", "fechado")
    .lt("week_start", currentMonday)
    .order("week_start", { ascending: true })
    .limit(1);

  const pendingReviewBatch = pendingBatches && pendingBatches.length > 0 ? pendingBatches[0] : null;

  // 2. Buscar lote da semana atual
  const { data: currentBatches } = await supabase
    .from("weekly_batches")
    .select(`
      id,
      week_start,
      status,
      batch_items (
        id,
        lead_id,
        destination,
        leads (
          id,
          cycle,
          status,
          companies (
            id,
            name,
            city,
            niche
          )
        )
      )
    `)
    .eq("owner_id", user?.id || "")
    .eq("week_start", currentMonday)
    .limit(1);

  const currentBatch = currentBatches && currentBatches.length > 0 ? currentBatches[0] : null;

  // 3. Buscar sugestões se não houver lote aberto
  let suggestedLeads: any[] = [];
  let batchSize = 30;

  if (!currentBatch && !pendingReviewBatch) {
    const suggestionsResult = await getBatchSuggestionsAction();
    if (suggestionsResult.leads) {
      suggestedLeads = suggestionsResult.leads;
      batchSize = suggestionsResult.batchSize || 30;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <BatchPlanner
          currentBatch={currentBatch}
          pendingReviewBatch={pendingReviewBatch}
          suggestedLeads={suggestedLeads}
          batchSize={batchSize}
          todayIsFridayOrWeekend={isFridayOrWeekend}
        />
      </main>
    </div>
  );
}
