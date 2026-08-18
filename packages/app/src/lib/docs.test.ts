import { describe, it, expect } from "vitest";

import { docsHref } from "./docs";

describe("docsHref", () => {
  it("serves every page at its slug, nested ones included", () => {
    expect(docsHref("overview")).toBe("/docs/overview");
    expect(docsHref("other-resources/science")).toBe("/docs/other-resources/science");
  });
});
