import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDossier, getDossierAnnoncesSelectionnees } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { MarketReport } from "@/lib/pdf/MarketReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dossier = await getDossier(params.id);
  if (!dossier) {
    return new NextResponse("Dossier introuvable", { status: 404 });
  }
  if (dossier.offre !== "copilote" && dossier.offre !== "copilote_plus") {
    return new NextResponse("Ce document n'existe que pour les offres Copilote et Copilote Plus", { status: 400 });
  }

  const annonces = await getDossierAnnoncesSelectionnees(params.id);
  const vehicules = await Promise.all(
    annonces.map(async (a) => ({ ...a, photoUrl: a.photos[0] ? await getSignedUrl(a.photos[0]) : null }))
  );

  const buffer = await renderToBuffer(
    MarketReport({
      offre: dossier.offre,
      vehicules,
      commentaire:
        dossier.offre === "copilote_plus"
          ? dossier.market_commentaire_copilote_plus
          : dossier.market_commentaire_copilote,
      dossierReference: dossier.reference,
      clientNom: `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim(),
    })
  );

  const title = dossier.offre === "copilote_plus" ? "copilote-plus-market" : "copilote-market";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${title}-${dossier.reference}.pdf"`,
    },
  });
}
