import { NextResponse } from "next/server";
import { getDossier, getDossierContrats, getEntrepriseInfo } from "@/lib/queries";
import { CONTRAT_TYPES, type ContratType } from "@/lib/types";
import { renderContratPdf } from "@/lib/pdf/contrats/build";

export async function GET(_request: Request, { params }: { params: { id: string; type: string } }) {
  if (!(CONTRAT_TYPES as readonly string[]).includes(params.type)) {
    return new NextResponse("Type de document inconnu", { status: 404 });
  }
  const type = params.type as ContratType;

  try {
    const dossier = await getDossier(params.id);
    if (!dossier) return new NextResponse("Dossier introuvable", { status: 404 });

    const [contrats, entreprise] = await Promise.all([getDossierContrats(params.id), getEntrepriseInfo()]);
    const contrat = contrats.find((c) => c.type === type);

    const buffer = await renderContratPdf(type, dossier, contrat, entreprise);

    const filename = `${type}-${dossier.reference}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erreur génération PDF contrat", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return new NextResponse(`Erreur lors de la génération du PDF : ${message}`, { status: 500 });
  }
}
