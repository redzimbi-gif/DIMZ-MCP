import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "dimz-files";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 an — contenu permanent, autant réutiliser la même URL longtemps
const CACHE_MARGIN_SECONDS = 60;

type CacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, CacheEntry>();

/** Upload une liste de fichiers vers Supabase Storage et retourne leurs chemins. */
export async function uploadFiles(prefix: string, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const db = createAdminClient();
  const paths: string[] = [];

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${prefix}/${Date.now()}-${safeName}`;
    const { error } = await db.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      cacheControl: "604800",
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
  signedUrlCache.delete(path);
}

/** Télécharge le contenu binaire d'un fichier (pour le joindre à un email). */
export async function downloadFile(path: string): Promise<Buffer | null> {
  const db = createAdminClient();
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Génère des URLs signées temporaires (1h) pour afficher des fichiers privés, en réutilisant le cache tant qu'il est valide. */
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const now = Date.now();
  const result: Record<string, string> = {};
  const toFetch: string[] = [];

  for (const path of paths) {
    const cached = signedUrlCache.get(path);
    if (cached && cached.expiresAt > now) {
      result[path] = cached.url;
    } else {
      toFetch.push(path);
    }
  }

  if (toFetch.length > 0) {
    const db = createAdminClient();
    const { data } = await db.storage.from(BUCKET).createSignedUrls(toFetch, SIGNED_URL_TTL);
    const expiresAt = now + (SIGNED_URL_TTL - CACHE_MARGIN_SECONDS) * 1000;
    (data ?? []).forEach((entry) => {
      if (entry.path && entry.signedUrl) {
        result[entry.path] = entry.signedUrl;
        signedUrlCache.set(entry.path, { url: entry.signedUrl, expiresAt });
      }
    });
  }

  return result;
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const map = await getSignedUrls([path]);
  return map[path] ?? null;
}

/** Upload une image encodée en data URL (ex: signature capturée sur un canvas). */
export async function uploadDataUrlImage(prefix: string, dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  const ext = contentType.split("/")[1] || "png";
  const buffer = Buffer.from(base64, "base64");

  const db = createAdminClient();
  const path = `${prefix}/${Date.now()}-signature.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    cacheControl: "604800",
    upsert: false,
  });
  return error ? null : path;
}
