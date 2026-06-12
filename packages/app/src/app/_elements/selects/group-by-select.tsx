"use client";

import { List, ListTree, Layers } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

import { NAVBAR_ICON_SIZE } from "@/lib/styles/sizes";
import { GroupBy, GROUP_BY_LABELS, useGroupBy } from "@/lib/group-by";

/** Icon shown for each grouping option in the navbar control. */
const GROUP_BY_ICONS: Record<GroupBy, typeof List> = {
  [GroupBy.Ungrouped]: List,
  [GroupBy.GroupedOnce]: ListTree,
  [GroupBy.GroupedRepeat]: Layers,
};

/**
 * Navbar control for the global {@link GroupBy} grouping preference.
 *
 * Like {@link ThemeSelect}, this is an icon-only navbar `Listbox` reading shared state (via
 * {@link useGroupBy}), so a single control configures grouping across every key list at once.
 */
export function GroupBySelect() {
  const { groupBy, setGroupBy } = useGroupBy();
  const iconSize = NAVBAR_ICON_SIZE;
  const SelectedIcon = GROUP_BY_ICONS[groupBy];

  return (
    <div id="group-by-select">
      <Listbox value={groupBy} onChange={setGroupBy}>
        <ListboxButton
          className="header-button flex items-center"
          title={`Group properties (${GROUP_BY_LABELS[groupBy]})`}
        >
          <SelectedIcon size={iconSize} />
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className="popup z-50 w-39">
          {Object.values(GroupBy).map((mode) => {
            const Icon = GROUP_BY_ICONS[mode];
            return (
              <ListboxOption key={mode} value={mode} className="select-option">
                <Icon size={iconSize} />
                <span>{GROUP_BY_LABELS[mode]}</span>
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
