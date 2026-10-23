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
}

/**
 * Executa o crawler de Google Places na Apify usando safeFetch.
 * Ator: compass/crawler-google-places
 * Endpoint síncrono otimizado: run-sync-get-dataset-items
 */
export async function runGooglePlacesCrawler(params: ApifySearchParams): Promise<GooglePlaceResult[]> {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error("APIFY_TOKEN não configurado no servidor.");
  }

  const query = `${params.niche} em ${params.city}`;
  const maxItems = params.maxResults || 20;

  const requestBody = {
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: maxItems,
    language: "pt-BR",
    countryCode: "BR",
    allPlacesNoSearchAction: "",
  };

  const syncUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  const response = await safeFetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    timeoutMs: 90000,
  });

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
}
