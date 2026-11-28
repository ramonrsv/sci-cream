import { describe, expect, it } from "vitest";

import { isAppRoute, opensInNewTab } from "@/lib/links";

describe("opensInNewTab", () => {
  it.each(["https://example.com/page", "http://example.com", "/rustdoc/sci_cream/index.html"])(
    "opens %s in a new tab, it lying outside the app shell",
    (href) => {
      expect(opensInNewTab(href)).toBe(true);
      expect(isAppRoute(href)).toBe(false);
    },
  );
});

describe("isAppRoute", () => {
  it.each(["/docs/reference/sweeteners#pod", "/docs/overview", "/calculator", "/docs/reference"])(
    "navigates to %s in place, a route the shell renders",
    (href) => {
      expect(isAppRoute(href)).toBe(true);
      expect(opensInNewTab(href)).toBe(false);
    },
  );

  // An in-page anchor needs no navigation, and a protocol-relative URL is another site's
  it.each(["#fn1", "//example.com/page", "mailto:someone@example.com", "notes.md"])(
    "leaves %s a plain link, opening in place",
    (href) => {
      expect(isAppRoute(href)).toBe(false);
      expect(opensInNewTab(href)).toBe(false);
    },
  );
});
