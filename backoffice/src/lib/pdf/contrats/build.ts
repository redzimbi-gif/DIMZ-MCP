import { renderToBuffer } from "@react-pdf/renderer";
import { getSignedUrls } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import type { Dossier, DossierContrat, EntrepriseInfo, ContratType } from "@/lib/types";
import { CgvDocument } from "./Cgv";
import { ContratConvoyageDocument } from "./ContratConvoyage";
import { ContratCopiloteDocument } from "./ContratCopilote";
import { ContratCopilotePlusDocument } from "./ContratCopilotePlus";
import { ContratInspectionDocument } from "./ContratInspection";
import { EtatVehiculeDocument } from "./EtatVehicule";
import { CommencementAnticipeDocument } from "./CommencementAnticipe";
import { RetractationDocument } from "./Retractation";

function parsePathArray(raw: string | undefined): string[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Génère le PDF d'un document/contrat de dossier — utilisé par la route de téléchargement et par l'envoi par email. */
export async function renderContratPdf(
  type: ContratType,
  dossier: Dossier,
  contrat: DossierContrat | undefined,
  entreprise: EntrepriseInfo | null
): Promise<Buffer> {
  const champs = contrat?.champs ?? {};
  const dateGeneration = formatDate(contrat?.date_generation ?? new Date());
  const dateSignature = contrat?.date_signature ? formatDate(contrat.date_signature) : dateGeneration;

  const common = {
    dossierReference: dossier.reference,
    client: dossier.clients,
    entreprise,
    champs,
  };

  switch (type) {
    case "cgv":
      return renderToBuffer(CgvDocument({ dossierReference: dossier.reference, entreprise, dateGeneration }));
    case "contrat_convoyage":
      return renderToBuffer(ContratConvoyageDocument({ ...common, dateSignature }));
    case "contrat_copilote":
      return renderToBuffer(ContratCopiloteDocument({ ...common, dateSignature }));
    case "contrat_copilote_plus":
      return renderToBuffer(ContratCopilotePlusDocument({ ...common, dateSignature }));
    case "contrat_inspection":
      return renderToBuffer(ContratInspectionDocument({ ...common, dateSignature }));
    case "etat_vehicule": {
      const pathsDepart = parsePathArray(champs.photos_autres_depart);
      const pathsArrivee = parsePathArray(champs.photos_autres_arrivee);
      const urls = await getSignedUrls([...pathsDepart, ...pathsArrivee]);
      return renderToBuffer(
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
    }
    case "commencement_anticipe":
      return renderToBuffer(CommencementAnticipeDocument({ ...common, date: dateGeneration }));
    case "retractation":
      return renderToBuffer(RetractationDocument(common));
    default:
      throw new Error("Type de document inconnu");
  }
}
