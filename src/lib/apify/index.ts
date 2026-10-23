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
 */
export async function runGooglePlacesCrawler(params: ApifySearchParams): Promise<GooglePlaceResult[]> {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    // Se não houver token configurado, retorna dados de demonstração com base na busca
    return generateMockPlaces(params);
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

  const actorUrl = `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${encodeURIComponent(token)}&waitForFinish=120`;

  const runResponse = await safeFetch(actorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    timeoutMs: 120000,
  });

  if (!runResponse.ok) {
    const errorText = await runResponse.text();
    throw new Error(`Erro na API do Apify (${runResponse.status}): ${errorText}`);
  }

  const runData = await runResponse.json();
  const datasetId = runData.data?.defaultDatasetId;

  if (!datasetId) {
    throw new Error("Dataset ID não retornado pelo Apify.");
  }

  // Buscar itens do dataset
  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}&format=json`;
  const itemsResponse = await safeFetch(datasetUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    timeoutMs: 30000,
  });

  if (!itemsResponse.ok) {
    throw new Error(`Erro ao baixar resultados do dataset Apify: ${itemsResponse.statusText}`);
  }

  const rawItems: any[] = await itemsResponse.json();

  return rawItems
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

function generateMockPlaces(params: ApifySearchParams): GooglePlaceResult[] {
  const cities = [params.city];
  const list: GooglePlaceResult[] = [];
  const baseName = params.niche.replace(/s$/i, "");

  for (let i = 1; i <= 6; i++) {
    const hasWebsite = i % 2 === 0;
    list.push({
      placeId: `ChIJ_mock_google_id_${params.niche}_${i}`,
      title: `${baseName} ${["Elite", "Excelência", "Aliança", "Premium", "Central", "Regional"][i - 1]}`,
      phone: `(19) 9${8000 + i * 111}-${1000 + i * 222}`,
      phoneE164: `+55199${8000 + i * 111}${1000 + i * 222}`,
      website: hasWebsite ? `https://${baseName.toLowerCase().replace(/\s+/g, "")}${i}.com.br` : null,
      address: `Av. Principal, ${100 * i} - Centro`,
      city: params.city,
      state: "SP",
      categoryName: params.niche,
      totalScore: 4.2 + (i % 8) * 0.1,
      reviewsCount: 12 + i * 8,
      hasWebsite,
    });
  }

  if (params.onlyWithoutWebsite) {
    return list.filter((item) => !item.hasWebsite);
  }

  return list;
}
