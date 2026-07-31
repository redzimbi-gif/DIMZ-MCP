import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "dimz-files";

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
      upsert: false,
    });
    if (!error) paths.push(path);
  }

  return paths;
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
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, contentType, base64] = match;
  const ext = contentType.split("/")[1] || "png";
  const buffer = Buffer.from(base64, "base64");

  const db = createAdminClient();
  const path = `${prefix}/${Date.now()}-signature.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  return error ? null : path;
}
