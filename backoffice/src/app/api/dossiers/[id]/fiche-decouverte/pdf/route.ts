import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDossier, getFicheDecouverteVehicules } from "@/lib/queries";
import { FicheDecouverteReport } from "@/lib/pdf/FicheDecouverteReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const dossier = await getDossier(params.id);
  if (!dossier) {
    return new NextResponse("Dossier introuvable", { status: 404 });
  }

  const vehicules = await getFicheDecouverteVehicules(params.id);

  const buffer = await renderToBuffer(
    FicheDecouverteReport({
      vehicules,
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
}
