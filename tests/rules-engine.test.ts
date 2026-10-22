import { describe, it, expect } from "vitest";
import { calculateNextAction } from "@/lib/rules-engine";

describe("Motor de Regras de Próxima Ação (CF Leads)", () => {
  it("deve sugerir ligar amanhã alternando período na 1ª tentativa sem atendimento", () => {
    // 09:30 da manhã (sexta-feira não conta para amanhã ser sábado, vamos fixar numa terça)
    const tuesdayMorning = new Date("2026-10-20T09:30:00Z");
    const result = calculateNextAction({
      channel: "ligacao",
      outcome: "nao_atendeu",
      occurrenceCount: 1,
      occurredAt: tuesdayMorning,
    });

    expect(result.nextAction).toBe("ligar");
    expect(result.suggestedDate.getDay()).toBe(3); // Quarta-feira
    expect(result.suggestedDate.getHours()).toBe(14); // Período da tarde
  });

  it("deve sugerir enviar e-mail hoje na 2ª tentativa sem atendimento", () => {
    const monday = new Date("2026-10-19T10:00:00Z");
    const result = calculateNextAction({
      channel: "ligacao",
      outcome: "nao_atendeu",
      occurrenceCount: 2,
      occurredAt: monday,
    });

    expect(result.nextAction).toBe("email");
    expect(result.suggestedDate.getDate()).toBe(monday.getDate());
  });

  it("deve marcar status de oportunidade quando decisor demonstrar interesse", () => {
    const result = calculateNextAction({
      channel: "ligacao",
      outcome: "decisor_interesse",
    });

    expect(result.nextAction).toBe("reuniao");
    expect(result.resultingStatus).toBe("oportunidade");
  });

  it("deve exigir motivo de descarte quando decisor não demonstrar interesse", () => {
    const result = calculateNextAction({
      channel: "ligacao",
      outcome: "decisor_sem_interesse",
    });

    expect(result.nextAction).toBe("nenhuma");
    expect(result.resultingStatus).toBe("descartado");
    expect(result.requiresDiscardReason).toBe(true);
  });

  it("deve sugerir retorno agendado quando decisor não tiver decisão no momento", () => {
    const result = calculateNextAction({
      channel: "ligacao",
      outcome: "decisor_sem_decisao",
    });

    expect(result.nextAction).toBe("ligar");
    expect(result.resultingStatus).toBe("retorno_agendado");
  });
});
