import { Receipt } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";

export default function FacturationPage() {
  return (
    <div>
      <PageHeader title="Facturation" />
      <Card className="p-10 text-center max-w-lg mx-auto">
        <Receipt className="h-8 w-8 text-blue-500 mx-auto mb-3" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-ink mb-1.5">Bientôt disponible</h2>
        <p className="text-sm text-ink-soft">
          Les devis, factures et le suivi des paiements arrivent dans une prochaine phase : ce
          module nécessite de connecter un compte de paiement (Stripe) pour être fonctionnel.
        </p>
      </Card>
    </div>
  );
}
