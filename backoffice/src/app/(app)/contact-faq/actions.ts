"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markContactFaqRead(id: string) {
  const db = createAdminClient();
  await db.from("contacts_faq").update({ lu: true }).eq("id", id);
  revalidatePath("/contact-faq");
}

export async function markAllContactsFaqRead() {
  const db = createAdminClient();
  await db.from("contacts_faq").update({ lu: true }).eq("lu", false);
  revalidatePath("/contact-faq");
}
