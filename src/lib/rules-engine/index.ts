export type Channel = "ligacao" | "email" | "whatsapp" | "sms" | "reuniao";
export type NextAction = "ligar" | "email" | "whatsapp" | "reuniao" | "nenhuma";
export type Outcome =
  | "nao_atendeu"
  | "caixa_postal"
  | "numero_invalido"
  | "secretaria_barrou"
  | "decisor_interesse"
  | "decisor_sem_interesse"
  | "decisor_sem_decisao"
  | "pediu_material"
  | "autorizou_whatsapp"
  | "enviado"
  | "respondeu"
  | "opt_out";

export interface RuleCalculationInput {
  channel: Channel;
  outcome: Outcome;
  occurrenceCount?: number; // Ex: quantas vezes consecutivas não atendeu
  occurredAt?: Date;
}

export interface RuleCalculationResult {
  nextAction: NextAction;
  suggestedDate: Date;
  suggestedActionLabel: string;
  resultingStatus?: "novo" | "no_lote" | "retorno_agendado" | "oportunidade" | "descartado";
  requiresNotes?: boolean;
  requiresDiscardReason?: boolean;
}

/**
 * Adiciona dias a uma data pulando finais de semana (sábado e domingo).
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

/**
 * Alterna período do dia:
 * Se foi de manhã (< 12h) -> sugere tarde (14:30)
 * Se foi à tarde (>= 12h) -> sugere manhã (10:00)
 */
export function adjustPeriod(date: Date, switchPeriod: boolean, referenceDate: Date): Date {
  const result = new Date(date);
  if (!switchPeriod) {
    return result;
  }

  const hour = referenceDate.getHours();
  if (hour < 12) {
    // Manhã -> Tarde
    result.setHours(14, 30, 0, 0);
  } else {
    // Tarde -> Manhã
    result.setHours(10, 0, 0, 0);
  }
  return result;
}

/**
 * Calcula a próxima ação recomendada e data ideal com base nas regras de negócio da Seção 1.3.
 */
export function calculateNextAction(input: RuleCalculationInput): RuleCalculationResult {
  const refDate = input.occurredAt || new Date();
  const occurrence = input.occurrenceCount || 1;

  switch (input.outcome) {
    case "nao_atendeu":
      if (occurrence >= 2) {
        // 2ª tentativa sem atender: Enviar e-mail hoje
        const today = new Date(refDate);
        today.setHours(16, 0, 0, 0);
        return {
          nextAction: "email",
          suggestedDate: today,
          suggestedActionLabel: "Enviar e-mail hoje (2ª ligação sem atendimento)",
        };
      } else {
        // 1ª tentativa: Ligar amanhã alternando período (manhã <-> tarde)
        const nextDay = addBusinessDays(refDate, 1);
        const adjusted = adjustPeriod(nextDay, true, refDate);
        return {
          nextAction: "ligar",
          suggestedDate: adjusted,
          suggestedActionLabel: "Ligar no próximo dia útil em outro período (manhã ↔ tarde)",
        };
      }

    case "caixa_postal": {
      const nextDay = addBusinessDays(refDate, 1);
      nextDay.setHours(refDate.getHours() || 10, 0, 0, 0);
      return {
        nextAction: "ligar",
        suggestedDate: nextDay,
        suggestedActionLabel: "Ligar amanhã (caiu na caixa postal)",
      };
    }

    case "secretaria_barrou": {
      const inTwoDays = addBusinessDays(refDate, 2);
      inTwoDays.setHours(10, 30, 0, 0);
      return {
        nextAction: "ligar",
        suggestedDate: inTwoDays,
        suggestedActionLabel: "Ligar em 2 dias (secretária barrou - pesquisar/anotar decisor)",
        requiresNotes: true,
      };
    }

    case "numero_invalido": {
      const today = new Date(refDate);
      today.setHours(15, 0, 0, 0);
      return {
        nextAction: "email",
        suggestedDate: today,
        suggestedActionLabel: "Marcar telefone inválido e tentar contato por e-mail hoje",
      };
    }

    case "pediu_material": {
      const today = new Date(refDate);
      return {
        nextAction: "email",
        suggestedDate: today,
        suggestedActionLabel: "Enviar e-mail com modelo de apresentação hoje",
      };
    }

    case "autorizou_whatsapp": {
      const today = new Date(refDate);
      return {
        nextAction: "whatsapp",
        suggestedDate: today,
        suggestedActionLabel: "Enviar mensagem por WhatsApp hoje (opt-in registrado)",
      };
    }

    case "decisor_sem_decisao": {
      // Retorno agendado: padrão de hoje + 7 dias se o decisor não propôs data
      const inSevenDays = addBusinessDays(refDate, 5); // 5 dias úteis ~ 7 dias corridos
      inSevenDays.setHours(10, 0, 0, 0);
      return {
        nextAction: "ligar",
        suggestedDate: inSevenDays,
        suggestedActionLabel: "Retorno agendado com decisor",
        resultingStatus: "retorno_agendado",
      };
    }

    case "decisor_interesse": {
      const tomorrow = addBusinessDays(refDate, 1);
      tomorrow.setHours(14, 0, 0, 0);
      return {
        nextAction: "reuniao",
        suggestedDate: tomorrow,
        suggestedActionLabel: "Oportunidade gerada! Agendar reunião com o decisor",
        resultingStatus: "oportunidade",
      };
    }

    case "decisor_sem_interesse": {
      return {
        nextAction: "nenhuma",
        suggestedDate: refDate,
        suggestedActionLabel: "Descartado pelo decisor",
        resultingStatus: "descartado",
        requiresDiscardReason: true,
      };
    }

    case "enviado": {
      const inTwoDays = addBusinessDays(refDate, 2);
      inTwoDays.setHours(14, 0, 0, 0);
      return {
        nextAction: "ligar",
        suggestedDate: inTwoDays,
        suggestedActionLabel: "Mensagem enviada. Ligar em 2 dias para follow-up",
      };
    }

    case "opt_out": {
      return {
        nextAction: "nenhuma",
        suggestedDate: refDate,
        suggestedActionLabel: "Opt-out registrado: contatos bloqueados",
        resultingStatus: "descartado",
        requiresDiscardReason: true,
      };
    }

    default: {
      const inTwoDays = addBusinessDays(refDate, 2);
      return {
        nextAction: "ligar",
        suggestedDate: inTwoDays,
        suggestedActionLabel: "Ligar em 2 dias úteis",
      };
    }
  }
}
