import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhoneE164 } from "../phone";

/**
 * Calcula o hash HMAC-SHA256 seguro de um valor usando o DEDUP_PEPPER.
 */
export function calculateDedupHash(value: string, pepper?: string): string {
  const secret = pepper || process.env.DEDUP_PEPPER || "default-pepper-cfleads-2026";
  const normalized = value.toLowerCase().trim();
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

/**
 * Extrai o domínio limpo a partir de uma URL ou string de website.
 */
export function extractDomain(website: string | null | undefined): string | null {
  if (!website || typeof website !== "string") return null;

  try {
    let clean = website.trim().toLowerCase();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    const url = new URL(clean);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Normaliza CNPJ mantendo apenas dígitos.
 */
export function normalizeCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

export interface DuplicateCheckParams {
  phone?: string | null;
  cnpj?: string | null;
  website?: string | null;
  googlePlaceId?: string | null;
  organizationId: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  field?: "phone" | "cnpj" | "domain" | "place_id";
  companyName?: string;
}

/**
 * Verifica se a empresa ou lead já existe no banco ou se está na lista de bloqueio de duplicatas.
 */
export async function checkForDuplicates(
  supabase: SupabaseClient,
  params: DuplicateCheckParams
): Promise<DuplicateCheckResult> {
  const pepper = process.env.DEDUP_PEPPER;

  // 1. Checar Telefone
  const normalizedPhone = params.phone ? normalizePhoneE164(params.phone) : null;
  if (normalizedPhone) {
    // 1.1 Checar empresas existentes
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("name")
      .eq("organization_id", params.organizationId)
      .eq("phone_e164", normalizedPhone)
      .limit(1)
      .maybeSingle();

    if (existingCompany) {
      return {
        isDuplicate: true,
        reason: `Telefone já cadastrado para a empresa "${existingCompany.name}".`,
        field: "phone",
        companyName: existingCompany.name,
      };
    }

    // 1.2 Checar lista de bloqueio definitiva por hash
    const phoneHash = calculateDedupHash(normalizedPhone, pepper);
    const { data: blockedPhone } = await supabase
      .from("dedup_blocklist")
      .select("reason")
      .eq("organization_id", params.organizationId)
      .eq("kind", "phone")
      .eq("value_hash", phoneHash)
      .limit(1)
      .maybeSingle();

    if (blockedPhone) {
      return {
        isDuplicate: true,
        reason: `Telefone bloqueado na lista de encerramento definitivo (${blockedPhone.reason || "descarte definitivo"}).`,
        field: "phone",
      };
    }
  }

  // 2. Checar CNPJ
  const cleanCnpj = normalizeCnpj(params.cnpj);
  if (cleanCnpj) {
    const { data: existingCnpj } = await supabase
      .from("companies")
      .select("name")
      .eq("organization_id", params.organizationId)
      .eq("cnpj", cleanCnpj)
      .limit(1)
      .maybeSingle();

    if (existingCnpj) {
      return {
        isDuplicate: true,
        reason: `CNPJ já cadastrado para a empresa "${existingCnpj.name}".`,
        field: "cnpj",
        companyName: existingCnpj.name,
      };
    }

    const cnpjHash = calculateDedupHash(cleanCnpj, pepper);
    const { data: blockedCnpj } = await supabase
      .from("dedup_blocklist")
      .select("reason")
      .eq("organization_id", params.organizationId)
      .eq("kind", "cnpj")
      .eq("value_hash", cnpjHash)
      .limit(1)
      .maybeSingle();

    if (blockedCnpj) {
      return {
        isDuplicate: true,
        reason: `CNPJ bloqueado na lista de encerramento definitivo.`,
        field: "cnpj",
      };
    }
  }

  // 3. Checar Domínio / Website
  const domain = extractDomain(params.website);
  if (domain) {
    const domainHash = calculateDedupHash(domain, pepper);
    const { data: blockedDomain } = await supabase
      .from("dedup_blocklist")
      .select("reason")
      .eq("organization_id", params.organizationId)
      .eq("kind", "domain")
      .eq("value_hash", domainHash)
      .limit(1)
      .maybeSingle();

    if (blockedDomain) {
      return {
        isDuplicate: true,
        reason: `Domínio de site "${domain}" bloqueado por encerramento definitivo anterior.`,
        field: "domain",
      };
    }
  }

  // 4. Checar Google Place ID
  if (params.googlePlaceId && params.googlePlaceId.trim()) {
    const cleanPlaceId = params.googlePlaceId.trim();
    const { data: existingPlace } = await supabase
      .from("companies")
      .select("name")
      .eq("organization_id", params.organizationId)
      .eq("google_place_id", cleanPlaceId)
      .limit(1)
      .maybeSingle();

    if (existingPlace) {
      return {
        isDuplicate: true,
        reason: `Empresa já cadastrada via Google Maps ("${existingPlace.name}").`,
        field: "place_id",
        companyName: existingPlace.name,
      };
    }

    const placeHash = calculateDedupHash(cleanPlaceId, pepper);
    const { data: blockedPlace } = await supabase
      .from("dedup_blocklist")
      .select("reason")
      .eq("organization_id", params.organizationId)
      .eq("kind", "place_id")
      .eq("value_hash", placeHash)
      .limit(1)
      .maybeSingle();

    if (blockedPlace) {
      return {
        isDuplicate: true,
        reason: `Registro de Google Maps bloqueado por encerramento definitivo anterior.`,
        field: "place_id",
      };
    }
  }

  return { isDuplicate: false };
}
