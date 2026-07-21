"use client";

import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";

import { CopyableField } from "@/app/_elements/copyable-field";
import { Popover, PopoverButton, PopupPanel } from "@/app/_elements/popup";
import type { Batch } from "@/lib/batch/batch";
import {
  BATCH_URL_WARN_CHARS,
  encodeBatchPayload,
  makeBatchPayload,
  makeBatchUrl,
} from "@/lib/batch/batch-share";
import { COMPONENT_ACTION_ICON_SIZE } from "@/lib/styles/sizes";

/** Dialog body: builds the handoff link for the current batch and offers it for copying. */
function BatchShareDialogBody({ batch }: { batch: Batch }) {
  // The encoded payload is kept beside the link: it, not the link, is what the size budget caps.
  const [link, setLink] = useState<{ url: string; encoded: string } | undefined>(undefined);

  // Encoding is async (native CompressionStream), so build the link in an effect
  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      const encoded = await encodeBatchPayload(makeBatchPayload(batch));
      if (!cancelled) setLink({ url: makeBatchUrl(encoded, window.location.origin), encoded });
    };
    void build();
    return () => {
      cancelled = true;
    };
  }, [batch]);

  return (
    <div className="flex w-80 flex-col gap-3 p-3">
      <span className="font-semibold">Share checklist</span>
      <p className="text-secondary text-xs leading-relaxed">
        Anyone with this link sees the same checklist and can check items off on their own device.
        Progress is tracked per device, not shared back.
      </p>
      {/* The blurb stays put while the link builds, so the panel does not resize in place */}
      {link === undefined ? (
        <p className="text-secondary text-sm">Building link…</p>
      ) : (
        <>
          <CopyableField
            label="Checklist link"
            value={link.url}
            copyLabel="Copy"
            testId="batch-share-link"
          />
          {link.encoded.length > BATCH_URL_WARN_CHARS && (
            <p className="msg-warning p-2 text-xs" data-testid="batch-share-length-warning">
              This link is long ({link.url.length} characters) and some chat apps may truncate it.
              Consider sharing fewer recipes at once.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Toolbar action opening the handoff-link dialog for a batch. Disabled until the batch has
 * something to weigh, since an empty checklist is not shareable.
 */
export function ShareBatchAction({
  batch,
  buttonClassName = "action-button px-2 py-0.5 text-sm",
  iconSize = COMPONENT_ACTION_ICON_SIZE,
}: {
  batch: Batch;
  buttonClassName?: string;
  iconSize?: number;
}) {
  const disabled = batch.recipes.every((recipe) => recipe.rows.length === 0);

  return (
    <Popover className="flex">
      <PopoverButton
        className={buttonClassName}
        disabled={disabled}
        title={disabled ? "Add a recipe to share the checklist" : "Share checklist"}
        data-testid="share-batch-button"
      >
        <Share2 size={iconSize} />
      </PopoverButton>
      {/* Width and padding live on the body, matching the recipe share dialog */}
      <PopupPanel data-testid="batch-share-dialog">
        <BatchShareDialogBody batch={batch} />
      </PopupPanel>
    </Popover>
  );
}
