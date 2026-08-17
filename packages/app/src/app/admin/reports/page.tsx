import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { ReportQueue } from "@/app/_components/report-queue";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database/client";
import { usersTable } from "@/lib/database/schema";

/** A moderation queue is per-session and never cacheable. */
export const dynamic = "force-dynamic";

/** Keep the moderation surface out of search indexes, as with `share/embed`. */
export const metadata: Metadata = {
  title: "Reported Comments — Ice Cream Calculator",
  robots: { index: false },
};

/**
 * Comment moderation, for admins only.
 *
 * Non-admins get `notFound()` rather than a refusal, so the route does not confirm it exists.
 * Admin-ness is `users.is_admin`, set by hand on the owner's row — the app never grants it.
 */
export default async function AdminReportsPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) notFound();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user?.isAdmin) notFound();

  return (
    <div className="blog-post">
      <h1 className="text-txt-prim mb-4 text-2xl font-bold">Reported comments</h1>
      <ReportQueue />
    </div>
  );
}
