import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ActivityLogEntry,
  AgendaEvent,
  Annonce,
  Client,
  Convoyage,
  ConvoyageExterne,
  DocumentRow,
  Dossier,
  DossierContrat,
  DossierEtapeHistory,
  DossierStatutHistory,
  EntrepriseInfo,
  Facture,
  FicheDecouverteVehicule,
  Inspection,
  NoteInterne,
  Notification,
  PhotoBibliotheque,
  TestFeedback,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardStats() {
  const db = createAdminClient();

  const [{ count: nouveaux }, { count: enCours }, { count: termines }, valeurs] =
    await Promise.all([
      db.from("dossiers").select("*", { count: "exact", head: true }).eq("statut", "demande_recue"),
      db
        .from("dossiers")
        .select("*", { count: "exact", head: true })
        .not("statut", "in", "(demande_recue,dossier_termine)"),
      db.from("dossiers").select("*", { count: "exact", head: true }).eq("statut", "dossier_termine"),
      db.from("dossiers").select("valeur_estimee").eq("statut", "dossier_termine"),
    ]);

  const chiffreAffaires = (valeurs.data ?? []).reduce(
    (sum, d) => sum + (d.valeur_estimee ? Number(d.valeur_estimee) : 0),
    0
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [convoyagesAVenir, livraisonsDuJour, notifications, activites] = await Promise.all([
    db
      .from("convoyages")
      .select("*, dossiers(reference, clients(nom, prenom))")
      .in("statut", ["planifie", "en_cours"])
      .order("date_convoyage", { ascending: true })
      .limit(6),
    db
      .from("agenda_events")
      .select("*")
      .eq("type", "livraison")
      .gte("date_debut", startOfToday.toISOString())
      .lte("date_debut", endOfToday.toISOString())
      .order("date_debut", { ascending: true }),
    db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    nouveaux: nouveaux ?? 0,
    enCours: enCours ?? 0,
    termines: termines ?? 0,
    chiffreAffaires,
    convoyagesAVenir: (convoyagesAVenir.data ?? []) as any[],
    livraisonsDuJour: (livraisonsDuJour.data ?? []) as AgendaEvent[],
    notifications: (notifications.data ?? []) as Notification[],
    activites: (activites.data ?? []) as ActivityLogEntry[],
  };
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export async function listClients(search?: string) {
  const db = createAdminClient();
  let query = db.from("clients").select("*, dossiers(id)").order("created_at", { ascending: false });
  if (search) {
    query = query.or(
      `nom.ilike.%${search}%,prenom.ilike.%${search}%,email.ilike.%${search}%,telephone.ilike.%${search}%`
    );
  }
  const { data } = await query;
  return (data ?? []) as (Client & { dossiers: { id: string }[] })[];
}

export async function getClient(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("clients").select("*").eq("id", id).maybeSingle();
  return data as Client | null;
}

export async function getClientDossiers(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossiers")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Dossier[];
}

export async function getClientDocuments(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("documents")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DocumentRow[];
}

export async function getClientNotes(clientId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("notes_internes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as NoteInterne[];
}

// ---------------------------------------------------------------------------
// Dossiers
// ---------------------------------------------------------------------------
export async function listDossiers(options?: { archived?: boolean }) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossiers")
    .select("*, clients(id, nom, prenom, email, telephone)")
    .eq("archive", options?.archived ?? false)
    .order("created_at", { ascending: false });
  return (data ?? []) as Dossier[];
}

export async function getDossier(id: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossiers")
    .select("*, clients(id, nom, prenom, email, telephone, adresse)")
    .eq("id", id)
    .maybeSingle();
  return data as Dossier | null;
}

export async function getDossierByToken(token: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossiers")
    .select("*, clients(nom, prenom)")
    .eq("portal_token", token)
    .maybeSingle();
  return data as Dossier | null;
}

export async function getDossierHistory(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossier_statut_history")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: true });
  return (data ?? []) as DossierStatutHistory[];
}

export async function getDossierEtapeHistory(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("dossier_etape_history")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: true });
  return (data ?? []) as DossierEtapeHistory[];
}

export async function getDossierAnnonces(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("annonces")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Annonce[];
}

export async function getDossierAnnoncesSelectionnees(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("annonces")
    .select("*")
    .eq("dossier_id", dossierId)
    .eq("selectionnee", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as Annonce[];
}

export async function listAllAnnonces() {
  const db = createAdminClient();
  const { data } = await db
    .from("annonces")
    .select("*, dossiers(reference, clients(nom, prenom))")
    .order("created_at", { ascending: false });
  return (data ?? []) as (Annonce & { dossiers: any })[];
}

export async function getAnnonce(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("annonces").select("*").eq("id", id).maybeSingle();
  return data as Annonce | null;
}

export async function getFicheDecouverteVehicules(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("fiche_decouverte_vehicules")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("ordre", { ascending: true });
  return (data ?? []) as FicheDecouverteVehicule[];
}

export async function listPhotosBibliotheque() {
  const db = createAdminClient();
  const { data } = await db.from("photos_bibliotheque").select("*").order("nom", { ascending: true });
  return (data ?? []) as PhotoBibliotheque[];
}

export async function listAllInspections() {
  const db = createAdminClient();
  const { data } = await db
    .from("inspections")
    .select("*, dossiers(reference, clients(nom, prenom))")
    .order("date_inspection", { ascending: false });
  return (data ?? []) as (Inspection & { dossiers: any })[];
}

export async function getDossierInspections(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("inspections")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Inspection[];
}

export async function getInspection(id: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("inspections")
    .select("*, dossiers(reference, portal_token, offre, clients(nom, prenom, email))")
    .eq("id", id)
    .maybeSingle();
  return data as (Inspection & { dossiers: any }) | null;
}

export async function listAllConvoyages() {
  const db = createAdminClient();
  const { data } = await db
    .from("convoyages")
    .select("*, dossiers(reference, clients(nom, prenom))")
    .order("date_convoyage", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as (Convoyage & { dossiers: any })[];
}

export async function getDossierConvoyages(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("convoyages")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Convoyage[];
}

export async function getConvoyage(id: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("convoyages")
    .select("*, dossiers(reference, portal_token, clients(nom, prenom, email))")
    .eq("id", id)
    .maybeSingle();
  return data as (Convoyage & { dossiers: any }) | null;
}

export async function getDossierDocuments(dossierId: string, options?: { archived?: boolean }) {
  const db = createAdminClient();
  const { data } = await db
    .from("documents")
    .select("*")
    .eq("dossier_id", dossierId)
    .eq("archive", options?.archived ?? false)
    .order("created_at", { ascending: false });
  return (data ?? []) as DocumentRow[];
}

export async function getDossierContrats(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db.from("dossier_contrats").select("*").eq("dossier_id", dossierId);
  return (data ?? []) as DossierContrat[];
}

export async function getEntrepriseInfo() {
  const db = createAdminClient();
  const { data } = await db.from("entreprise_info").select("*").eq("id", 1).maybeSingle();
  return data as EntrepriseInfo | null;
}

export async function getDossierNotes(dossierId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("notes_internes")
    .select("*")
    .eq("dossier_id", dossierId)
    .order("created_at", { ascending: false });
  return (data ?? []) as NoteInterne[];
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
export async function listAgendaEvents(fromISO: string, toISO: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("agenda_events")
    .select("*, dossiers(reference), clients(nom, prenom)")
    .gte("date_debut", fromISO)
    .lte("date_debut", toISO)
    .order("date_debut", { ascending: true });
  return (data ?? []) as (AgendaEvent & { dossiers: any; clients: any })[];
}

export async function getAgendaEvent(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("agenda_events").select("*").eq("id", id).maybeSingle();
  return data as AgendaEvent | null;
}

export async function listConvoyagesExternesAFaire() {
  const db = createAdminClient();
  const { data } = await db
    .from("agenda_events")
    .select("*")
    .eq("type", "convoyage_externe")
    .eq("termine", false)
    .order("date_debut", { ascending: true });
  return (data ?? []) as AgendaEvent[];
}

// ---------------------------------------------------------------------------
// Documents (toutes entités)
// ---------------------------------------------------------------------------
export async function listAllDossierContrats() {
  const db = createAdminClient();
  const { data } = await db
    .from("dossier_contrats")
    .select("*, dossiers(reference, clients(nom, prenom))")
    .not("date_generation", "is", null)
    .order("date_generation", { ascending: false });
  return (data ?? []) as (DossierContrat & { dossiers: any })[];
}

export async function listAllDocuments(options?: { archived?: boolean }) {
  const db = createAdminClient();
  const { data } = await db
    .from("documents")
    .select("*, dossiers(reference), clients(nom, prenom)")
    .eq("archive", options?.archived ?? false)
    .order("created_at", { ascending: false });
  return (data ?? []) as (DocumentRow & { dossiers: any; clients: any })[];
}

export async function listRecentNotes() {
  const db = createAdminClient();
  const { data } = await db
    .from("notes_internes")
    .select("*, dossiers(reference), clients(nom, prenom)")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as (NoteInterne & { dossiers: any; clients: any })[];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function countUnreadNotifications() {
  const db = createAdminClient();
  const { count } = await db
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("lue", false);
  return count ?? 0;
}

export async function listNotifications() {
  const db = createAdminClient();
  const { data } = await db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Notification[];
}

// ---------------------------------------------------------------------------
// Comptabilité : convoyages réalisés hors plateforme DIMZ
// ---------------------------------------------------------------------------
export async function listConvoyagesExternes(from?: string, to?: string) {
  const db = createAdminClient();
  let query = db.from("convoyages_externes").select("*");
  if (from) query = query.gte("date_convoyage", from);
  if (to) query = query.lte("date_convoyage", to);
  const { data } = await query
    .order("date_convoyage", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as ConvoyageExterne[];
}

export async function listFactures() {
  const db = createAdminClient();
  const { data } = await db
    .from("factures")
    .select("*, clients(nom, prenom, type_client, raison_sociale, siret)")
    .order("date_facture", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as (Facture & { clients: any })[];
}

export async function getFacture(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("factures").select("*").eq("id", id).maybeSingle();
  return data as Facture | null;
}

export async function getConvoyageExterne(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("convoyages_externes").select("*").eq("id", id).maybeSingle();
  return data as ConvoyageExterne | null;
}

// ---------------------------------------------------------------------------
// Retours du questionnaire de test utilisateur
// ---------------------------------------------------------------------------
export async function listTestFeedback() {
  const db = createAdminClient();
  const { data } = await db.from("test_feedback").select("*").order("created_at", { ascending: false });
  return (data ?? []) as TestFeedback[];
}

export async function getTestFeedback(id: string) {
  const db = createAdminClient();
  const { data } = await db.from("test_feedback").select("*").eq("id", id).maybeSingle();
  return data as TestFeedback | null;
}
