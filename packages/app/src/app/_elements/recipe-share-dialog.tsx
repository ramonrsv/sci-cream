"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";

import type { LightRecipe } from "@workspace/sci-cream";

import { CopyableField } from "@/app/_elements/copyable-field";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";
import { useSessionResources } from "@/lib/session-resources";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";
import {
  encodeSharePayload,
  findUserDefinedShareNames,
  makeEmbedSnippet,
  makeSharePayload,
  makeShareUrl,
} from "@/lib/recipe-share";

/**
 * Share dialog body: builds the share/embed links for the given recipe and re-encodes them as the
 * user opts individual user-defined ingredient specs in or out. Mounted fresh on every dialog
 * open (Headless UI unmounts the panel when closed), so consent always starts from "none shared".
 */
function ShareDialogBody({
  name,
  rows,
  evaporation,
  comments,
}: {
  name: string;
  rows: LightRecipe;
  evaporation?: number;
  comments?: string;
}) {
  const { userIngredientSpecs } = useSessionResources();

  const userDefinedNames = useMemo(
    () =>
      findUserDefinedShareNames(
        rows,
        userIngredientSpecs.map((spec) => spec.name),
      ),
    [rows, userIngredientSpecs],
  );

  // Opt-in per design: sharing a spec publishes its full composition to anyone with the link.
  const [includedNames, setIncludedNames] = useState<ReadonlySet<string>>(new Set());
  // Comments default to included — they're less sensitive than compositions, but still opt-out.
  const [includeComments, setIncludeComments] = useState(true);
  const [urls, setUrls] = useState<{ share: string; embed: string } | undefined>(undefined);

  /** Toggle whether the named ingredient's spec is inlined into the link. */
  const toggleIncluded = (ingredientName: string) => {
    setIncludedNames((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientName)) next.delete(ingredientName);
      else next.add(ingredientName);
      return next;
    });
  };

  // Re-encode whenever the inputs or the spec consent change; encoding is async (native streams).
  useEffect(() => {
    let cancelled = false;

    const build = async () => {
      const specs = userIngredientSpecs
        .filter((spec) => includedNames.has(spec.name))
        .map((spec) => spec.spec);
      const encoded = await encodeSharePayload(
        makeSharePayload(name, rows, evaporation, includeComments ? comments : undefined, specs),
      );
      if (cancelled) return;
      setUrls({
        share: makeShareUrl(encoded, window.location.origin),
        embed: makeShareUrl(encoded, window.location.origin, true),
      });
    };

    void build();
    return () => {
      cancelled = true;
    };
  }, [name, rows, evaporation, comments, includeComments, includedNames, userIngredientSpecs]);

  return (
    <div className="flex w-80 flex-col gap-3 p-3">
      <span className="font-semibold">Share recipe</span>
      <p className="text-secondary text-xs leading-relaxed">
        Anyone with the link can view this recipe. The recipe itself is encoded in the link — no
        account needed, and nothing is stored on the server.
      </p>

      {userDefinedNames.length > 0 && (
        <div className="flex flex-col gap-1" data-testid="share-spec-consent">
          <span className="text-secondary text-xs font-medium tracking-wide uppercase">
            Your custom ingredients
          </span>
          <p className="text-secondary text-xs leading-relaxed">
            Checked ingredients embed their <em>full specification</em> in the link, visible to
            anyone who has it. Unchecked ones share by name only and will show as unresolved.
          </p>
          <ul>
            {userDefinedNames.map((ingredientName) => (
              <li key={ingredientName}>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={includedNames.has(ingredientName)}
                    onChange={() => toggleIncluded(ingredientName)}
                  />
                  <span className="truncate" title={ingredientName}>
                    {ingredientName}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comments && (
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={includeComments}
            onChange={() => setIncludeComments((prev) => !prev)}
            data-testid="share-include-comments"
          />
          Include comments
        </label>
      )}

      {urls && (
        <>
          <CopyableField
            label="Link"
            value={urls.share}
            copyLabel="Copy link"
            testId="share-link"
          />
          <CopyableField
            label="Embed"
            value={makeEmbedSnippet(urls.embed)}
            copyLabel="Copy embed"
            testId="share-embed"
          />
        </>
      )}
    </div>
  );
}

/**
 * Share action: an icon button opening a popup with a copyable share link and `<iframe>` embed
 * snippet, plus an opt-in consent list when the recipe uses the sharer's own ingredient specs.
 * `rows` come from `makeShareRows` (editor) or a saved version; disabled when there are none.
 */
export function ShareRecipeAction({
  name,
  rows,
  evaporation,
  comments,
  buttonClassName = "action-button px-2 py-0.5 text-sm",
  iconSize = COMPONENT_ACTION_ICON_SIZE,
}: {
  name: string;
  rows: LightRecipe;
  evaporation?: number;
  comments?: string;
  buttonClassName?: string;
  iconSize?: number;
}) {
  const disabled = rows.length === 0;
  const title = disabled ? "Add ingredients to share" : "Share recipe";

  // `flex` on the Popover wrapper lets the button fill it, matching sibling buttons' height.
  return (
    <Popover className="flex">
      <PopoverButton
        className={buttonClassName}
        title={title}
        aria-label="Share recipe"
        disabled={disabled}
        data-testid="share-recipe-button"
      >
        <Share2 size={iconSize} />
      </PopoverButton>
      <PopupPanel data-testid="share-dialog">
        <ShareDialogBody name={name} rows={rows} evaporation={evaporation} comments={comments} />
      </PopupPanel>
    </Popover>
  );
}
