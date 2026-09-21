import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getConvoyageReportData } from "@/lib/convoyage-report";
import { ConvoyageReport } from "@/lib/pdf/ConvoyageReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const reportData = await getConvoyageReportData(params.id);
    if (!reportData) {
      return new NextResponse("Convoyage introuvable", { status: 404 });
    }

    const buffer = await renderToBuffer(
      ConvoyageReport({
        convoyage: reportData.convoyage,
        dossierReference: reportData.convoyage.dossiers?.reference ?? "",
        clientNom: `${reportData.convoyage.dossiers?.clients?.prenom ?? ""} ${reportData.convoyage.dossiers?.clients?.nom ?? ""}`.trim(),
        entreprise: reportData.entreprise,
        etatsLieux: reportData.etatsLieux,
      })
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="convoyage-${params.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF convoyage", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new NextResponse(`Erreur lors de la génération du PDF : ${message}`, { status: 500 });
  }
}
