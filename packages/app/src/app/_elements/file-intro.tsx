import { ChevronRight } from "lucide-react";

import type { DataFileIntro } from "@workspace/sci-cream";

import { Markdown } from "@/app/_elements/markdown";
import { FILE_INTRO_ICON_SIZE } from "@/lib/styles/sizes";

/**
 * A built-in entry's data file intro, notes on every entry from that file, in a disclosure that
 * starts collapsed. The browser holds its open state, which only a remount resets.
 */
export function FileIntro({ intro }: { intro: DataFileIntro }) {
  return (
    <details className="group mt-2">
      <summary className="text-txt-prim hover:bg-hov flex cursor-pointer list-none items-center gap-2 rounded-lg p-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight
          size={FILE_INTRO_ICON_SIZE}
          className="transition-transform group-open:rotate-90"
        />
        About {intro.title}
      </summary>
      <Markdown text={intro.text} className="px-2" />
    </details>
  );
}
