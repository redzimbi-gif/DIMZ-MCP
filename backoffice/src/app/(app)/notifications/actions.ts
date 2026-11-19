"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markAllNotificationsRead() {
  const db = createAdminClient();
  await db.from("notifications").update({ lue: true }).eq("lue", false);
  revalidatePath("/notifications");
  revalidatePath("/");
}
