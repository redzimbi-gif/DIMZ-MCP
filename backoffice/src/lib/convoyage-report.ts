import "server-only";
import { getConvoyage, getConvoyageEtatsLieux, getEntrepriseInfo } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { ETAT_LIEUX_PHOTO_SLOTS } from "@/lib/etat-lieux";

/** Assemble tout ce qu'il faut pour rendre ConvoyageReport (route PDF et email). */
export async function getConvoyageReportData(convoyageId: string) {
  const [convoyage, etatsLieuxRows, entreprise] = await Promise.all([
    getConvoyage(convoyageId),
    getConvoyageEtatsLieux(convoyageId),
    getEntrepriseInfo(),
  ]);
  if (!convoyage) return null;

  const allPaths = etatsLieuxRows.flatMap((el) => [
    ...ETAT_LIEUX_PHOTO_SLOTS.map((s) => el.photos[s.key]).filter((p): p is string => !!p),
    ...el.photos_autres,
    ...(el.signature_path ? [el.signature_path] : []),
  ]);
  const urls = await getSignedUrls(allPaths);

  const etatsLieux = etatsLieuxRows
    .filter((el) => el.confirme_at)
    .sort((a, b) => (a.type === "depart" ? -1 : 1))
    .map((el) => ({
      type: el.type,
      data: el,
      photoUrls: Object.fromEntries(
        ETAT_LIEUX_PHOTO_SLOTS.map((s) => [s.key, el.photos[s.key] ? urls[el.photos[s.key]] : undefined]).filter(
          ([, url]) => url
        )
      ) as Record<string, string>,
      photosAutresUrls: el.photos_autres.map((p) => urls[p]).filter((u): u is string => !!u),
      signatureUrl: el.signature_path ? urls[el.signature_path] ?? null : null,
    }));

  return { convoyage, entreprise, etatsLieux };
}
