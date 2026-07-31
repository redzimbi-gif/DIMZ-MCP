import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Récupère l'id du membre de l'équipe connecté (pour tracer qui fait quoi). */
export async function getActorId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function logActivity(params: {
  action: string;
  entiteType: string;
  entiteId?: string | null;
  description: string;
}) {
  const admin = createAdminClient();
  const acteur = await getActorId();
  await admin.from("activity_log").insert({
    action: params.action,
    entite_type: params.entiteType,
    entite_id: params.entiteId ?? null,
    description: params.description,
    acteur,
  });
}

export async function notifyStaff(params: {
  titre: string;
  message?: string;
  type?: string;
  lien?: string;
}) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    titre: params.titre,
    message: params.message ?? null,
    type: params.type ?? "info",
    lien: params.lien ?? null,
  });
}
