import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Notification push sur le téléphone de l'équipe via ntfy.sh (gratuit, sans
 * compte : il suffit de s'abonner au topic NTFY_TOPIC depuis l'appli ntfy).
 * Le topic fait office de secret — n'importe qui le connaissant peut
 * s'abonner ou publier dessus, d'où un nom long et aléatoire en variable
 * d'environnement plutôt qu'en dur ici. N'échoue jamais bruyamment : une
 * notif push qui échoue ne doit jamais casser le flux qui l'a déclenchée.
 */
async function sendPushNotification(params: { title: string; message: string; link?: string | null }) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  try {
    // Publication via le corps JSON plutôt que des en-têtes HTTP : les
    // en-têtes n'acceptent que du Latin-1 (ISO-8859-1) et rejetteraient tout
    // titre ou message contenant un tiret cadratin, une emoji ou un caractère
    // hors de cette plage — silencieusement fatal pour une simple notif.
    await fetch("https://ntfy.sh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title: params.title,
        message: params.message,
        priority: 4,
        ...(params.link
          ? { click: `${process.env.NEXT_PUBLIC_APP_URL || "https://back.dimz-copilote.com"}${params.link}` }
          : {}),
      }),
    });
  } catch (err) {
    console.error("Échec envoi notification push:", err);
  }
}

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

  await sendPushNotification({
    title: params.titre,
    message: params.message || params.titre,
    link: params.lien,
  });
}
