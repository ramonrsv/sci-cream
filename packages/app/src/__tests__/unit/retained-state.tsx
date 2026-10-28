import type { ReactElement } from "react";
import { render } from "@testing-library/react";

import { RetainedStateProvider } from "@/app/_providers/retained-state-provider";

/**
 * Render `ui` under a {@link RetainedStateProvider}, as the root layout does.
 *
 * `leaveAndReturn` unmounts `ui` and mounts it again inside the same provider, like navigating away
 * and back client-side; pass `next` to return to it instead, e.g. with data that changed meanwhile.
 * A reload starts from a new provider instead, i.e. another call to this.
 */
export function renderWithRetainedState(ui: ReactElement) {
  const tree = (child: ReactElement | null) => (
    <RetainedStateProvider>{child}</RetainedStateProvider>
  );
  const result = render(tree(ui));

  return {
    ...result,
    leaveAndReturn: (next: ReactElement = ui) => {
      result.rerender(tree(null));
      result.rerender(tree(next));
    },
  };
}
