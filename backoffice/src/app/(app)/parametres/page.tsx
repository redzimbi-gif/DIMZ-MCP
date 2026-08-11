import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, Button } from "@/components/ui";
import { logout } from "@/app/login/actions";

export default async function ParametresPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <PageHeader title="Paramètres" description="Réglages du compte et du back-office." />

      <Card className="p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-ink mb-4">Compte</h2>
        <div className="flex items-center justify-between gap-3 py-3 border-t border-line">
          <div>
            <p className="text-sm text-ink">{user?.email ?? "—"}</p>
            <p className="text-xs text-ink-soft mt-0.5">Connecté·e à ce compte</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </div>
      </Card>

      <p className="text-xs text-ink-faint mt-4">
        D'autres réglages (rôles, notifications, préférences) arriveront ici au fil des besoins.
      </p>
    </div>
  );
}
