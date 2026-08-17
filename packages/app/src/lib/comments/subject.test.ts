import { describe, it, expect } from "vitest";

import {
  COMMENT_SUBJECT_TYPES,
  commentSubjectPath,
  isCommentSubject,
  isCommentSubjectType,
} from "@/lib/comments/subject";

describe("COMMENT_SUBJECT_TYPES", () => {
  it("holds the sections that have comment threads today", () => {
    expect(COMMENT_SUBJECT_TYPES).toEqual(["blog", "docs"]);
  });
});

describe("isCommentSubjectType", () => {
  it.each(COMMENT_SUBJECT_TYPES)("accepts %s", (type) => {
    expect(isCommentSubjectType(type)).toBe(true);
  });

  it.each([["recipe"], ["ingredient"], [""], ["BLOG"]])("rejects %j", (value) => {
    expect(isCommentSubjectType(value)).toBe(false);
  });

  it.each([[undefined], [null], [42], [{ type: "blog" }], [["blog"]]])(
    "rejects the non-string %j",
    (value) => {
      expect(isCommentSubjectType(value)).toBe(false);
    },
  );
});

describe("isCommentSubject", () => {
  it("accepts a well-formed subject", () => {
    expect(isCommentSubject({ type: "blog", key: "2026-04-27-welcome" })).toBe(true);
  });

  it("accepts a nested docs key", () => {
    expect(isCommentSubject({ type: "docs", key: "other-resources/science" })).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(isCommentSubject({ type: "recipe", key: "Anyone: Anything" })).toBe(false);
  });

  it("rejects an empty key", () => {
    expect(isCommentSubject({ type: "blog", key: "" })).toBe(false);
  });

  it("rejects a non-string key", () => {
    expect(isCommentSubject({ type: "blog", key: 7 })).toBe(false);
  });

  it("rejects a missing key", () => {
    expect(isCommentSubject({ type: "blog" })).toBe(false);
  });

  it.each([[null], [undefined], ["blog"], [42], [[]]])("rejects the non-object %j", (value) => {
    expect(isCommentSubject(value)).toBe(false);
  });
});

describe("commentSubjectPath", () => {
  it("builds the blog post's path", () => {
    expect(commentSubjectPath({ type: "blog", key: "2026-04-27-welcome" })).toBe(
      "/blog/2026-04-27-welcome",
    );
  });

  it("keeps a nested docs key's slashes", () => {
    expect(commentSubjectPath({ type: "docs", key: "other-resources/science" })).toBe(
      "/docs/other-resources/science",
    );
  });
});
