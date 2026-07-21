import type { Metadata } from "next";

import { MakeRecipeView } from "@/app/_components/make-recipe-view";

/** Route metadata: the batch never reaches the server, so this describes the feature instead. */
export const metadata: Metadata = {
  title: "Make recipe",
  description:
    "A weighing checklist for one or more recipes, shareable as a link to whoever is measuring.",
};

/** Make-recipe route: the weighing checklist, in owner or shared-link mode. */
export default function MakeRecipePage() {
  return <MakeRecipeView />;
}
