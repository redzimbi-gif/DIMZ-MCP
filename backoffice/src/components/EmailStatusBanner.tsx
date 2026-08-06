const MESSAGES: Record<string, { text: string; tone: "good" | "bad" | "warn" }> = {
  sent: { text: "Email envoyé au client.", tone: "good" },
  error: { text: "Échec de l'envoi de l'email. Réessaie dans un instant.", tone: "bad" },
  "no-email": { text: "Impossible d'envoyer : ce client n'a pas d'adresse email enregistrée.", tone: "warn" },
};

const TONE_CLASSES: Record<string, string> = {
  good: "bg-good-bg text-good",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
};

export function EmailStatusBanner({ status }: { status?: string }) {
  if (!status || !MESSAGES[status]) return null;
  const { text, tone } = MESSAGES[status];
  return (
    <div className={`rounded-md px-4 py-2.5 text-sm font-medium mb-4 ${TONE_CLASSES[tone]}`}>{text}</div>
  );
}
