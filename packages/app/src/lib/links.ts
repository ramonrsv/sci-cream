/**
 * Where a link opens. Whatever the app shell renders opens in place, through client-side
 * navigation, which keeps a page's in-memory state, such as a search panel's selection, for the
 * way back. Whatever lies outside the shell opens in a new tab: another site, or the hosted rustdoc
 * at `/rustdoc/`, a static site of its own.
 */

/** Whether `href` leaves the app shell, opening in a new tab. */
export function opensInNewTab(href: string): boolean {
  return /^https?:\/\//.test(href) || href.startsWith("/rustdoc/");
}

/** Whether `href` is a route of the app shell, navigated client-side as a Next `Link`. */
export function isAppRoute(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !opensInNewTab(href);
}
