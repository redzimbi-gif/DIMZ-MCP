import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getInspection } from "@/lib/queries";
import { InspectionReport } from "@/lib/pdf/InspectionReport";
import { getSignedUrls } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const inspection = await getInspection(params.id);
  if (!inspection) {
    return new NextResponse("Inspection introuvable", { status: 404 });
  }

  // Le bucket est privé : les photos doivent être signées avant le rendu,
  // @react-pdf n'ayant aucun moyen de les récupérer lui-même.
  const photoMap = await getSignedUrls(inspection.photos ?? []);
  const photoUrls = (inspection.photos ?? []).map((path) => photoMap[path]).filter(Boolean);

  const buffer = await renderToBuffer(
    InspectionReport({
      inspection,
      dossierReference: inspection.dossiers?.reference ?? "",
      clientNom: `${inspection.dossiers?.clients?.prenom ?? ""} ${inspection.dossiers?.clients?.nom ?? ""}`.trim(),
      offre: inspection.dossiers?.offre ?? null,
      photoUrls,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspection-${params.id}.pdf"`,
    },
  });
}
