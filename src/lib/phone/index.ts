import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normaliza um número de telefone para o padrão internacional E.164 (+5519999999999).
 * Se o número for inválido, retorna null.
 */
export function normalizePhoneE164(phone: string, defaultCountry = "BR"): string | null {
  if (!phone || typeof phone !== "string") return null;

  const cleaned = phone.trim();
  if (!cleaned) return null;

  try {
    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry as any);
    if (parsed && parsed.isValid()) {
      return parsed.format("E.164");
    }
  } catch {
    return null;
  }

  // Fallback para números sem código de país se começar com DDD brasileiro
  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    const withCountry = `+55${digitsOnly}`;
    const parsedFallback = parsePhoneNumberFromString(withCountry);
    if (parsedFallback && parsedFallback.isValid()) {
      return parsedFallback.format("E.164");
    }
  }

  return null;
}

/**
 * Formata um telefone E.164 para exibição amigável no Brasil (ex: (19) 99999-9999).
 */
export function formatPhoneDisplay(phoneE164: string | null | undefined): string {
  if (!phoneE164) return "Sem telefone";

  try {
    const parsed = parsePhoneNumberFromString(phoneE164);
    if (parsed) {
      return parsed.formatNational();
    }
  } catch {
    // Retorna o valor original se falhar
  }

  return phoneE164;
}

/**
 * Retorna o link 'tel:' para acionar o discador nativo do celular.
 */
export function getTelLink(phoneE164: string | null | undefined): string | null {
  if (!phoneE164) return null;
  return `tel:${phoneE164}`;
}

/**
 * Retorna o link para envio direto no WhatsApp com mensagem opcional.
 */
export function getWhatsAppLink(phoneE164: string | null | undefined, message?: string): string | null {
  if (!phoneE164) return null;
  const digits = phoneE164.replace(/\D/g, "");
  if (!digits) return null;

  const baseUrl = `https://wa.me/${digits}`;
  if (message && message.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
  }
  return baseUrl;
}
