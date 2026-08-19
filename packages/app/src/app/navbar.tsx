"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { useIsNarrow } from "@/lib/hooks/use-is-narrow";
import { useCanHover } from "@/lib/hooks/use-can-hover";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Calculator,
  BookOpen,
  ListChecks,
  Wheat,
  Library,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  CircleUserRound,
  LogIn,
  LogOut,
  RotateCcw,
  Menu,
} from "lucide-react";

import {
  HEADER_ICON_SIZE,
  NAVBAR_ICON_SIZE,
  DEFAULT_SIDEBAR_PINNED,
  SIDEBAR_W_REST,
  SIDEBAR_W_SPACER_REST,
  HEADER_W_REST,
  SIDEBAR_W_PINNED,
  SIDEBAR_W_PEEK,
  SIDEBAR_W_SPACER_PINNED,
  HEADER_W_PINNED,
  HEADER_W_PEEK,
} from "@/lib/styles/sizes";
import { Logo } from "@/app/_elements/logo";
import { ThemeSelect } from "@/app/_elements/selects/theme-select";
import { GroupBySelect } from "@/app/_elements/selects/group-by-select";
import { STORAGE_KEYS } from "@/lib/local-storage";
import { clearStoredLayouts, dispatchLayoutReset } from "@/lib/calculator-layout";

/** Primary navigation links shown in the sidebar */
const navItems = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/make-recipe", label: "Make", icon: ListChecks },
  { href: "/ingredients", label: "Ingredients", icon: Wheat },
  { href: "/docs", label: "Docs", icon: Library },
  { href: "/blog", label: "Blog", icon: Newspaper },
];

/** Returns `true` when the current pathname starts with the given nav item href */
function isNavActive(pathname: string, href: string): boolean {
  return pathname.startsWith(href);
}

/** Routes whose pages render groupable key lists, where the global Group-by control is shown. */
const GROUP_BY_ROUTES = ["/calculator", "/recipes", "/ingredients"];

/** Sidebar pinned/peek state, mount status, and viewport class, for descendants */
const NavbarContext = createContext<{
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
  mounted: boolean;
  /** Transient drawer-open state: hover-peek on mouse, tap-peek on touch. Not persisted. */
  peek: boolean;
  openPeek: () => void;
  closePeek: () => void;
  /** Viewport narrower than `sm`; drives width-sensitive layout, not peek interaction. */
  isNarrow: boolean;
  /** Primary pointer can hover (mouse/trackpad); drives hover-vs-tap peek interaction. */
  canHover: boolean;
}>({
  pinned: false,
  setPinned: () => {},
  mounted: false,
  peek: false,
  openPeek: () => {},
  closePeek: () => {},
  isNarrow: true,
  canHover: false,
});

/** Hook to access the `NavbarContext` value from any descendant component */
export function useNavbarContext() {
  return useContext(NavbarContext);
}

/** Routes rendered without the header/sidebar shell (embeddable views inside third-party frames) */
const CHROMELESS_ROUTES = ["/share/embed"];

/** Root layout shell with the `NavbarContext`, top header, collapsible sidebar, and main area */
export function Navbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [pinned, setPinned] = usePersistedState<boolean>(
    STORAGE_KEYS.sidebarPinned,
    DEFAULT_SIDEBAR_PINNED,
  );

  const [mounted, setMounted] = useState(false);
  const [peek, setPeek] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const isNarrow = useIsNarrow();
  const canHover = useCanHover();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPeek = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPeek(true);
  }, []);

  // Deferred so re-entry cancels the close when the cursor crosses between header and sidebar.
  const closePeek = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setPeek(false), 80);
  }, []);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Touch devices: a pointer down outside the sidebar or header dismisses the peeked drawer.
  useEffect(() => {
    if (!peek || canHover) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const insideNav = target?.closest("#sidebar") ?? target?.closest("#header");
      if (insideNav) return;
      setPeek(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [peek, canHover]);

  // Touch devices: navigating dismisses the peek drawer so it doesn't linger over the new page.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (!canHover) setPeek(false);
  }

  if (CHROMELESS_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  return (
    <NavbarContext
      value={{ pinned, setPinned, mounted, peek, openPeek, closePeek, isNarrow, canHover }}
    >
      <div className="flex h-screen flex-col">
        <Header />
        {/* `relative` anchors the sidebar drawer, which overlays the content when peeking. */}
        <div className="relative flex min-h-0 flex-1">
          <Sidebar />
          {/* `scrollbar-gutter:stable` keeps content width fixed when the scrollbar toggles,
              so `react-grid-layout` on the calculator page can't flip breakpoints at viewport
              widths where the container straddles one (e.g. Pixel 5 landscape at 802px). */}
          <div
            id="app-content"
            data-testid="app-content"
            className="flex-1 scrollbar-gutter-stable overflow-auto"
          >
            {children}
          </div>
        </div>
      </div>
    </NavbarContext>
  );
}

/** Logo, collapse/expand button, `ThemeSelect` button, and account button to the right */
export function Header() {
  const pathname = usePathname();
  const { pinned, setPinned, mounted, peek, openPeek, closePeek, isNarrow, canHover } =
    useContext(NavbarContext);

  const pageTitle = navItems.find(({ href }) => isNavActive(pathname, href))?.label || "Sci-Cream";
  const iconSize = HEADER_ICON_SIZE;
  const logoSize = iconSize + 2;

  if (!mounted) return <header id="header" className="navbar h-12 shrink-0" />;

  const onCalculator = pathname === "/calculator";
  const showGroupBy = GROUP_BY_ROUTES.some((route) => pathname.startsWith(route));

  const spacerWidth = pinned ? HEADER_W_PINNED : HEADER_W_REST;
  const headerWidth = peek ? HEADER_W_PEEK : pinned ? HEADER_W_PINNED : HEADER_W_REST;
  const hoverProps = canHover ? { onMouseEnter: openPeek, onMouseLeave: closePeek } : undefined;

  const handleResetLayout = () => {
    if (!window.confirm("Reset the calculator layout to its default arrangement?")) return;
    clearStoredLayouts();
    dispatchLayoutReset();
  };

  return (
    <header id="header" className="navbar flex h-12 shrink-0 items-center justify-between">
      {/* Logo and header controls: reserves spacer width in flow, overlays title when peeking */}
      <div className={`navbar-trans-width relative h-12 shrink-0 ${spacerWidth}`} {...hoverProps}>
        {/* Clipper: animates the revealed width and overlays the title when peeking. */}
        <div
          className={`navbar navbar-trans-width absolute inset-y-0 left-0 z-40 overflow-hidden ${headerWidth}`}
        >
          {/* Fixed width keeps the controls positioned; the clipper above reveals them. */}
          <div className={`flex h-full items-center ${HEADER_W_PEEK}`}>
            {canHover ? (
              <Logo size={logoSize} className="mr-auto ml-4 sm:ml-6" />
            ) : (
              <button
                title={peek ? "Un-peek sidebar" : "Peek sidebar"}
                id="peek-sidebar-button"
                className="header-button mr-auto ml-2 sm:ml-4"
                onClick={() => (peek ? closePeek() : openPeek())}
              >
                <Menu size={iconSize} />
              </button>
            )}
            {onCalculator && (
              <button
                type="button"
                title="Reset calculator layout"
                aria-label="Reset calculator layout"
                id="reset-layout-button"
                className="header-button"
                onClick={handleResetLayout}
              >
                <RotateCcw size={iconSize} />
              </button>
            )}
            {showGroupBy && <GroupBySelect />}
            <ThemeSelect />
            <button
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
              id="pin-sidebar-button"
              className={`header-button mr-2 sm:mr-4`}
              onClick={() => {
                setPinned(!pinned);
                if (!canHover && peek) closePeek();
              }}
            >
              {pinned ? <PanelLeftClose size={iconSize} /> : <PanelLeftOpen size={iconSize} />}
            </button>
          </div>
        </div>
      </div>
      {/* Page title and account button */}
      <div className="navbar flex w-full items-center justify-between">
        <h1 className={`${isNarrow && !pinned && !peek ? "" : "m-4"} text-lg font-bold`}>
          {pageTitle}
        </h1>
        <div className="flex items-center gap-1">
          <AccountButton iconSize={iconSize} />
        </div>
      </div>
    </header>
  );
}

/** Collapsible sidebar with nav links, rendered as a drawer that overlays content when peeking */
export function Sidebar() {
  const pathname = usePathname();
  const { pinned, mounted, peek, openPeek, closePeek, isNarrow, canHover } =
    useContext(NavbarContext);

  const iconSize = NAVBAR_ICON_SIZE;

  const spacerWidth = pinned ? SIDEBAR_W_SPACER_PINNED : SIDEBAR_W_SPACER_REST;
  const sidebarWidth = peek ? SIDEBAR_W_PEEK : pinned ? SIDEBAR_W_PINNED : SIDEBAR_W_REST;
  const overlaying = peek && (!pinned || isNarrow);

  if (!mounted) return <div className={`navbar-trans-width shrink-0 ${spacerWidth}`} />;

  const hoverProps = canHover ? { onMouseEnter: openPeek, onMouseLeave: closePeek } : undefined;

  return (
    <>
      {/* In-flow spacer: small left gutter on mobile at rest, else matches un-peeked sidebar */}
      <div className={`navbar-trans-width shrink-0 ${spacerWidth}`} aria-hidden />
      <aside
        id="sidebar"
        className={`navbar navbar-trans-width absolute inset-y-0 left-0 z-30 flex flex-col overflow-hidden ${sidebarWidth} ${overlaying ? "sidebar-drawer-peek" : ""}`}
        {...hoverProps}
      >
        {/* Nav links */}
        <nav aria-label="Main" className="mt-1 flex flex-1 flex-col gap-1 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={pinned ? undefined : label}
                className={`sidebar-item ${active ? "sidebar-item-active" : ""} mx-0.5 gap-2 px-2 sm:mx-2.25`}
              >
                <Icon size={iconSize} className="shrink-0" />
                {<span className="overflow-hidden">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

/** Account button: shows a signed-in user avatar + sign-out button, or a sign-in button */
function AccountButton({ iconSize }: { iconSize: number }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button title="Account" className="header-button m-4" disabled>
        <CircleUserRound size={iconSize} />
      </button>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2 pr-2">
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "User"}
            width={iconSize + 4}
            height={iconSize + 4}
            className="rounded-full"
          />
        ) : (
          <CircleUserRound size={iconSize} />
        )}
        <span id="user-name" className="hidden text-sm sm:inline">
          {session.user.name}
        </span>
        <button title="Sign out" className="header-button ml-1 p-1" onClick={() => signOut()}>
          <LogOut size={iconSize} />
        </button>
      </div>
    );
  }

  return (
    <button
      title="Sign in"
      className="header-button m-4 flex items-center gap-1"
      onClick={() => signIn()}
    >
      <LogIn size={iconSize} />
    </button>
  );
}
