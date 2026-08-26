import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportQueue } from "@/app/_components/report-queue";
import { requireAdmin } from "@/lib/data/session";

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
  if (!(await requireAdmin())) notFound();

  return (
    <div className="blog-post">
      <h1 className="text-txt-prim mb-4 text-2xl font-bold">Reported comments</h1>
      <ReportQueue />
    </div>
  );
}
