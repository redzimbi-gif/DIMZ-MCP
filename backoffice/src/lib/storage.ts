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

/** Upload une liste de fichiers vers Supabase Storage et retourne leurs chemins. */
export async function uploadFiles(prefix: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const db = createAdminClient();
  const paths: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_FILE_BYTES) continue;
    if (!isAllowedMime(file.type)) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (!error) paths.push(path);
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

/** Upload une image encodée en data URL (ex: signature capturée sur un canvas). */
export async function uploadDataUrlImage(prefix: string, dataUrl: string): Promise<string | null> {
  // \w+ ne capture pas le "+" de "svg+xml" : un data URL SVG ne matche pas
  // ce pattern et est déjà rejeté par construction, pas seulement par
  // DISALLOWED_MIME (qui ne s'applique qu'à uploadFiles).
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  const ext = contentType.split("/")[1] || "png";
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > MAX_FILE_BYTES) return null;

  const db = createAdminClient();
  const path = `${prefix}/${Date.now()}-signature.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  return error ? null : path;
}
