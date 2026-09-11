"use client";

import { useId, useState, type ChangeEvent } from "react";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
// En dessous de ce poids et de cette taille, la photo est déjà légère :
// pas la peine de la recompresser (juste un risque de perte de qualité
// pour un gain quasi nul).
const SKIP_BELOW_BYTES = 400 * 1024;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    // La recompression n'a pas aidé (photo déjà bien compressée) : on garde l'original.
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Format non décodable par le navigateur (HEIC sur certains Chrome, etc.)
    // ou autre souci : on part sur le fichier d'origine plutôt que de bloquer l'envoi.
    return file;
  }
}

/**
 * Remplace un <input type="file"> classique : redimensionne et compresse
 * chaque image côté navigateur avant l'envoi (réduit le stockage ET
 * l'egress Supabase à chaque consultation ultérieure), sans rien changer
 * au formulaire qui l'entoure — la Server Action reçoit toujours un
 * FormData standard, avec les fichiers déjà allégés.
 * Les fichiers non-image (ex. accept="image/*,application/pdf") passent
 * inchangés.
 */
export function CompressedImageInput({
  name,
  accept = "image/*",
  multiple,
  required,
  capture,
  className,
}: {
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  capture?: "user" | "environment";
  className?: string;
}) {
  const [working, setWorking] = useState(false);
  const statusId = useId();

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = input.files;
    if (!files || files.length === 0) return;

    setWorking(true);
    try {
      const dataTransfer = new DataTransfer();
      for (const file of Array.from(files)) {
        dataTransfer.items.add(await compressImage(file));
      }
      input.files = dataTransfer.files;
    } finally {
      setWorking(false);
    }
  }

  return (
    <div>
      <input
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required}
        capture={capture}
        className={className}
        onChange={handleChange}
        aria-describedby={working ? statusId : undefined}
      />
      {working ? (
        <p id={statusId} className="mt-1 text-xs text-ink-soft">
          Compression des photos…
        </p>
      ) : null}
    </div>
  );
}
