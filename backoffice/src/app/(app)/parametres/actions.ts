"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

function text(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

export async function updateEntrepriseInfo(formData: FormData) {
  const db = createAdminClient();

  await db
    .from("entreprise_info")
    .update({
      nom_dirigeant: text(formData, "nom_dirigeant"),
      siret: text(formData, "siret"),
      adresse: text(formData, "adresse"),
      ville: text(formData, "ville") ?? "Lyon",
      email: text(formData, "email"),
      telephone: text(formData, "telephone"),
      mediateur_nom: text(formData, "mediateur_nom"),
      mediateur_adresse: text(formData, "mediateur_adresse"),
      mediateur_site: text(formData, "mediateur_site"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  revalidatePath("/parametres");
}
