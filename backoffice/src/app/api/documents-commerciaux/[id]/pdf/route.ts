import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocumentCommercial, getEntrepriseInfo } from "@/lib/queries";
import { DocumentCommercialPdf } from "@/lib/pdf/DocumentCommercial";
import { DOCUMENT_COMMERCIAL_TYPE_LABELS } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const [doc, entreprise] = await Promise.all([getDocumentCommercial(params.id), getEntrepriseInfo()]);
    if (!doc) {
      return new NextResponse("Document introuvable", { status: 404 });
    }

    const clientNom = `${doc.clients?.prenom ?? ""} ${doc.clients?.nom ?? ""}`.trim();

    const buffer = await renderToBuffer(
      DocumentCommercialPdf({
        doc,
        clientNom,
        clientAdresse: doc.clients?.adresse ?? null,
        clientRaisonSociale: doc.clients?.type_client === "professionnel" ? doc.clients?.raison_sociale : null,
        clientSiret: doc.clients?.type_client === "professionnel" ? doc.clients?.siret : null,
        entreprise,
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${DOCUMENT_COMMERCIAL_TYPE_LABELS[doc.type].toLowerCase()}-${doc.numero}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF document commercial", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new NextResponse(`Erreur lors de la génération du PDF : ${message}`, { status: 500 });
  }
}
