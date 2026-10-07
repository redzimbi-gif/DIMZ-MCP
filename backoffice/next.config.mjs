// Hôte du bucket Supabase Storage, dérivé de la même variable d'environnement
// que le client Supabase (NEXT_PUBLIC_SUPABASE_URL) plutôt que codé en dur :
// les URLs signées des photos/documents (src/lib/storage.ts) pointent vers ce
// domaine, c'est le seul hôte externe dont l'app a réellement besoin.
const supabaseHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname || null;
  } catch {
    return null;
  }
})();

const isDev = process.env.NODE_ENV !== "production";

// CSP volontairement stricte : cette app ne charge aucun script/police/style
// tiers (pas de next/font, pas de <script> externe, aucun SDK appelé côté
// navigateur — Stripe et Resend ne sont appelés qu'en HTTP direct depuis le
// serveur, cf. src/lib/stripe.ts et src/lib/email.ts) et ne rend jamais de
// HTML non échappé (aucun dangerouslySetInnerHTML dans tout le code). Les
// directives qui comptent vraiment ici sont frame-ancestors (anti-clickjacking
// sur /login et le reste du back-office) et connect-src/form-action, qui
// bornent où les données peuvent partir même en cas de faille non prévue.
// script-src garde 'unsafe-inline' car Next.js injecte de petits scripts de
// hydratation sans nonce par défaut ; 'unsafe-eval' n'est nécessaire qu'en
// dev (Fast Refresh).
function buildCsp() {
  const imgSrc = ["'self'", "data:", "blob:", supabaseHostname ? `https://${supabaseHostname}` : null]
    .filter(Boolean)
    .join(" ");
  const connectSrc = ["'self'", supabaseHostname ? `https://${supabaseHostname}` : null]
    .filter(Boolean)
    .join(" ");
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSrc}`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: buildCsp() },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Aucune de ces API n'est utilisée par l'app : autant les désactiver
  // explicitement plutôt que laisser le comportement par défaut du navigateur.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Ignoré en HTTP (dev local), sans effet indésirable : pas besoin de le
  // conditionner à la production.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname }]
      : [],
  },
  async headers() {
    return [
      {
        // Exclut /api/stripe/webhook et /api/public/** : ce sont des endpoints
        // appelés par Stripe ou par le site vitrine (autre domaine), pas des
        // pages affichées dans un navigateur — les en-têtes ci-dessus (CSP,
        // frame-ancestors...) n'ont aucun sens pour une réponse JSON.
        source: "/((?!api/stripe|api/public).*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
