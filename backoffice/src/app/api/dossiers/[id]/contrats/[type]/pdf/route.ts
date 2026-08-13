import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDossier, getDossierContrats, getEntrepriseInfo } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { CONTRAT_TYPES, type ContratType } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { CgvDocument } from "@/lib/pdf/contrats/Cgv";
import { ContratConvoyageDocument } from "@/lib/pdf/contrats/ContratConvoyage";
import { ContratCopiloteDocument } from "@/lib/pdf/contrats/ContratCopilote";
import { ContratCopilotePlusDocument } from "@/lib/pdf/contrats/ContratCopilotePlus";
import { ContratInspectionDocument } from "@/lib/pdf/contrats/ContratInspection";
import { EtatVehiculeDocument } from "@/lib/pdf/contrats/EtatVehicule";
import { CommencementAnticipeDocument } from "@/lib/pdf/contrats/CommencementAnticipe";
import { RetractationDocument } from "@/lib/pdf/contrats/Retractation";

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
    const champs = contrat?.champs ?? {};
    const dateGeneration = formatDate(contrat?.date_generation ?? new Date());
    const dateSignature = contrat?.date_signature ? formatDate(contrat.date_signature) : dateGeneration;

    const common = {
      dossierReference: dossier.reference,
      client: dossier.clients,
      entreprise,
      champs,
    };

    let buffer: Buffer;
    switch (type) {
      case "cgv":
        buffer = await renderToBuffer(
          CgvDocument({ dossierReference: dossier.reference, entreprise, dateGeneration })
        );
        break;
      case "contrat_convoyage":
        buffer = await renderToBuffer(ContratConvoyageDocument({ ...common, dateSignature }));
        break;
      case "contrat_copilote":
        buffer = await renderToBuffer(ContratCopiloteDocument({ ...common, dateSignature }));
        break;
      case "contrat_copilote_plus":
        buffer = await renderToBuffer(ContratCopilotePlusDocument({ ...common, dateSignature }));
        break;
      case "contrat_inspection":
        buffer = await renderToBuffer(ContratInspectionDocument({ ...common, dateSignature }));
        break;
      case "etat_vehicule": {
        const parsePaths = (raw: string | undefined): string[] => {
          try {
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        };
        const pathsDepart = parsePaths(champs.photos_autres_depart);
        const pathsArrivee = parsePaths(champs.photos_autres_arrivee);
        const urls = await getSignedUrls([...pathsDepart, ...pathsArrivee]);
        buffer = await renderToBuffer(
          EtatVehiculeDocument({
            dossierReference: dossier.reference,
            client: dossier.clients,
            entreprise,
            champs,
            date: dateGeneration,
            photosDepart: pathsDepart.map((p) => urls[p]).filter((u): u is string => !!u),
            photosArrivee: pathsArrivee.map((p) => urls[p]).filter((u): u is string => !!u),
          })
        );
        break;
      }
      case "commencement_anticipe":
        buffer = await renderToBuffer(CommencementAnticipeDocument({ ...common, date: dateGeneration }));
        break;
      case "retractation":
        buffer = await renderToBuffer(RetractationDocument(common));
        break;
      default:
        return new NextResponse("Type de document inconnu", { status: 404 });
    }

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
