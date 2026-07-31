import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getConvoyage } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { ConvoyageReport } from "@/lib/pdf/ConvoyageReport";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const convoyage = await getConvoyage(params.id);
  if (!convoyage) {
    return new NextResponse("Convoyage introuvable", { status: 404 });
  }

  const signatureUrl = convoyage.signature_client
    ? await getSignedUrl(convoyage.signature_client)
    : null;

  const buffer = await renderToBuffer(
    createElement(ConvoyageReport, {
      convoyage,
      dossierReference: convoyage.dossiers?.reference ?? "",
      clientNom: `${convoyage.dossiers?.clients?.prenom ?? ""} ${convoyage.dossiers?.clients?.nom ?? ""}`.trim(),
      signatureUrl,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="convoyage-${params.id}.pdf"`,
    },
  });
}
