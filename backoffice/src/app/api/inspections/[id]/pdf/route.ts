import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getInspection } from "@/lib/queries";
import { InspectionReport } from "@/lib/pdf/InspectionReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const inspection = await getInspection(params.id);
  if (!inspection) {
    return new NextResponse("Inspection introuvable", { status: 404 });
  }

  const buffer = await renderToBuffer(
    InspectionReport({
      inspection,
      dossierReference: inspection.dossiers?.reference ?? "",
      clientNom: `${inspection.dossiers?.clients?.prenom ?? ""} ${inspection.dossiers?.clients?.nom ?? ""}`.trim(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspection-${params.id}.pdf"`,
    },
  });
}
