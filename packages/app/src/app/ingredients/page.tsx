"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import type { IngredientSpecJson } from "@workspace/sci-cream";

import { IngredientSearch } from "@/app/_components/ingredient-search";
import { fetchAllUserIngredientSpecs } from "@/lib/data";

/**
 * Coerce a DB row's `spec` field (JSON column) into an `IngredientSpecJson`.
 *
 * The seed code stores specs via `JSON.stringify(spec)` into a `json()` column, so depending on
 * how Drizzle/PG round-trips the value we may receive either a parsed object or a JSON-encoded
 * string. Accept both and return `undefined` for malformed data.
 */
function toSpecJson(value: unknown): IngredientSpecJson | undefined {
  const candidate: unknown = typeof value === "string" ? safeJsonParse(value) : value;
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "name" in candidate &&
    "category" in candidate
  ) {
    return candidate as IngredientSpecJson;
  }
  return undefined;
}

/** Parse a JSON string, returning `undefined` on any parse error rather than throwing */
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Ingredients page: browse and inspect specs from embedded data and the user's saved library */
export default function IngredientsPage() {
  const { data: session } = useSession();
  const [savedSpecs, setSavedSpecs] = useState<IngredientSpecJson[]>([]);

  const userEmail = session?.user?.email;

  useEffect(() => {
    if (!userEmail) return;
    fetchAllUserIngredientSpecs(userEmail).then((rows) => {
      if (!rows) return;
      const specs = rows
        .map((r) => toSpecJson(r.spec))
        .filter((s): s is IngredientSpecJson => s !== undefined);
      setSavedSpecs(specs);
    });
  }, [userEmail]);

  return (
    <div className="mx-auto mt-4 max-w-5xl px-1 md:px-4">
      <IngredientSearch savedSpecs={savedSpecs} />
    </div>
  );
}
