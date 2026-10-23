import { createClient } from "@/lib/supabase/server";
import { TopHeader } from "@/components/layout/TopHeader";
import { TodayQueue } from "@/components/hoje/TodayQueue";
import { Calendar, PhoneCall, CheckCircle2 } from "lucide-react";

export default async function HojePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Buscar leads que precisam de ação hoje
  // Prioridade: reuniao > retorno_agendado > lote/novo
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: rawLeads } = await supabase
    .from("leads")
    .select(`
      id,
      status,
      next_action,
      next_action_at,
      companies (
        id,
        name,
        phone_e164,
        email,
        city,
        niche,
        contacts (
          name,
          is_decision_maker
        )
      ),
      attempts (
        id
      )
    `)
    .in("status", ["novo", "no_lote", "retorno_agendado", "oportunidade"])
    .lte("next_action_at", endOfDay.toISOString())
    .order("next_action_at", { ascending: true })
    .limit(50);

  const items = (rawLeads || []).map((l: any) => {
    const comp = l.companies;
    const decisionMaker = comp?.contacts?.find((c: any) => c.is_decision_maker);
    const attemptsCount = l.attempts ? l.attempts.length : 0;

    let priorityLabel = "Lote da Semana";
    if (l.next_action === "reuniao") {
      priorityLabel = "Hora Marcada";
    } else if (l.status === "retorno_agendado") {
      priorityLabel = "Retorno Agendado";
    }

    return {
      id: l.id,
      leadId: l.id,
      companyName: comp?.name || "Empresa sem nome",
      phoneE164: comp?.phone_e164 || null,
      email: comp?.email || null,
      city: comp?.city || null,
      niche: comp?.niche || null,
      decisionMakerName: decisionMaker?.name || null,
      nextAction: l.next_action,
      nextActionAt: l.next_action_at,
      attemptsCount,
      status: l.status,
      priorityLabel,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <TopHeader userEmail={user?.email} />

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Topo do Dia */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {now.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fila de Prospecção do Dia</h1>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {items.length} para contatar
          </span>
        </div>

        <TodayQueue items={items} />
      </main>
    </div>
  );
}
