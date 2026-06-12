"use client";

import { createContext, useContext, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Calculator,
  BookOpen,
  Wheat,
  Library,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  CircleUserRound,
  LogIn,
  LogOut,
  RotateCcw,
} from "lucide-react";

import {
  HEADER_ICON_SIZE,
  NAVBAR_ICON_SIZE,
  DEFAULT_COLLAPSED_NAVBAR,
  SIDEBAR_W_COLLAPSED,
  SIDEBAR_W_EXPANDED,
} from "@/lib/styles/sizes";
import { ThemeSelect } from "@/app/_elements/selects/theme-select";
import { GroupBySelect } from "@/app/_elements/selects/group-by-select";
import { setLocalStorage, getLocalStorage, STORAGE_KEYS } from "@/lib/local-storage";
import { clearStoredLayouts, dispatchLayoutReset } from "@/lib/calculator-layout";

/** Primary navigation links shown in the sidebar */
const navItems = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
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

/** Context providing the sidebar collapsed state and mount status to child components */
const NavbarContext = createContext<{
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mounted: boolean;
}>({ collapsed: false, setCollapsed: () => {}, mounted: false });

/** Hook to access the `NavbarContext` value from any descendant component */
export function useNavbarContext() {
  return useContext(NavbarContext);
}

/** Read the sidebar collapsed state from `localStorage`, default `DEFAULT_COLLAPSED_NAVBAR` */
function getInitialCollapsedState(): boolean {
  return getLocalStorage<boolean>(STORAGE_KEYS.sidebarCollapsed) ?? DEFAULT_COLLAPSED_NAVBAR;
}

/** Root layout shell with the `NavbarContext`, top header, collapsible sidebar, and main area */
export function Navbar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => getInitialCollapsedState());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    setLocalStorage(STORAGE_KEYS.sidebarCollapsed, collapsed);
  }, [collapsed]);

  return (
    <NavbarContext value={{ collapsed, setCollapsed, mounted }}>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          {/* `scrollbar-gutter:stable` keeps content width fixed when the scrollbar toggles,
              so `react-grid-layout` on the calculator page can't flip breakpoints at viewport
              widths where the container straddles one (e.g. Pixel 5 landscape at 802px). */}
          <div data-testid="app-content" className="flex-1 overflow-auto [scrollbar-gutter:stable]">
            {children}
          </div>
        </div>
      </div>
    </NavbarContext>
  );
}

/** Logo, collapse/expand button, `ThemeSelect` button, and account button to the right */
export function Header() {
  const { collapsed, setCollapsed, mounted } = useContext(NavbarContext);
  const pathname = usePathname();
  const [hoveringLogo, setHoveringLogo] = useState(false);

  const pageTitle = navItems.find(({ href }) => isNavActive(pathname, href))?.label || "Sci-Cream";
  const iconSize = HEADER_ICON_SIZE;
  const logoSize = iconSize + 2;

  if (!mounted) return <header className="navbar h-12 shrink-0" />;

  const showExpandButton = collapsed && hoveringLogo;
  const onCalculator = pathname === "/calculator";
  const showGroupBy = GROUP_BY_ROUTES.some((route) => pathname.startsWith(route));

  const handleResetLayout = () => {
    if (!window.confirm("Reset the calculator layout to its default arrangement?")) return;
    clearStoredLayouts();
    dispatchLayoutReset();
  };

  return (
    <header id="header" className="navbar flex h-12 shrink-0 items-center justify-between">
      {/* Logo and collapse/expand button */}
      <div
        className={`navbar-trans-width flex shrink-0 ${collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED}`}
      >
        <div className={`flex ${SIDEBAR_W_EXPANDED} shrink-0 items-center overflow-hidden`}>
          <button
            title="Expand sidebar"
            id="expand-sidebar-button"
            className={`${showExpandButton ? "header-button ml-2 sm:ml-4" : "ml-4 sm:ml-6"} mr-auto`}
            onClick={() => setCollapsed(false)}
            onMouseEnter={() => setHoveringLogo(true)}
            onMouseLeave={() => setHoveringLogo(false)}
          >
            {showExpandButton ? (
              <PanelLeftOpen size={iconSize} />
            ) : (
              <Image src="/favicon.ico" alt="Sci-Cream" width={logoSize} height={logoSize} />
            )}
          </button>
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
            title="Collapse sidebar"
            id="collapse-sidebar-button"
            className={`header-button mr-2 sm:mr-4`}
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose size={iconSize} />
          </button>
        </div>
      </div>
      {/* Page title and account button */}
      <div className="navbar flex w-full items-center justify-between">
        <h1 className="m-4 text-lg font-bold">{pageTitle}</h1>
        <div className="flex items-center gap-1">
          <AccountButton iconSize={iconSize} />
        </div>
      </div>
    </header>
  );
}

/** Collapsible sidebar with nav links */
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mounted } = useContext(NavbarContext);

  if (!mounted) return <aside className={`navbar ${SIDEBAR_W_COLLAPSED} shrink-0`} />;

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <aside
      id="sidebar"
      className={`navbar navbar-trans-width flex shrink-0 flex-col ${collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED}`}
    >
      {/* Nav links */}
      <nav className="mt-1 flex flex-1 flex-col gap-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`sidebar-item ${active ? "sidebar-item-active" : ""} mx-0.5 gap-2 px-2 sm:mx-2.25`}
            >
              <Icon size={iconSize} className="shrink-0" />
              {<span className="overflow-hidden">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
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
