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
  PanelLeftClose,
  PanelLeftOpen,
  CircleUserRound,
  LogIn,
  LogOut,
} from "lucide-react";

import { NAVBAR_ICON_SIZE, DEFAULT_COLLAPSED_NAVBAR } from "@/lib/styles/sizes";
import { ThemeSelect, Theme, getInitialTheme } from "@/app/_elements/selects/theme-select";

const navItems = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/ingredients", label: "Ingredients", icon: Wheat },
];

function isNavActive(pathname: string, href: string): boolean {
  return pathname.startsWith(href);
}

const NavbarContext = createContext<{
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mounted: boolean;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}>({
  collapsed: false,
  setCollapsed: () => {},
  mounted: false,
  theme: Theme.Light,
  setTheme: () => {},
});

export function useNavbarContext() {
  return useContext(NavbarContext);
}

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return DEFAULT_COLLAPSED_NAVBAR;
  const stored = localStorage.getItem("sidebar-collapsed");
  return stored !== null ? stored === "true" : DEFAULT_COLLAPSED_NAVBAR;
}

export function Navbar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => getInitialCollapsedState());
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  return (
    <NavbarContext value={{ collapsed, setCollapsed, mounted, theme, setTheme }}>
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </NavbarContext>
  );
}

/** Logo, collapse/expand button, `ThemeSelect` button, and account button to the right */
export function Header() {
  const { collapsed, setCollapsed, mounted, theme, setTheme } = useContext(NavbarContext);
  const pathname = usePathname();
  const [hoveringLogo, setHoveringLogo] = useState(false);

  const pageTitle = navItems.find(({ href }) => isNavActive(pathname, href))?.label || "Sci-Cream";
  const iconSize = NAVBAR_ICON_SIZE;
  const logoSize = iconSize + 2;

  if (!mounted) return <header className="navbar h-12 shrink-0" />;

  const showExpandButton = collapsed && hoveringLogo;

  return (
    <header id="header" className="navbar flex h-12 shrink-0 items-center justify-between">
      {/* Logo and collapse/expand button */}
      <div className={`navbar-trans-width flex shrink-0 ${collapsed ? "w-18" : "w-52"}`}>
        <div className="flex w-52 shrink-0 items-center overflow-hidden">
          <button
            title="Expand sidebar"
            id="expand-sidebar-button"
            className={`${showExpandButton ? "header-button m-4 p-2" : "m-6"} mr-auto`}
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
          <ThemeSelect themeState={[theme, setTheme]} />
          <button
            title="Collapse sidebar"
            id="collapse-sidebar-button"
            className={`header-button mr-3`}
            onClick={() => setCollapsed(true)}
          >
            <PanelLeftClose size={iconSize} />
          </button>
        </div>
      </div>
      {/* Page title and account button */}
      <div className="navbar flex w-full items-center justify-between">
        <h1 className="m-3 text-lg font-bold">{pageTitle}</h1>
        <AccountButton iconSize={iconSize} />
      </div>
    </header>
  );
}

/** Collapsible sidebar with nav links */
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, mounted } = useContext(NavbarContext);

  if (!mounted) return <aside className="navbar w-18 shrink-0" />;

  const iconSize = NAVBAR_ICON_SIZE;

  return (
    <aside
      id="sidebar"
      className={`navbar navbar-trans-width flex shrink-0 flex-col ${collapsed ? "w-18" : "w-52"}`}
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
              className={`sidebar-item ${active ? "sidebar-item-active" : ""} gap-2 px-2`}
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
