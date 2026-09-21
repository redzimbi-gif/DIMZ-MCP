"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, Button } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto mt-16">
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-bad-bg flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-bad" />
        </div>
        <h1 className="text-lg font-semibold text-ink mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-ink-soft mb-6">
          {error.message || "Quelque chose s'est mal passé. Réessaie, et si ça persiste, note ce qui s'est passé pour qu'on puisse corriger."}
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>Réessayer</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            Retour à l'accueil
          </Button>
        </div>
        {error.digest ? <p className="text-xs text-ink-faint mt-6">Référence : {error.digest}</p> : null}
      </Card>
    </div>
  );
}
