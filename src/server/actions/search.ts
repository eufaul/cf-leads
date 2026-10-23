"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { runGooglePlacesCrawler, GooglePlaceResult } from "@/lib/apify";
import { checkForDuplicates } from "@/lib/dedup";
import { revalidatePath } from "next/cache";

const searchSchema = z.object({
  niche: z.string().min(2, "Informe o nicho de prospecção"),
  city: z.string().min(2, "Informe a cidade ou região"),
  onlyWithoutWebsite: z.boolean().default(false),
});

export interface ProcessedSearchResult extends GooglePlaceResult {
  isDuplicate: boolean;
  duplicateReason?: string;
}

export async function searchGooglePlacesAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  const raw = {
    niche: formData.get("niche") as string,
    city: formData.get("city") as string,
    onlyWithoutWebsite: formData.get("onlyWithoutWebsite") === "on",
  };

  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // 1. Criar registro inicial do job
  const { data: job, error: jobError } = await supabase
    .from("search_jobs")
    .insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      niche: parsed.data.niche,
      city: parsed.data.city,
      filters: { onlyWithoutWebsite: parsed.data.onlyWithoutWebsite },
      status: "rodando",
    })
    .select()
    .single();

  if (jobError || !job) {
    return { error: `Erro ao iniciar busca: ${jobError?.message}` };
  }

  try {
    // 2. Executar o crawler
    const rawPlaces = await runGooglePlacesCrawler({
      niche: parsed.data.niche,
      city: parsed.data.city,
      onlyWithoutWebsite: parsed.data.onlyWithoutWebsite,
    });

    // 3. Filtragem de duplicatas e empresas bloqueadas por hash
    const processedResults: ProcessedSearchResult[] = [];

    for (const place of rawPlaces) {
      const dupCheck = await checkForDuplicates(supabase, {
        organizationId: profile.organization_id,
        phone: place.phoneE164,
        website: place.website,
        googlePlaceId: place.placeId,
      });

      processedResults.push({
        ...place,
        isDuplicate: dupCheck.isDuplicate,
        duplicateReason: dupCheck.reason,
      });
    }

    // 4. Atualizar job com os resultados
    await supabase
      .from("search_jobs")
      .update({
        status: "concluido",
        results: processedResults,
        results_count: processedResults.filter((p) => !p.isDuplicate).length,
      })
      .eq("id", job.id);

    revalidatePath("/buscar");
    return { success: true, jobId: job.id, results: processedResults };
  } catch (err: any) {
    await supabase
      .from("search_jobs")
      .update({ status: "erro" })
      .eq("id", job.id);

    return { error: `Falha na busca do Google Maps: ${err.message}` };
  }
}

const importSchema = z.object({
  jobId: z.string().uuid(),
  places: z.array(
    z.object({
      placeId: z.string(),
      title: z.string(),
      phoneE164: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      categoryName: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      totalScore: z.number().nullable().optional(),
      reviewsCount: z.number().nullable().optional(),
    })
  ),
});

export async function importGooglePlacesLeadsAction(input: z.infer<typeof importSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Perfil não encontrado." };

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  let importedCount = 0;

  for (const place of parsed.data.places) {
    // 1. Inserir empresa
    const { data: company, error: compError } = await supabase
      .from("companies")
      .insert({
        organization_id: profile.organization_id,
        name: place.title,
        phone_e164: place.phoneE164,
        website: place.website,
        city: place.city,
        niche: place.categoryName,
        address: place.address,
        google_place_id: place.placeId,
        google_rating: place.totalScore,
        google_reviews: place.reviewsCount,
        source: "google_maps",
      })
      .select()
      .single();

    if (compError || !company) {
      continue;
    }

    // 2. Inserir lead vinculado
    const { error: leadError } = await supabase.from("leads").insert({
      organization_id: profile.organization_id,
      company_id: company.id,
      owner_id: user.id,
      status: "novo",
      cycle: 1,
      next_action: "ligar",
      next_action_at: new Date().toISOString(),
    });

    if (!leadError) {
      importedCount++;
    }
  }

  // 3. Trilha de auditoria
  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "import_google_places",
    entity: "search_jobs",
    entity_id: parsed.data.jobId,
    metadata: { imported_count: importedCount },
  });

  revalidatePath("/leads");
  revalidatePath("/lote");
  revalidatePath("/hoje");
  return { success: true, importedCount };
}
