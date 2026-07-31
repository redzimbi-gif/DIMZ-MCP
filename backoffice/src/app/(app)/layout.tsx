import { createClient } from "@/lib/supabase/server";
import { countUnreadNotifications } from "@/lib/queries";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const unreadCount = await countUnreadNotifications();

  const userLabel = user?.email ?? "Équipe DIMZ";

  return (
    <div className="flex min-h-screen">
      <Sidebar userLabel={userLabel} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar unreadCount={unreadCount} />
        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
