import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "dimz-files";

// Photos, vidéos d'inspection et documents (factures, contrats, cartes
// grises scannées) : trois familles de contenu, toutes légitimes ici. SVG
// est explicitement exclu du préfixe image/ malgré le joker : un SVG peut
// embarquer du <script>, contrairement aux autres formats image.
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_MIME_EXACT = ["application/pdf"];
const DISALLOWED_MIME = ["image/svg+xml"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo

function isAllowedMime(contentType: string): boolean {
  if (!contentType) return false;
  if (DISALLOWED_MIME.includes(contentType)) return false;
  if (ALLOWED_MIME_EXACT.includes(contentType)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => contentType.startsWith(prefix));
}

function formatMo(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
}

/**
 * Upload une liste de fichiers vers Supabase Storage et retourne leurs
 * chemins. Un fichier refusé (type ou taille) lève une erreur nommant le
 * fichier et la raison, plutôt que d'être ignoré en silence : le message
 * remonte tel quel jusqu'à l'utilisateur, via le try/catch de l'appelant
 * (redirection ?error=...) ou, à défaut, via la limite d'erreur générique
 * de l'app (error.tsx) qui affiche error.message.
 */
export async function uploadFiles(prefix: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  // Validation d'abord, upload ensuite : si un fichier du lot est refusé, on
  // ne veut pas avoir déjà envoyé les autres vers le bucket pour rien (ils
  // resteraient orphelins, l'action entière échouant de toute façon).
  const valid: File[] = [];
  const problems: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue; // champ fichier laissé vide, pas un refus
    if (file.size > MAX_FILE_BYTES) {
      problems.push(`« ${file.name} » (${formatMo(file.size)} Mo) dépasse la limite de ${formatMo(MAX_FILE_BYTES)} Mo`);
    } else if (!isAllowedMime(file.type)) {
      problems.push(`« ${file.name} » : type de fichier non autorisé (${file.type || "inconnu"})`);
    } else {
      valid.push(file);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Fichier(s) refusé(s) : ${problems.join(" ; ")}.`);
  }

  const db = createAdminClient();
  const paths: string[] = [];
  for (const file of valid) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw new Error(`Échec de l'envoi de « ${file.name} » : ${error.message}`);
    paths.push(path);
  }

  return paths;
}

/** Supprime un fichier du bucket de stockage. */
export async function deleteFile(path: string): Promise<void> {
  const db = createAdminClient();
  await db.storage.from(BUCKET).remove([path]);
}

/** Télécharge le contenu binaire d'un fichier (pour le joindre à un email). */
export async function downloadFile(path: string): Promise<Buffer | null> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Génère des URLs signées temporaires (1h) pour afficher des fichiers privés. */
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const db = createAdminClient();
  const { data } = await db.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const result: Record<string, string> = {};
  (data ?? []).forEach((entry) => {
    if (entry.path && entry.signedUrl) result[entry.path] = entry.signedUrl;
  });
  return result;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const map = await getSignedUrls([path]);
  return map[path] ?? null;
}

/**
 * Upload une image encodée en data URL (ex: signature capturée sur un
 * canvas). Lève une erreur descriptive en cas de refus plutôt que de
 * renvoyer null en silence, même logique que uploadFiles ci-dessus.
 */
export async function uploadDataUrlImage(prefix: string, dataUrl: string): Promise<string> {
  // \w+ ne capture pas le "+" de "svg+xml" : un data URL SVG ne matche pas
  // ce pattern et est déjà rejeté par construction, pas seulement par
  // DISALLOWED_MIME (qui ne s'applique qu'à uploadFiles).
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Image invalide.");
  const [, contentType, base64] = match;
  const ext = contentType.split("/")[1] || "png";
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0) throw new Error("Image vide.");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(`Image trop volumineuse (${formatMo(buffer.length)} Mo, limite ${formatMo(MAX_FILE_BYTES)} Mo).`);
  }

  const db = createAdminClient();
  const path = `${prefix}/${Date.now()}-signature.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Échec de l'envoi de l'image : ${error.message}`);
  return path;
}
