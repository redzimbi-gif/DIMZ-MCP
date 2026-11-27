"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";

function failArticle(id: string | null, error: unknown, fallback: string): never {
  console.error("Erreur actualités", error);
  const message = error instanceof Error ? error.message : fallback;
  const base = id ? `/actualites/${id}` : "/actualites/new";
  redirect(`${base}?error=${encodeURIComponent(message)}`);
}

export async function createArticle(formData: FormData) {
  const db = createAdminClient();

  const titre = String(formData.get("titre") || "").trim();
  const extrait = String(formData.get("extrait") || "").trim();
  const contenu = String(formData.get("contenu") || "").trim();
  const publie = formData.get("publie") === "on";
  const photo = formData.get("photo");

  if (!titre || !extrait || !contenu) {
    failArticle(null, null, "Titre, extrait et contenu sont obligatoires.");
  }

  let imagePath: string | null = null;
  try {
    if (photo instanceof File && photo.size > 0) {
      const [path] = await uploadFiles("articles", [photo]);
      imagePath = path ?? null;
    }
  } catch (error) {
    failArticle(null, error, "Erreur lors de l'envoi de la photo.");
  }

  const { data, error } = await db
    .from("articles")
    .insert({ titre, extrait, contenu, image_path: imagePath, publie })
    .select("id")
    .single();
  if (error || !data) failArticle(null, error, "Erreur lors de la création de l'article.");

  await logActivity({
    action: "article.cree",
    entiteType: "article",
    entiteId: data.id,
    description: `Article créé : ${titre}`,
  });

  revalidatePath("/actualites");
  redirect(`/actualites/${data.id}`);
}

export async function updateArticle(id: string, formData: FormData) {
  const db = createAdminClient();

  const titre = String(formData.get("titre") || "").trim();
  const extrait = String(formData.get("extrait") || "").trim();
  const contenu = String(formData.get("contenu") || "").trim();
  const publie = formData.get("publie") === "on";
  const supprimerPhoto = formData.get("supprimer_photo") === "on";
  const photo = formData.get("photo");

  if (!titre || !extrait || !contenu) {
    failArticle(id, null, "Titre, extrait et contenu sont obligatoires.");
  }

  const { data: existing } = await db.from("articles").select("image_path").eq("id", id).maybeSingle();
  let imagePath = existing?.image_path ?? null;

  try {
    if (photo instanceof File && photo.size > 0) {
      const [path] = await uploadFiles("articles", [photo]);
      if (path) {
        if (imagePath) await deleteFile(imagePath);
        imagePath = path;
      }
    } else if (supprimerPhoto && imagePath) {
      await deleteFile(imagePath);
      imagePath = null;
    }
  } catch (error) {
    failArticle(id, error, "Erreur lors de l'envoi de la photo.");
  }

  const { error } = await db
    .from("articles")
    .update({ titre, extrait, contenu, image_path: imagePath, publie })
    .eq("id", id);
  if (error) failArticle(id, error, "Erreur lors de la mise à jour de l'article.");

  await logActivity({
    action: "article.modifie",
    entiteType: "article",
    entiteId: id,
    description: `Article mis à jour : ${titre}`,
  });

  revalidatePath(`/actualites/${id}`);
  revalidatePath("/actualites");
}

export async function deleteArticle(id: string) {
  const db = createAdminClient();
  const { data: article } = await db.from("articles").select("titre, image_path").eq("id", id).maybeSingle();

  await db.from("articles").delete().eq("id", id);
  if (article?.image_path) await deleteFile(article.image_path);

  await logActivity({
    action: "article.supprime",
    entiteType: "article",
    entiteId: id,
    description: `Article supprimé : ${article?.titre ?? ""}`,
  });

  revalidatePath("/actualites");
  redirect("/actualites");
}
