import type { ReactElement } from "react";
import { render } from "@testing-library/react";

import { RetainedStateProvider } from "@/app/_providers/retained-state-provider";

/**
 * Render `ui` under a {@link RetainedStateProvider}, as the root layout does.
 *
 * `leaveAndReturn` unmounts `ui` and mounts it again inside the same provider, like navigating away
 * and back client-side. A reload starts from a new provider instead, i.e. another call to this.
 */
export function renderWithRetainedState(ui: ReactElement) {
  const tree = (present: boolean) => (
    <RetainedStateProvider>{present ? ui : null}</RetainedStateProvider>
  );
  const result = render(tree(true));

  return {
    ...result,
    leaveAndReturn: () => {
      result.rerender(tree(false));
      result.rerender(tree(true));
    },
  };
}
