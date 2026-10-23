import { safeFetch } from "@/lib/safe-fetch";
import { normalizePhoneE164 } from "@/lib/phone";

export interface GooglePlaceResult {
  placeId: string;
  title: string;
  phone?: string | null;
  phoneE164?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  categoryName?: string | null;
  totalScore?: number | null;
  reviewsCount?: number | null;
  hasWebsite?: boolean;
}

export interface ApifySearchParams {
  niche: string;
  city: string;
  maxResults?: number;
  onlyWithoutWebsite?: boolean;
  tokensPool?: string[];
}

/**
 * Executa o crawler de Google Places na Apify usando safeFetch.
 * Suporta pool de múltiplos tokens com rotação e failover automático se uma conta esgotar créditos.
 */
export async function runGooglePlacesCrawler(params: ApifySearchParams): Promise<GooglePlaceResult[]> {
  // Lista de tokens: primeiro os do banco de dados, depois a variável de ambiente como fallback
  const tokens: string[] = [];

  if (params.tokensPool && params.tokensPool.length > 0) {
    tokens.push(...params.tokensPool.filter((t) => t && t.trim()));
  }

  if (process.env.APIFY_TOKEN && !tokens.includes(process.env.APIFY_TOKEN)) {
    tokens.push(process.env.APIFY_TOKEN);
  }

  if (tokens.length === 0) {
    throw new Error("Nenhum token da Apify configurado. Cadastre pelo menos uma chave em Configurações > Integrações ou no .env.local.");
  }

  const query = `${params.niche} em ${params.city}`;
  const maxItems = Math.min(Math.max(params.maxResults || 20, 1), 100);

  const requestBody = {
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: maxItems,
    language: "pt-BR",
    countryCode: "BR",
    allPlacesNoSearchAction: "",
  };

  let lastError: Error | null = null;

  // Itera sobre o pool de tokens até obter sucesso
  for (let i = 0; i < tokens.length; i++) {
    const currentToken = tokens[i];
    const syncUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(currentToken)}`;

    try {
      const response = await safeFetch(syncUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        timeoutMs: 120000,
      });

      // Se estourou limite de cota (402 Payment Required ou 429 Too Many Requests), passa para o próximo token
      if (response.status === 402 || response.status === 429) {
        console.warn(`Token Apify #${i + 1} sem créditos ou limite excedido. Tentando o próximo token do pool...`);
        lastError = new Error(`Token #${i + 1} sem créditos.`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API do Apify (${response.status}): ${errorText}`);
      }

      const rawItems: any[] = await response.json();

      return (rawItems || [])
        .map((item) => {
          const rawPhone = item.phone || item.phoneUnformatted || null;
          const phoneE164 = rawPhone ? normalizePhoneE164(rawPhone) : null;
          const website = item.website || item.url || null;
          const hasWebsite = !!(website && website.trim() && !website.includes("google.com/maps"));

          return {
            placeId: item.placeId || item.id || `place_${Math.random().toString(36).substring(7)}`,
            title: item.title || item.name || "Sem nome",
            phone: rawPhone,
            phoneE164,
            website: hasWebsite ? website : null,
            address: item.address || item.street || null,
            city: item.city || params.city,
            state: item.state || null,
            categoryName: item.categoryName || params.niche,
            totalScore: typeof item.totalScore === "number" ? item.totalScore : null,
            reviewsCount: typeof item.reviewsCount === "number" ? item.reviewsCount : null,
            hasWebsite,
          };
        })
        .filter((item) => {
          if (params.onlyWithoutWebsite && item.hasWebsite) {
            return false;
          }
          return true;
        });
    } catch (err: any) {
      lastError = err;
      // Se ainda houver outros tokens na lista, tenta o próximo
      if (i < tokens.length - 1) {
        console.warn(`Erro com token #${i + 1}. Tentando próximo token...`, err.message);
        continue;
      }
    }
  }

  throw lastError || new Error("Falha ao consultar Apify com todos os tokens disponíveis.");
}
