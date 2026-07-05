"use client";

import { GripVertical } from "lucide-react";

import { Recipe, filterActiveSlots } from "@/lib/recipe";
import { PropertiesChartView } from "@/app/_elements/charts/properties-chart";
import type { TargetsMap } from "@/app/_elements/watchers/watchers";
import { DRAG_HANDLE_ICON_SIZE } from "@/lib/styles/sizes";
import { STORAGE_KEYS } from "@/lib/local-storage";

/**
 * Calculator-page panel wrapping {@link PropertiesChartView} with grid-layout chrome and a drag
 * handle.
 *
 * Applies slot filtering so the chart shows the main recipe plus any non-empty reference recipes.
 * `targets` (optional, read-only) carries the page-owned balancing targets for tick display.
 */
export function PropertiesChartPanel({
  recipes,
  targets,
}: {
  recipes: Recipe[];
  targets?: TargetsMap;
}) {
  const active = filterActiveSlots(recipes);
  return (
    <div id="properties-chart-panel" className="grid-component relative h-full w-full">
      <PropertiesChartView
        main={active[0]}
        refs={active.slice(1)}
        targets={targets}
        toolbarPrefix={<GripVertical size={DRAG_HANDLE_ICON_SIZE} className="drag-handle" />}
        persistKey={STORAGE_KEYS.propertiesChartPanelView}
      />
    </div>
  );
}
