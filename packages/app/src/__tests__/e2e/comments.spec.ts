import { test, expect, type Locator, type Page } from "@playwright/test";
import { inArray } from "drizzle-orm";

import { goToPageAndWaitFor, loginAsTestUserWithCredentials } from "@/__tests__/e2e/util";
import { TEST_USER_A, TEST_USER_B } from "@/lib/database/assets";
import { db } from "@/lib/database/client";
import { commentsTable } from "@/lib/database/schema";

/**
 * End-to-end coverage for public comment threads.
 *
 * These navigate straight to the post, not through the `/blog` index.
 *
 * The thread is seeded, so each test posts text unique to its run and asserts on that, not on the
 * thread's size. The rate limit counts an author's rows, tombstones included, so posts are split
 * across both test users and every childless one is deleted again.
 *
 * The one pair the UI cannot clear is deleted from the database: see {@link deleteCommentRows}.
 */

const POST = "/blog/2026-04-27-welcome";

/** A body no other run will collide with. */
function uniqueBody(label: string): string {
  return `e2e ${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** The thread section, once its mount-time fetch has settled. */
async function openThread(page: Page, url = POST) {
  await goToPageAndWaitFor(page, url);
  const thread = page.locator(".comments");
  await expect(thread.getByRole("heading", { name: /^Comments/ })).toBeVisible();
  await expect(page.getByText("Loading comments…")).toHaveCount(0);
  return thread;
}

/** The card holding `body`. */
function cardFor(page: Page, body: string) {
  return page.locator(".comment-card").filter({ hasText: body });
}

/** The id behind a comment card, read from its `comment-{id}` test id. */
async function commentIdOf(card: Locator): Promise<number> {
  return Number((await card.getAttribute("data-testid"))!.slice("comment-".length));
}

/**
 * Hard-delete rows no UI action can: a tombstone refuses everything, and purge needs a report.
 * Left behind, they land in later visual snapshots and count toward the next project's rate limit.
 */
async function deleteCommentRows(ids: number[]) {
  await db.delete(commentsTable).where(inArray(commentsTable.id, ids));
}

// Only this spec talks to the database, so the pool it opens is closed here rather than globally.
test.afterAll(async () => {
  await db.$client.end();
});

/** Fill the open composer and submit it, waiting for the thread to settle. */
async function submitComposer(page: Page, body: string, action: "Post" | "Save") {
  await page.getByTestId("comment-input").fill(body);
  await page.getByRole("button", { name: action, exact: true }).click();
  await expect(page.getByTestId("comment-input")).toHaveCount(0);
}

/** Post a top-level comment and return its body. */
async function postComment(page: Page, label: string): Promise<string> {
  const body = uniqueBody(label);
  await page.getByRole("button", { name: "Add a comment" }).click();
  await submitComposer(page, body, "Post");
  await expect(cardFor(page, body)).toBeVisible();
  return body;
}

/** Delete the comment holding `body`, accepting the confirmation. */
async function deleteComment(page: Page, body: string) {
  page.once("dialog", (dialog) => void dialog.accept());
  await cardFor(page, body).getByRole("button", { name: "Delete" }).click();
}

test.describe("signed out", () => {
  test("reads the seeded thread and is offered a sign-in link back to the post", async ({
    page,
  }) => {
    const thread = await openThread(page);

    await expect(thread.locator(".comment-card").first()).toBeVisible();
    await expect(thread.getByRole("button", { name: "Add a comment" })).toHaveCount(0);
    await expect(thread.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      `/signin?callbackUrl=${encodeURIComponent(POST)}`,
    );
  });

  test("is offered no per-comment actions", async ({ page }) => {
    const thread = await openThread(page);

    await expect(thread.getByRole("button", { name: "Reply" })).toHaveCount(0);
    await expect(thread.getByRole("button", { name: "Report" })).toHaveCount(0);
  });
});

test.describe("signed in", () => {
  test("posts, replies to, edits, and deletes a comment", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await openThread(page);

    // Post
    const body = await postComment(page, "root");

    // Reply — one level deep, so the reply itself offers no Reply of its own
    const reply = uniqueBody("reply");
    await cardFor(page, body).getByRole("button", { name: "Reply" }).first().click();
    await submitComposer(page, reply, "Post");
    await expect(page.locator(".comment-replies").filter({ hasText: reply })).toBeVisible();
    await expect(cardFor(page, reply).getByRole("button", { name: "Reply" })).toHaveCount(0);

    // Edit the root, which marks it edited
    const edited = `${body} (edited body)`;
    await cardFor(page, body).getByRole("button", { name: "Edit" }).first().click();
    await submitComposer(page, edited, "Save");
    await expect(cardFor(page, edited).getByText("(edited)")).toBeVisible();

    // Both deletes tombstone — the reply because it sits inside a thread, the root because that
    // reply still hangs off it. Each row stays, blanked, holding the sequence together.
    const replyId = await commentIdOf(cardFor(page, reply));
    const replyCard = page.getByTestId(`comment-${replyId}`);
    await deleteComment(page, reply);
    await expect(cardFor(page, reply)).toHaveCount(0);
    await expect(replyCard).toContainText("[deleted]");

    const rootId = await commentIdOf(cardFor(page, edited));
    const rootCard = page.getByTestId(`comment-${rootId}`);
    await deleteComment(page, edited);
    await expect(cardFor(page, edited)).toHaveCount(0);
    await expect(rootCard).toContainText("[deleted]");

    // A tombstone offers nothing to act on, so the pair has to go out of band.
    await expect(rootCard.getByRole("button")).toHaveCount(0);
    await deleteCommentRows([rootId, replyId]);
  });

  test("survives a reload, so the comment really was stored", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_A);
    await openThread(page);
    const body = await postComment(page, "persisted");

    await openThread(page);
    await expect(cardFor(page, body)).toBeVisible();

    await deleteComment(page, body);
    await expect(cardFor(page, body)).toHaveCount(0);
  });

  test("offers Report on another user's comment, not on one's own", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await openThread(page);
    const body = await postComment(page, "own");

    await expect(cardFor(page, body).getByRole("button", { name: "Report" })).toHaveCount(0);
    await expect(cardFor(page, body).getByRole("button", { name: "Edit" })).toBeVisible();

    // The seeded thread's first comment belongs to the other test user.
    const seeded = page.locator(".comment-card").first();
    await expect(seeded.getByRole("button", { name: "Report" })).toBeVisible();

    await deleteComment(page, body);
    await expect(cardFor(page, body)).toHaveCount(0);
  });

  test("comments on a docs page too", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_A);
    await openThread(page, "/docs/overview");
    const body = await postComment(page, "docs");

    await expect(cardFor(page, body)).toBeVisible();
    await deleteComment(page, body);
    await expect(cardFor(page, body)).toHaveCount(0);
  });
});

test.describe("moderation", () => {
  test("hides the report queue from a non-admin", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_B);
    await goToPageAndWaitFor(page, "/admin/reports");

    await expect(page.getByRole("heading", { name: "Reported comments" })).toHaveCount(0);
  });

  test("lists the seeded open report for the admin", async ({ page }) => {
    await loginAsTestUserWithCredentials(page, TEST_USER_A);
    await goToPageAndWaitFor(page, "/admin/reports");

    await expect(page.getByRole("heading", { name: "Reported comments" })).toBeVisible();
    await expect(page.getByText("Reason: Testing the report queue.")).toBeVisible();
  });
});
