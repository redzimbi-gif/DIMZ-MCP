import { Newspaper } from "lucide-react";
import { listArticles } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, EmptyState, Badge, LinkButton, StatCard } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";

export default async function ActualitesPage() {
  const articles = await listArticles();
  const publies = articles.filter((a) => a.publie).length;
  const imagePaths = articles.map((a) => a.image_path).filter((p): p is string => Boolean(p));
  const urls = await getSignedUrls(imagePaths);

  return (
    <div>
      <PageHeader
        title="Actualités"
        description="Articles affichés sur la page « Actualités » du site vitrine — repris de ce qui est publié sur Instagram, ou écrits directement ici."
        actions={<LinkButton href="/actualites/new">Nouvel article</LinkButton>}
      />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Articles" value={articles.length} icon={<Newspaper className="h-4 w-4" strokeWidth={1.8} />} />
        <StatCard label="Publiés" value={publies} />
      </div>

      <Card>
        {articles.length === 0 ? (
          <EmptyState
            title="Aucun article pour le moment"
            description="Créez votre premier article pour qu'il apparaisse ici, puis publiez-le quand il est prêt."
          />
        ) : (
          <ul className="divide-y divide-line">
            {articles.map((a) => {
              const url = a.image_path ? urls[a.image_path] : null;
              return (
                <li key={a.id} className="p-4">
                  <Link href={`/actualites/${a.id}`} className="flex items-start gap-4">
                    {url ? (
                      <Image
                        src={url}
                        alt=""
                        width={80}
                        height={60}
                        unoptimized
                        className="w-20 h-15 rounded-md object-cover shrink-0 bg-surface-sunken"
                      />
                    ) : (
                      <div className="w-20 h-15 rounded-md shrink-0 bg-surface-sunken flex items-center justify-center">
                        <Newspaper className="h-5 w-5 text-ink-soft" strokeWidth={1.6} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink">{a.titre}</p>
                        <Badge tone={a.publie ? "good" : "neutral"}>{a.publie ? "Publié" : "Brouillon"}</Badge>
                      </div>
                      <p className="text-sm text-ink-soft mt-1 line-clamp-2">{a.extrait}</p>
                      <p className="text-xs text-ink-faint mt-1.5">{formatDateTime(a.created_at)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
