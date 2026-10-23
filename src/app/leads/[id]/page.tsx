import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { LeadDetailView } from "@/components/leads/LeadDetailView";
import { notFound } from "next/navigation";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*, companies(*, contacts(*))")
    .eq("id", id)
    .single();

  if (!lead || !lead.companies) {
    notFound();
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*")
    .eq("lead_id", id)
    .order("occurred_at", { ascending: false });

  const contacts = (lead.companies as any)?.contacts || [];
  const decisionMaker = contacts.find((c: any) => c.is_decision_maker) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader />

      <main className="max-w-2xl mx-auto p-4">
        <LeadDetailView
          lead={lead}
          company={lead.companies}
          contacts={contacts}
          attempts={attempts || []}
          decisionMaker={decisionMaker}
        />
      </main>
    </div>
  );
}
