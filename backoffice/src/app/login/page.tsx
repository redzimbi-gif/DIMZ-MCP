import { Logo } from "@/components/Logo";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="text-xl" />
        </div>

        <form
          action={login}
          className="bg-surface border border-line rounded-lg2 shadow-card p-8 space-y-5"
        >
          <div>
            <h1 className="text-lg font-semibold text-ink">Espace interne</h1>
            <p className="text-sm text-ink-soft mt-1">
              Connecte-toi pour accéder au back-office.
            </p>
          </div>

          {searchParams.error ? (
            <div className="text-sm text-bad bg-bad-bg border border-bad/20 rounded-md px-3 py-2">
              {searchParams.error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-ink-soft">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus-ring"
              placeholder="toi@dimz.fr"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-ink-soft">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2.5 transition-colors focus-ring"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Accès réservé à l'équipe DIMZ.
        </p>
      </div>
    </div>
  );
}
