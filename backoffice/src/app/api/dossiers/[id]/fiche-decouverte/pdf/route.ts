import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDossier, getFicheDecouverteVehicules } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { FicheDecouverteReport } from "@/lib/pdf/FicheDecouverteReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const dossier = await getDossier(params.id);
    if (!dossier) {
      return new NextResponse("Dossier introuvable", { status: 404 });
    }

    const vehicules = await getFicheDecouverteVehicules(params.id);
    const photoUrls = await getSignedUrls(vehicules.map((v) => v.photo_path).filter((p): p is string => !!p));
    const vehiculesAvecPhoto = vehicules.map((v) => ({
      ...v,
      photoUrl: v.photo_path ? photoUrls[v.photo_path] ?? null : null,
    }));

    const buffer = await renderToBuffer(
      FicheDecouverteReport({
        vehicules: vehiculesAvecPhoto,
        commentaire: dossier.fiche_decouverte_intro,
        dossierReference: dossier.reference,
        clientNom: `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim(),
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="fiche-decouverte-${dossier.reference}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF fiche Découverte", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new NextResponse(`Erreur lors de la génération du PDF : ${message}`, { status: 500 });
  }
}
